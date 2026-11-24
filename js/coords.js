/**
 * Transformaciones entre coordenadas matemáticas y píxeles, y gestión del
 * viewport (rango visible, zoom y paneo). Módulo puro: no toca el DOM ni dibuja.
 *
 * Se implementa en F4/F5. En F1 solo se declaran las firmas.
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
 *
 * @param {number} xMin
 * @param {number} xMax
 * @param {number} width - Ancho del canvas en píxeles CSS.
 * @param {number} height - Alto del canvas en píxeles CSS.
 * @returns {Viewport}
 */
export function createViewport(xMin, xMax, width, height) {
  throw new Error("createViewport no implementado todavía (F4)");
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
  throw new Error("toPixels no implementado todavía (F4)");
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
  throw new Error("toMath no implementado todavía (F4)");
}

/**
 * Aplica zoom anclado a un punto matemático (§5.3).
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
 *
 * @param {Viewport} viewport
 * @param {number} dx
 * @param {number} dy
 * @returns {Viewport}
 */
export function pan(viewport, dx, dy) {
  throw new Error("pan no implementado todavía (F5)");
}
