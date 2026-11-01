import { api } from "./api.js";
import { config } from "./config.js";
import { getToken } from "./session.js";

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [
  ...root.querySelectorAll(selector),
];
export const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
export const safeImage = (value) => {
  try {
    const url = new URL(value, location.origin);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
};
export const titleName = (item) =>
  item?.title ?? item?.name ?? item?.originalTitle ?? "Sin título";
export const titleId = (item) =>
  item?.id ?? item?.titleId ?? item?.title_id ?? item?.tmdbId;
export const titleType = (item) =>
  ({ movie: "Película", anime: "Anime", series: "Serie" })[item?.type] ??
  item?.type ??
  "Título";
export const titleRating = (item) => {
  const rating = Number(
    item?.averageRating ??
      item?.average_rating ??
      item?.rating ??
      item?.score ??
      0,
  );
  return Number.isFinite(rating) ? rating : 0;
};
export const formatRating = (rating) =>
  (Number.isFinite(Number(rating)) ? Number(rating) : 0).toFixed(1);
export function tmdbImageUrl(path, size = config.tmdbPosterSize) {
  if (typeof path !== "string" || !path.trim()) {
    return "";
  }

  const normalizedPath = path.trim().replace(/^\/+/, "");
  if (normalizedPath.split("/").includes("..")) {
    return "";
  }

  return `${config.tmdbImageBaseUrl}/${size}/${normalizedPath
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

export const posterUrl = (item, size = config.tmdbPosterSize) =>
  safeImage(item?.posterUrl ?? item?.poster ?? "") ||
  tmdbImageUrl(item?.posterPath ?? item?.tmdb?.posterPath, size);

export const backdropUrl = (item) =>
  safeImage(item?.backdropUrl ?? "") ||
  tmdbImageUrl(
    item?.backdropPath ?? item?.tmdb?.backdropPath,
    config.tmdbBackdropSize,
  );
export function setYear() {
  $$("[data-year]").forEach(
    (node) => (node.textContent = new Date().getFullYear()),
  );
}
export function showAlert(element, message, success = false) {
  if (!element) {
    return;
  }
  element.textContent = message;
  element.classList.remove("hidden", "success");
  if (success) {
    element.classList.add("success");
  }
}
export function clearAlert(element) {
  if (element) {
    element.classList.add("hidden");
  }
}
export function setBusy(button, busy, label = "Procesando…") {
  if (!button) {
    return;
  }
  if (busy) {
    button.dataset.originalText = button.innerHTML;
    button.innerHTML = escapeHtml(label);
    button.disabled = true;
  } else {
    button.innerHTML = button.dataset.originalText || button.innerHTML;
    button.disabled = false;
  }
}
export function posterCard(item) {
  const id = titleId(item);
  const poster = posterUrl(item);
  const detailUrl = `/html/detail.html?id=${encodeURIComponent(id ?? "")}`;
  const image = poster
    ? `<img
        class="poster-image"
        src="${escapeHtml(poster)}"
        alt="Póster de ${escapeHtml(titleName(item))}"
        loading="lazy"
      />`
    : `<span class="poster-placeholder">${escapeHtml(titleName(item))}</span>`;
  return `
    <article class="poster-card">
      <a class="poster-link" href="${detailUrl}">
        ${image}
        <span class="poster-overlay">
          <span>
            ${escapeHtml(titleType(item))}
            ${item?.releaseYear ? ` · ${escapeHtml(item.releaseYear)}` : ""}
          </span>
          <p>${escapeHtml(item?.synopsis ?? "Descubre la ficha y comparte tu reseña.")}</p>
        </span>
      </a>
      <div class="poster-caption">
        <h3><a href="${detailUrl}">${escapeHtml(titleName(item))}</a></h3>
        <p>
          <span>${escapeHtml(titleType(item))}</span>
          <span class="rating">★ ${formatRating(titleRating(item))}</span>
        </p>
      </div>
    </article>
  `;
}
export function rankCard(item, index) {
  const poster = posterUrl(item);
  const detailUrl = `/html/detail.html?id=${encodeURIComponent(titleId(item) ?? "")}`;
  const posterMarkup = poster
    ? `<img
        class="rank-poster"
        src="${escapeHtml(poster)}"
        alt=""
        loading="lazy"
      />`
    : '<span class="rank-poster"></span>';

  return `
    <a class="rank-card" href="${detailUrl}">
      <span class="rank-number">${String(index + 1).padStart(2, "0")}</span>
      ${posterMarkup}
      <span class="rank-info">
        <strong>${escapeHtml(titleName(item))}</strong>
        <span>${escapeHtml(titleType(item))}</span>
        <span class="rank-rating">★ ${formatRating(titleRating(item))}</span>
      </span>
    </a>
  `;
}
export function renderError(container, message) {
  if (container) {
    container.innerHTML = `<div class="loading-state">${escapeHtml(message)}</div>`;
  }
}
export async function requireAdmin() {
  if (!getToken()) {
    location.replace("/html/login.html?next=%2Fhtml%2Fadmin.html");
    return false;
  }
  let user;
  try {
    const profile = await api.auth.me();
    user = profile?.user ?? profile;
    if (!user) {
      throw new Error("La API no devolvió el perfil actual.");
    }
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) {
      location.replace("/html/login.html?next=%2Fhtml%2Fadmin.html");
    } else {
      showAlert($("#admin-alert"), error.message);
    }
    return false;
  }
  const role = String(user?.role ?? user?.userRole ?? "").toLowerCase();
  if (!["admin", "administrator"].includes(role)) {
    location.replace("/html/index.html");
    return false;
  }
  return true;
}
