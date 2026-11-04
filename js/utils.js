import { isLoggedIn, logout } from "./auth.js";
import { ApiError } from "./api.js";

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
}

// Alerts can be hidden by the "hidden" class or the hidden attribute; both are handled
export function showAlert(box, message, type = "error") {
  box.textContent = message;
  box.className = type === "success" || type === true ? "alert success" : "alert";
  box.hidden = false;
}

export function clearAlert(box) {
  box.textContent = "";
  box.hidden = true;
}

// Fills <small data-error-for="field"> elements with backend validation errors
export function showFieldErrors(form, errors = []) {
  form.querySelectorAll("[data-error-for]").forEach((el) => (el.textContent = ""));
  for (const { field, message } of errors) {
    const el = form.querySelector(`[data-error-for="${field}"]`);
    if (el) el.textContent = message;
  }
}
