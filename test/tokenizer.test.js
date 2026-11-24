import { test } from "node:test";
import assert from "node:assert/strict";

import { tokenize } from "../js/expr/tokenizer.js";

function types(tokens) {
  return tokens.map((token) => token.type);
}

test("tokenizer: el módulo carga y exporta tokenize", () => {
  assert.equal(typeof tokenize, "function");
});

test("tokenizer: separa números y operadores con sus posiciones", () => {
  const tokens = tokenize("2+3*4");
  assert.deepEqual(
    tokens.map((t) => [t.type, t.value, t.position]),
    [
      ["number", "2", 0],
      ["operator", "+", 1],
      ["number", "3", 2],
      ["operator", "*", 3],
      ["number", "4", 4],
      ["eof", "", 5],
    ],
  );
});

test("tokenizer: reconoce decimales y notación científica", () => {
  assert.deepEqual(types(tokenize("3.14 1e3 1.5e-2 .5")), [
    "number",
    "number",
    "number",
    "number",
    "eof",
  ]);
  assert.equal(tokenize("1e3")[0].value, "1e3");
  assert.equal(Number(tokenize("1.5e-2")[0].value), 0.015);
});

test("tokenizer: normaliza operadores y símbolos unicode", () => {
  const tokens = tokenize("2×3÷4−1π√9");
  assert.deepEqual(
    tokens.map((t) => [t.type, t.value]),
    [
      ["number", "2"],
      ["operator", "*"],
      ["number", "3"],
      ["operator", "/"],
      ["number", "4"],
      ["operator", "-"],
      ["number", "1"],
      ["identifier", "pi"],
      ["identifier", "sqrt"],
      ["number", "9"],
      ["eof", ""],
    ],
  );
});

test("tokenizer: lee identificadores y paréntesis", () => {
  const tokens = tokenize("sin(x)");
  assert.deepEqual(
    tokens.map((t) => [t.type, t.value]),
    [
      ["identifier", "sin"],
      ["lparen", "("],
      ["identifier", "x"],
      ["rparen", ")"],
      ["eof", ""],
    ],
  );
});

test("tokenizer: ignora espacios en blanco", () => {
  assert.deepEqual(
    types(tokenize("  2  +\t3\n")),
    ["number", "operator", "number", "eof"],
  );
});

test("tokenizer: lanza error con posición ante caracteres inválidos", () => {
  assert.throws(
    () => tokenize("2 @ 3"),
    (error) => error.position === 2 && /inválido/.test(error.message),
  );
});
