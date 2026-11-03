import { listCategories, listMovies, listPendingMovies } from "../api.js";
import { initAdminShell, protectAdminPage, showAdminError } from "./admin-shell.js";

if (protectAdminPage()) {
  initAdminShell("dashboard");
  const metrics = document.querySelector(".admin-metrics");
  try {
    const [works, pending, categories] = await Promise.all([
      listMovies({ sort: "title" }),
      listPendingMovies(),
      listCategories(),
    ]);
    document.querySelector('[data-metric="published"]').textContent = works.length;
    document.querySelector('[data-metric="pending"]').textContent = pending.length;
    document.querySelector('[data-metric="categories"]').textContent = categories.length;
  } catch (error) {
    showAdminError(metrics, error);
  }
}
