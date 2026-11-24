# Handoff

Estado en que quedó la última corrida y qué sigue. Cada corrida lo reescribe al terminar.

- Estado: planificación completada (issue #2). Existen `docs/vision.md`, `docs/architecture.md` y `docs/backlog.md`. Arquitectura definida: estructura de carpetas, fronteras de módulos, parser propio (descenso recursivo → AST, sin `eval`), diseño del graficador (escala uniforme, muestreo por píxel, zoom/paneo), despliegue a GitHub Pages vía Actions con rutas relativas. Backlog: F1–F8 con criterios verificables. **No hay código de producto todavía.**
- Siguiente paso: ejecutar F1 — crear el esqueleto ejecutable (index.html, css, módulos stub en js/, package.json con `node --test`, tests smoke, README mínimo) para dejar `npm test` en verde y la página servible sin errores de consola.
