import {
  createReview,
  getMovie,
  listReviews,
  reactToReview,
  removeReviewReaction,
} from "./api.js";
import { getToken, getUser, isLoggedIn, clearSession } from "./auth.js";
import { posterUrl } from "./posters.js";
import { showAlert } from "./utils.js";

const movieId = new URLSearchParams(location.search).get("id");
const reactionByReview = new Map();
const element = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

function renderError(container, message) {
  container.replaceChildren(element("p", "alert", message));
}

function addPoster(container, movie) {
  const source = posterUrl(movie, "w780");
  if (!source) {
    container.append(element("div", "detail-poster poster-fallback", movie.movie_name));
    return;
  }
  const image = element("img", "detail-poster");
  image.src = source;
  image.alt = `Póster de ${movie.movie_name}`;
  image.loading = "eager";
  image.onerror = () => {
    const fallback = posterUrl({ ...movie, image_url: null }, "w780");
    if (fallback && image.src !== fallback) {
      image.src = fallback;
      image.onerror = () => image.replaceWith(element("div", "detail-poster poster-fallback", movie.movie_name));
    } else {
      image.replaceWith(element("div", "detail-poster poster-fallback", movie.movie_name));
    }
  };
  container.append(image);
}

function renderMovie(movie) {
  const root = document.querySelector("#detail-content");
  const hero = element("section", "detail-hero");
  const poster = element("div", "detail-poster-wrap");
  addPoster(poster, movie);

  const info = element("div", "detail-info");
  const average = Number(movie.average_rating || 0);
  const meta = element("div", "detail-meta");
  meta.append(
    element("span", "detail-score", `★ ${average.toFixed(1)} / 10`),
    element("span", "", movie.release_year || "Año desconocido"),
    element("span", "", `${Number(movie.rating_count || 0)} reseñas`),
  );
  info.append(
    element("p", "eyebrow", "PELÍCULA · ARCHIVO CMDB"),
    element("h1", "", movie.movie_name),
    meta,
    element("p", "detail-synopsis", movie.overview || "Esta película aún no tiene sinopsis."),
  );

  const categories = (movie.categories || []).map((category) => category.category_name).filter(Boolean);
  if (categories.length) {
    const genreList = element("div", "detail-genres");
    categories.forEach((name) => genreList.append(element("span", "", name)));
    info.append(genreList);
  }
  const credits = [];
  if (movie.directors?.length) credits.push(["Dirección", movie.directors.map((person) => person.director_name).join(", ")]);
  if (movie.actors?.length) credits.push(["Reparto", movie.actors.map((person) => person.actor_name).join(", ")]);
  credits.forEach(([label, names]) => {
    const line = element("p", "detail-credit");
    line.append(element("strong", "", `${label}: `), document.createTextNode(names));
    info.append(line);
  });

  hero.append(poster, info);
  root.replaceChildren(hero);
  document.title = `${movie.movie_name} — CMDB`;
}

function renderReviews(reviews) {
  const list = document.querySelector("#review-list");
  document.querySelector("#review-count").textContent = `${reviews.length} ${reviews.length === 1 ? "reseña" : "reseñas"}`;
  if (!reviews.length) {
    list.replaceChildren(element("p", "loading-state", "Todavía no hay reseñas. Sé la primera persona en compartir su opinión."));
    return;
  }

  const currentUserId = Number(getUser()?.id);
  list.replaceChildren(...reviews.map((review) => {
    const card = element("article", "review-card");
    card.dataset.reviewId = review.id;
    const head = element("div", "review-card-head");
    const author = element("div");
    author.append(
      element("span", "review-author", review.username || "Miembro CMDB"),
      element("span", "review-date", review.created_at ? ` · ${new Date(review.created_at).toLocaleDateString("es")}` : ""),
    );
    head.append(author, element("span", "review-stars", `${Number(review.rating)}/10`));
    card.append(head, element("h3", "review-title", review.title), element("p", "review-body", review.comment));

    const actions = element("div", "review-actions");
    const myReaction = reactionByReview.get(String(review.id));
    ["like", "dislike"].forEach((reaction) => {
      const isLike = reaction === "like";
      const button = element("button", `vote-button${myReaction === reaction ? " active" : ""}`, `${isLike ? "↑" : "↓"} ${Number(review[isLike ? "likes" : "dislikes"] || 0)}`);
      button.type = "button";
      button.dataset.reaction = reaction;
      button.disabled = !getToken() || Number(review.user_id) === currentUserId;
      button.setAttribute("aria-label", isLike ? "Me gusta" : "No me gusta");
      actions.append(button);
    });
    card.append(actions);
    return card;
  }));
}

async function loadReviews() {
  const reviews = await listReviews(movieId);
  renderReviews(Array.isArray(reviews) ? reviews : []);
}

function setupAuthLink() {
  const loginLink = document.querySelector("[data-auth-link]");
  const joinLink = document.querySelector("[data-join-link]");
  if (!isLoggedIn()) return;
  loginLink.textContent = "Cerrar sesión";
  loginLink.href = "#";
  loginLink.addEventListener("click", (event) => {
    event.preventDefault();
    clearSession();
    location.reload();
  });
  joinLink?.classList.add("hidden");
}

async function init() {
  setupAuthLink();
  document.querySelectorAll("[data-year]").forEach((node) => {
    node.textContent = new Date().getFullYear();
  });
  const reviewForm = document.querySelector("#review-form");
  const alertBox = document.querySelector("#review-alert");
  if (!movieId || !/^\d+$/.test(movieId) || Number(movieId) < 1) {
    renderError(document.querySelector("#detail-content"), "La dirección no contiene un identificador válido.");
    reviewForm.classList.add("hidden");
    return;
  }

  if (!getToken()) {
    const signIn = element("p", "form-footnote");
    signIn.append(document.createTextNode("Para publicar una reseña, "));
    const link = element("a", "text-link", "inicia sesión");
    link.href = "/html/login.html";
    signIn.append(link, document.createTextNode("."));
    reviewForm.prepend(signIn);
    reviewForm.querySelectorAll("input, textarea, select, button[type='submit']").forEach((control) => {
      control.disabled = true;
    });
  }

  try {
    renderMovie(await getMovie(movieId));
  } catch (error) {
    renderError(document.querySelector("#detail-content"), error.message || "No se pudo cargar la película.");
    reviewForm.classList.add("hidden");
    return;
  }
  try {
    await loadReviews();
  } catch (error) {
    renderError(document.querySelector("#review-list"), error.message || "No se pudieron cargar las reseñas.");
  }

  reviewForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(reviewForm));
    const button = reviewForm.querySelector("button[type='submit']");
    button.disabled = true;
    try {
      await createReview(movieId, {
        title: data.title.trim(),
        comment: data.comment.trim(),
        rating: Number(data.rating),
      });
      reviewForm.reset();
      showAlert(alertBox, "Tu reseña se publicó correctamente.", "success");
      await loadReviews();
    } catch (error) {
      showAlert(alertBox, error.message || "No se pudo publicar la reseña.");
    } finally {
      button.disabled = false;
    }
  });

  document.querySelector("#review-list").addEventListener("click", async (event) => {
    const button = event.target.closest("[data-reaction]");
    if (!button || !getToken()) return;
    const card = button.closest("[data-review-id]");
    const reviewId = card.dataset.reviewId;
    const reaction = button.dataset.reaction;
    button.disabled = true;
    try {
      if (reactionByReview.get(reviewId) === reaction) {
        await removeReviewReaction(reviewId);
        reactionByReview.delete(reviewId);
      } else {
        await reactToReview(reviewId, reaction);
        reactionByReview.set(reviewId, reaction);
      }
      await loadReviews();
    } catch (error) {
      showAlert(alertBox, error.message || "No se pudo guardar la reacción.");
    } finally {
      setBusy(reviewSubmit, false);
    }
  });

  // Review actions: like/dislike on others' reviews; edit or delete your own
  $("#review-list").addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button || button.disabled) return;
    const reviewId = button.closest("[data-review-id]").dataset.reviewId;
    clearAlert(reviewAlert);

    if (button.dataset.action === "edit") {
      const review = currentMovie.reviews.find((r) => String(r.id) === reviewId);
      if (review) startEditingReview(review);
      return;
    }

    setBusy(button, true);
    try {
      if (button.dataset.action === "delete") {
        if (!window.confirm("¿Eliminar tu reseña?")) return;
        await deleteReview(reviewId);
        if (editingReviewId && String(editingReviewId) === reviewId) stopEditingReview();
      } else {
        await setReaction(reviewId, button.dataset.action);
      }
      await loadMovie();
    } catch (err) {
      showAlert(reviewAlert, errorText(err));
    } finally {
      setBusy(button, false);
    }
  });
}

init();
