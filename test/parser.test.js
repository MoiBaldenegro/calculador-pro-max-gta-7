import { test } from "node:test";
import assert from "node:assert/strict";

import { parse } from "../js/expr/parser.js";

test("parser: el módulo carga y exporta parse", () => {
  assert.equal(typeof parse, "function");
});
