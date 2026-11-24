# Memoria de Calculador Pro Max GTA 7

Decisiones, convenciones y aprendizajes que cualquier agente futuro debe conocer.
Agrega entradas cortas y fechadas; no borres las de otros salvo que ya no sean ciertas.

- 2026-11-24 — Descubrimiento (issue #1): producto definido en `docs/vision.md`. Es una calculadora científica web + graficador de funciones `f(x)`, 100% estática, vanilla HTML/CSS/JS con Canvas 2D, desplegada en GitHub Pages. Interfaz en español.
- 2026-11-24 — Supuesto clave: "gráficas algorítmicas" se interpretó como graficar funciones matemáticas de una variable (plano cartesiano, zoom y paneo), no como visualización de algoritmos/estructuras de datos. Si el humano corrige esto, revisar alcance del MVP.
- 2026-11-24 — Restricciones de producto: sin backend, sin login, sin persistencia en servidor; se acepta perder historial/gráficas al recargar. Fuera de alcance: CAS, resolución simbólica, multi-idioma, dominio propio.
- 2026-11-24 — Planificación (issue #2): arquitectura y backlog en `docs/architecture.md` y `docs/backlog.md`. Decisiones clave: parser propio (tokenizer + descenso recursivo → AST + evaluador, sin `eval`); ángulos en **radianes**; multiplicación implícita (`2x`, `2sin(x)`); errores tipados `{ok,value}|{ok,error{type,message,position}}` (graficador ignora NaN/Inf por punto); graficador con escala uniforme y muestreo por píxel; GitHub Pages vía GitHub Actions (artefacto) con **rutas relativas** por el subpath `/calculador-pro-max-gta-7/`.
- 2026-11-24 — Tests sin dependencias: runner nativo `node --test` (Node 26 disponible en la máquina). No hay paso de build. Ejecutar en local con `python -m http.server 8080` (ES modules no cargan en `file://`).
