import { test } from "node:test";
import assert from "node:assert/strict";

import {
  HISTORY_LIMIT,
  compute,
  createHistory,
  deleteBefore,
  formatResult,
  insertAt,
  pushHistory,
} from "../js/calculator.js";

test("calculator: el módulo carga y exporta sus funciones", () => {
  assert.equal(typeof compute, "function");
  assert.equal(typeof formatResult, "function");
  assert.equal(typeof insertAt, "function");
  assert.equal(typeof deleteBefore, "function");
  assert.equal(typeof createHistory, "function");
  assert.equal(typeof pushHistory, "function");
});

test("calculator: compute resuelve las operaciones del punto 2 de la visión", () => {
  const cases = [
    ["2+3*4", 14],
    ["10−4", 6],
    ["6÷3", 2],
    ["2×3", 6],
    ["2^3^2", 512],
    ["√(16)", 4],
    ["sqrt(9)", 3],
    ["sin(0)", 0],
    ["cos(0)", 1],
    ["tan(0)", 0],
    ["log(100)", 2],
    ["ln(e)", 1],
    ["exp(0)", 1],
    ["π", Math.PI],
    ["e", Math.E],
    ["(2+3)×2", 10],
  ];
  for (const [input, expected] of cases) {
    const result = compute(input);
    assert.equal(result.ok, true, `compute(${input}) falló: ${JSON.stringify(result.error)}`);
    assert.ok(
      Math.abs(result.value - expected) < 1e-9,
      `compute(${input}) = ${result.value}, esperaba ${expected}`,
    );
  }
});

test("calculator: compute informa errores de sintaxis con mensaje en español", () => {
  const result = compute("2+");
  assert.equal(result.ok, false);
  assert.equal(result.error.type, "syntax");
  assert.equal(typeof result.error.message, "string");
  assert.ok(result.error.message.length > 0);

  const invalid = compute("2%3");
  assert.equal(invalid.ok, false);
  assert.equal(invalid.error.type, "syntax");
});

test("calculator: compute informa errores de dominio sin lanzar", () => {
  const division = compute("1/0");
  assert.equal(division.ok, false);
  assert.equal(division.error.type, "domain");
  assert.match(division.error.message, /cero/i);

  const sqrt = compute("sqrt(-1)");
  assert.equal(sqrt.ok, false);
  assert.equal(sqrt.error.type, "domain");
});

test("calculator: compute con expresión vacía devuelve error de sintaxis", () => {
  const result = compute("   ");
  assert.equal(result.ok, false);
  assert.equal(result.error.type, "syntax");
  assert.match(result.error.message, /vacía/i);
});

test("calculator: formatResult redondea y evita artefactos de coma flotante", () => {
  assert.equal(formatResult(14), "14");
  assert.equal(formatResult(0.30000000000000004), "0.3");
  assert.equal(formatResult(1 / 3), "0.333333333333");
  assert.equal(formatResult(-0), "0");
  assert.equal(formatResult(1000), "1000");
});

test("calculator: insertAt respeta cursor y selección", () => {
  assert.deepEqual(insertAt("23", 1, 1, "+"), { value: "2+3", caret: 2 });
  assert.deepEqual(insertAt("2+3", 0, 3, "9"), { value: "9", caret: 1 });
  assert.deepEqual(insertAt("", 0, 0, "sin("), { value: "sin(", caret: 4 });
  assert.deepEqual(insertAt("2+3", 3, 3, "×4"), { value: "2+3×4", caret: 5 });
  assert.deepEqual(insertAt("2+3", undefined, undefined, "4"), { value: "2+34", caret: 4 });
});

test("calculator: deleteBefore borra carácter o selección", () => {
  assert.deepEqual(deleteBefore("2+3", 3, 3), { value: "2+", caret: 2 });
  assert.deepEqual(deleteBefore("2+3", 0, 3), { value: "", caret: 0 });
  assert.deepEqual(deleteBefore("", 0, 0), { value: "", caret: 0 });
  assert.deepEqual(deleteBefore("sin(2)", 4, 4), { value: "sin2)", caret: 3 });
});

test("calculator: pushHistory añade al inicio y respeta el límite", () => {
  let history = createHistory();
  assert.deepEqual(history, []);

  history = pushHistory(history, { expression: "1+1", result: "2" });
  history = pushHistory(history, { expression: "2+2", result: "4" });
  assert.deepEqual(history, [
    { expression: "2+2", result: "4" },
    { expression: "1+1", result: "2" },
  ]);

  let capped = createHistory();
  for (let i = 0; i < HISTORY_LIMIT + 5; i += 1) {
    capped = pushHistory(capped, { expression: String(i), result: String(i) });
  }
  assert.equal(capped.length, HISTORY_LIMIT);
  assert.equal(capped[0].expression, String(HISTORY_LIMIT + 4));
});

test("calculator: el historial es de sesión y empieza vacío", () => {
  assert.deepEqual(createHistory(), []);
  assert.notEqual(createHistory(), createHistory());
});
