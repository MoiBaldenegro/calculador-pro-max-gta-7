import { test } from "node:test";
import assert from "node:assert/strict";

import {
  createViewport,
  toPixels,
  toMath,
  zoomAt,
  pan,
} from "../js/coords.js";

test("coords: el módulo carga y exporta sus funciones", () => {
  assert.equal(typeof createViewport, "function");
  assert.equal(typeof toPixels, "function");
  assert.equal(typeof toMath, "function");
  assert.equal(typeof zoomAt, "function");
  assert.equal(typeof pan, "function");
});
