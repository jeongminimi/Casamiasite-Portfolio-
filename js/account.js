// 공개 체험 계정 전용 UI입니다. 실제 인증·접근 제어를 제공하지 않습니다.
// 실사용 계정은 인증 서비스에서 검증하고 비밀번호를 이 코드에 저장하지 마세요.
(() => {
  "use strict";
  const KEY = "casamia.demo.profile.v1";
  const DEMO_EMAIL = "demo@casamia.example";
  const DEMO_PASSWORD = "Demo1234!";
  function read() {
    try {
      const value = JSON.parse(localStorage.getItem(KEY));
      if (value && typeof value.name === "string" && value.name.trim().length >= 2 && value.name.length <= 20 && typeof value.signedIn === "boolean") return value;
    } catch {}
    return { name: "까사미아", signedIn: false };
  }
  function getUser() {
    const profile = read();
    return profile.signedIn ? { name: profile.name, email: DEMO_EMAIL } : null;
  }
  function sync() {
    const user = getUser();
    document.querySelectorAll("[data-account-link]").forEach(link => {
      link.href = user ? "mypage.html" : "login.html";
      link.setAttribute("aria-label", user ? "마이페이지" : "로그인");
      link.title = user ? `${user.name}님의 마이페이지` : "데모 로그인";
      if (!link.querySelector("i")) link.textContent = user ? "마이페이지" : "로그인";
    });
  }
  function write(profile) {
    try { localStorage.setItem(KEY, JSON.stringify({ name: profile.name, signedIn: profile.signedIn })); }
    catch { return { ok: false, message: "브라우저에 저장하지 못했습니다. 사이트 저장 허용 설정과 저장 공간을 확인해 주세요." }; }
    sync();
    window.dispatchEvent?.(new Event("accountchange"));
    return { ok: true };
  }
  function login(email, password) {
    if (email.trim().toLowerCase() !== DEMO_EMAIL || password !== DEMO_PASSWORD) return { ok: false, message: "체험 계정의 이메일과 비밀번호를 확인해 주세요." };
    return write({ ...read(), signedIn: true });
  }
  function createProfile(name) {
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 20) return { ok: false, message: "닉네임은 2~20자로 입력해 주세요." };
    return write({ name: trimmed, signedIn: true });
  }
  function updateName(name) {
    if (!getUser()) return { ok: false, message: "먼저 데모 로그인해 주세요." };
    return createProfile(name);
  }
  function logout() { return write({ ...read(), signedIn: false }); }
  document.addEventListener("DOMContentLoaded", sync);
  window.addEventListener("pageshow", sync);
  window.addEventListener("storage", event => {
    if (event.key === KEY || event.key === null) { sync(); window.dispatchEvent?.(new Event("accountchange")); }
  });
  window.Account = { getUser, login, createProfile, updateName, logout };
})();
