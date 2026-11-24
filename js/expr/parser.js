/**
 * Parser de descenso recursivo: convierte tokens en un AST, validando la
 * gramática y la precedencia descritas en `docs/architecture.md` §4.2.
 * No evalúa ni toca el DOM. Módulo puro.
 *
 * Gramática implementada (precedencia de menor a mayor):
 *
 *   expression := term (('+' | '-') term)*
 *   term       := unary (('*' | '/') unary | <producto implícito>)*
 *   unary      := ('-' | '+') unary | power
 *   power      := primary ('^' unary)?          # asociativo a la derecha
 *   primary    := number | constant | variable
 *               | function '(' expression ')' | '(' expression ')'
 *
 * La multiplicación implícita (`2x`, `2sin(x)`, `(x+1)(x-1)`, `3(x+2)`) se
 * resuelve en `term` insertando un nodo `*` cuando un token de valor sigue a
 * otro de valor.
 *
 * @typedef {Object} AstNode
 * @property {string} type - Tipo de nodo: `number`, `constant`, `variable`,
 *   `unary`, `binary`, `call`.
 * @property {*} [value] - Valor o nombre según el tipo de nodo.
 * @property {AstNode} [left] - Hijo izquierdo (operadores binarios).
 * @property {AstNode} [right] - Hijo derecho (operadores binarios).
 * @property {AstNode} [argument] - Argumento (unario).
 * @property {AstNode[]} [args] - Argumentos (llamadas a función).
 * @property {number} [position] - Índice del carácter asociado al nodo.
 */

import { tokenize } from "./tokenizer.js";
import { getConstants, getFunctions } from "./functions.js";

class ParseError extends Error {
  /**
   * @param {string} message
   * @param {number} position
   */
  constructor(message, position) {
    super(message);
    this.name = "ParseError";
    this.position = position;
  }
}

function isValueStart(token) {
  return token.type === "number" || token.type === "identifier" || token.type === "lparen";
}

/**
 * Construye el AST de una expresión.
 *
 * @param {string} input - Texto de la expresión.
 * @returns {{ok: true, value: AstNode} | {ok: false, error: {type: string, message: string, position: number}}}
 */
export function parse(input) {
  let tokens;
  try {
    tokens = tokenize(input);
  } catch (error) {
    return {
      ok: false,
      error: {
        type: "syntax",
        message: error && error.message ? error.message : "Error de sintaxis",
        position: typeof error?.position === "number" ? error.position : 0,
      },
    };
  }

  const constants = getConstants();
  const functions = getFunctions();
  let index = 0;

  const peek = () => tokens[index];
  const advance = () => tokens[index++];

  function parseExpression() {
    let left = parseTerm();
    for (;;) {
      const token = peek();
      if (token.type === "operator" && (token.value === "+" || token.value === "-")) {
        advance();
        const right = parseTerm();
        left = { type: "binary", value: token.value, left, right, position: token.position };
      } else {
        break;
      }
    }
    return left;
  }

  function parseTerm() {
    let left = parseUnary();
    for (;;) {
      const token = peek();
      if (token.type === "operator" && (token.value === "*" || token.value === "/")) {
        advance();
        const right = parseUnary();
        left = { type: "binary", value: token.value, left, right, position: token.position };
      } else if (isValueStart(token)) {
        const right = parseUnary();
        left = { type: "binary", value: "*", left, right, position: token.position };
      } else {
        break;
      }
    }
    return left;
  }

  function parseUnary() {
    const token = peek();
    if (token.type === "operator" && (token.value === "-" || token.value === "+")) {
      advance();
      const argument = parseUnary();
      return { type: "unary", value: token.value, argument, position: token.position };
    }
    return parsePower();
  }

  function parsePower() {
    const base = parsePrimary();
    const token = peek();
    if (token.type === "operator" && token.value === "^") {
      advance();
      const exponent = parseUnary();
      return { type: "binary", value: "^", left: base, right: exponent, position: token.position };
    }
    return base;
  }

  function parsePrimary() {
    const token = peek();

    if (token.type === "number") {
      advance();
      const value = Number(token.value);
      if (!Number.isFinite(value)) {
        throw new ParseError(`Número inválido «${token.value}»`, token.position);
      }
      return { type: "number", value, position: token.position };
    }

    if (token.type === "lparen") {
      advance();
      const inner = parseExpression();
      const close = peek();
      if (close.type !== "rparen") {
        throw new ParseError("Paréntesis sin cerrar", token.position);
      }
      advance();
      return inner;
    }

    if (token.type === "identifier") {
      const name = token.value.toLowerCase();

      if (Object.prototype.hasOwnProperty.call(constants, name)) {
        advance();
        return { type: "constant", value: name, position: token.position };
      }

      if (name === "x") {
        advance();
        return { type: "variable", value: "x", position: token.position };
      }

      if (Object.prototype.hasOwnProperty.call(functions, name)) {
        advance();
        const open = peek();
        if (open.type !== "lparen") {
          throw new ParseError(`Se esperaba «(» después de la función «${token.value}»`, token.position);
        }
        advance();
        const argument = parseExpression();
        const close = peek();
        if (close.type !== "rparen") {
          throw new ParseError("Paréntesis sin cerrar", open.position);
        }
        advance();
        return { type: "call", value: name, args: [argument], position: token.position };
      }

      if (peekAt(1)?.type === "lparen") {
        throw new ParseError(`Función desconocida «${token.value}»`, token.position);
      }
      throw new ParseError(`Identificador desconocido «${token.value}»`, token.position);
    }

    if (token.type === "eof") {
      throw new ParseError("Expresión vacía", token.position);
    }

    throw new ParseError(`Token inesperado «${token.value || token.type}»`, token.position);
  }

  function peekAt(offset) {
    return tokens[index + offset];
  }

  try {
    const ast = parseExpression();
    const trailing = peek();
    if (trailing.type !== "eof") {
      throw new ParseError(`Token inesperado «${trailing.value || trailing.type}»`, trailing.position);
    }
    return { ok: true, value: ast };
  } catch (error) {
    if (error instanceof ParseError) {
      return {
        ok: false,
        error: { type: "syntax", message: error.message, position: error.position },
      };
    }
    return {
      ok: false,
      error: {
        type: "syntax",
        message: error && error.message ? error.message : "Error de sintaxis",
        position: peek().position,
      },
    };
  }
}
