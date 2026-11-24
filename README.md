# Calculador Pro Max GTA 7

Calculadora científica web con graficador de funciones `f(x)`. Es 100 % estática
(HTML/CSS/JS vanilla con ES modules y Canvas 2D), sin backend, sin build y sin
dependencias de runtime. La interfaz está en español.

**Sitio publicado:** https://moibaldenegro.github.io/calculador-pro-max-gta-7/

> **Nota importante: los ángulos están en radianes.** `sin(pi/2)` vale `1`;
> `sin(90)` NO es 1. Para convertir grados a radianes usa `grados*pi/180`.

## Cómo usar

### Calculadora

- Escribe una expresión en el display o usa los botones; el teclado físico
  también funciona.
- **Enter** o `=` evalúan; **Escape** limpia.
- Operadores: `+ - * / ^` (también `×`, `÷`, `−`), paréntesis y multiplicación
  implícita (`2x`, `2sin(x)`). `^` es asociativo a la derecha y `-2^2 = -4`.
- Funciones: `sin cos tan asin acos atan log ln exp sqrt abs` (`√(` es alias de
  `sqrt`). `log` es base 10 y `ln` base e.
- Constantes: `pi` (o `π`) y `e`.
- Los errores (sintaxis, división por cero, fuera de dominio) se muestran en
  español sin romper la página. Se guarda un historial de los últimos 20
  cálculos, solo en memoria (se pierde al recargar).

### Graficador

- Escribe una función de `x`, por ejemplo `sin(x)`, `x^2` o `1/x`.
- **Varias funciones:** botón de añadir; cada una tiene su color, puede
  ocultarse/mostrarse o quitarse, y muestra su propio error si es inválida.
- **Zoom:** rueda del ratón (anclado al cursor), botones `+` / `−`, o teclas
  `+` / `-` con el canvas enfocado.
- **Paneo:** arrastrar con ratón o dedo.
- **Restablecer vista:** botón ⟲ o tecla `0`.
- Los puntos donde la función no está definida se omiten (no se dibujan líneas
  espurias en asíntotas como `tan(x)`).

## Correr en local

Los ES modules no cargan con `file://`; hay que servir por HTTP. Requiere
Python 3:

```bash
python -m http.server 8080
# abrir http://localhost:8080/
```

## Pruebas

Requiere Node.js (≥ 18; el proyecto se desarrolló con Node 26). No hay
dependencias que instalar:

```bash
npm test   # ejecuta: node --test test/
```

Cubren el motor de expresiones, las utilidades de la calculadora, las
coordenadas del viewport y el muestreo/gestión de funciones del graficador.

## Despliegue (GitHub Pages)

Cada push a `main` ejecuta `.github/workflows/deploy.yml`, que publica la raíz
del repo con GitHub Actions en la URL indicada arriba.

Paso manual (una sola vez): en GitHub, **Settings → Pages → Build and
deployment → Source = GitHub Actions**. Sin esto el workflow falla en
`configure-pages`/`deploy-pages`. También se puede lanzar a mano desde la
pestaña Actions (*workflow_dispatch*).

Todas las rutas del sitio son relativas (`./css/...`, `./js/...`) porque se
sirve bajo el subpath `/calculador-pro-max-gta-7/`; mantén esa convención.

## Estructura

- `index.html` — página única con las secciones de calculadora y graficador.
- `css/styles.css` — estilos, layout responsive y foco accesible.
- `js/app.js` — arranque y cableado de la UI.
- `js/calculator.js`, `js/grapher.js` — capas de UI (DOM / Canvas).
- `js/coords.js` — transformaciones viewport ↔ píxeles, zoom y paneo (puro).
- `js/expr/` — motor de expresiones propio (sin `eval`): `tokenizer`, `parser`,
  `evaluator`, `functions` (puro).
- `test/` — tests con el runner nativo de Node.
- `.github/workflows/deploy.yml` — despliegue a GitHub Pages.

Documentación de producto y técnica en `docs/` (`vision.md`, `architecture.md`,
`backlog.md`).
