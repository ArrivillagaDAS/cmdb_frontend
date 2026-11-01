import { login, ApiError } from "./api.js";
import { saveSession, isLoggedIn, isAdmin } from "./auth.js";
import { showAlert, clearAlert, showFieldErrors } from "./utils.js";

const goHome = () => {
  location.href = isAdmin() ? "./admin.html" : "./index.html";
};

// Si ya hay sesión, no mostrar el login
if (isLoggedIn()) goHome();

const form = document.querySelector("#login-form");
const alertBox = document.querySelector("#alert");
const submitButton = form.querySelector("button[type='submit']");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearAlert(alertBox);
  showFieldErrors(form, []);

  const { email, password } = Object.fromEntries(new FormData(form));
  submitButton.disabled = true;

  try {
    const session = await login({ email: email.trim(), password });
    saveSession(session);
    goHome();
  } catch (err) {
    if (err instanceof ApiError) {
      showFieldErrors(form, err.errors);
      showAlert(alertBox, err.message);
    } else {
      showAlert(alertBox, "Error inesperado. Intenta de nuevo.");
    }
  } finally {
    submitButton.disabled = false;
  }
});