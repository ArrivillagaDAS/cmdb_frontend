import { createCategory, deleteCategory, listCategories, updateCategory } from "../api.js";
import { initAdminShell, protectAdminPage, showAdminError } from "./admin-shell.js";

if (protectAdminPage()) {
  initAdminShell("categories");
  const list = document.querySelector("[data-category-list]");
  const form = document.querySelector("[data-category-form]");
  const message = document.querySelector("[data-page-message]");
  let categories = [];

  function render() {
    if (!categories.length) {
      const empty = document.createElement("p");
      empty.className = "admin-notice";
      empty.textContent = "No hay categorías registradas.";
      list.replaceChildren(empty);
      return;
    }
    list.replaceChildren(...categories.map((category) => {
      const row = document.createElement("article");
      row.className = "admin-record";
      const label = document.createElement("h3");
      label.textContent = category.category_name;
      const id = document.createElement("small");
      id.textContent = `ID ${category.id}`;
      const details = document.createElement("div");
      details.append(label, id);
      const actions = document.createElement("div");
      actions.className = "admin-record-actions";
      const rename = document.createElement("button");
      rename.className = "button button-quiet";
      rename.textContent = "Renombrar";
      rename.addEventListener("click", async () => {
        const next = window.prompt("Nuevo nombre de la categoría", category.category_name);
        if (next === null || !next.trim()) return;
        try {
          await updateCategory(category.id, next.trim());
          await load();
        } catch (error) {
          showMessage(error.message, true);
        }
      });
      const remove = document.createElement("button");
      remove.className = "button button-quiet";
      remove.textContent = "Eliminar";
      remove.addEventListener("click", async () => {
        if (!window.confirm(`¿Eliminar la categoría “${category.category_name}”?`)) return;
        try {
          await deleteCategory(category.id);
          await load();
        } catch (error) {
          showMessage(error.message, true);
        }
      });
      actions.append(rename, remove);
      row.append(details, actions);
      return row;
    }));
  }

  function showMessage(text, isError = false) {
    const notice = document.createElement("p");
    notice.className = `admin-notice${isError ? " admin-notice-error" : ""}`;
    notice.textContent = text;
    message.replaceChildren(notice);
  }

  async function load() {
    try {
      categories = await listCategories();
      render();
    } catch (error) {
      showAdminError(list, error);
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = form.elements.categoryName;
    try {
      await createCategory(input.value.trim());
      input.value = "";
      message.replaceChildren();
      await load();
    } catch (error) {
      showMessage(error.message, true);
    }
  });

  load();
}
