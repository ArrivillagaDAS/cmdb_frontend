import { config } from "./config.js";
import { getToken, clearSession } from "./auth.js";

export class ApiError extends Error {
  constructor({ status = 0, message = "Error inesperado", errors = [] } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  const token = auth ? getToken() : null;
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.requestTimeoutMs);

  let res;
  try {
    res = await fetch(`${config.apiBaseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: config.credentials,
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new ApiError({ status: 408, message: "El servidor tardó demasiado. Intenta de nuevo." });
    }
    throw new ApiError({ message: "No hay conexión con el servidor." });
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 204) return null;

  const payload = await res.json().catch(() => null);

  // Token vencido o inválido: se borra la sesión local
  if (res.status === 401 && token) clearSession();

  if (!res.ok || payload?.success === false) {
    throw new ApiError({
      status: res.status,
      message: payload?.message || `Error ${res.status}`,
      errors: payload?.errors || [],
    });
  }

  return payload?.data ?? null;
}

// Autenticación
export const register = (data) =>
  request("/auth/register", { method: "POST", body: data, auth: false });

export const login = (credentials) =>
  request("/auth/login", { method: "POST", body: credentials, auth: false });

// Categorías
export const listCategories = () => request("/categories", { auth: false });

export const createCategory = (name) =>
  request("/categories", { method: "POST", body: { category_name: name } });

export const updateCategory = (id, name) =>
  request(`/categories/${id}`, { method: "PUT", body: { category_name: name } });

export const deleteCategory = (id) =>
  request(`/categories/${id}`, { method: "DELETE" });

// Películas
export function listMovies({ categoryId, sort } = {}) {
  const params = new URLSearchParams();
  if (categoryId) params.set("category_id", categoryId);
  if (sort) params.set("sort", sort);
  const query = params.toString();
  return request(`/movies${query ? `?${query}` : ""}`, { auth: false });
}

export const getMovie = (id) => request(`/movies/${id}`);

export const createMovie = (data) =>
  request("/movies", { method: "POST", body: data });

export const approveMovie = (id) =>
  request(`/movies/${id}/approve`, { method: "PATCH" });

// Reseñas y reacciones
export const createReview = (movieId, data) =>
  request(`/movies/${movieId}/reviews`, { method: "POST", body: data });

export const updateReview = (id, data) =>
  request(`/reviews/${id}`, { method: "PUT", body: data });

export const deleteReview = (id) =>
  request(`/reviews/${id}`, { method: "DELETE" });

export const reactToReview = (id, reaction) =>
  request(`/reviews/${id}/reactions`, { method: "POST", body: { reaction } });