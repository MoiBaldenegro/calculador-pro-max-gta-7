/**
 * Tokenizador de expresiones: convierte el texto de entrada en una lista de
 * tokens (números, operadores, identificadores, paréntesis). No interpreta
 * semántica ni evalúa. Módulo puro, sin DOM.
 *
 * Se implementa en F2; en F1 solo se declara la firma.
 *
 * @typedef {Object} Token
 * @property {"number"|"operator"|"identifier"|"lparen"|"rparen"|"eof"} type
 * @property {string} value - Texto crudo del token.
 * @property {number} position - Índice del carácter donde empieza.
 */

/**
 * Convierte una expresión en tokens.
 *
 * @param {string} input - Texto de la expresión, p. ej. `"2x + sin(pi)"`.
 * @returns {Token[]} Lista de tokens terminada en un token `eof`.
 */
export function tokenize(input) {
  throw new Error("tokenize no implementado todavía (F2)");
}
