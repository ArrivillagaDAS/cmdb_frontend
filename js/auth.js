import { api } from "./api.js";
import { $, $$, clearAlert, setBusy, setYear, showAlert } from "./utils.js";
import { saveSession } from "./session.js";

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function initAuth() {
  setYear();
  const alert = $("#auth-alert");
  const loginForm = $("#login-form");
  const registerForm = $("#register-form");
  if (!loginForm || !registerForm) {
    return;
  }
  const tabs = $$(".auth-tab");
  const switchTab = (mode) => {
    tabs.forEach((tab) => {
      const active = tab.dataset.tab === mode;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    loginForm.classList.toggle("hidden", mode !== "login");
    registerForm.classList.toggle("hidden", mode !== "register");
    clearAlert(alert);
  };
  tabs.forEach((tab) =>
    tab.addEventListener("click", () => switchTab(tab.dataset.tab)),
  );
  if (location.hash === "#registro") {
    switchTab("register");
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearAlert(alert);
    const button = $('button[type="submit"]', loginForm);
    const data = Object.fromEntries(new FormData(loginForm));
    if (!validEmail(data.email) || data.password.length < 8) {
      return showAlert(
        alert,
        "Escribe un correo válido y una contraseña de al menos 8 caracteres.",
      );
    }
    setBusy(button, true);
    try {
      const result = await api.auth.login({
        email: data.email.trim().toLowerCase(),
        password: data.password,
      });
      saveSession(result);
      const next = new URLSearchParams(location.search).get("next");
      const nextUrl =
        next &&
        next.startsWith("/") &&
        !next.startsWith("//") &&
        !next.includes("\\")
          ? new URL(next, location.origin)
          : null;
      location.assign(
        nextUrl?.origin === location.origin ? nextUrl.href : "/html/index.html",
      );
    } catch (error) {
      showAlert(alert, error.message || "No fue posible iniciar sesión.");
    } finally {
      setBusy(button, false);
    }
  });

  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearAlert(alert);
    const button = $('button[type="submit"]', registerForm);
    const data = Object.fromEntries(new FormData(registerForm));
    if (data.name.trim().length < 2 || !validEmail(data.email)) {
      return showAlert(alert, "Revisa tu nombre y escribe un correo válido.");
    }
    if (data.password.length < 8 || data.password.length > 128) {
      return showAlert(
        alert,
        "La contraseña debe tener entre 8 y 128 caracteres.",
      );
    }
    if (data.password !== data.confirmPassword) {
      return showAlert(alert, "Las contraseñas no coinciden.");
    }
    setBusy(button, true);
    try {
      const result = await api.auth.register({
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        password: data.password,
      });
      if (result?.accessToken || result?.token) {
        saveSession(result);
        location.assign("/html/index.html");
      } else {
        showAlert(alert, "Cuenta creada. Ya puedes iniciar sesión.", true);
        registerForm.reset();
        switchTab("login");
      }
    } catch (error) {
      showAlert(alert, error.message || "No fue posible crear la cuenta.");
    } finally {
      setBusy(button, false);
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAuth);
} else {
  initAuth();
}
