# Handoff

Estado en que quedó la última corrida y qué sigue. Cada corrida lo reescribe al terminar.

- Estado: **F3 completada** (issue #5). Implementada de verdad la UI de la calculadora en `js/calculator.js`: display de expresión, teclado en pantalla de 30 botones (funciones, dígitos, operadores, paréntesis, constantes, `=`, borrar, limpiar), entrada por teclado físico, mensajes de error en español y historial de la sesión en memoria.
- API pura exportada (testeable en Node sin DOM): `compute(text)` (encadena `parse` + `evaluate`, nunca lanza), `formatResult(value)`, `insertAt(text,start,end,snippet)`, `deleteBefore(text,start,end)`, `createHistory()`, `pushHistory(history,entry,limit)`, `HISTORY_LIMIT` (20). El historial NO usa `localStorage`: se pierde al recargar por diseño.
- `mountCalculator(root)` monta el DOM y devuelve `{ input, destroy }`. Los botones insertan texto en el cursor respetando la selección; `Borrar` borra carácter/selección; `Limpiar` vacía; `=` evalúa. Teclado: Enter y `=` evalúan, Escape limpia; un listener global captura dígitos/operadores cuando el foco no está en un campo editable, sin interferir con botones.
- Estilos añadidos en `css/styles.css`: grid de 5×6 teclas, display, resultado con clase `.is-error`, historial con scroll y tope de 20, utilidad `.visually-hidden`.
- Tests: nuevo `test/calculator.test.js` (10 tests) cubriendo operaciones del punto 2 de la visión, errores de sintaxis y dominio, formateo, edición de texto e historial (orden y tope). `npm test` → **55/55 en verde**.
- Verificado E2E con Chrome headless + CDP sobre `python -m http.server`: 30 botones, `2+3*4` → `= 14`, `1/0` → «División por cero», `(2+3` → «Paréntesis sin cerrar», recuperación tras error `2^10` → `= 1024`, Enter por teclado `sin(0)` → `= 0`, solo botones `7×8` → `= 56`, borrar, historial limitado a 20 y **0 errores de consola**.
- Siguiente paso: ejecutar **F4** (issue #6) — graficador de una función con ejes, rejilla, muestreo por píxel y resize, implementando `js/coords.js` y `js/grapher.js` con el mismo motor `expr/*`.
