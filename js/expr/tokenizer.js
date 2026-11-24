/**
 * Tokenizador de expresiones: convierte el texto de entrada en una lista de
 * tokens (números, operadores, identificadores, paréntesis). No interpreta
 * semántica ni evalúa. Módulo puro, sin DOM.
 *
 * @typedef {Object} Token
 * @property {"number"|"operator"|"identifier"|"lparen"|"rparen"|"eof"} type
 * @property {string} value - Texto crudo del token (los operadores y símbolos
 *   unicode se normalizan a su equivalente ASCII/latino).
 * @property {number} position - Índice del carácter donde empieza.
 */

const WHITESPACE = new Set([" ", "\t", "\n", "\r", "\f", "\v"]);

function isDigit(ch) {
  return ch >= "0" && ch <= "9";
}

function isAlpha(ch) {
  return (ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z");
}

function syntaxError(message, position) {
  const error = new Error(message);
  error.name = "ExprSyntaxError";
  error.type = "syntax";
  error.position = position;
  return error;
}

/**
 * Convierte una expresión en tokens.
 *
 * Lanza un error con `position` cuando encuentra un carácter no válido; el
 * parser lo captura y lo convierte en un resultado tipado.
 *
 * @param {string} input - Texto de la expresión, p. ej. `"2x + sin(pi)"`.
 * @returns {Token[]} Lista de tokens terminada en un token `eof`.
 */
export function tokenize(input) {
  const text = typeof input === "string" ? input : String(input ?? "");
  const tokens = [];
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (WHITESPACE.has(ch)) {
      i += 1;
      continue;
    }

    // Símbolos unicode normalizados a tokens ASCII.
    if (ch === "×") {
      tokens.push({ type: "operator", value: "*", position: i });
      i += 1;
      continue;
    }
    if (ch === "÷") {
      tokens.push({ type: "operator", value: "/", position: i });
      i += 1;
      continue;
    }
    if (ch === "−") {
      tokens.push({ type: "operator", value: "-", position: i });
      i += 1;
      continue;
    }
    if (ch === "π") {
      tokens.push({ type: "identifier", value: "pi", position: i });
      i += 1;
      continue;
    }
    if (ch === "√") {
      tokens.push({ type: "identifier", value: "sqrt", position: i });
      i += 1;
      continue;
    }

    if (ch === "+" || ch === "-" || ch === "*" || ch === "/" || ch === "^") {
      tokens.push({ type: "operator", value: ch, position: i });
      i += 1;
      continue;
    }

    if (ch === "(") {
      tokens.push({ type: "lparen", value: "(", position: i });
      i += 1;
      continue;
    }
    if (ch === ")") {
      tokens.push({ type: "rparen", value: ")", position: i });
      i += 1;
      continue;
    }

    if (isDigit(ch) || (ch === "." && isDigit(text[i + 1]))) {
      const start = i;
      while (i < text.length && isDigit(text[i])) i += 1;
      if (text[i] === ".") {
        i += 1;
        while (i < text.length && isDigit(text[i])) i += 1;
      }
      // Notación científica: solo si «e/E» va seguida de dígitos (con signo opcional).
      if (text[i] === "e" || text[i] === "E") {
        let j = i + 1;
        if (text[j] === "+" || text[j] === "-") j += 1;
        if (isDigit(text[j])) {
          i = j;
          while (i < text.length && isDigit(text[i])) i += 1;
        }
      }
      tokens.push({ type: "number", value: text.slice(start, i), position: start });
      continue;
    }

    if (isAlpha(ch)) {
      const start = i;
      while (i < text.length && isAlpha(text[i])) i += 1;
      tokens.push({ type: "identifier", value: text.slice(start, i), position: start });
      continue;
    }

    throw syntaxError(`Carácter inválido «${ch}»`, i);
  }

  tokens.push({ type: "eof", value: "", position: text.length });
  return tokens;
}
