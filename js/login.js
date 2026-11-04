import { login, register, ApiError } from "./api.js";
import { saveSession, isLoggedIn, isAdmin } from "./auth.js";
import { showAlert, clearAlert } from "./utils.js";

const loginForm = document.querySelector("#login-form");
const registerForm = document.querySelector("#register-form");
const alertBox = document.querySelector("#auth-alert");
const tabs = [...document.querySelectorAll("[data-tab]")];

function selectTab(name) {
  const isRegister = name === "register";
  loginForm.classList.toggle("hidden", isRegister);
  registerForm.classList.toggle("hidden", !isRegister);
  tabs.forEach((tab) => {
    const selected = tab.dataset.tab === name;
    tab.classList.toggle("active", selected);
    tab.setAttribute("aria-selected", String(selected));
  });
  clearAlert(alertBox);
}

function goHome() {
  location.replace(isAdmin() ? "/html/admin/index.html" : "/html/index.html");
}

if (isLoggedIn()) goHome();
selectTab(location.hash === "#registro" ? "register" : "login");

tabs.forEach((tab) => tab.addEventListener("click", () => selectTab(tab.dataset.tab)));

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearAlert(alertBox);
  const button = loginForm.querySelector("[type='submit']");
  const { email, password } = Object.fromEntries(new FormData(loginForm));
  button.disabled = true;

  const { email, password } = Object.fromEntries(new FormData(loginForm));
  const button = loginForm.querySelector('button[type="submit"]');
  setBusy(button, true);
  try {
    saveSession(await login({ email: email.trim(), password }));
    goHome();
  } catch (error) {
    showAlert(
      alertBox,
      error instanceof ApiError ? error.message : "No se pudo iniciar sesión. Intenta de nuevo.",
    );
  } finally {
    button.disabled = false;
  }
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearAlert(alertBox);
  const { username, email, password, confirmPassword } = Object.fromEntries(
    new FormData(registerForm),
  );

  if (password !== confirmPassword) {
    showAlert(alertBox, "Las contraseñas no coinciden.");
    return;
  }

  const button = registerForm.querySelector("[type='submit']");
  button.disabled = true;
  try {
    await register({ username: username.trim(), email: email.trim(), password });
    registerForm.reset();
    selectTab("login");
    showAlert(alertBox, "Cuenta creada. Ya puedes iniciar sesión.", "success");
  } catch (error) {
    showAlert(
      alertBox,
      error instanceof ApiError ? error.message : "No se pudo crear la cuenta. Intenta de nuevo.",
    );
  } finally {
    button.disabled = false;
  }
});

document.querySelectorAll("[data-year]").forEach((el) => {
  el.textContent = new Date().getFullYear();
});
