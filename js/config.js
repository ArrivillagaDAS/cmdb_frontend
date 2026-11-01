const LOCAL_HOSTS = ["localhost", "127.0.0.1"];
const isLocal = LOCAL_HOSTS.includes(window.location.hostname);

export const config = Object.freeze({
  apiBaseUrl: isLocal
    ? "http://localhost:3000/api/v1"
    : "https://cmdb-back-end.onrender.com/api/v1",
  requestTimeoutMs: 60000,   // Render gratuito tarda en despertar
  credentials: "omit",       // usamos token en el encabezado, no cookies
  tokenKey: "cmdb_access_token",
  pageSize: 30,
  tmdbApiBaseUrl: "https://api.themoviedb.org/3",
  tmdbImageBaseUrl: "https://image.tmdb.org/t/p",
  tmdbPosterSize: "w500",
  tmdbDetailPosterSize: "w780",
  tmdbBackdropSize: "w1280",
});