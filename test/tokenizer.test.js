import { test } from "node:test";
import assert from "node:assert/strict";

import { tokenize } from "../js/expr/tokenizer.js";

test("tokenizer: el módulo carga y exporta tokenize", () => {
  assert.equal(typeof tokenize, "function");
});
