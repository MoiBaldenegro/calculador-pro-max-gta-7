/**
 * Controlador + vista de la calculadora científica.
 *
 * Capa de UI: la única que toca el DOM para la calculadora. Monta el display,
 * el teclado en pantalla, la entrada por teclado físico, los mensajes de error
 * en español y el historial de la sesión (en memoria, sin persistencia).
 * Consume el motor puro de `./expr/` (`parse` + `evaluate`).
 *
 * Las funciones puras de edición de texto, cálculo y historial se exportan
 * para poder probarlas en Node sin DOM.
 */

import { parse } from "./expr/parser.js";
import { evaluate } from "./expr/evaluator.js";

/** Número máximo de cálculos que se conservan en el historial de la sesión. */
export const HISTORY_LIMIT = 20;

/**
 * @typedef {Object} HistoryEntry
 * @property {string} expression - Expresión tal como la escribió el usuario.
 * @property {string} result - Resultado ya formateado para mostrar.
 */

function clamp(value, min, max) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return max;
  }
  return Math.min(Math.max(value, min), max);
}

/**
 * Crea un historial de sesión vacío. No hay persistencia: se pierde al recargar.
 *
 * @returns {HistoryEntry[]}
 */
export function createHistory() {
  return [];
}

/**
 * Evalúa una expresión de la calculadora encadenando `parse` y `evaluate`.
 * Nunca lanza: devuelve el resultado tipado del motor.
 *
 * @param {string} text
 * @returns {{ok: true, value: number} | {ok: false, error: {type: string, message: string, position: number}}}
 */
export function compute(text) {
  const expression = String(text ?? "").trim();
  if (expression === "") {
    return {
      ok: false,
      error: { type: "syntax", message: "Expresión vacía", position: 0 },
    };
  }
  try {
    const parsed = parse(expression);
    if (!parsed.ok) {
      return parsed;
    }
    return evaluate(parsed.value);
  } catch (error) {
    return {
      ok: false,
      error: {
        type: "syntax",
        message: "No se pudo evaluar la expresión",
        position: 0,
      },
    };
  }
}

/**
 * Formatea un número para el display y el historial, evitando artefactos de
 * coma flotante (`0.30000000000000004` → `0.3`).
 *
 * @param {number} value
 * @returns {string}
 */
export function formatResult(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return String(value);
  }
  if (Object.is(value, -0)) {
    return "0";
  }
  return String(Number(value.toPrecision(12)));
}

/**
 * Inserta un fragmento de texto en una posición, respetando una selección.
 *
 * @param {string} text - Contenido actual del display.
 * @param {number} start - Inicio de la selección.
 * @param {number} end - Fin de la selección.
 * @param {string} snippet - Texto a insertar.
 * @returns {{value: string, caret: number}}
 */
export function insertAt(text, start, end, snippet) {
  const value = String(text ?? "");
  const from = clamp(start, 0, value.length);
  const to = clamp(end ?? from, from, value.length);
  const insert = String(snippet ?? "");
  return {
    value: value.slice(0, from) + insert + value.slice(to),
    caret: from + insert.length,
  };
}

/**
 * Borra el carácter anterior al cursor o la selección actual.
 *
 * @param {string} text
 * @param {number} start
 * @param {number} end
 * @returns {{value: string, caret: number}}
 */
export function deleteBefore(text, start, end) {
  const value = String(text ?? "");
  const from = clamp(start, 0, value.length);
  const to = clamp(end ?? from, from, value.length);
  if (from !== to) {
    return { value: value.slice(0, from) + value.slice(to), caret: from };
  }
  if (from === 0) {
    return { value, caret: 0 };
  }
  return {
    value: value.slice(0, from - 1) + value.slice(from),
    caret: from - 1,
  };
}

/**
 * Añade una entrada al principio del historial y recorta al límite.
 *
 * @param {HistoryEntry[]} history
 * @param {HistoryEntry} entry
 * @param {number} [limit]
 * @returns {HistoryEntry[]}
 */
export function pushHistory(history, entry, limit = HISTORY_LIMIT) {
  const entries = Array.isArray(history) ? history : [];
  const max = typeof limit === "number" && limit > 0 ? Math.floor(limit) : HISTORY_LIMIT;
  return [entry, ...entries].slice(0, max);
}

/**
 * Distribución del teclado en pantalla. El orden define las 6 filas de 5
 * columnas del grid. `insert` añade texto; `action` dispara un comando.
 *
 * @type {{label: string, insert?: string, action?: string, variant: string, aria?: string}[]}
 */
const KEYPAD = [
  { label: "sin", insert: "sin(", variant: "fn", aria: "seno" },
  { label: "cos", insert: "cos(", variant: "fn", aria: "coseno" },
  { label: "tan", insert: "tan(", variant: "fn", aria: "tangente" },
  { label: "log", insert: "log(", variant: "fn", aria: "logaritmo base 10" },
  { label: "ln", insert: "ln(", variant: "fn", aria: "logaritmo natural" },

  { label: "exp", insert: "exp(", variant: "fn", aria: "exponencial" },
  { label: "√", insert: "√(", variant: "fn", aria: "raíz cuadrada" },
  { label: "^", insert: "^", variant: "op", aria: "potencia" },
  { label: "(", insert: "(", variant: "op", aria: "abrir paréntesis" },
  { label: ")", insert: ")", variant: "op", aria: "cerrar paréntesis" },

  { label: "7", insert: "7", variant: "digit" },
  { label: "8", insert: "8", variant: "digit" },
  { label: "9", insert: "9", variant: "digit" },
  { label: "÷", insert: "÷", variant: "op", aria: "dividir" },
  { label: "Borrar", action: "backspace", variant: "action", aria: "borrar" },

  { label: "4", insert: "4", variant: "digit" },
  { label: "5", insert: "5", variant: "digit" },
  { label: "6", insert: "6", variant: "digit" },
  { label: "×", insert: "×", variant: "op", aria: "multiplicar" },
  { label: "Limpiar", action: "clear", variant: "action", aria: "limpiar" },

  { label: "1", insert: "1", variant: "digit" },
  { label: "2", insert: "2", variant: "digit" },
  { label: "3", insert: "3", variant: "digit" },
  { label: "−", insert: "−", variant: "op", aria: "restar" },
  { label: "+", insert: "+", variant: "op", aria: "sumar" },

  { label: "0", insert: "0", variant: "digit" },
  { label: ".", insert: ".", variant: "digit", aria: "punto decimal" },
  { label: "π", insert: "π", variant: "const", aria: "pi" },
  { label: "e", insert: "e", variant: "const", aria: "e" },
  { label: "=", action: "equals", variant: "equals", aria: "igual" },
];

/**
 * Monta la interfaz de la calculadora dentro del contenedor dado.
 *
 * @param {HTMLElement} root - Sección `#calculadora` donde se renderiza la UI.
 * @returns {{input: HTMLInputElement, destroy: () => void} | null}
 */
export function mountCalculator(root) {
  if (!root || typeof root.appendChild !== "function" || typeof document === "undefined") {
    return null;
  }

  const container = document.createElement("div");
  container.className = "calc";

  const form = document.createElement("form");
  form.className = "calc-display-form";

  const label = document.createElement("label");
  label.className = "visually-hidden";
  label.htmlFor = "calc-input";
  label.textContent = "Expresión";

  const input = document.createElement("input");
  input.id = "calc-input";
  input.className = "calc-input";
  input.type = "text";
  input.autocomplete = "off";
  input.spellcheck = false;
  input.setAttribute("inputmode", "text");
  input.setAttribute("aria-label", "Expresión matemática");
  input.placeholder = "Escribe una expresión, p. ej. 2+3×4";

  form.append(label, input);

  const result = document.createElement("output");
  result.className = "calc-result";
  result.setAttribute("aria-live", "polite");
  result.setAttribute("aria-atomic", "true");

  const keys = document.createElement("div");
  keys.className = "calc-keys";
  keys.setAttribute("role", "group");
  keys.setAttribute("aria-label", "Teclado de la calculadora");

  const historyTitle = document.createElement("h3");
  historyTitle.id = "calc-history-title";
  historyTitle.className = "calc-history-title";
  historyTitle.textContent = "Historial";

  const historyEmpty = document.createElement("p");
  historyEmpty.className = "calc-history-empty";
  historyEmpty.textContent = "Aún no hay cálculos.";

  const historyList = document.createElement("ol");
  historyList.className = "calc-history-list";

  const historySection = document.createElement("section");
  historySection.className = "calc-history";
  historySection.setAttribute("aria-labelledby", "calc-history-title");
  historySection.append(historyTitle, historyEmpty, historyList);

  container.append(form, result, keys, historySection);
  root.appendChild(container);

  let history = createHistory();

  function setResult(text, isError) {
    result.textContent = text;
    result.classList.toggle("is-error", Boolean(isError));
  }

  function renderHistory() {
    historyList.textContent = "";
    const hasEntries = history.length > 0;
    historyEmpty.hidden = hasEntries;
    historyList.hidden = !hasEntries;
    if (!hasEntries) {
      return;
    }
    for (const entry of history) {
      const item = document.createElement("li");
      item.className = "calc-history-item";

      const expression = document.createElement("span");
      expression.className = "calc-history-expr";
      expression.textContent = entry.expression;

      const equals = document.createElement("span");
      equals.className = "calc-history-eq";
      equals.textContent = " = ";

      const value = document.createElement("span");
      value.className = "calc-history-result";
      value.textContent = entry.result;

      item.append(expression, equals, value);
      historyList.appendChild(item);
    }
  }

  function insertSnippet(snippet) {
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    const next = insertAt(input.value, start, end, snippet);
    input.value = next.value;
    input.setSelectionRange(next.caret, next.caret);
    input.focus();
  }

  function backspace() {
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    const next = deleteBefore(input.value, start, end);
    input.value = next.value;
    input.setSelectionRange(next.caret, next.caret);
    input.focus();
  }

  function clearAll() {
    input.value = "";
    setResult("", false);
    input.focus();
    input.setSelectionRange(0, 0);
  }

  function evaluateInput() {
    const text = input.value;
    input.focus();
    input.setSelectionRange(text.length, text.length);
    if (text.trim() === "") {
      setResult("", false);
      return;
    }
    const outcome = compute(text);
    if (!outcome.ok) {
      setResult(outcome.error.message, true);
      return;
    }
    const formatted = formatResult(outcome.value);
    setResult(`= ${formatted}`, false);
    history = pushHistory(history, { expression: text.trim(), result: formatted });
    renderHistory();
  }

  for (const key of KEYPAD) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `calc-key calc-key--${key.variant}`;
    button.textContent = key.label;
    if (key.aria) {
      button.setAttribute("aria-label", key.aria);
    }
    button.addEventListener("click", () => {
      if (key.action === "equals") {
        evaluateInput();
      } else if (key.action === "backspace") {
        backspace();
      } else if (key.action === "clear") {
        clearAll();
      } else {
        insertSnippet(key.insert);
      }
    });
    keys.appendChild(button);
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    evaluateInput();
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === "=") {
      event.preventDefault();
      evaluateInput();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      clearAll();
    }
  });

  function isEditable(element) {
    if (!element) {
      return false;
    }
    const tag = element.tagName;
    return (
      tag === "INPUT" ||
      tag === "TEXTAREA" ||
      tag === "SELECT" ||
      element.isContentEditable === true
    );
  }

  function isInteractive(element) {
    if (!element) {
      return false;
    }
    const tag = element.tagName;
    return tag === "BUTTON" || tag === "A" || isEditable(element);
  }

  function handleGlobalKeydown(event) {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }
    if (isInteractive(document.activeElement)) {
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      input.focus();
      evaluateInput();
      return;
    }
    if (event.key.length === 1 && /[0-9a-zA-Z.+\-*/^()π√×÷−]/.test(event.key)) {
      event.preventDefault();
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
      insertSnippet(event.key);
    }
  }

  document.addEventListener("keydown", handleGlobalKeydown);

  renderHistory();
  input.focus();

  return {
    input,
    destroy() {
      document.removeEventListener("keydown", handleGlobalKeydown);
      container.remove();
    },
  };
}
