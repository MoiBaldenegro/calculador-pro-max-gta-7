# Handoff

Estado en que quedó la última corrida y qué sigue. Cada corrida lo reescribe al terminar.

- Estado: **F1 completada** (issue #3). Existe el esqueleto ejecutable: `index.html` con secciones `#calculadora` y `#graficador`, `css/styles.css`, `js/app.js` (arranque), `js/calculator.js` y `js/grapher.js` (stubs de UI que montan estructura mínima), `js/coords.js` (stubs puros), `js/expr/{tokenizer,parser,evaluator,functions}.js` (stubs puros documentados). `package.json` con `"type":"module"` y `"test":"node --test test/"`, sin dependencias. Tests smoke en `test/` en verde (`npm test`: 4/4). README mínimo. Verificado: `python -m http.server 8080` sirve todos los recursos con 200 y `node --check` valida la sintaxis de todos los módulos. `docs/vision.md`, `architecture.md` y `backlog.md` siguen presentes.
- Los stubs lanzan `Error("... no implementado todavía (Fx)")` a propósito; los tests smoke NO los llaman, solo comprueban que existen. Mantener ese contrato al implementar.
- Siguiente paso: ejecutar **F2** (issue #4) — implementar tokenizer + parser de descenso recursivo + evaluador (sin `eval`/`new Function`) y sus tests reales según `architecture.md` §4; sustituir los stubs de `js/expr/*.js`. Tras F2 seguiría F3 (UI calculadora, issue #5).
