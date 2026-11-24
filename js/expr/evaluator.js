/**
 * Evaluador de AST: recorre un AST y devuelve un número, usando un entorno
 * `{ x }` y la tabla de funciones/constantes. No parsea ni toca el DOM.
 * Módulo puro. Formato de resultado según `docs/architecture.md` §4.4.
 *
 * Se implementa en F2; en F1 solo se declara la firma.
 */

/**
 * @typedef {Object} ExprError
 * @property {"syntax"|"domain"} type
 * @property {string} message - Mensaje en español para la UI.
 * @property {number} position - Índice del carácter problemático.
 */

/**
 * Evalúa un AST con un entorno opcional.
 *
 * @param {import("./parser.js").AstNode} ast
 * @param {{x?: number}} [env] - Entorno de variables (p. ej. `{ x: 2 }`).
 * @returns {{ok: true, value: number} | {ok: false, error: ExprError}}
 */
export function evaluate(ast, env = {}) {
  throw new Error("evaluate no implementado todavía (F2)");
}
