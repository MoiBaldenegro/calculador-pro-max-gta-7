/**
 * Evaluador de AST: recorre un AST y devuelve un número, usando un entorno
 * `{ x }` y la tabla de funciones/constantes. No parsea ni toca el DOM.
 * Módulo puro. Formato de resultado según `docs/architecture.md` §4.4.
 */

import { getConstants, getFunctions } from "./functions.js";

/**
 * @typedef {Object} ExprError
 * @property {"syntax"|"domain"} type
 * @property {string} message - Mensaje en español para la UI.
 * @property {number} position - Índice del carácter problemático.
 */

function fail(type, message, position) {
  return { ok: false, error: { type, message, position } };
}

function finite(value, position) {
  if (Number.isFinite(value)) {
    return { ok: true, value };
  }
  return fail("domain", "Resultado no definido", position);
}

/**
 * Evalúa un AST con un entorno opcional.
 *
 * @param {import("./parser.js").AstNode} ast
 * @param {{x?: number}} [env] - Entorno de variables (p. ej. `{ x: 2 }`).
 * @returns {{ok: true, value: number} | {ok: false, error: ExprError}}
 */
export function evaluate(ast, env = {}) {
  const constants = getConstants();
  const functions = getFunctions();
  const environment = env && typeof env === "object" ? env : {};

  function applyBinary(operator, a, b, position) {
    switch (operator) {
      case "+":
        return finite(a + b, position);
      case "-":
        return finite(a - b, position);
      case "*":
        return finite(a * b, position);
      case "/":
        if (b === 0) {
          return fail("domain", "División por cero", position);
        }
        return finite(a / b, position);
      case "^": {
        const value = Math.pow(a, b);
        if (Number.isNaN(value)) {
          return fail("domain", "Resultado no definido", position);
        }
        return finite(value, position);
      }
      default:
        return fail("syntax", `Operador desconocido «${operator}»`, position);
    }
  }

  function evaluateNode(node) {
    if (!node || typeof node.type !== "string") {
      return fail("syntax", "Árbol de expresión inválido", 0);
    }

    switch (node.type) {
      case "number":
        return finite(node.value, node.position ?? 0);

      case "constant": {
        const value = constants[node.value];
        if (typeof value !== "number") {
          return fail("syntax", `Constante desconocida «${node.value}»`, node.position ?? 0);
        }
        return { ok: true, value };
      }

      case "variable": {
        if (Object.prototype.hasOwnProperty.call(environment, node.value)) {
          const value = environment[node.value];
          if (typeof value === "number" && !Number.isNaN(value)) {
            return { ok: true, value };
          }
        }
        return fail("domain", `La variable «${node.value}» no tiene valor`, node.position ?? 0);
      }

      case "unary": {
        const argument = evaluateNode(node.argument);
        if (!argument.ok) {
          return argument;
        }
        return { ok: true, value: node.value === "-" ? -argument.value : argument.value };
      }

      case "binary": {
        const left = evaluateNode(node.left);
        if (!left.ok) {
          return left;
        }
        const right = evaluateNode(node.right);
        if (!right.ok) {
          return right;
        }
        return applyBinary(node.value, left.value, right.value, node.position ?? 0);
      }

      case "call": {
        const definition = functions[node.value];
        if (!definition) {
          return fail("syntax", `Función desconocida «${node.value}»`, node.position ?? 0);
        }
        const args = [];
        for (const argNode of node.args ?? []) {
          const argument = evaluateNode(argNode);
          if (!argument.ok) {
            return argument;
          }
          args.push(argument.value);
        }
        const argument = args[0];
        if (typeof definition.inDomain === "function" && !definition.inDomain(argument)) {
          return fail(
            "domain",
            `Resultado no definido: «${node.value}(${argument})»`,
            node.position ?? 0,
          );
        }
        const value = definition.fn(argument);
        return finite(value, node.position ?? 0);
      }

      default:
        return fail("syntax", `Tipo de nodo desconocido «${node.type}»`, node.position ?? 0);
    }
  }

  return evaluateNode(ast);
}
