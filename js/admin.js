import { api, unwrapList } from "./api.js";
import {
  $,
  $$,
  clearAlert,
  escapeHtml,
  formatRating,
  requireAdmin,
  setBusy,
  setYear,
  showAlert,
  titleName,
  titleRating,
  titleType,
} from "./utils.js";
import { logout } from "./session.js";

function reviewCard(review) {
  return `
    <article class="admin-card" data-id="${escapeHtml(review.id)}">
      <div>
        <h3>${escapeHtml(review.title?.title ?? review.titleName ?? "Reseña")}</h3>
        <p>“${escapeHtml(review.body ?? review.content ?? "")}”</p>
        <span class="admin-card-meta">
          ${escapeHtml(review.user?.name ?? review.authorName ?? "Miembro")}
          · ${Number(review.rating)}/5
          · ${escapeHtml(review.createdAt ? new Date(review.createdAt).toLocaleDateString("es") : "")}
        </span>
      </div>
      <div class="admin-card-actions">
        <button class="button button-primary" data-action="approve">Aprobar</button>
        <button class="button button-danger" data-action="reject">Rechazar</button>
      </div>
    </article>
  `;
}

function titleRow(title) {
  const publishButton =
    title.status === "pending"
      ? '<button class="button button-primary" data-action="publish">Publicar</button>'
      : "";

  return `
    <article class="admin-card" data-id="${escapeHtml(title.id)}">
      <div>
        <h3>${escapeHtml(titleName(title))}</h3>
        <p>
          ${escapeHtml(titleType(title))}
          · ${escapeHtml(title.releaseYear ?? "Año desconocido")}
          · ★ ${formatRating(titleRating(title))}
        </p>
        <span class="admin-card-meta">
          ${escapeHtml((title.genres ?? []).join?.(", ") ?? title.genres ?? "")}
          ${title.status === "pending" ? "· Pendiente de publicación" : ""}
        </span>
      </div>
      <div class="admin-card-actions">
        <button class="button button-quiet" data-action="edit">Editar</button>
        ${publishButton}
        <button class="button button-danger" data-action="delete">Eliminar</button>
      </div>
    </article>
  `;
}

async function loadReviews() {
  const container = $("#pending-reviews");
  try {
    const result = await api.reviews.pending();
    const items = unwrapList(result).items;
    container.innerHTML =
      items.map(reviewCard).join("") ||
      '<p class="loading-state">No hay reseñas pendientes de aprobación.</p>';
    $("#pending-count").textContent = `${items.length} pendientes`;
  } catch (error) {
    container.innerHTML = `<p class="loading-state">${escapeHtml(error.message)}</p>`;
  }
}

async function loadTitles() {
  const container = $("#title-list");
  try {
    const result = await api.titles.list(
      { limit: 100, includePending: true },
      { auth: true },
    );
    const items = unwrapList(result).items;
    container.innerHTML =
      items.map(titleRow).join("") ||
      '<p class="loading-state">El catálogo está vacío.</p>';
  } catch (error) {
    container.innerHTML = `<p class="loading-state">${escapeHtml(error.message)}</p>`;
  }
}

function initTabs() {
  $$(".admin-tab").forEach((tab) =>
    tab.addEventListener("click", () => {
      $$(".admin-tab").forEach((item) =>
        item.classList.toggle("active", item === tab),
      );
      $("#admin-reviews").classList.toggle(
        "hidden",
        tab.dataset.adminTab !== "reviews",
      );
      $("#admin-titles").classList.toggle(
        "hidden",
        tab.dataset.adminTab !== "titles",
      );
    }),
  );
}

function initModeration() {
  $("#pending-reviews").addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) {
      return;
    }
    const card = button.closest("[data-id]");
    const action = button.dataset.action;
    setBusy(button, true);
    try {
      await api.reviews.moderate(
        card.dataset.id,
        action === "approve" ? "approved" : "rejected",
      );
      card.remove();
      await loadReviews();
    } catch (error) {
      showAlert($("#admin-alert"), error.message);
    } finally {
      setBusy(button, false);
    }
  });

  $("#title-list").addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) {
      return;
    }
    const card = button.closest("[data-id]");
    setBusy(button, true);
    try {
      if (button.dataset.action === "edit") {
        const title = await api.titles.get(card.dataset.id, { auth: true });
        const form = $("#title-form");
        form.elements.id.value = title.id;
        form.elements.title.value = title.title ?? title.name ?? "";
        form.elements.type.value = title.type ?? "movie";
        form.elements.synopsis.value = title.synopsis ?? "";
        form.elements.tmdbId.value = title.tmdbId ?? "";
        form.elements.releaseYear.value = title.releaseYear ?? "";
        form.elements.genres.value = Array.isArray(title.genres)
          ? title.genres.join(", ")
          : (title.genres ?? "");
        $("#title-modal-heading").innerHTML = "Editar <em>título</em>";
        $("#title-modal").showModal();
      } else if (button.dataset.action === "delete") {
        if (!window.confirm("¿Eliminar este título del catálogo?")) {
          return;
        }
        await api.titles.remove(card.dataset.id);
      } else if (button.dataset.action === "publish") {
        await api.titles.update(card.dataset.id, { status: "published" });
      }
      await loadTitles();
    } catch (error) {
      showAlert($("#admin-alert"), error.message);
    } finally {
      setBusy(button, false);
    }
  });
}

function initTitleModal() {
  const modal = $("#title-modal");
  const form = $("#title-form");
  $("#new-title").addEventListener("click", () => {
    form.reset();
    form.elements.id.value = "";
    $("#title-modal-heading").innerHTML = "Nuevo <em>título</em>";
    modal.showModal();
  });
  $$("[data-close-modal]", modal).forEach((button) =>
    button.addEventListener("click", () => modal.close()),
  );
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearAlert($("#title-alert"));
    const data = Object.fromEntries(new FormData(form));
    if (!data.title.trim()) {
      showAlert($("#title-alert"), "El título es obligatorio.");
      return;
    }
    const button = $('button[type="submit"]', form);
    setBusy(button, true);
    try {
      const payload = {
        title: data.title.trim(),
        type: data.type,
        synopsis: data.synopsis.trim(),
        tmdbId: data.tmdbId ? Number(data.tmdbId) : null,
        releaseYear: data.releaseYear ? Number(data.releaseYear) : null,
        genres: data.genres
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      };
      if (data.id) {
        await api.titles.update(data.id, payload);
      } else {
        await api.titles.create(payload);
      }
      form.reset();
      modal.close();
      await loadTitles();
      showAlert($("#admin-alert"), "Título añadido al archivo.", true);
    } catch (error) {
      showAlert($("#title-alert"), error.message);
    } finally {
      setBusy(button, false);
    }
  });
}

async function init() {
  setYear();
  if (!(await requireAdmin())) {
    return;
  }
  $("#logout-button").addEventListener("click", async () => {
    try {
      await api.auth.logout();
    } catch {}
    logout();
  });
  initTabs();
  initModeration();
  initTitleModal();
  await Promise.all([loadReviews(), loadTitles()]);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
