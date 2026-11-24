/**
 * Controlador + vista del graficador de funciones `f(x)`.
 *
 * Capa de UI: la única que toca el Canvas. El dibujo de ejes, la rejilla, el
 * muestreo por píxel, el corte de discontinuidades y el redibujado en resize se
 * implementan en F4; el zoom anclado al cursor, el paneo con Pointer Events y la
 * lista de múltiples funciones con colores y leyenda en F5.
 *
 * Las funciones puras (`niceStep`, `generateTicks`, `formatTick`,
 * `compileExpression`, `sampleCurve`, `pickColor`, `createFunctionEntry` y las
 * operaciones de lista `addFunction`/`removeFunction`/`toggleVisibility`/
 * `visibleFunctions`) se exportan para poder testearlas en Node sin navegador;
 * `mountGrapher` es lo único que toca el DOM/Canvas.
 */

import { parse } from "./expr/parser.js";
import { evaluate } from "./expr/evaluator.js";
import {
  createViewport,
  fitViewportToSize,
  toPixels,
  toMath,
  viewportCenter,
  zoomAt,
  pan,
} from "./coords.js";

const DEFAULT_EXPRESSION = "sin(x)";
const DEFAULT_X_MIN = -10;
const DEFAULT_X_MAX = 10;
const ZOOM_FACTOR = 1.25;
const WHEEL_ZOOM_FACTOR = 1.1;

/**
 * Paleta de colores para las funciones, asignada de forma cíclica (§5.5).
 * Colores distinguibles sobre el fondo oscuro y entre sí.
 */
export const CURVE_COLORS = [
  "#38bdf8",
  "#f472b6",
  "#a3e635",
  "#fbbf24",
  "#c084fc",
  "#fb7185",
  "#2dd4bf",
  "#f97316",
];

/**
 * Elige un color para una función nueva evitando repetir los ya usados. Si toda
 * la paleta está en uso, cae en asignación cíclica por `seed` (§5.5).
 *
 * @param {string[]} [usedColors=[]] - Colores ya asignados.
 * @param {number} [seed=0] - Contador para la asignación cíclica de reserva.
 * @returns {string} Color en formato CSS.
 */
export function pickColor(usedColors = [], seed = 0) {
  const used = new Set(Array.isArray(usedColors) ? usedColors : []);
  for (const color of CURVE_COLORS) {
    if (!used.has(color)) {
      return color;
    }
  }
  const length = CURVE_COLORS.length;
  const raw = Number.isFinite(seed) ? Math.trunc(seed) : 0;
  const index = ((raw % length) + length) % length;
  return CURVE_COLORS[index];
}

/**
 * Crea una entrada de función compilando su expresión. Nunca lanza: si la
 * expresión es inválida, `ast` queda en `null` y `error` guarda el detalle.
 *
 * @param {string} text
 * @param {string} color
 * @param {number|string} id
 * @returns {{id: number|string, text: string, ast: import("./expr/parser.js").AstNode|null, error: {type: string, message: string, position: number}|null, color: string, visible: boolean, touched: boolean}}
 */
export function createFunctionEntry(text, color, id) {
  const source = typeof text === "string" ? text : "";
  const compiled = compileExpression(source);
  return {
    id,
    text: source,
    ast: compiled.ok ? compiled.ast : null,
    error: compiled.ok ? null : compiled.error,
    color,
    visible: true,
    touched: source.trim().length > 0,
  };
}

/**
 * Devuelve una nueva lista con la entrada añadida (no muta la original).
 *
 * @template T
 * @param {T[]} list
 * @param {T} entry
 * @returns {T[]}
 */
export function addFunction(list, entry) {
  return [...(Array.isArray(list) ? list : []), entry];
}

/**
 * Devuelve una nueva lista sin la entrada con ese `id` (no muta la original).
 *
 * @template {{id: number|string}} T
 * @param {T[]} list
 * @param {number|string} id
 * @returns {T[]}
 */
export function removeFunction(list, id) {
  return (Array.isArray(list) ? list : []).filter((entry) => entry.id !== id);
}

/**
 * Devuelve una nueva lista con la visibilidad de una entrada invertida.
 *
 * @template {{id: number|string, visible: boolean}} T
 * @param {T[]} list
 * @param {number|string} id
 * @returns {T[]}
 */
export function toggleVisibility(list, id) {
  return (Array.isArray(list) ? list : []).map((entry) =>
    entry.id === id ? { ...entry, visible: !entry.visible } : entry,
  );
}

/**
 * Filtra las entradas visibles y con expresión válida, que son las que se
 * dibujan en cada frame.
 *
 * @template {{visible: boolean, ast: unknown}} T
 * @param {T[]} list
 * @returns {T[]}
 */
export function visibleFunctions(list) {
  return (Array.isArray(list) ? list : []).filter(
    (entry) => entry.visible && entry.ast,
  );
}

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
 * Dibuja una curva a partir de los segmentos muestreados, con su color.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<Array<{px: number, py: number}>>} segments
 * @param {string} [color="#38bdf8"]
 */
function drawCurve(ctx, segments, color = CURVE_COLORS[0]) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.fillStyle = color;

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
 * Monta el área del graficador dentro del contenedor dado: lista de funciones
 * con colores, botón de añadir, canvas con zoom (rueda y botones) y paneo
 * (Pointer Events), y leyenda. Devuelve las referencias principales y un
 * `destroy` que libera observadores y listeners.
 *
 * @param {HTMLElement} root - Sección `#graficador` donde se renderiza el canvas.
 * @returns {{canvas: HTMLCanvasElement, input: HTMLInputElement|null, destroy: () => void} | null}
 */
export function mountGrapher(root) {
  if (!root || typeof root.appendChild !== "function" || typeof document === "undefined") {
    return null;
  }

  const container = document.createElement("div");
  container.className = "graph";

  const list = document.createElement("div");
  list.className = "graph-fn-list";
  list.setAttribute("role", "group");
  list.setAttribute("aria-label", "Funciones a graficar");

  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.className = "graph-add";
  addButton.textContent = "+ Añadir función";

  const wrap = document.createElement("div");
  wrap.className = "graph-canvas-wrap";

  const canvas = document.createElement("canvas");
  canvas.className = "graph-canvas";
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", "Gráfica de las funciones f(x)");

  const zoomControls = document.createElement("div");
  zoomControls.className = "graph-zoom";

  const zoomIn = document.createElement("button");
  zoomIn.type = "button";
  zoomIn.className = "graph-zoom-btn";
  zoomIn.textContent = "+";
  zoomIn.setAttribute("aria-label", "Acercar");

  const zoomOut = document.createElement("button");
  zoomOut.type = "button";
  zoomOut.className = "graph-zoom-btn";
  zoomOut.textContent = "−";
  zoomOut.setAttribute("aria-label", "Alejar");

  const zoomReset = document.createElement("button");
  zoomReset.type = "button";
  zoomReset.className = "graph-zoom-btn";
  zoomReset.textContent = "⟲";
  zoomReset.setAttribute("aria-label", "Reiniciar vista");

  zoomControls.append(zoomIn, zoomOut, zoomReset);
  wrap.append(canvas, zoomControls);

  const legend = document.createElement("ul");
  legend.className = "graph-legend";
  legend.setAttribute("aria-label", "Leyenda de funciones");

  container.append(list, addButton, wrap, legend);
  root.appendChild(container);

  const ctx = canvas.getContext("2d");
  const state = {
    viewport: null,
    width: 0,
    height: 0,
    functions: [],
    nextId: 1,
  };
  const rows = new Map();
  let firstInput = null;

  function updateEntry(id, patch) {
    const entry = state.functions.find((item) => item.id === id);
    if (!entry) {
      return;
    }
    Object.assign(entry, patch);
    if (Object.prototype.hasOwnProperty.call(patch, "text")) {
      const compiled = compileExpression(entry.text);
      entry.ast = compiled.ok ? compiled.ast : null;
      entry.error = compiled.ok ? null : compiled.error;
    }
    if (Object.prototype.hasOwnProperty.call(patch, "text") || entry.touched) {
      entry.touched = true;
    }
    refreshRow(entry);
    renderLegend();
    requestDraw();
  }

  function refreshRow(entry) {
    const refs = rows.get(entry.id);
    if (!refs) {
      return;
    }
    refs.row.style.setProperty("--fn-color", entry.color);
    refs.row.classList.toggle("is-hidden", !entry.visible);
    refs.toggle.textContent = entry.visible ? "Ocultar" : "Mostrar";
    refs.toggle.setAttribute("aria-pressed", entry.visible ? "false" : "true");
    refs.toggle.setAttribute(
      "aria-label",
      entry.visible ? "Ocultar función" : "Mostrar función",
    );
    const showError = Boolean(entry.error) && entry.touched;
    refs.error.hidden = !showError;
    refs.error.textContent = showError ? entry.error.message : "";
    refs.input.classList.toggle("is-invalid", showError);
  }

  function createRow(entry) {
    const row = document.createElement("div");
    row.className = "graph-fn";
    row.style.setProperty("--fn-color", entry.color);

    const swatch = document.createElement("span");
    swatch.className = "graph-fn-swatch";
    swatch.setAttribute("aria-hidden", "true");

    const controls = document.createElement("div");
    controls.className = "graph-fn-controls";

    const input = document.createElement("input");
    input.className = "graph-input graph-fn-input";
    input.type = "text";
    input.autocomplete = "off";
    input.spellcheck = false;
    input.value = entry.text;
    input.placeholder = "p. ej. x^2";
    input.setAttribute("aria-label", `Expresión de la función ${entry.id}`);

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "graph-fn-btn";
    toggle.addEventListener("click", () => {
      state.functions = toggleVisibility(state.functions, entry.id);
      const updated = state.functions.find((item) => item.id === entry.id);
      if (updated) {
        refreshRow(updated);
      }
      renderLegend();
      requestDraw();
    });

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "graph-fn-btn graph-fn-remove";
    remove.textContent = "×";
    remove.setAttribute("aria-label", "Quitar función");
    remove.addEventListener("click", () => removeEntry(entry.id));

    controls.append(input, toggle, remove);

    const error = document.createElement("p");
    error.className = "graph-error graph-fn-error";
    error.setAttribute("role", "alert");
    error.hidden = true;

    row.append(swatch, controls, error);

    input.addEventListener("input", () => {
      updateEntry(entry.id, { text: input.value });
    });

    rows.set(entry.id, { row, input, toggle, error });
    list.appendChild(row);
    if (!firstInput) {
      firstInput = input;
    }
    refreshRow(entry);
  }

  function addEntry(text) {
    const id = state.nextId;
    state.nextId += 1;
    const color = pickColor(
      state.functions.map((entry) => entry.color),
      id,
    );
    const entry = createFunctionEntry(text, color, id);
    state.functions = addFunction(state.functions, entry);
    createRow(entry);
    renderLegend();
    requestDraw();
    return entry;
  }

  function removeEntry(id) {
    const refs = rows.get(id);
    if (refs) {
      refs.row.remove();
      rows.delete(id);
    }
    state.functions = removeFunction(state.functions, id);
    if (firstInput && refs && refs.input === firstInput) {
      const next = rows.values().next();
      firstInput = next.done ? null : next.value.input;
    }
    renderLegend();
    requestDraw();
  }

  function renderLegend() {
    legend.textContent = "";
    for (const entry of state.functions) {
      const item = document.createElement("li");
      item.className = "graph-legend-item";
      item.classList.toggle("is-hidden", !entry.visible);

      const dot = document.createElement("span");
      dot.className = "graph-legend-swatch";
      dot.style.background = entry.color;
      dot.setAttribute("aria-hidden", "true");

      const label = document.createElement("span");
      label.className = "graph-legend-expr";
      const name = entry.text.trim() || "…";
      label.textContent = `f(x) = ${name}`;

      item.append(dot, label);
      legend.appendChild(item);
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

    for (const entry of visibleFunctions(state.functions)) {
      const segments = sampleCurve(entry.ast, state.viewport, cssWidth, cssHeight);
      drawCurve(ctx, segments, entry.color);
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

  function pointerToCanvas(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      px: event.clientX - rect.left,
      py: event.clientY - rect.top,
    };
  }

  function applyZoom(factor, anchor) {
    if (!state.viewport) {
      return;
    }
    state.viewport = zoomAt(state.viewport, factor, anchor);
    requestDraw();
  }

  function zoomAtCenter(factor) {
    if (!state.viewport) {
      return;
    }
    applyZoom(factor, viewportCenter(state.viewport));
  }

  function resetView() {
    const width = state.width || Math.max(1, Math.round(wrap.clientWidth || 640));
    const height = state.height || Math.max(1, Math.round(wrap.clientHeight || 360));
    state.viewport = createViewport(DEFAULT_X_MIN, DEFAULT_X_MAX, width, height);
    requestDraw();
  }

  function onWheel(event) {
    if (!state.viewport) {
      return;
    }
    event.preventDefault();
    const { px, py } = pointerToCanvas(event);
    const anchor = toMath(px, py, state.viewport, state.width, state.height);
    const factor = event.deltaY < 0 ? WHEEL_ZOOM_FACTOR : 1 / WHEEL_ZOOM_FACTOR;
    applyZoom(factor, anchor);
  }

  let drag = null;

  function onPointerDown(event) {
    if (!state.viewport || event.button !== 0) {
      return;
    }
    if (drag) {
      return;
    }
    const { px, py } = pointerToCanvas(event);
    drag = { pointerId: event.pointerId, px, py };
    canvas.classList.add("is-panning");
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      /* setPointerCapture puede no estar disponible en navegadores antiguos */
    }
  }

  function onPointerMove(event) {
    if (!drag || drag.pointerId !== event.pointerId || !state.viewport) {
      return;
    }
    const { px, py } = pointerToCanvas(event);
    const dxPx = px - drag.px;
    const dyPx = py - drag.py;
    if (dxPx === 0 && dyPx === 0) {
      return;
    }
    drag.px = px;
    drag.py = py;
    const unitsPerPxX = (state.viewport.xMax - state.viewport.xMin) / state.width;
    const unitsPerPxY = (state.viewport.yMax - state.viewport.yMin) / state.height;
    state.viewport = pan(
      state.viewport,
      -dxPx * unitsPerPxX,
      dyPx * unitsPerPxY,
    );
    requestDraw();
  }

  function endDrag(event) {
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }
    drag = null;
    canvas.classList.remove("is-panning");
    try {
      canvas.releasePointerCapture(event.pointerId);
    } catch {
      /* liberar la captura puede fallar si el puntero ya se soltó */
    }
  }

  function onKeyDown(event) {
    if (!state.viewport) {
      return;
    }
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      zoomAtCenter(ZOOM_FACTOR);
    } else if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      zoomAtCenter(1 / ZOOM_FACTOR);
    } else if (event.key === "0") {
      event.preventDefault();
      resetView();
    }
  }

  addButton.addEventListener("click", () => {
    const entry = addEntry("");
    const refs = rows.get(entry.id);
    if (refs) {
      refs.input.focus();
    }
  });

  zoomIn.addEventListener("click", () => zoomAtCenter(ZOOM_FACTOR));
  zoomOut.addEventListener("click", () => zoomAtCenter(1 / ZOOM_FACTOR));
  zoomReset.addEventListener("click", resetView);

  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
  canvas.addEventListener("lostpointercapture", endDrag);
  canvas.addEventListener("keydown", onKeyDown);
  if (!canvas.hasAttribute("tabindex")) {
    canvas.tabIndex = 0;
  }

  let observer = null;
  if (typeof ResizeObserver === "function") {
    observer = new ResizeObserver(() => requestDraw());
    observer.observe(wrap);
  }

  addEntry(DEFAULT_EXPRESSION);
  requestDraw();

  return {
    canvas,
    input: firstInput,
    destroy() {
      if (observer) {
        observer.disconnect();
      }
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", endDrag);
      canvas.removeEventListener("pointercancel", endDrag);
      canvas.removeEventListener("lostpointercapture", endDrag);
      canvas.removeEventListener("keydown", onKeyDown);
      container.remove();
    },
  };
}
