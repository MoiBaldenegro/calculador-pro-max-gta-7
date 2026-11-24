# Calculador Pro Max GTA 7

Calculadora científica web + graficador de funciones `f(x)`. 100 % estática
(HTML/CSS/JS vanilla con ES modules), sin backend y sin dependencias de runtime.
Los ángulos se trabajan en **radianes**.

## Estado

Esqueleto del proyecto (F1). La calculadora (F3), el motor de expresiones (F2)
y el graficador (F4/F5) se implementan en las siguientes features. Ver
`docs/backlog.md`.

## Correr en local

Los ES modules no cargan con `file://`; hay que servir por HTTP:

```bash
python -m http.server 8080
# abrir http://localhost:8080/
```

## Despliegue (GitHub Pages)

Cada push a `main` ejecuta `.github/workflows/deploy.yml`, que publica la raíz
del repo. Sitio: https://moibaldenegro.github.io/calculador-pro-max-gta-7/

Paso manual (una sola vez): en GitHub, **Settings → Pages → Build and
deployment → Source = GitHub Actions**. Sin esto el workflow falla en
`configure-pages`/`deploy-pages`. Todas las rutas del sitio son relativas
(`./css/...`, `./js/...`) porque se sirve bajo un subpath.

## Tests

```bash
npm test   # ejecuta: node --test test/
```

## Estructura

- `index.html` — página única con las secciones de calculadora y graficador.
- `css/styles.css` — estilos y layout.
- `js/app.js` — arranque y cableado de la UI.
- `js/calculator.js`, `js/grapher.js` — capas de UI (DOM / Canvas).
- `js/coords.js` — transformaciones viewport ↔ píxeles (puro).
- `js/expr/` — motor de expresiones: `tokenizer`, `parser`, `evaluator`, `functions` (puro).
- `test/` — tests smoke con el runner nativo de Node.

Documentación de producto y técnica en `docs/` (`vision.md`, `architecture.md`,
`backlog.md`).
