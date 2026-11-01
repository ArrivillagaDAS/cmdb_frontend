import { api, unwrapList } from "./api.js";
import { config } from "./config.js";
import {
  $,
  backdropUrl,
  escapeHtml,
  formatRating,
  posterUrl,
  renderError,
  setBusy,
  setYear,
  showAlert,
  titleName,
  titleRating,
  titleType,
} from "./utils.js";
import { getToken } from "./session.js";

const id = new URLSearchParams(location.search).get("id");

function renderDetail(item) {
  const poster = posterUrl(item, config.tmdbDetailPosterSize);
  const backdrop = backdropUrl(item);
  const genres = Array.isArray(item.genres)
    ? item.genres
    : String(item.genres ?? "")
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean);
  const element = $("#detail-content");
  const posterMarkup = poster
    ? `<img
        class="detail-poster"
        src="${escapeHtml(poster)}"
        alt="Póster de ${escapeHtml(titleName(item))}"
      />`
    : `<div class="detail-poster poster-placeholder">
        ${escapeHtml(titleName(item))}
      </div>`;

  element.innerHTML = `
    <section class="detail-hero">
      ${backdrop ? `<img class="detail-backdrop" src="${escapeHtml(backdrop)}" alt="" />` : ""}
      <div>${posterMarkup}</div>
      <div class="detail-info">
        <p class="eyebrow">${escapeHtml(titleType(item))} · ARCHIVO CMDB</p>
        <h1>${escapeHtml(titleName(item))}</h1>
        <div class="detail-meta">
          <span class="detail-score">★ ${formatRating(titleRating(item))}</span>
          <span>${item.releaseYear ? escapeHtml(item.releaseYear) : "Año desconocido"}</span>
          <span>${Number(item.reviewCount ?? 0)} reseñas</span>
        </div>
        <p class="detail-synopsis">
          ${escapeHtml(item.synopsis ?? "Esta historia aún no tiene sinopsis.")}
        </p>
        <div class="detail-genres">
          ${genres.map((genre) => `<span>${escapeHtml(genre)}</span>`).join("")}
        </div>
      </div>
    </section>
  `;
  document.title = `${titleName(item)} — CMDB`;
}

function renderReviews(items) {
  const list = $("#review-list");
  $("#review-count").textContent = `${items.length} reseñas`;
  if (!items.length) {
    list.innerHTML =
      '<p class="loading-state">Aún no hay reseñas. Sé la primera persona en compartir su mirada.</p>';
    return;
  }
  list.innerHTML = items
    .map((review) => {
      const votes = review.votes ?? {};
      const liked = review.myVote === "like";
      const disliked = review.myVote === "dislike";
      const numericRating = Number(review.rating);
      const safeRating = Number.isFinite(numericRating)
        ? Math.min(5, Math.max(0, Math.round(numericRating)))
        : 0;
      return `
        <article class="review-card" data-review-id="${escapeHtml(review.id)}">
          <div class="review-card-head">
            <div>
              <span class="review-author">
                ${escapeHtml(review.user?.name ?? review.authorName ?? "Miembro CMDB")}
              </span>
              <span class="review-date">
                · ${escapeHtml(review.createdAt ? new Date(review.createdAt).toLocaleDateString("es") : "")}
              </span>
            </div>
            <span class="review-stars" aria-label="${safeRating} de 5">
              ${"★".repeat(safeRating)}${"☆".repeat(5 - safeRating)}
            </span>
          </div>
          <p class="review-body">
            ${escapeHtml(review.body ?? review.content ?? "")}
          </p>
          <div class="review-actions">
            <button
              class="vote-button ${liked ? "active" : ""}"
              data-vote="like"
              ${getToken() ? "" : "disabled"}
              aria-label="Me gusta"
            >
              ↑ ${Number(votes.likes ?? review.likes ?? 0)}
            </button>
            <button
              class="vote-button ${disliked ? "active" : ""}"
              data-vote="dislike"
              ${getToken() ? "" : "disabled"}
              aria-label="No me gusta"
            >
              ↓ ${Number(votes.dislikes ?? review.dislikes ?? 0)}
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

async function loadReviews() {
  const result = await api.reviews.list(id, { status: "approved" });
  renderReviews(unwrapList(result).items);
}

async function init() {
  setYear();
  const reviewForm = $("#review-form");
  if (!id) {
    renderError(
      $("#detail-content"),
      "Falta el identificador del título en la dirección.",
    );
    reviewForm.classList.add("hidden");
    return;
  }
  if (!getToken()) {
    reviewForm
      .querySelector("h3")
      .insertAdjacentHTML(
        "afterend",
        '<p class="form-footnote">Para publicar una reseña, <a class="text-link" href="/html/login.html">inicia sesión</a>.</p>',
      );
  }
  try {
    const title = await api.titles.get(id);
    renderDetail(title);
  } catch (error) {
    renderError($("#detail-content"), error.message);
    reviewForm.classList.add("hidden");
  }
  try {
    await loadReviews();
  } catch (error) {
    renderError($("#review-list"), error.message);
  }

  reviewForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const alert = $("#review-alert");
    alert.classList.add("hidden");
    if (!getToken()) {
      showAlert(alert, "Inicia sesión antes de enviar una reseña.");
      return;
    }
    const data = Object.fromEntries(new FormData(reviewForm));
    if (!data.rating || data.body.trim().length < 20) {
      showAlert(
        alert,
        "Elige una calificación y escribe al menos 20 caracteres.",
      );
      return;
    }
    const button = reviewForm.querySelector('button[type="submit"]');
    setBusy(button, true);
    try {
      await api.reviews.create(id, {
        rating: Number(data.rating),
        body: data.body.trim(),
      });
      reviewForm.reset();
      showAlert(
        alert,
        "Reseña enviada. Aparecerá cuando el equipo la apruebe.",
        true,
      );
    } catch (error) {
      showAlert(alert, error.message);
    } finally {
      setBusy(button, false);
    }
  });

  $("#review-list").addEventListener("click", async (event) => {
    const button = event.target.closest("[data-vote]");
    if (!button) {
      return;
    }
    if (!getToken()) {
      location.assign("/html/login.html");
      return;
    }
    button.disabled = true;
    try {
      await api.reviews.vote(
        button.closest("[data-review-id]").dataset.reviewId,
        button.dataset.vote,
      );
      await loadReviews();
    } catch (error) {
      showAlert($("#review-alert"), error.message);
    } finally {
      button.disabled = false;
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
