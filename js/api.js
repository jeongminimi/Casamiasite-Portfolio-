// Centralize the API base URL, JWT storage, HTTP requests, and 401 handling.
(() => {
  "use strict";
  const TOKEN_KEY = "casamia.auth.token.v1";
  const USER_KEY = "casamia.auth.user.v1";
  const API_URL_KEY = "casamia.api.baseUrl";
  const DEFAULT_API_BASE_URL = "http://127.0.0.1:8001/api/v1";

  // Shared API error shape and browser storage keys
  class ApiError extends Error {
    constructor(message, status, detail) {
      super(message);
      this.name = "ApiError";
      this.status = status;
      this.detail = detail;
    }
  }

  const normalizeBaseUrl = value => String(value || DEFAULT_API_BASE_URL).replace(/\/+$/, "");
  const getBaseUrl = () => normalizeBaseUrl(window.CASAMIA_API_BASE_URL || localStorage.getItem(API_URL_KEY));
  const setBaseUrl = value => {
    const normalized = normalizeBaseUrl(value);
    localStorage.setItem(API_URL_KEY, normalized);
    return normalized;
  };
  const getToken = () => localStorage.getItem(TOKEN_KEY) || "";
  function getCachedUser() {
    try {
      const user = JSON.parse(localStorage.getItem(USER_KEY));
      return user && user.id && user.email ? user : null;
    } catch { return null; }
  }
  function setSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    window.dispatchEvent(new Event("accountchange"));
  }
  function updateCachedUser(user) {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
    window.dispatchEvent(new Event("accountchange"));
  }
  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.dispatchEvent(new Event("accountchange"));
  }

  // Shared fetch wrapper: attach JWT, encode JSON, and clear expired sessions.
  async function request(path, options = {}) {
    const headers = new Headers(options.headers || {});
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (options.body !== undefined && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
    let response;
    try {
      response = await fetch(`${getBaseUrl()}${path}`, {
        ...options,
        headers,
        body: options.body !== undefined && !(options.body instanceof FormData) ? JSON.stringify(options.body) : options.body,
      });
    } catch (error) {
      throw new ApiError("백엔드 서버에 연결할 수 없습니다. FastAPI 실행 상태와 API 주소를 확인해 주세요.", 0, error.message);
    }
    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json") ? await response.json() : await response.text();
    if (!response.ok) {
      if (response.status === 401 && path !== "/auth/login") clearSession();
      const detail = data && typeof data === "object" ? data.detail : data;
      throw new ApiError(typeof detail === "string" ? detail : "요청을 처리하지 못했습니다.", response.status, detail);
    }
    return data;
  }

  // Public API consumed by page-specific scripts
  window.CasamiaApi = {
    get API_BASE_URL() { return getBaseUrl(); },
    ApiError,
    get: path => request(path, { method: "GET" }),
    post: (path, body) => request(path, { method: "POST", body }),
    patch: (path, body) => request(path, { method: "PATCH", body }),
    delete: path => request(path, { method: "DELETE" }),
    request,
    getToken,
    getCachedUser,
    setSession,
    updateCachedUser,
    clearSession,
    setBaseUrl,
  };
})();
