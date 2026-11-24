/**
 * Transformaciones entre coordenadas matemáticas y píxeles, y gestión del
 * viewport (rango visible, zoom y paneo). Módulo puro: no toca el DOM ni dibuja.
 *
 * El viewport se guarda en coordenadas matemáticas `{ xMin, xMax, yMin, yMax }`
 * y la escala es uniforme (mismas unidades por píxel en X e Y) para no deformar
 * las curvas, según `docs/architecture.md` §5.1.
 *
 * @typedef {Object} Viewport
 * @property {number} xMin - Límite izquierdo en coordenadas matemáticas.
 * @property {number} xMax - Límite derecho en coordenadas matemáticas.
 * @property {number} yMin - Límite inferior en coordenadas matemáticas.
 * @property {number} yMax - Límite superior en coordenadas matemáticas.
 */

/**
 * Crea un viewport inicial a partir de un rango X y el tamaño del canvas,
 * derivando el rango Y del aspecto para mantener escala uniforme (§5.1).
 * El rango Y queda centrado en 0.
 *
 * @param {number} xMin
 * @param {number} xMax
 * @param {number} width - Ancho del canvas en píxeles CSS.
 * @param {number} height - Alto del canvas en píxeles CSS.
 * @returns {Viewport}
 */
export function createViewport(xMin, xMax, width, height) {
  const safeWidth = Number.isFinite(width) && width > 0 ? width : 1;
  const safeHeight = Number.isFinite(height) && height > 0 ? height : 1;
  const xSpan = xMax - xMin;
  const unitsPerPixel = xSpan / safeWidth;
  const ySpan = unitsPerPixel * safeHeight;
  return {
    xMin,
    xMax,
    yMin: -ySpan / 2,
    yMax: ySpan / 2,
  };
}

/**
 * Reajusta el viewport a un nuevo tamaño de canvas conservando el rango X y el
 * centro vertical, recalculando el rango Y para mantener la escala uniforme.
 * Se usa al redimensionar (§5.6).
 *
 * @param {Viewport} viewport
 * @param {number} width - Nuevo ancho en píxeles CSS.
 * @param {number} height - Nuevo alto en píxeles CSS.
 * @returns {Viewport}
 */
export function fitViewportToSize(viewport, width, height) {
  const safeWidth = Number.isFinite(width) && width > 0 ? width : 1;
  const safeHeight = Number.isFinite(height) && height > 0 ? height : 1;
  const xSpan = viewport.xMax - viewport.xMin;
  const unitsPerPixel = xSpan / safeWidth;
  const ySpan = unitsPerPixel * safeHeight;
  const yCenter = (viewport.yMin + viewport.yMax) / 2;
  return {
    xMin: viewport.xMin,
    xMax: viewport.xMax,
    yMin: yCenter - ySpan / 2,
    yMax: yCenter + ySpan / 2,
  };
}

/**
 * Convierte coordenadas matemáticas a píxeles del canvas.
 *
 * @param {{x: number, y: number}} point
 * @param {Viewport} viewport
 * @param {number} width
 * @param {number} height
 * @returns {{px: number, py: number}}
 */
export function toPixels(point, viewport, width, height) {
  const px = ((point.x - viewport.xMin) / (viewport.xMax - viewport.xMin)) * width;
  const py = height - ((point.y - viewport.yMin) / (viewport.yMax - viewport.yMin)) * height;
  return { px, py };
}

/**
 * Convierte píxeles del canvas a coordenadas matemáticas.
 *
 * @param {number} px
 * @param {number} py
 * @param {Viewport} viewport
 * @param {number} width
 * @param {number} height
 * @returns {{x: number, y: number}}
 */
export function toMath(px, py, viewport, width, height) {
  const x = viewport.xMin + (px / width) * (viewport.xMax - viewport.xMin);
  const y = viewport.yMin + ((height - py) / height) * (viewport.yMax - viewport.yMin);
  return { x, y };
}

/**
 * Aplica zoom anclado a un punto matemático (§5.3). Se implementa en F5.
 *
 * @param {Viewport} viewport
 * @param {number} factor - >1 acerca, <1 aleja.
 * @param {{x: number, y: number}} anchor - Punto que se mantiene fijo.
 * @returns {Viewport}
 */
export function zoomAt(viewport, factor, anchor) {
  throw new Error("zoomAt no implementado todavía (F5)");
}

/**
 * Desplaza el viewport un delta en coordenadas matemáticas (§5.4).
 * Se implementa en F5.
 *
 * @param {Viewport} viewport
 * @param {number} dx
 * @param {number} dy
 * @returns {Viewport}
 */
export function pan(viewport, dx, dy) {
  throw new Error("pan no implementado todavía (F5)");
}
