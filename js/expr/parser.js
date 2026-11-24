/**
 * Parser de descenso recursivo: convierte tokens en un AST, validando la
 * gramática y la precedencia descritas en `docs/architecture.md` §4.2.
 * No evalúa ni toca el DOM. Módulo puro.
 *
 * Se implementa en F2; en F1 solo se declara la firma.
 *
 * @typedef {Object} AstNode
 * @property {string} type - Tipo de nodo: `number`, `constant`, `variable`,
 *   `unary`, `binary`, `call`.
 * @property {*} [value] - Valor o nombre según el tipo de nodo.
 * @property {AstNode} [left] - Hijo izquierdo (operadores binarios).
 * @property {AstNode} [right] - Hijo derecho (operadores binarios).
 * @property {AstNode} [argument] - Argumento (unario).
 * @property {AstNode[]} [args] - Argumentos (llamadas a función).
 */

/**
 * Construye el AST de una expresión.
 *
 * @param {string} input - Texto de la expresión.
 * @returns {{ok: true, value: AstNode} | {ok: false, error: {type: string, message: string, position: number}}}
 */
export function parse(input) {
  throw new Error("parse no implementado todavía (F2)");
}
