import {
  approveMovie,
  createMovie,
  deleteMovie,
  getMovie,
  listCategories,
  listMovies,
  listPendingMovies,
  updateMovie,
} from "../api.js";
import { initAdminShell, protectAdminPage, showAdminError } from "./admin-shell.js";

if (protectAdminPage()) {
  initAdminShell("works");
  const pendingList = document.querySelector("[data-pending-list]");
  const publishedList = document.querySelector("[data-published-list]");
  const search = document.querySelector("[data-work-search]");
  const dialog = document.querySelector("[data-work-dialog]");
  const form = document.querySelector("[data-work-form]");
  const categoryOptions = document.querySelector("[data-category-options]");
  let categories = [];
  let pendingWorks = [];
  let publishedWorks = [];

  function makeRecord(work, isPending) {
    const record = document.createElement("article");
    record.className = "admin-record";
    const details = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = work.movie_name;
    const meta = document.createElement("p");
    meta.textContent = `${work.release_year} · ${work.status === "pending" ? "Pendiente" : "Publicada"}`;
    const description = document.createElement("small");
    description.textContent = work.overview || "Sin sinopsis";
    details.append(title, meta, description);

    const actions = document.createElement("div");
    actions.className = "admin-record-actions";
    actions.append(makeButton("Editar", "button button-quiet", () => openEditor(work.id)));
    if (isPending) {
      actions.append(makeButton("Aprobar", "button button-primary", async (button) => {
        await withBusy(button, () => approveMovie(work.id));
        await reload();
      }));
    }
    actions.append(makeButton("Eliminar", "button button-quiet", async (button) => {
      if (!window.confirm(`¿Eliminar “${work.movie_name}”? Esta acción no se puede deshacer.`)) return;
      await withBusy(button, () => deleteMovie(work.id));
      await reload();
    }));
    record.append(details, actions);
    return record;
  }

  function makeButton(label, className, callback) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = label;
    button.addEventListener("click", () => callback(button).catch((error) => {
      window.alert(error.message || "No se pudo completar la operación.");
    }));
    return button;
  }

  async function withBusy(button, action) {
    button.disabled = true;
    try {
      await action();
    } finally {
      button.disabled = false;
    }
  }

  function render() {
    pendingList.replaceChildren(...(pendingWorks.length
      ? pendingWorks.map((work) => makeRecord(work, true))
      : [emptyMessage("No hay obras pendientes de aprobación.")]));
    const term = search.value.trim().toLowerCase();
    const matches = publishedWorks.filter((work) => work.movie_name.toLowerCase().includes(term));
    publishedList.replaceChildren(...(matches.length
      ? matches.map((work) => makeRecord(work, false))
      : [emptyMessage(term ? "No hay obras que coincidan con la búsqueda." : "Todavía no hay obras publicadas.")]));
  }

  function emptyMessage(text) {
    const empty = document.createElement("p");
    empty.className = "admin-notice";
    empty.textContent = text;
    return empty;
  }

  function renderCategories(selected = []) {
    categoryOptions.replaceChildren(...categories.map((category) => {
      const label = document.createElement("label");
      label.className = "admin-category-option";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.name = "categoryIds";
      checkbox.value = category.id;
      checkbox.checked = selected.some((item) => Number(item.id ?? item) === Number(category.id));
      const name = document.createElement("span");
      name.textContent = category.category_name;
      label.append(checkbox, name);
      return label;
    }));
  }

  async function reload() {
    pendingList.replaceChildren(emptyMessage("Cargando propuestas…"));
    publishedList.replaceChildren(emptyMessage("Cargando catálogo…"));
    try {
      [pendingWorks, publishedWorks] = await Promise.all([
        listPendingMovies(),
        listMovies({ sort: "title" }),
      ]);
      render();
    } catch (error) {
      showAdminError(pendingList, error);
      showAdminError(publishedList, error);
    }
  }

  async function openEditor(id = "") {
    form.reset();
    form.elements.id.value = id;
    document.querySelector("[data-dialog-title]").textContent = id ? "Editar obra" : "Nueva obra";
    form.querySelector("[data-form-message]").replaceChildren();
    renderCategories();
    if (id) {
      try {
        const work = await getMovie(id);
        form.elements.movieName.value = work.movie_name;
        form.elements.overview.value = work.overview;
        form.elements.releaseYear.value = work.release_year;
        form.elements.imageUrl.value = work.image_url || "";
        form.elements.runtime.value = work.runtime ?? "";
        form.elements.budget.value = work.budget ?? "";
        form.elements.grossWorldwide.value = work.gross_worldwide ?? "";
        renderCategories(work.categories || []);
      } catch (error) {
        window.alert(error.message || "No se pudo cargar la obra.");
        return;
      }
    }
    dialog.showModal();
  }

  document.querySelector("[data-create-work]").addEventListener("click", () => openEditor());
  document.querySelector("[data-close-dialog]").addEventListener("click", () => dialog.close());
  search.addEventListener("input", render);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = form.querySelector("[data-form-message]");
    message.replaceChildren();
    const categoryIds = [...form.querySelectorAll("[name='categoryIds']:checked")].map((input) => Number(input.value));
    if (!categoryIds.length) {
      message.append(emptyMessage("Selecciona al menos una categoría."));
      return;
    }
    const optionalNumber = (value) => value === "" ? null : Number(value);
    const payload = {
      movieName: form.elements.movieName.value.trim(),
      overview: form.elements.overview.value.trim(),
      releaseYear: Number(form.elements.releaseYear.value),
      imageUrl: form.elements.imageUrl.value.trim() || null,
      runtime: optionalNumber(form.elements.runtime.value),
      budget: optionalNumber(form.elements.budget.value),
      grossWorldwide: optionalNumber(form.elements.grossWorldwide.value),
      categoryIds,
    };
    const submit = form.querySelector("[type='submit']");
    await withBusy(submit, async () => {
      try {
        if (form.elements.id.value) await updateMovie(form.elements.id.value, payload);
        else await createMovie(payload);
        dialog.close();
        await reload();
      } catch (error) {
        message.append(emptyMessage(error.message || "No se pudo guardar la obra."));
      }
    });
  });

  Promise.all([listCategories().then((items) => { categories = items; }), reload()]).then(() => {
    renderCategories();
  }).catch((error) => showAdminError(pendingList, error));
}
