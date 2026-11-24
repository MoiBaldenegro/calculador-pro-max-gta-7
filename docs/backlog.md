# Backlog — Calculador Pro Max GTA 7

> Lista ordenada de lo que falta para completar el MVP definido en `docs/vision.md`, con la arquitectura de `docs/architecture.md`. Cada feature cabe en una sesión de un agente `constructor`. Los criterios de aceptación son **verificables** (tests automáticos o pasos manuales concretos en la web).

## Trazabilidad con el alcance del MVP

| Punto de `vision.md` | Feature(s) |
| --- | --- |
| 1. Página estática en GitHub Pages sin login | F1, F7 |
| 2. Calculadora científica (ops, funciones, constantes) | F2, F3 |
| 3. Entrada por teclado y botones, borrar/limpiar | F3 |
| 4. Evaluación segura sin `eval`, errores claros sin romper | F2, F3 |
| 5. Historial visible de la sesión | F3 |
| 6. Graficador de `f(x)` con varias funciones y colores | F4, F5 |
| 7. Zoom, paneo y ejes con marcas legibles | F4, F5 |
| 8. Diseño responsive (≥ 360 px y escritorio) | F6 |
| 9. 100 % estático (sin backend/cookies) | Arquitectura + F7 |
| 10. Repositorio público + despliegue automático en push a `main` | F7 |
| 11. README (qué hace, cómo usar, cómo desplegar) | F8 |

## Features (orden de implementación)

### F1 — Esqueleto del proyecto ejecutable con tests (p0)
Deja el proyecto corriendo y testeable antes de escribir lógica.
- Crear `index.html`, `css/styles.css`, `js/app.js`, `js/calculator.js`, `js/grapher.js`, `js/coords.js`, `js/expr/{tokenizer,parser,evaluator,functions}.js` con firmas/stubs documentadas.
- `package.json` con `"test": "node --test test/"` y sin dependencias de runtime. Tests smoke en `test/`.
- `README.md` mínimo.
- **Aceptación:** `npm test` corre y pasa; `python -m http.server 8080` sirve la página con las secciones de calculadora y graficador, **sin errores en consola**; todos los imports de módulos resuelven.

### F2 — Motor de expresiones: tokenizer + parser + evaluador (p0)
- Implementar gramática de `architecture.md` §4.2, funciones/constantes de §4.3 y errores tipados de §4.4. Sin `eval`/`new Function`.
- Tests: precedencia, `^` asociativo a la derecha, menos unario, multiplicación implícita, funciones, constantes, paréntesis, errores de sintaxis con posición, división por cero y dominio.
- **Aceptación:** `npm test` verde con casos que cubren lo anterior; grep confirma ausencia de `eval`/`new Function`; `2+3*4=14`, `2^3^2=512`, `-2^2=-4`, `sqrt(-1)` devuelve error `domain`.

### F3 — UI de la calculadora: botones, teclado, errores e historial (p0)
- Display, botones (dígitos, ops, paréntesis, funciones, constantes, `=`, borrar, limpiar), entrada por teclado, mensajes de error en español, historial de la sesión (en memoria, se pierde al recargar).
- **Aceptación:** operaciones del punto 2 de la visión resueltas por botones **y** por teclado; una expresión inválida muestra mensaje claro y la página sigue funcionando; el historial lista los últimos cálculos y se vacía al recargar.

### F4 — Graficador: una función, ejes, rejilla y resize (p0)
- Canvas con viewport, `coords.js`, muestreo por píxel, corte de discontinuidades, ejes con marcas legibles, `ResizeObserver` + DPR.
- **Aceptación:** `sin(x)` y `x^2` se dibujan correctamente; ejes y marcas legibles; `tan(x)` no muestra líneas verticales espurias; expresión inválida muestra error sin romper; al redimensionar la ventana el gráfico se reajusta y redibuja.

### F5 — Graficador: zoom, paneo y múltiples funciones con colores (p0)
- Zoom con rueda y botones (anclado al cursor), paneo con arrastre ratón/táctil, lista de funciones con colores, añadir/quitar/ocultar, leyenda.
- **Aceptación:** zoom y paneo responden en ratón y táctil manteniendo el punto anclado; se grafican ≥ 2 funciones simultáneas con colores distintos y leyenda; quitar una función la elimina del dibujo; el viewport se conserva tras redibujar.

### F6 — Diseño responsive y accesibilidad básica (p0)
- CSS responsive usable a ≥ 360 px y escritorio; sin scroll horizontal; foco visible; etiquetas accesibles en inputs/botones.
- **Aceptación:** a 360 px de ancho calculadora y graficador son usables (sin solapamientos ni scroll horizontal); en escritorio se ven lado a lado o en layout coherente; navegación por teclado con foco visible.

### F7 — Despliegue automático a GitHub Pages (p0)
- `.github/workflows/deploy.yml` (Actions + artefacto), rutas relativas en `index.html`, verificación de la URL.
- **Aceptación:** un push a `main` dispara el workflow y termina en verde; `https://moibaldenegro.github.io/calculador-pro-max-gta-7/` carga la app **sin errores en consola**. Si Pages no está habilitado como *GitHub Actions*, se documenta el paso manual en el README.

### F8 — README y documentación de uso/despliegue (p1)
- README: qué hace, cómo usarlo (calculadora y graficador), cómo correr en local, cómo probar (`npm test`) y cómo se despliega.
- **Aceptación:** una persona nueva entiende el proyecto y puede correrlo y desplegarlo siguiendo solo el README; incluye la nota de ángulos en radianes y la URL publicada.

## Fuera de alcance (no crear features para esto)

Login/cuentas, CAS/resolución simbólica, estadística/matrices/conversores, persistencia en servidor, multi-idioma, temas, PWA/offline, dominio propio, anuncios/analítica. (Ver `docs/vision.md` §Fuera de alcance.)
