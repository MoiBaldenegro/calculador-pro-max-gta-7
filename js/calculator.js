/**
 * Controlador + vista de la calculadora científica.
 *
 * Capa de UI: la única que toca el DOM para la calculadora. En F1 solo monta
 * una estructura mínima; el display, los botones, el teclado y el historial
 * se implementan en F3, consumiendo el motor de `./expr/`.
 */

/**
 * Monta la interfaz de la calculadora dentro del contenedor dado.
 *
 * @param {HTMLElement} root - Sección `#calculadora` donde se renderiza la UI.
 * @returns {void}
 */
export function mountCalculator(root) {
  const status = document.createElement("p");
  status.className = "placeholder";
  status.textContent =
    "Calculadora pendiente (F3). El motor de expresiones llega en F2.";
  root.appendChild(status);
}
