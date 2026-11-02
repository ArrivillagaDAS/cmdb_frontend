import { createMovie, listCategories, updateMovie, ApiError } from "./api.js";
import { escapeHtml, setBusy, showFieldErrors } from "./utils.js";

let dialog = null;
let resolveCurrent = null;

// Builds the dialog once and reuses it for create and edit
function ensureDialog() {
  if (dialog) return dialog;
  dialog = document.createElement("dialog");
  dialog.className = "modal";
  dialog.innerHTML = `
    <form id="movie-form" class="form-stack">
      <div class="modal-heading">
        <div>
          <p class="eyebrow">AMPLÍA EL ARCHIVO</p>
          <h2 id="movie-form-heading">Proponer <em>película</em></h2>
        </div>
        <button class="icon-button" type="button" data-close-modal aria-label="Cerrar">×</button>
      </div>
      <label>Título
        <input name="movieName" required minlength="1" maxlength="100" />
        <small data-error-for="movieName"></small>
      </label>
      <label>Año de estreno
        <input name="releaseYear" type="number" required min="1888" max="2100" />
        <small data-error-for="releaseYear"></small>
      </label>
      <label>Sinopsis
        <textarea name="overview" required minlength="1" maxlength="500" rows="4"></textarea>
        <small data-error-for="overview"></small>
      </label>
      <label>Imagen (URL, opcional)
        <input name="imageUrl" type="url" maxlength="500" placeholder="https://..." />
        <small data-error-for="imageUrl"></small>
      </label>
      <fieldset class="category-picker">
        <legend>Categorías</legend>
        <div id="movie-form-categories"></div>
        <small data-error-for="categoryIds"></small>
      </fieldset>
      <p class="form-footnote" id="movie-form-note"></p>
      <div id="movie-form-alert" class="alert hidden" role="alert"></div>
      <div class="modal-actions">
        <button class="button button-quiet" type="button" data-close-modal>Cancelar</button>
        <button class="button button-primary" type="submit">Guardar</button>
      </div>
    </form>`;
  document.body.append(dialog);

  dialog.querySelectorAll("[data-close-modal]").forEach((btn) =>
    btn.addEventListener("click", () => closeWith(null)),
  );
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeWith(null);
  });
  dialog.querySelector("form").addEventListener("submit", onSubmit);
  return dialog;
}

function closeWith(result) {
  dialog.close();
  if (resolveCurrent) resolveCurrent(result);
  resolveCurrent = null;
}

async function renderCategoryChoices(selectedIds) {
  const box = dialog.querySelector("#movie-form-categories");
  box.innerHTML = '<p class="form-footnote">Cargando categorías…</p>';
  try {
    const categories = await listCategories();
    box.innerHTML = categories.length
      ? categories
          .map((c) => `
            <label class="checkbox-row">
              <input type="checkbox" name="categoryIds" value="${c.id}" ${selectedIds.includes(c.id) ? "checked" : ""} />
              ${escapeHtml(c.category_name)}
            </label>`)
          .join("")
      : '<p class="form-footnote">No hay categorías. Pide a un administrador que las cree.</p>';
  } catch {
    box.innerHTML = '<p class="form-footnote">No se pudieron cargar las categorías.</p>';
  }
}

async function onSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const alertBox = dialog.querySelector("#movie-form-alert");
  alertBox.hidden = true;
  showFieldErrors(form, []);

  const categoryIds = [...form.querySelectorAll('input[name="categoryIds"]:checked')].map((el) => Number(el.value));
  if (categoryIds.length === 0) {
    showFieldErrors(form, [{ field: "categoryIds", message: "Elige al menos una categoría." }]);
    return;
  }

  const data = Object.fromEntries(new FormData(form));
  const payload = {
    movieName: data.movieName.trim(),
    releaseYear: Number(data.releaseYear),
    overview: data.overview.trim(),
    imageUrl: data.imageUrl.trim() || null,
    categoryIds,
  };

  const button = form.querySelector('button[type="submit"]');
  setBusy(button, true);
  try {
    const current = dialog.dataset.movieId;
    const saved = current
      ? await updateMovie(current, payload)
      : await createMovie(payload);
    closeWith(saved);
  } catch (err) {
    if (err instanceof ApiError) {
      showFieldErrors(form, err.errors);
      alertBox.textContent = err.status === 409
        ? "Ya existe una película con ese título."
        : err.message;
      alertBox.className = "alert alert-error";
      alertBox.hidden = false;
    } else {
      alertBox.textContent = "Algo salió mal. Intenta de nuevo.";
      alertBox.className = "alert alert-error";
      alertBox.hidden = false;
    }
  } finally {
    setBusy(button, false);
  }
}

// Opens the form. Resolves with the saved movie, or null if cancelled.
// Pass a movie to edit it; omit it to propose a new one.
export async function openMovieForm(movie = null) {
  ensureDialog();
  const form = dialog.querySelector("#movie-form");
  form.reset();
  showFieldErrors(form, []);
  dialog.querySelector("#movie-form-alert").hidden = true;

  dialog.dataset.movieId = movie ? movie.id : "";
  dialog.querySelector("#movie-form-heading").innerHTML = movie
    ? 'Editar <em>película</em>'
    : 'Proponer <em>película</em>';
  dialog.querySelector("#movie-form-note").textContent = movie
    ? ""
    : "Tu propuesta quedará pendiente hasta que un administrador la apruebe.";

  if (movie) {
    form.elements.movieName.value = movie.movie_name ?? "";
    form.elements.releaseYear.value = movie.release_year ?? "";
    form.elements.overview.value = movie.overview ?? "";
    form.elements.imageUrl.value = movie.image_url ?? "";
  }

  const selected = movie ? (movie.categories ?? []).map((c) => c.id) : [];
  await renderCategoryChoices(selected);

  dialog.showModal();
  return new Promise((resolve) => {
    resolveCurrent = resolve;
  });
}
