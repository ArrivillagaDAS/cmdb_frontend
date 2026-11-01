import { api, unwrapList } from "./api.js";
import { config } from "./config.js";
import { $, $$, posterCard, rankCard, renderError, setYear } from "./utils.js";
import { getToken } from "./session.js";

let page = 1;
let pagination = null;
let debounceId;
let requestVersion = 0;

function renderCatalog(items) {
  $("#catalog-grid").innerHTML = items.map(posterCard).join("");
  $("#empty-state").classList.toggle("hidden", items.length > 0);
  const total = Number(pagination?.total);
  $("#result-count").textContent =
    `${items.length}${Number.isFinite(total) && total > 0 ? ` de ${total}` : ""} títulos`;
  const totalPages = Number(pagination?.totalPages ?? pagination?.pages);
  const hasNextPage =
    pagination?.hasNext ??
    (Number.isFinite(totalPages)
      ? page < totalPages
      : items.length >= config.pageSize);
  $("#load-more").classList.toggle("hidden", !hasNextPage);
}

async function loadCatalog({ reset = true } = {}) {
  const version = ++requestVersion;
  const grid = $("#catalog-grid");
  const form = $("#filter-form");
  const loadMoreButton = $("#load-more");
  if (reset) {
    page = 1;
    pagination = null;
    grid.innerHTML = '<div class="loading-state">Cargando el archivo…</div>';
  }
  loadMoreButton.disabled = true;
  try {
    const result = await api.titles.list({
      page,
      limit: config.pageSize,
      search: form.elements.search.value.trim(),
      type: form.elements.type.value,
      sort: form.elements.sort.value,
    });
    if (version !== requestVersion) {
      return;
    }
    const response = unwrapList(result);
    pagination = response.pagination;
    renderCatalog(response.items);
  } catch (error) {
    if (version === requestVersion) {
      renderError(grid, error.message);
      $("#empty-state").classList.add("hidden");
    }
  } finally {
    if (version === requestVersion) {
      loadMoreButton.disabled = false;
    }
  }
}

async function loadRanking() {
  const container = $("#ranking-list");
  try {
    const result = await api.titles.list({ sort: "rating", limit: 5, page: 1 });
    const { items } = unwrapList(result);
    container.innerHTML =
      items.slice(0, 5).map(rankCard).join("") ||
      '<div class="loading-state">Aún no hay títulos en el ranking.</div>';
  } catch (error) {
    renderError(container, error.message);
  }
}

async function loadStats() {
  try {
    const stats = await api.titles.stats();
    $$("[data-stat]").forEach((element) => {
      const key = element.dataset.stat;
      const value = stats?.[key] ?? stats?.[`${key}Count`];
      if (value !== null && value !== undefined) {
        element.textContent = Number(value).toLocaleString("es");
      }
    });
  } catch {
    return;
  }
}

function initNavigation() {
  const menuButton = $(".menu-toggle");
  const navigation = $(".main-nav");
  menuButton?.addEventListener("click", () => {
    const expanded = menuButton.getAttribute("aria-expanded") === "true";
    menuButton.setAttribute("aria-expanded", String(!expanded));
    navigation.classList.toggle("is-open", !expanded);
  });
  navigation?.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      navigation.classList.remove("is-open");
      menuButton?.setAttribute("aria-expanded", "false");
    }
  });
}

function initFilters() {
  const form = $("#filter-form");
  form.elements.search.addEventListener("input", () => {
    clearTimeout(debounceId);
    debounceId = setTimeout(() => loadCatalog(), 250);
  });
  form.addEventListener("change", (event) => {
    if (event.target !== form.elements.search) {
      loadCatalog();
    }
  });
  $("#load-more").addEventListener("click", () => {
    page += 1;
    loadCatalog({ reset: false });
  });
}

async function init() {
  setYear();
  initNavigation();
  initFilters();
  if (getToken()) {
    $$("[data-auth-link]").forEach((link) => {
      link.textContent = "Mi cuenta";
      link.href = "/";
    });
  }
  await Promise.all([loadCatalog(), loadRanking(), loadStats()]);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
