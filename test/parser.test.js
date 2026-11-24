import { test } from "node:test";
import assert from "node:assert/strict";

import { parse } from "../js/expr/parser.js";

function ast(input) {
  const result = parse(input);
  assert.equal(result.ok, true, `parse(${input}) falló: ${JSON.stringify(result.error)}`);
  return result.value;
}

function expectSyntaxError(input, matcher) {
  const result = parse(input);
  assert.equal(result.ok, false, `parse(${input}) debía fallar`);
  assert.equal(result.error.type, "syntax");
  assert.equal(typeof result.error.position, "number");
  if (matcher) {
    assert.match(result.error.message, matcher);
  }
  return result.error;
}

test("parser: el módulo carga y exporta parse", () => {
  assert.equal(typeof parse, "function");
});

test("parser: respeta la precedencia de * sobre +", () => {
  const root = ast("2+3*4");
  assert.equal(root.type, "binary");
  assert.equal(root.value, "+");
  assert.equal(root.left.value, 2);
  assert.equal(root.right.type, "binary");
  assert.equal(root.right.value, "*");
  assert.equal(root.right.left.value, 3);
  assert.equal(root.right.right.value, 4);
});

test("parser: ^ es asociativo a la derecha", () => {
  const root = ast("2^3^2");
  assert.equal(root.value, "^");
  assert.equal(root.left.value, 2);
  assert.equal(root.right.type, "binary");
  assert.equal(root.right.value, "^");
  assert.equal(root.right.left.value, 3);
  assert.equal(root.right.right.value, 2);
});

test("parser: el menos unario tiene menor precedencia que ^", () => {
  const root = ast("-2^2");
  assert.equal(root.type, "unary");
  assert.equal(root.value, "-");
  assert.equal(root.argument.type, "binary");
  assert.equal(root.argument.value, "^");
});

test("parser: el exponente admite signo", () => {
  const root = ast("2^-3");
  assert.equal(root.value, "^");
  assert.equal(root.right.type, "unary");
  assert.equal(root.right.value, "-");
});

test("parser: soporta multiplicación implícita número-variable", () => {
  const root = ast("2x");
  assert.equal(root.type, "binary");
  assert.equal(root.value, "*");
  assert.equal(root.left.value, 2);
  assert.equal(root.right.type, "variable");
});

test("parser: soporta multiplicación implícita con paréntesis", () => {
  const root = ast("3(x+2)");
  assert.equal(root.value, "*");
  assert.equal(root.left.value, 3);
  assert.equal(root.right.type, "binary");

  const product = ast("(x+1)(x-1)");
  assert.equal(product.value, "*");
  assert.equal(product.left.type, "binary");
  assert.equal(product.right.type, "binary");
});

test("parser: soporta multiplicación implícita con funciones", () => {
  const root = ast("2sin(x)");
  assert.equal(root.value, "*");
  assert.equal(root.left.value, 2);
  assert.equal(root.right.type, "call");
  assert.equal(root.right.value, "sin");
});

test("parser: reconoce constantes, variables y llamadas", () => {
  assert.equal(ast("pi").type, "constant");
  assert.equal(ast("π").type, "constant");
  assert.equal(ast("e").type, "constant");
  assert.equal(ast("x").type, "variable");
  const call = ast("sqrt(9)");
  assert.equal(call.type, "call");
  assert.equal(call.value, "sqrt");
  assert.equal(call.args.length, 1);
});

test("parser: resuelve alias √ como sqrt", () => {
  const call = ast("√(16)");
  assert.equal(call.type, "call");
  assert.equal(call.value, "sqrt");
});

test("parser: maneja paréntesis anidados", () => {
  const root = ast("((2+3)*(4-1))");
  assert.equal(root.type, "binary");
  assert.equal(root.value, "*");
});

test("parser: error por expresión vacía", () => {
  expectSyntaxError("", /vacía/i);
});

test("parser: error por operador colgando con posición", () => {
  const error = expectSyntaxError("2+");
  assert.equal(error.position, 2);
});

test("parser: error por paréntesis sin cerrar", () => {
  const error = expectSyntaxError("(2+3", /paréntesis/i);
  assert.equal(error.position, 0);
});

test("parser: error por función desconocida", () => {
  expectSyntaxError("foo(2)", /desconocida/i);
});

test("parser: error por identificador desconocido", () => {
  expectSyntaxError("bar", /desconocido/i);
});

test("parser: error por función sin paréntesis", () => {
  expectSyntaxError("sin 2", /\(/);
});

test("parser: error por carácter inválido con su posición", () => {
  const error = expectSyntaxError("2 @ 3");
  assert.equal(error.position, 2);
});
