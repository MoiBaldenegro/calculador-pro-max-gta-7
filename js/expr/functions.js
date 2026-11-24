/**
 * Tabla de funciones y constantes soportadas por el motor de expresiones
 * (ver `docs/architecture.md` §4.3) y validación de dominio.
 *
 * Módulo puro, sin DOM. Ángulos en radianes.
 */

/**
 * @typedef {Object} FunctionDef
 * @property {(x: number) => number} fn - Implementación de la función.
 * @property {(x: number) => boolean} [inDomain] - Validación de dominio opcional.
 */

const FUNCTIONS = {
  sin: { fn: (x) => Math.sin(x) },
  cos: { fn: (x) => Math.cos(x) },
  tan: { fn: (x) => Math.tan(x) },
  asin: {
    fn: (x) => Math.asin(x),
    inDomain: (x) => x >= -1 && x <= 1,
  },
  acos: {
    fn: (x) => Math.acos(x),
    inDomain: (x) => x >= -1 && x <= 1,
  },
  atan: { fn: (x) => Math.atan(x) },
  log: {
    fn: (x) => Math.log(x) / Math.LN10,
    inDomain: (x) => x > 0,
  },
  ln: {
    fn: (x) => Math.log(x),
    inDomain: (x) => x > 0,
  },
  exp: { fn: (x) => Math.exp(x) },
  sqrt: {
    fn: (x) => Math.sqrt(x),
    inDomain: (x) => x >= 0,
  },
  abs: { fn: (x) => Math.abs(x) },
};

const CONSTANTS = {
  pi: Math.PI,
  e: Math.E,
  "π": Math.PI,
};

/**
 * Tabla de funciones trigonométricas, logaritmos, raíces y valor absoluto.
 * Claves en minúsculas: `sin`, `cos`, `tan`, `asin`, `acos`, `atan`,
 * `log`, `ln`, `exp`, `sqrt`, `abs`.
 *
 * @returns {Record<string, FunctionDef>}
 */
export function getFunctions() {
  return FUNCTIONS;
}

/**
 * Tabla de constantes: `pi` (y `π`) y `e`.
 *
 * @returns {Record<string, number>}
 */
export function getConstants() {
  return CONSTANTS;
}
