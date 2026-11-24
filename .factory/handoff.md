# Handoff

Estado en que quedó la última corrida y qué sigue. Cada corrida lo reescribe al terminar.

- Estado: **F2 completada** (issue #4). Implementados de verdad `js/expr/functions.js` (tabla de funciones/constantes con validación de dominio), `js/expr/tokenizer.js`, `js/expr/parser.js` (descenso recursivo → AST, `^` asociativo a la derecha, menos unario, multiplicación implícita, alias `π`/`√`/`×`/`÷`/`−`) y `js/expr/evaluator.js` (errores tipados `{ok,error{type,message,position}}`). Sin `eval`/`new Function` (grep limpio en `js/`).
- Tests reales en `test/tokenizer.test.js`, `test/parser.test.js`, `test/evaluator.test.js`: `npm test` → **45/45 en verde**. Cubren precedencia, `2^3^2=512`, `-2^2=-4`, multiplicación implícita, funciones, constantes, paréntesis, errores de sintaxis con posición, división por cero y dominio (`sqrt(-1)`, `log(0)`, `asin(2)`…). `coords.test.js` sigue como smoke (F4/F5).
- Contrato respetado: `parse(input)` y `evaluate(ast, env)` devuelven resultados tipados y **nunca lanzan** hacia la UI. `tokenize` lanza un error con `.position` solo para caracteres inválidos; `parse` lo captura y lo convierte a `{ok:false,...}`.
- Verificado a mano: `2+3*4=14`, `2^3^2=512`, `-2^2=-4`, `2π≈6.283`, `2x` con `x=3` → 6, `√(16)=4`, `1/0` → domain «División por cero», `(2+3` → syntax «Paréntesis sin cerrar» posición 0.
- Siguiente paso: ejecutar **F3** (issue #5) — UI de la calculadora (display, botones, teclado, errores en español e historial) consumiendo `parse`+`evaluate`. La UI debe encadenar `parse(texto)` y, si `ok`, `evaluate(ast)`.
