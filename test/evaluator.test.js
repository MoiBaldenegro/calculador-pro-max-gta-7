import { test } from "node:test";
import assert from "node:assert/strict";

import { parse } from "../js/expr/parser.js";
import { evaluate } from "../js/expr/evaluator.js";

function compute(input, env) {
  const parsed = parse(input);
  assert.equal(parsed.ok, true, `parse(${input}) falló: ${JSON.stringify(parsed.error)}`);
  return evaluate(parsed.value, env);
}

function value(input, env) {
  const result = compute(input, env);
  assert.equal(result.ok, true, `eval(${input}) falló: ${JSON.stringify(result.error)}`);
  return result.value;
}

function domainError(input, env) {
  const result = compute(input, env);
  assert.equal(result.ok, false, `eval(${input}) debía fallar`);
  assert.equal(result.error.type, "domain");
  assert.equal(typeof result.error.message, "string");
  assert.equal(typeof result.error.position, "number");
  return result.error;
}

function approx(actual, expected, epsilon = 1e-12) {
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `esperaba ${expected} ± ${epsilon}, obtuve ${actual}`,
  );
}

test("evaluator: el módulo carga y exporta evaluate", () => {
  assert.equal(typeof evaluate, "function");
});

test("evaluator: precedencia 2+3*4 = 14", () => {
  assert.equal(value("2+3*4"), 14);
});

test("evaluator: ^ asociativo a la derecha 2^3^2 = 512", () => {
  assert.equal(value("2^3^2"), 512);
});

test("evaluator: menos unario -2^2 = -4 y (-2)^2 = 4", () => {
  assert.equal(value("-2^2"), -4);
  assert.equal(value("(-2)^2"), 4);
  assert.equal(value("2^-2"), 0.25);
});

test("evaluator: suma y resta con signos", () => {
  assert.equal(value("-2+3"), 1);
  assert.equal(value("2*-3"), -6);
  assert.equal(value("10-4-3"), 3);
});

test("evaluator: multiplicación y división explícitas", () => {
  assert.equal(value("6/2"), 3);
  assert.equal(value("2*3*4"), 24);
  assert.equal(value("2×3"), 6);
  assert.equal(value("6÷2"), 3);
});

test("evaluator: multiplicación implícita", () => {
  assert.equal(value("2(3+4)"), 14);
  assert.equal(value("(1+2)(3+4)"), 21);
  assert.equal(value("2x", { x: 5 }), 10);
  assert.equal(value("(x+1)(x-1)", { x: 3 }), 8);
  assert.equal(value("2sin(0)"), 0);
  assert.equal(value("3x^2", { x: 2 }), 12);
});

test("evaluator: funciones trigonométricas en radianes", () => {
  approx(value("sin(pi/2)"), 1);
  approx(value("sin(π/2)"), 1);
  approx(value("cos(0)"), 1);
  approx(value("tan(0)"), 0);
  approx(value("asin(1)"), Math.PI / 2);
  approx(value("acos(1)"), 0);
  approx(value("atan(1)"), Math.PI / 4);
});

test("evaluator: logaritmos, exponenciales, raíz y valor absoluto", () => {
  approx(value("log(100)"), 2);
  approx(value("ln(e)"), 1);
  approx(value("exp(0)"), 1);
  assert.equal(value("sqrt(9)"), 3);
  approx(value("sqrt(2)^2"), 2);
  assert.equal(value("√(16)"), 4);
  assert.equal(value("abs(-5)"), 5);
});

test("evaluator: constantes pi y e", () => {
  approx(value("pi"), Math.PI);
  approx(value("π"), Math.PI);
  approx(value("e"), Math.E);
});

test("evaluator: notación científica", () => {
  assert.equal(value("1e3"), 1000);
  approx(value("1.5e-2"), 0.015);
});

test("evaluator: división por cero devuelve error de dominio", () => {
  const error = domainError("1/0");
  assert.match(error.message, /cero/i);
  domainError("0/0");
});

test("evaluator: sqrt(-1) devuelve error de dominio", () => {
  domainError("sqrt(-1)");
  domainError("√(-4)");
});

test("evaluator: logaritmos fuera de dominio", () => {
  domainError("log(0)");
  domainError("ln(-1)");
  domainError("log(-5)");
});

test("evaluator: inversas fuera de dominio", () => {
  domainError("asin(2)");
  domainError("acos(-2)");
});

test("evaluator: potencia con resultado no definido", () => {
  domainError("(-1)^0.5");
});

test("evaluator: variable sin valor en el entorno es error de dominio", () => {
  const parsed = parse("x+1");
  assert.equal(parsed.ok, true);
  const result = evaluate(parsed.value);
  assert.equal(result.ok, false);
  assert.equal(result.error.type, "domain");
});

test("evaluator: entorno x se propaga en toda la expresión", () => {
  assert.equal(value("x^2 + 2x + 1", { x: 3 }), 16);
});

test("evaluator: una expresión con error de sintaxis no se evalúa", () => {
  const parsed = parse("2+");
  assert.equal(parsed.ok, false);
  assert.equal(parsed.error.type, "syntax");
});
