import { mountCalculator } from "./calculator.js";
import { mountGrapher } from "./grapher.js";

/**
 * Arranque de la aplicación: monta la calculadora y el graficador en sus
 * secciones de `index.html` y actualiza el estado del pie de página.
 * Es el único punto de entrada; no contiene lógica de negocio.
 */
function main() {
  const calcRoot = document.querySelector("#calculadora");
  const graphRoot = document.querySelector("#graficador");

  if (calcRoot) {
    mountCalculator(calcRoot);
  }
  if (graphRoot) {
    mountGrapher(graphRoot);
  }

  const estado = document.querySelector("#estado");
  if (estado) {
    estado.textContent = "listo";
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", main);
} else {
  main();
}
