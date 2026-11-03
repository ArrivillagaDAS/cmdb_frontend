export function showAlert(box, message, type = "error") {
  box.textContent = message;
  box.className = type === "success" || type === true ? "alert success" : "alert";
  box.hidden = false;
}

export function clearAlert(box) {
  box.textContent = "";
  box.hidden = true;
}

// Busca elementos como <small data-error-for="email"></small>
export function showFieldErrors(form, errors = []) {
  form.querySelectorAll("[data-error-for]").forEach((el) => (el.textContent = ""));
  for (const { field, message } of errors) {
    const el = form.querySelector(`[data-error-for="${field}"]`);
    if (el) el.textContent = message;
  }
}
