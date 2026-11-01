import { config } from "./config.js";

import { isLoggedIn, isAdmin } from "./auth.js";

export function requireLogin() {
  if (!isLoggedIn()) location.href = "./login.html";
}

export function requireAdmin() {
  if (!isLoggedIn() || !isAdmin()) location.href = "./login.html";
}

export function getToken() {
  try {
    return localStorage.getItem(config.tokenKey);
  } catch {
    return null;
  }
}

export function saveSession(payload) {
  const token = payload?.accessToken ?? payload?.token;
  if (!token) {
    throw new Error("La API no devolvió un token de sesión válido.");
  }
  try {
    localStorage.setItem(config.tokenKey, token);
  } catch {
    throw new Error(
      "El navegador no permite guardar la sesión. Habilita el almacenamiento local e inténtalo de nuevo.",
    );
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(config.tokenKey);
  } catch {
    return;
  }
}

export function logout() {
  clearSession();
  location.assign("/html/index.html");
}
