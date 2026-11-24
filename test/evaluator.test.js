import { test } from "node:test";
import assert from "node:assert/strict";

import { evaluate } from "../js/expr/evaluator.js";

test("evaluator: el módulo carga y exporta evaluate", () => {
  assert.equal(typeof evaluate, "function");
});
