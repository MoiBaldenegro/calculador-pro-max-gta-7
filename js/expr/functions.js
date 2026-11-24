/**
 * Tabla de funciones y constantes soportadas por el motor de expresiones
 * (ver `docs/architecture.md` §4.3) y validación de dominio.
 *
 * Módulo puro, sin DOM. Se implementa en F2; en F1 solo se declaran las firmas.
 * Ángulos en radianes.
 */

/**
 * @typedef {Object} FunctionDef
 * @property {(x: number) => number} fn - Implementación de la función.
 * @property {(x: number) => boolean} [inDomain] - Validación de dominio opcional.
 */

/**
 * Tabla de funciones trigonométricas, logaritmos, raíces y valor absoluto.
 * Claves en minúsculas: `sin`, `cos`, `tan`, `asin`, `acos`, `atan`,
 * `log`, `ln`, `exp`, `sqrt`, `abs`.
 *
 * @returns {Record<string, FunctionDef>}
 */
export function getFunctions() {
  throw new Error("getFunctions no implementado todavía (F2)");
}

/**
 * Tabla de constantes: `pi` (y `π`) y `e`.
 *
 * @returns {Record<string, number>}
 */
export function getConstants() {
  throw new Error("getConstants no implementado todavía (F2)");
}
