import { config } from "./config.js";

const USER_KEY = "cmdb_user";

export function saveSession({ token, user }) {
  localStorage.setItem(config.tokenKey, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(config.tokenKey);
  localStorage.removeItem(USER_KEY);
}

export function getToken() {
  return localStorage.getItem(config.tokenKey);
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY));
  } catch {
    return null;
  }
}

export function isLoggedIn() {
  return Boolean(getToken());
}

export function isAdmin() {
  const user = getUser();
  return Boolean(user && (user.role === "admin" || user.administrator === true));
}