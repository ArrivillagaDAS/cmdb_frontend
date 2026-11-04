import { clearSession, getUser, isAdmin, isLoggedIn } from "../auth.js";

const links = [
  ["dashboard", "Resumen", "./index.html"],
  ["works", "Obras", "./works.html"],
  ["categories", "Categorías", "./categories.html"],
  ["users", "Usuarios", "./users.html"],
];

export function protectAdminPage() {
  if (!isLoggedIn()) {
    location.replace("/html/login.html");
    return false;
  }
  if (!isAdmin()) {
    location.replace("/html/index.html");
    return false;
  }
  return true;
}

export function initAdminShell(activePage) {
  const nav = document.querySelector("[data-admin-nav]");
  nav.replaceChildren(
    ...links.map(([id, label, href]) => {
      const link = document.createElement("a");
      link.href = href;
      link.textContent = label;
      link.classList.toggle("active", id === activePage);
      if (id === activePage) link.setAttribute("aria-current", "page");
      return link;
    }),
  );

  const user = getUser();
  const identity = document.querySelector("[data-admin-identity]");
  identity.textContent = user?.username || "Administrador";

  document.querySelector("[data-admin-logout]").addEventListener("click", () => {
    clearSession();
    location.replace("/html/index.html");
  });

  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
}

export function showAdminError(container, error) {
  const message = document.createElement("p");
  message.className = "admin-notice admin-notice-error";
  message.textContent = error?.message || "No se pudo cargar la información.";
  container.replaceChildren(message);
}
