# Arquitectura — Calculador Pro Max GTA 7

> Documento de planificación técnica. Deriva de `docs/vision.md` (fuente de verdad del producto). Define **cómo** construimos el MVP: estructura, fronteras entre módulos, decisiones del parser/evaluador, diseño del graficador y despliegue. No contiene código de producto.

## 1. Principios

- **100 % estático**: HTML/CSS/JS vanilla con ES modules. Sin backend, sin base de datos, sin cookies.
- **Cero dependencias de runtime**: nada de frameworks ni librerías en el navegador. Sin paso de build para desplegar.
- **Auditable y mantenible**: módulos pequeños con responsabilidad única, funciones puras en el núcleo lógico.
- **Interfaz en español**, responsive (móvil ≥ 360 px y escritorio).
- **Herramientas de desarrollo opcionales**: los tests usan el runner nativo de Node (`node --test`), no afectan al sitio publicado.

## 2. Estructura de carpetas y archivos

```
/
├── index.html                  # única página: calculadora + graficador
├── css/
│   └── styles.css              # estilos y layout responsive
├── js/
│   ├── app.js                  # arranque: monta calculadora y graficador, cablea eventos
│   ├── calculator.js           # controlador + vista de la calculadora (DOM, teclado, historial)
│   ├── grapher.js              # controlador + vista del graficador (Canvas 2D, zoom, paneo)
│   ├── coords.js               # transformaciones matemático ↔ píxeles y viewport
│   └── expr/
│       ├── tokenizer.js        # texto → tokens
│       ├── parser.js           # tokens → AST (descenso recursivo)
│       ├── evaluator.js        # AST + entorno (x) → número | error
│       └── functions.js        # tabla de funciones y constantes soportadas
├── test/
│   ├── tokenizer.test.js
│   ├── parser.test.js
│   ├── evaluator.test.js
│   └── coords.test.js
├── docs/
│   ├── vision.md
│   ├── architecture.md         # este documento
│   └── backlog.md
├── .github/
│   └── workflows/
│       └── deploy.yml          # despliegue automático a GitHub Pages
├── package.json                # solo scripts de desarrollo (test); sin dependencias de runtime
├── README.md                   # qué hace, cómo usarlo, cómo se prueba y despliega
└── .gitignore                  # .env, node_modules/, .factory/outbox/
```

### Por qué esta estructura

- `js/expr/` es el **núcleo puro** (sin DOM, sin Canvas): se puede testear en Node sin navegador.
- `calculator.js` y `grapher.js` son las **capas de UI** (las únicas que tocan DOM/Canvas).
- `coords.js` aísla la matemática del viewport para testearla y reutilizarla.
- `app.js` es el **único punto de entrada**; `index.html` solo carga `./js/app.js` con `type="module"`.

## 3. Fronteras entre módulos y flujo de datos

| Módulo | Responsabilidad | Depende de | NO hace |
| --- | --- | --- | --- |
| `expr/tokenizer.js` | Convertir texto en tokens (números, operadores, identificadores, paréntesis) | — | No interpreta semántica |
| `expr/parser.js` | Construir AST validando gramática y precedencia | tokenizer | No evalúa ni toca DOM |
| `expr/evaluator.js` | Evaluar AST con un entorno `{ x }` | functions, AST | No parsea ni toca DOM |
| `expr/functions.js` | Tabla de funciones/constantes y validación de dominio | — | No parsea |
| `coords.js` | Transformar coords matemáticas ↔ píxeles, gestionar viewport y zoom/paneo | — | No dibuja |
| `calculator.js` | UI calculadora: display, botones, teclado, historial de sesión | expr/* | No dibuja gráficas |
| `grapher.js` | UI graficador: funciones, colores, Canvas, zoom, paneo, resize | expr/*, coords | No calcula historial |
| `app.js` | Composición y arranque | calculator, grapher | No contiene lógica de negocio |

### Flujo de datos

```
Usuario (teclado/botones)
        │
        ▼
calculator.js / grapher.js  (controlador de UI)
        │  texto de expresión
        ▼
expr/tokenizer → expr/parser → AST
        │
        ▼
expr/evaluator  (+ functions.js)
        │  número | ExprError
        ▼
UI: muestra resultado / error (calculadora)  ó  coords.js → dibuja curva (graficador)
```

- El **núcleo de expresión es puro**: recibe texto (y opcionalmente `x`) y devuelve un resultado tipado. No lanza excepciones hacia la UI: devuelve `{ ok, value }` o `{ ok:false, error }` (ver §4.4).
- La calculadora y el graficador **comparten el mismo motor** de expresiones, garantizando comportamiento consistente.

## 4. Parser / evaluador de expresiones

### 4.1 Decisión: tokenizer + parser de descenso recursivo + evaluador sobre AST

Se descarta `eval` / `new Function` (prohibido por el MVP: evaluación segura, visión punto 4).

Alternativas consideradas:

| Opción | Pros | Contras | Decisión |
| --- | --- | --- | --- |
| **Descenso recursivo → AST** | Legible, errores con posición, maneja bien menos unario, funciones y precedencia; fácil de extender | Algo más de código que shunting-yard | **Elegida** |
| Shunting-yard → RPN | Evaluación plana sencilla | Menos unario y llamadas a función son incómodos; mensajes de error pobres | Descartada |
| `eval` / `new Function` | Trivial | Inseguro, prohibido | Descartada |

El evaluador recorre el AST con un `switch` por tipo de nodo. Es determinista, sin efectos secundarios y testeable en Node.

### 4.2 Gramática (precedencia de mayor a menor)

```
expression := term (('+' | '-') term)*
term       := unary (('*' | '/') unary)*
unary      := ('-' | '+') unary | power
power      := primary ('^' unary)?          # asociativo a la derecha
primary    := number
            | constant                       # pi, e
            | variable                       # x (solo en graficador)
            | function '(' expression ')'    # sin, cos, sqrt, ...
            | '(' expression ')'
```

- `^` es **asociativo a la derecha**: `2^3^2 = 2^(3^2) = 512`.
- **Multiplicación implícita** soportada (común en graficadores): `2x`, `2π`, `2sin(x)`, `(x+1)(x-1)`, `3(x+2)`. Se resuelve en `term` insertando un `*` cuando un token de valor sigue a otro de valor.
- Números: decimales con `.`, notación científica opcional (`1e3`).
- Se aceptan tanto `π` como `pi`, y `√` como alias de `sqrt`.

### 4.3 Funciones y constantes soportadas

| Tipo | Símbolos |
| --- | --- |
| Operadores | `+  -  *  /  ^` (y `×`, `÷` normalizados a `*`, `/`) |
| Trigonométricas | `sin`, `cos`, `tan` (**radianes**) |
| Trigonométricas inversas | `asin`, `acos`, `atan` |
| Logaritmos / exp | `log` (base 10), `ln` (natural), `exp` |
| Raíz y valor absoluto | `sqrt` (alias `√`), `abs` |
| Constantes | `π` / `pi`, `e` |

- **Ángulo en radianes** (estándar matemático y coherente con el graficador). Se documenta en el README y en la UI.
- Fuera de alcance: funciones estadísticas, matrices, CAS.

### 4.4 Reporte de errores

Formato de resultado del núcleo:

```js
// éxito
{ ok: true, value: 42 }
// error
{ ok: false, error: { type, message, position } }
```

Tipos de error:

- `syntax`: token/estructura inválida (paréntesis sin cerrar, operador colgando, función desconocida). `position` = índice del carácter problemático; la UI lo muestra en español (p. ej. «Paréntesis sin cerrar»).
- `domain`: operación matemáticamente indefinida en la **calculadora** (p. ej. `sqrt(-1)`, `log(0)`, división por cero). Mensaje claro («Resultado no definido» / «División por cero»).
- El **graficador no reporta errores de dominio por punto**: si `f(x)` da `NaN`/`±Infinity`, ese punto se omite (las asíntotas son normales). Solo muestra error de `syntax` de la expresión completa.
- La UI **nunca deja escapar una excepción**: `app.js`/controladores capturan y muestran el mensaje; la página no se rompe (visión punto 4).

## 5. Diseño del módulo del graficador

### 5.1 Viewport: coordenadas matemáticas vs píxeles

- Estado del viewport en **coordenadas matemáticas**: `{ xMin, xMax, yMin, yMax }`, más el tamaño del canvas.
- **Escala uniforme** (mismas unidades por píxel en X e Y) para no deformar las curvas: se fija el rango X y se deriva Y del aspecto del canvas. Un círculo se ve como círculo.
- El canvas usa `devicePixelRatio` para nitidez (backing store = tamaño CSS × DPR; el contexto se escala).

Transformaciones en `coords.js`:

```
px = (x - xMin) / (xMax - xMin) * width
py = height - (y - yMin) / (yMax - yMin) * height
```

y sus inversas `toMath(px, py)`.

### 5.2 Muestreo y dibujo de curvas

- Se evalúa `f(x)` **por columna de píxel** (una muestra por píxel horizontal) y se traza una polilínea.
- Puntos `NaN`/`±Infinity` se **saltan** (rompen la línea).
- Para evitar artefactos verticales en discontinuidades (p. ej. `tan(x)`), se **corta la polilínea** cuando el salto vertical entre muestras consecutivas supera un umbral (p. ej. mayor que la altura del canvas).
- Redibujado **bajo demanda** con `requestAnimationFrame` (no bucle continuo), al cambiar viewport, funciones o tamaño.

### 5.3 Zoom

- Rueda del ratón y botones `+` / `−`.
- Zoom **anclado al cursor**: el punto matemático bajo el puntero se mantiene fijo; se escala el rango alrededor de ese punto.

### 5.4 Paneo

- Arrastre con puntero (Pointer Events, cubre ratón y táctil): el delta en píxeles se convierte a delta matemático y se desplaza el viewport.
- Sin selección de texto accidental durante el arrastre (`touch-action: none`, `user-select: none` en el canvas).

### 5.5 Múltiples funciones con colores

- Lista de funciones: `{ id, expr, ast, color, visible }`.
- Paleta de colores predefinida y asignación cíclica; leyenda con el color y la expresión de cada función.
- Añadir/quitar funciones y alternar visibilidad; se redibujan todas en cada frame.

### 5.6 Redibujado en resize

- `ResizeObserver` sobre el contenedor del canvas: recalcula el backing store (DPR incluido), reajusta el rango Y al nuevo aspecto y redibuja. Se agrupa con `requestAnimationFrame` para evitar redibujados redundantes.

## 6. Despliegue a GitHub Pages

### 6.1 Estrategia: GitHub Actions con artefacto (recomendada)

- Workflow `.github/workflows/deploy.yml` que en cada push a `main`:
  1. `actions/checkout`
  2. `actions/configure-pages`
  3. `actions/upload-pages-artifact` con `path: .` (la raíz estática; `node_modules` no se commitea)
  4. `actions/deploy-pages`
- Requiere en el repositorio: **Settings → Pages → Source = GitHub Actions** (una sola vez).
- Ventajas frente a publicar la raíz directamente: control del artefacto, historial de despliegues y verificación en la pestaña Actions. No ensucia el repo con una rama `gh-pages`.

Alternativa aceptable (más simple): Settings → Pages → *Deploy from a branch* → `main` / `/ (root)`. No requiere workflow, pero no deja registro de despliegue.

### 6.2 Rutas relativas (crítico)

El sitio se sirve bajo el subpath `/calculador-pro-max-gta-7/`. Todo recurso debe referenciarse **relativo**: `./css/styles.css`, `./js/app.js`. Nunca rutas absolutas (`/js/...`), que romperían en Pages.

### 6.3 Verificación

- URL esperada: `https://moibaldenegro.github.io/calculador-pro-max-gta-7/`.
- Comprobaciones: la acción de GitHub termina en verde; la URL carga calculadora y graficador; **consola sin errores**; un push a `main` actualiza el sitio.

## 7. Cómo correr y probar

- **Correr en local** (los ES modules no cargan con `file://`):
  ```bash
  python -m http.server 8080
  # abrir http://localhost:8080/
  ```
  Alternativa: `npx serve .`
- **Tests** (núcleo puro, sin navegador):
  ```bash
  npm test        # ejecuta: node --test test/
  ```
- **Sin build**: no hay paso de compilación; se despliega el árbol tal cual.
- Pruebas de UI/navegador: verificación manual guiada (responsive, zoom/paneo, teclado) descrita en el backlog; opcionalmente Playwright en el futuro, fuera del MVP.

## 8. Decisiones y límites (resumen)

- Vanilla + ES modules, sin build, sin dependencias de runtime.
- Motor de expresiones propio (descenso recursivo + AST), sin `eval`, con errores tipados en español.
- Ángulos en radianes.
- Graficador con escala uniforme, muestreo por píxel y corte de discontinuidades.
- GitHub Pages vía Actions + rutas relativas.
- Nada de: backend, login, persistencia, CAS, multi-idioma, PWA (fuera de alcance del MVP).
