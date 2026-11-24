/**
 * Controlador + vista del graficador de funciones `f(x)`.
 *
 * Capa de UI: la única que toca el Canvas. El dibujo de ejes, la rejilla, el
 * muestreo por píxel, el corte de discontinuidades y el redibujado en resize se
 * implementan en F4 usando `./coords.js` y el motor de `./expr/`. El zoom, el
 * paneo y las múltiples funciones llegan en F5.
 *
 * Las funciones puras (`niceStep`, `generateTicks`, `formatTick`,
 * `compileExpression`, `sampleCurve`) se exportan para poder testearlas en Node
 * sin navegador; `mountGrapher` es lo único que toca el DOM/Canvas.
 */

import { parse } from "./expr/parser.js";
import { evaluate } from "./expr/evaluator.js";
import {
  createViewport,
  fitViewportToSize,
  toPixels,
  toMath,
} from "./coords.js";

const CURVE_COLOR = "#38bdf8";
const DEFAULT_EXPRESSION = "sin(x)";
const DEFAULT_X_MIN = -10;
const DEFAULT_X_MAX = 10;

/**
 * Calcula un "paso bonito" (1, 2, 5 × 10^n) para las marcas de un eje, de modo
 * que el número de marcas se acerque al objetivo y las etiquetas sean legibles.
 *
 * @param {number} span - Longitud del rango visible (max - min).
 * @param {number} [targetTicks=8] - Número aproximado de marcas deseado.
 * @returns {number} Paso entre marcas (> 0).
 */
export function niceStep(span, targetTicks = 8) {
  if (!Number.isFinite(span) || span <= 0) {
    return 1;
  }
  const target = Number.isFinite(targetTicks) && targetTicks > 0 ? targetTicks : 8;
  const raw = span / target;
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
  const residual = raw / magnitude;
  let nice;
  if (residual <= 1) {
    nice = 1;
  } else if (residual <= 2) {
    nice = 2;
  } else if (residual <= 5) {
    nice = 5;
  } else {
    nice = 10;
  }
  return nice * magnitude;
}

/**
 * Número de decimales necesarios para representar un paso sin ruido de coma
 * flotante.
 *
 * @param {number} step
 * @returns {number}
 */
function decimalsFor(step) {
  const abs = Math.abs(step);
  if (!Number.isFinite(abs) || abs === 0 || abs >= 1) {
    return 0;
  }
  return Math.min(20, Math.ceil(-Math.log10(abs)));
}

/**
 * Redondea un valor al número de decimales del paso para evitar etiquetas como
 * `0.30000000000000004`.
 *
 * @param {number} value
 * @param {number} step
 * @returns {number}
 */
function roundToStep(value, step) {
  const decimals = decimalsFor(step);
  return Number(value.toFixed(decimals));
}

/**
 * Genera las marcas (valores matemáticos) de un eje dentro de `[min, max]`,
 * alineadas a un paso "bonito".
 *
 * @param {number} min
 * @param {number} max
 * @param {number} [targetTicks=8]
 * @returns {number[]}
 */
export function generateTicks(min, max, targetTicks = 8) {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
    return [];
  }
  const step = niceStep(max - min, targetTicks);
  const first = Math.ceil(min / step) * step;
  const ticks = [];
  const guard = 1000;
  for (let i = 0, value = first; value <= max + step * 1e-9 && i < guard; i += 1) {
    ticks.push(roundToStep(value, step));
    value = first + (i + 1) * step;
  }
  return ticks;
}

/**
 * Formatea una marca para mostrarla en un eje de forma legible.
 *
 * @param {number} value
 * @param {number} [step=1] - Paso del eje, para decidir los decimales.
 * @returns {string}
 */
export function formatTick(value, step = 1) {
  const safe = Math.abs(value) < 1e-12 ? 0 : value;
  if (safe === 0) {
    return "0";
  }
  const abs = Math.abs(safe);
  if (abs >= 1e6 || abs < 1e-4) {
    return safe
      .toExponential(0)
      .replace("e+", "e")
      .replace("e-0", "e-")
      .replace("e+0", "e");
  }
  const decimals = decimalsFor(step);
  return Number(safe.toFixed(decimals)).toString();
}

/**
 * Compila el texto de una expresión `f(x)` a un AST listo para evaluar.
 * Nunca lanza: devuelve `{ ok, ast }` o `{ ok:false, error }`.
 *
 * @param {string} text
 * @returns {{ok: true, ast: import("./expr/parser.js").AstNode} | {ok: false, error: {type: string, message: string, position: number}}}
 */
export function compileExpression(text) {
  const trimmed = typeof text === "string" ? text.trim() : "";
  if (!trimmed) {
    return {
      ok: false,
      error: {
        type: "syntax",
        message: "Escribe una función de x, p. ej. sin(x)",
        position: 0,
      },
    };
  }
  const parsed = parse(trimmed);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }
  return { ok: true, ast: parsed.value };
}

/**
 * Muestrea `f(x)` una vez por columna de píxel y devuelve una lista de
 * segmentos continuos. Los puntos no finitos (NaN/±Infinity o error de dominio)
 * rompen el segmento; un salto vertical mayor que la altura del canvas también
 * lo corta para evitar líneas verticales espurias en discontinuidades (p. ej.
 * `tan(x)`), según §5.2.
 *
 * @param {import("./expr/parser.js").AstNode} ast
 * @param {import("./coords.js").Viewport} viewport
 * @param {number} width - Ancho en píxeles CSS.
 * @param {number} height - Alto en píxeles CSS.
 * @param {{maxJumpPx?: number}} [options]
 * @returns {Array<Array<{x: number, y: number, px: number, py: number}>>}
 */
export function sampleCurve(ast, viewport, width, height, options = {}) {
  const maxJumpPx = Number.isFinite(options.maxJumpPx) ? options.maxJumpPx : height;
  const columns = Math.max(1, Math.floor(width));
  const segments = [];
  let current = [];
  let previousPy = null;

  const flush = () => {
    if (current.length > 0) {
      segments.push(current);
      current = [];
    }
    previousPy = null;
  };

  for (let px = 0; px < columns; px += 1) {
    const { x } = toMath(px, 0, viewport, width, height);
    const result = evaluate(ast, { x });
    if (!result.ok || !Number.isFinite(result.value)) {
      flush();
      continue;
    }
    const { py } = toPixels({ x, y: result.value }, viewport, width, height);
    if (!Number.isFinite(py)) {
      flush();
      continue;
    }
    if (previousPy !== null && Math.abs(py - previousPy) > maxJumpPx) {
      flush();
    }
    current.push({ x, y: result.value, px, py });
    previousPy = py;
  }
  flush();
  return segments;
}

/**
 * Ajusta el backing store del canvas al tamaño CSS y al devicePixelRatio para
 * que el dibujo se vea nítido (§5.1). El contexto queda escalado a píxeles CSS.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cssWidth
 * @param {number} cssHeight
 * @returns {number} El devicePixelRatio aplicado.
 */
function syncBackingStore(canvas, ctx, cssWidth, cssHeight) {
  const dpr = typeof window !== "undefined" && window.devicePixelRatio ? window.devicePixelRatio : 1;
  const backingWidth = Math.max(1, Math.round(cssWidth * dpr));
  const backingHeight = Math.max(1, Math.round(cssHeight * dpr));
  if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
    canvas.width = backingWidth;
    canvas.height = backingHeight;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return dpr;
}

/**
 * Dibuja la rejilla, los ejes y las marcas legibles.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {import("./coords.js").Viewport} viewport
 * @param {number} width
 * @param {number} height
 */
function drawGridAndAxes(ctx, viewport, width, height) {
  const xTarget = Math.max(2, Math.round(width / 80));
  const yTarget = Math.max(2, Math.round(height / 60));
  const xStep = niceStep(viewport.xMax - viewport.xMin, xTarget);
  const yStep = niceStep(viewport.yMax - viewport.yMin, yTarget);
  const xTicks = generateTicks(viewport.xMin, viewport.xMax, xTarget);
  const yTicks = generateTicks(viewport.yMin, viewport.yMax, yTarget);

  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(148, 163, 184, 0.15)";
  ctx.beginPath();
  for (const value of xTicks) {
    const { px } = toPixels({ x: value, y: 0 }, viewport, width, height);
    ctx.moveTo(px, 0);
    ctx.lineTo(px, height);
  }
  for (const value of yTicks) {
    const { py } = toPixels({ x: 0, y: value }, viewport, width, height);
    ctx.moveTo(0, py);
    ctx.lineTo(width, py);
  }
  ctx.stroke();

  const origin = toPixels({ x: 0, y: 0 }, viewport, width, height);
  const hasXAxis = origin.py >= 0 && origin.py <= height;
  const hasYAxis = origin.px >= 0 && origin.px <= width;
  const axisX = hasXAxis ? origin.py : Math.min(Math.max(origin.py, 0), height);
  const axisY = hasYAxis ? origin.px : Math.min(Math.max(origin.px, 0), width);

  ctx.strokeStyle = "rgba(148, 163, 184, 0.7)";
  ctx.beginPath();
  ctx.moveTo(0, axisX);
  ctx.lineTo(width, axisX);
  ctx.moveTo(axisY, 0);
  ctx.lineTo(axisY, height);
  ctx.stroke();

  ctx.fillStyle = "#94a3b8";
  ctx.font = "12px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
  ctx.textBaseline = "top";

  const xLabelY = Math.min(Math.max(axisX + 4, 2), height - 16);
  ctx.textAlign = "center";
  for (const value of xTicks) {
    if (value === 0) {
      continue;
    }
    const { px } = toPixels({ x: value, y: 0 }, viewport, width, height);
    ctx.fillText(formatTick(value, xStep), px, xLabelY);
  }

  const yLabelX = Math.min(Math.max(axisY - 6, 24), width - 4);
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (const value of yTicks) {
    if (value === 0) {
      continue;
    }
    const { py } = toPixels({ x: 0, y: value }, viewport, width, height);
    ctx.fillText(formatTick(value, yStep), yLabelX, py);
  }

  if (hasXAxis && hasYAxis) {
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.fillText("0", axisY - 4, axisX + 4);
  }
}

/**
 * Dibuja la curva a partir de los segmentos muestreados.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<Array<{px: number, py: number}>>} segments
 */
function drawCurve(ctx, segments) {
  ctx.strokeStyle = CURVE_COLOR;
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.fillStyle = CURVE_COLOR;

  for (const segment of segments) {
    if (segment.length === 0) {
      continue;
    }
    if (segment.length === 1) {
      const point = segment[0];
      ctx.beginPath();
      ctx.arc(point.px, point.py, 1.25, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    ctx.beginPath();
    ctx.moveTo(segment[0].px, segment[0].py);
    for (let i = 1; i < segment.length; i += 1) {
      ctx.lineTo(segment[i].px, segment[i].py);
    }
    ctx.stroke();
  }
}

/**
 * Monta el área del graficador dentro del contenedor dado.
 *
 * @param {HTMLElement} root - Sección `#graficador` donde se renderiza el canvas.
 * @returns {{canvas: HTMLCanvasElement, input: HTMLInputElement, destroy: () => void} | null}
 */
export function mountGrapher(root) {
  if (!root || typeof root.appendChild !== "function" || typeof document === "undefined") {
    return null;
  }

  const container = document.createElement("div");
  container.className = "graph";

  const field = document.createElement("div");
  field.className = "graph-field";

  const label = document.createElement("label");
  label.className = "graph-label";
  label.htmlFor = "graph-expr";
  label.textContent = "f(x) =";

  const input = document.createElement("input");
  input.id = "graph-expr";
  input.className = "graph-input";
  input.type = "text";
  input.autocomplete = "off";
  input.spellcheck = false;
  input.value = DEFAULT_EXPRESSION;
  input.setAttribute("aria-label", "Expresión de la función a graficar");

  field.append(label, input);

  const error = document.createElement("p");
  error.className = "graph-error";
  error.setAttribute("role", "alert");
  error.hidden = true;

  const wrap = document.createElement("div");
  wrap.className = "graph-canvas-wrap";

  const canvas = document.createElement("canvas");
  canvas.className = "graph-canvas";
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", "Gráfica de la función f(x)");

  wrap.append(canvas);
  container.append(field, error, wrap);
  root.appendChild(container);

  const ctx = canvas.getContext("2d");
  const state = {
    viewport: null,
    width: 0,
    height: 0,
    ast: null,
  };

  function setExpression(text) {
    const compiled = compileExpression(text);
    if (compiled.ok) {
      state.ast = compiled.ast;
      error.hidden = true;
      error.textContent = "";
    } else {
      state.ast = null;
      error.hidden = false;
      error.textContent = compiled.error.message;
    }
  }

  function draw() {
    const cssWidth = Math.max(1, Math.round(wrap.clientWidth || canvas.clientWidth || 640));
    const cssHeight = Math.max(1, Math.round(wrap.clientHeight || canvas.clientHeight || 360));

    if (!state.viewport) {
      state.viewport = createViewport(DEFAULT_X_MIN, DEFAULT_X_MAX, cssWidth, cssHeight);
    } else if (cssWidth !== state.width || cssHeight !== state.height) {
      state.viewport = fitViewportToSize(state.viewport, cssWidth, cssHeight);
    }
    state.width = cssWidth;
    state.height = cssHeight;

    syncBackingStore(canvas, ctx, cssWidth, cssHeight);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    drawGridAndAxes(ctx, state.viewport, cssWidth, cssHeight);

    if (state.ast) {
      const segments = sampleCurve(state.ast, state.viewport, cssWidth, cssHeight);
      drawCurve(ctx, segments);
    }
  }

  let rafId = 0;
  function requestDraw() {
    if (rafId) {
      return;
    }
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      draw();
    });
  }

  input.addEventListener("input", () => {
    setExpression(input.value);
    requestDraw();
  });

  let observer = null;
  if (typeof ResizeObserver === "function") {
    observer = new ResizeObserver(() => requestDraw());
    observer.observe(wrap);
  }

  setExpression(input.value);
  requestDraw();

  return {
    canvas,
    input,
    destroy() {
      if (observer) {
        observer.disconnect();
      }
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    },
  };
}
