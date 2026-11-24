/**
 * Controlador + vista del graficador de funciones `f(x)`.
 *
 * Capa de UI: la única que toca el Canvas. En F1 solo monta un `<canvas>`
 * vacío; el dibujo de ejes, la rejilla, el muestreo, el zoom y el paneo se
 * implementan en F4/F5 usando `./coords.js` y el motor de `./expr/`.
 */

/**
 * Monta el área del graficador dentro del contenedor dado.
 *
 * @param {HTMLElement} root - Sección `#graficador` donde se renderiza el canvas.
 * @returns {void}
 */
export function mountGrapher(root) {
  const canvas = document.createElement("canvas");
  canvas.className = "graph-canvas";
  canvas.width = 640;
  canvas.height = 360;
  canvas.setAttribute("aria-label", "Área del graficador (pendiente, F4)");

  const status = document.createElement("p");
  status.className = "placeholder";
  status.textContent = "Graficador pendiente (F4/F5).";

  root.append(canvas, status);
}
