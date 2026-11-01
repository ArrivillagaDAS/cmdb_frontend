import { config } from "./config.js";
import { clearSession, getToken } from "./session.js";

export class ApiError extends Error {
  constructor(
    message,
    { status = 0, code = "NETWORK_ERROR", details = null } = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function normalizeKeys(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeKeys);
  }
  if (value === null || typeof value !== "object") {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()),
      normalizeKeys(item),
    ]),
  );
}

function normalizeError(payload, status) {
  const message =
    payload?.message ||
    payload?.error ||
    (status === 401
      ? "Tu sesión ha expirado. Inicia sesión de nuevo."
      : status === 403
        ? "No tienes permiso para realizar esta acción."
        : `La solicitud falló (${status}).`);
  return new ApiError(message, {
    status,
    code: payload?.code || "HTTP_ERROR",
    details: payload?.details || payload?.errors || null,
  });
}

export async function request(
  path,
  { method = "GET", body, headers = {}, auth = true, signal, query } = {},
) {
  const requestHeaders = new Headers({
    Accept: "application/json",
    ...headers,
  });
  if (body !== undefined && !(body instanceof FormData)) {
    requestHeaders.set("Content-Type", "application/json");
  }
  const token = auth ? getToken() : null;
  if (token) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.requestTimeoutMs);
  const abortRequest = () => controller.abort();
  if (signal?.aborted) {
    abortRequest();
  } else if (signal) {
    signal.addEventListener("abort", abortRequest, { once: true });
  }
  try {
    const url = new URL(
      `${config.apiBaseUrl}/${String(path).replace(/^\/+/, "")}`,
    );
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          url.searchParams.set(key, String(value));
        }
      });
    }
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body:
        body === undefined
          ? undefined
          : body instanceof FormData
            ? body
            : JSON.stringify(body),
      signal: controller.signal,
      credentials: config.credentials,
    });
    const raw = await response.text();
    let payload = null;
    if (raw) {
      try {
        payload = JSON.parse(raw);
      } catch {
        payload = { message: raw };
      }
    }
    if (!response.ok) {
      if (response.status === 401 && auth) {
        clearSession();
      }
      throw normalizeError(payload, response.status);
    }
    return normalizeKeys(payload?.data ?? payload);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (error.name === "AbortError") {
      throw new ApiError("La solicitud tardó demasiado. Inténtalo de nuevo.", {
        code: "TIMEOUT",
      });
    }
    throw new ApiError(
      "No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.",
      { code: "NETWORK_ERROR" },
    );
  } finally {
    clearTimeout(timer);
    if (signal) {
      signal.removeEventListener("abort", abortRequest);
    }
  }
}

const segment = (value) => encodeURIComponent(String(value));
export const api = Object.freeze({
  auth: {
    login: (credentials) =>
      request("auth/login", { method: "POST", body: credentials, auth: false }),
    register: (data) =>
      request("auth/register", { method: "POST", body: data, auth: false }),
    me: () => request("auth/me"),
    logout: () => request("auth/logout", { method: "POST" }),
  },
  titles: {
    list: (params, { auth = false } = {}) =>
      request("titles", { auth, query: params }),
    get: (id, { auth = false } = {}) =>
      request(`titles/${segment(id)}`, { auth }),
    create: (data) => request("titles", { method: "POST", body: data }),
    update: (id, data) =>
      request(`titles/${segment(id)}`, { method: "PATCH", body: data }),
    remove: (id) => request(`titles/${segment(id)}`, { method: "DELETE" }),
    stats: () => request("stats", { auth: false }),
  },
  reviews: {
    list: (titleId, params = {}) =>
      request(`titles/${segment(titleId)}/reviews`, {
        auth: false,
        query: params,
      }),
    create: (titleId, data) =>
      request(`titles/${segment(titleId)}/reviews`, {
        method: "POST",
        body: data,
      }),
    vote: (reviewId, value) =>
      request(`reviews/${segment(reviewId)}/votes`, {
        method: "PUT",
        body: { value },
      }),
    pending: () => request("admin/reviews", { query: { status: "pending" } }),
    moderate: (id, status) =>
      request(`admin/reviews/${segment(id)}`, {
        method: "PATCH",
        body: { status },
      }),
  },
});

export function unwrapList(result) {
  if (Array.isArray(result)) {
    return { items: result, pagination: null };
  }
  if (Array.isArray(result?.items)) {
    return { items: result.items, pagination: result.pagination ?? null };
  }
  if (Array.isArray(result?.rows)) {
    return { items: result.rows, pagination: result.pagination ?? null };
  }
  return { items: [], pagination: null };
}

export function getErrorMessage(error) {
  return error instanceof ApiError
    ? error.message
    : "Ocurrió un error inesperado. Inténtalo de nuevo.";
}
