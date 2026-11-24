import { test } from "node:test";
import assert from "node:assert/strict";

import {
  niceStep,
  generateTicks,
  formatTick,
  compileExpression,
  sampleCurve,
  mountGrapher,
} from "../js/grapher.js";
import { createViewport } from "../js/coords.js";

function astOf(text) {
  const compiled = compileExpression(text);
  assert.equal(compiled.ok, true, `«${text}» debería compilar`);
  return compiled.ast;
}

test("grapher: exporta las funciones esperadas", () => {
  assert.equal(typeof niceStep, "function");
  assert.equal(typeof generateTicks, "function");
  assert.equal(typeof formatTick, "function");
  assert.equal(typeof compileExpression, "function");
  assert.equal(typeof sampleCurve, "function");
  assert.equal(typeof mountGrapher, "function");
});

test("niceStep: elige pasos 1/2/5 × 10^n", () => {
  assert.ok(Math.abs(niceStep(20, 8) - 5) < 1e-12);
  assert.ok(Math.abs(niceStep(100, 10) - 10) < 1e-12);
  assert.ok(Math.abs(niceStep(1, 5) - 0.2) < 1e-12);
  assert.equal(niceStep(0, 8), 1);
});

test("generateTicks: marcas alineadas dentro del rango", () => {
  assert.deepEqual(generateTicks(-10, 10, 8), [-10, -5, 0, 5, 10]);
  const ticks = generateTicks(-1, 1, 4);
  assert.ok(ticks.length >= 3);
  assert.ok(ticks.every((v) => v >= -1 - 1e-9 && v <= 1 + 1e-9));
  assert.deepEqual(generateTicks(5, 5, 8), []);
});

test("formatTick: etiquetas legibles sin ruido de coma flotante", () => {
  assert.equal(formatTick(0, 1), "0");
  assert.equal(formatTick(-0, 1), "0");
  assert.equal(formatTick(-0.30000000000000004, 0.1), "-0.3");
  assert.equal(formatTick(5, 5), "5");
  assert.equal(formatTick(1e7, 1e6), "1e7");
});

test("compileExpression: válida devuelve AST, inválida devuelve error", () => {
  const ok = compileExpression("sin(x)");
  assert.equal(ok.ok, true);
  assert.ok(ok.ast);

  const bad = compileExpression("sin(");
  assert.equal(bad.ok, false);
  assert.equal(typeof bad.error.message, "string");
  assert.ok(bad.error.message.length > 0);

  const empty = compileExpression("   ");
  assert.equal(empty.ok, false);
});

test("sampleCurve: sin(x) es una única curva continua", () => {
  const vp = createViewport(-2 * Math.PI, 2 * Math.PI, 400, 240);
  const segments = sampleCurve(astOf("sin(x)"), vp, 400, 240);
  assert.equal(segments.length, 1);
  assert.ok(segments[0].length > 300);
  assert.ok(segments[0].every((p) => Number.isFinite(p.x) && Number.isFinite(p.py)));
});

test("sampleCurve: x^2 es una única curva continua", () => {
  const vp = createViewport(-5, 5, 400, 240);
  const segments = sampleCurve(astOf("x^2"), vp, 400, 240);
  assert.equal(segments.length, 1);
  assert.ok(segments[0].length > 300);
});

test("sampleCurve: tan(x) corta las discontinuidades sin líneas verticales", () => {
  const vp = createViewport(-6, 6, 600, 300);
  const segments = sampleCurve(astOf("tan(x)"), vp, 600, 300);
  assert.ok(segments.length >= 3, "debe haber varios tramos separados por asíntotas");
  for (const segment of segments) {
    for (let i = 1; i < segment.length; i += 1) {
      const jump = Math.abs(segment[i].py - segment[i - 1].py);
      assert.ok(jump <= 300 + 1e-9, "ningún tramo debe cruzar la asíntota verticalmente");
    }
  }
});

test("sampleCurve: 1/x se parte en la asíntota x=0", () => {
  const vp = createViewport(-5, 5, 400, 240);
  const segments = sampleCurve(astOf("1/x"), vp, 400, 240);
  assert.ok(segments.length >= 2);
});
