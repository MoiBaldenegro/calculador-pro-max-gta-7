import { test } from "node:test";
import assert from "node:assert/strict";

import {
  createViewport,
  fitViewportToSize,
  toPixels,
  toMath,
  zoomAt,
  pan,
} from "../js/coords.js";

test("coords: el módulo carga y exporta sus funciones", () => {
  assert.equal(typeof createViewport, "function");
  assert.equal(typeof fitViewportToSize, "function");
  assert.equal(typeof toPixels, "function");
  assert.equal(typeof toMath, "function");
  assert.equal(typeof zoomAt, "function");
  assert.equal(typeof pan, "function");
});

test("createViewport: mantiene escala uniforme y centra Y en 0", () => {
  const vp = createViewport(-10, 10, 400, 200);
  assert.equal(vp.xMin, -10);
  assert.equal(vp.xMax, 10);

  const unitsPerPxX = (vp.xMax - vp.xMin) / 400;
  const unitsPerPxY = (vp.yMax - vp.yMin) / 200;
  assert.ok(Math.abs(unitsPerPxX - unitsPerPxY) < 1e-12);
  assert.ok(Math.abs((vp.yMin + vp.yMax) / 2) < 1e-12);
});

test("toPixels: mapea las esquinas del viewport al canvas", () => {
  const vp = createViewport(-10, 10, 400, 200);
  const topLeft = toPixels({ x: -10, y: vp.yMax }, vp, 400, 200);
  assert.equal(topLeft.px, 0);
  assert.equal(topLeft.py, 0);

  const bottomRight = toPixels({ x: 10, y: vp.yMin }, vp, 400, 200);
  assert.equal(bottomRight.px, 400);
  assert.equal(bottomRight.py, 200);
});

test("toPixels/toMath: son transformaciones inversas", () => {
  const vp = createViewport(-10, 10, 400, 200);
  const point = { x: 3.25, y: -1.5 };
  const { px, py } = toPixels(point, vp, 400, 200);
  const back = toMath(px, py, vp, 400, 200);
  assert.ok(Math.abs(back.x - point.x) < 1e-9);
  assert.ok(Math.abs(back.y - point.y) < 1e-9);
});

test("fitViewportToSize: conserva el rango X y el centro Y", () => {
  const vp = createViewport(-10, 10, 400, 200);
  const resized = fitViewportToSize(vp, 400, 400);
  assert.equal(resized.xMin, -10);
  assert.equal(resized.xMax, 10);
  assert.ok(Math.abs((resized.yMin + resized.yMax) / 2) < 1e-12);
  const unitsPerPxX = (resized.xMax - resized.xMin) / 400;
  const unitsPerPxY = (resized.yMax - resized.yMin) / 400;
  assert.ok(Math.abs(unitsPerPxX - unitsPerPxY) < 1e-12);
});
