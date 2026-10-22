(() => {
  "use strict";
  const Api = window.CasamiaApi;
  if (!Api) throw new Error("js/api.js must be loaded before js/account.js");

  const getUser = () => Api.getToken() ? Api.getCachedUser() : null;

  function sync() {
    const user = getUser();
    document.querySelectorAll("[data-account-link]").forEach(link => {
      link.href = user ? "mypage.html" : "login.html";
      link.setAttribute("aria-label", user ? "마이페이지" : "로그인");
      link.title = user ? `${user.name}님의 마이페이지` : "로그인";
      if (!link.querySelector("i")) link.textContent = user ? "마이페이지" : "로그인";
    });
  }

  async function refresh() {
    if (!Api.getToken()) {
      Api.updateCachedUser(null);
      sync();
      return null;
    }
    try {
      const user = await Api.get("/users/me");
      Api.updateCachedUser(user);
      sync();
      return user;
    } catch (error) {
      if (error.status === 401) Api.clearSession();
      sync();
      throw error;
    }
  }

  async function login(email, password) {
    try {
      const token = await Api.post("/auth/login", { email: email.trim(), password });
      Api.setSession(token.access_token, null);
      const user = await Api.get("/users/me");
      Api.setSession(token.access_token, user);
      sync();
      return { ok: true, user };
    } catch (error) {
      Api.clearSession();
      const message = error.status === 401
        ? "이메일 또는 비밀번호가 올바르지 않습니다."
        : error.message;
      return { ok: false, message, status: error.status };
    }
  }

  async function register(email, password, name) {
    try {
      await Api.post("/auth/register", { email: email.trim(), password, name: name.trim() });
      return await login(email, password);
    } catch (error) {
      const message = error.status === 409
        ? "이미 가입된 이메일입니다. 로그인해 주세요."
        : error.status === 422
          ? "이메일, 이름, 비밀번호 형식을 확인해 주세요."
          : error.message;
      return { ok: false, message, status: error.status };
    }
  }

  function logout() {
    Api.clearSession();
    sync();
    return { ok: true };
  }

  document.addEventListener("DOMContentLoaded", () => {
    sync();
    if (Api.getToken()) refresh().catch(() => {});
  });
  window.addEventListener("pageshow", sync);
  window.addEventListener("storage", event => {
    if (["casamia.auth.token.v1", "casamia.auth.user.v1", null].includes(event.key)) {
      sync();
      window.dispatchEvent(new Event("accountchange"));
    }
  });
  window.addEventListener("accountchange", sync);

  window.Account = { getUser, refresh, login, register, logout, sync };
})();
