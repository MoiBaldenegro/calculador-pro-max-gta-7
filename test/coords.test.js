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

test("zoomAt: mantiene el ancla fija y reduce el rango al acercar", () => {
  const vp = createViewport(-10, 10, 400, 200);
  const anchor = { x: 3, y: 1.25 };
  const before = toPixels(anchor, vp, 400, 200);
  const zoomed = zoomAt(vp, 2, anchor);
  const after = toPixels(anchor, zoomed, 400, 200);

  assert.ok(Math.abs(before.px - after.px) < 1e-9, "el ancla no debe moverse en X");
  assert.ok(Math.abs(before.py - after.py) < 1e-9, "el ancla no debe moverse en Y");
  assert.ok(zoomed.xMax - zoomed.xMin < vp.xMax - vp.xMin);
  assert.ok(zoomed.yMax - zoomed.yMin < vp.yMax - vp.yMin);

  const unitsPerPxX = (zoomed.xMax - zoomed.xMin) / 400;
  const unitsPerPxY = (zoomed.yMax - zoomed.yMin) / 200;
  assert.ok(Math.abs(unitsPerPxX - unitsPerPxY) < 1e-12, "la escala sigue siendo uniforme");
});

test("zoomAt: alejar duplica el rango y respeta el ancla", () => {
  const vp = createViewport(-10, 10, 400, 200);
  const anchor = { x: -4, y: 0.5 };
  const before = toPixels(anchor, vp, 400, 200);
  const zoomed = zoomAt(vp, 0.5, anchor);
  const after = toPixels(anchor, zoomed, 400, 200);

  assert.ok(Math.abs(before.px - after.px) < 1e-9);
  assert.ok(Math.abs(before.py - after.py) < 1e-9);
  assert.ok(Math.abs(zoomed.xMax - zoomed.xMin - 40) < 1e-9);
  assert.ok(Math.abs(zoomed.yMax - zoomed.yMin - 20) < 1e-9);
});

test("zoomAt: sin ancla usa el centro y un factor inválido no cambia el viewport", () => {
  const vp = createViewport(-10, 10, 400, 200);
  const zoomed = zoomAt(vp, 2);
  assert.ok(Math.abs((zoomed.xMin + zoomed.xMax) / 2) < 1e-12);
  assert.ok(Math.abs((zoomed.yMin + zoomed.yMax) / 2) < 1e-12);

  assert.deepEqual(zoomAt(vp, 0, { x: 1, y: 1 }), vp);
  assert.deepEqual(zoomAt(vp, Number.NaN, { x: 1, y: 1 }), vp);
});

test("pan: desplaza ambos rangos sin cambiar su tamaño", () => {
  const vp = createViewport(-10, 10, 400, 200);
  const moved = pan(vp, 2, -1);

  assert.equal(moved.xMin, -8);
  assert.equal(moved.xMax, 12);
  assert.ok(Math.abs(moved.yMax - moved.yMin - (vp.yMax - vp.yMin)) < 1e-12);
  assert.ok(Math.abs(moved.yMin - (vp.yMin - 1)) < 1e-12);
  assert.ok(Math.abs(moved.yMax - (vp.yMax - 1)) < 1e-12);

  assert.deepEqual(pan(vp, Number.NaN, Number.POSITIVE_INFINITY), vp);
});
