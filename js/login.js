document.addEventListener("DOMContentLoaded", () => {
  const $ = id => document.getElementById(id);
  const requested = new URLSearchParams(location.search).get("next");
  const destination = ["mypage.html", "checkout.html", "index.html", "sub.html"].includes(requested) ? requested : "mypage.html";
  if (Account.getUser()) { location.replace(destination); return; }
  function finish(result, errorId) {
    if (result.ok) { $("loginPassword").value = ""; location.assign(destination); }
    else { $(errorId).hidden = false; $(errorId).textContent = result.message; }
  }
  $("loginForm").addEventListener("submit", event => { event.preventDefault(); finish(Account.login($("loginEmail").value, $("loginPassword").value), "loginError"); });
  $("quickLogin").addEventListener("click", () => finish(Account.login("demo@casamia.example", "Demo1234!"), "loginError"));
  $("signupForm").addEventListener("submit", event => { event.preventDefault(); finish(Account.createProfile($("signupName").value), "signupError"); });
  $("togglePassword").addEventListener("click", () => {
    const shown = $("loginPassword").type === "password";
    $("loginPassword").type = shown ? "text" : "password";
    $("togglePassword").textContent = shown ? "숨기기" : "보기";
    $("togglePassword").setAttribute("aria-pressed", String(shown));
    $("togglePassword").setAttribute("aria-label", shown ? "비밀번호 숨기기" : "비밀번호 표시");
  });
  const tabs = [$("loginTab"), $("signupTab")];
  function select(index) {
    tabs.forEach((tab, i) => { tab.setAttribute("aria-selected", String(i === index)); tab.tabIndex = i === index ? 0 : -1; });
    $("loginPane").hidden = index !== 0;
    $("signupPane").hidden = index !== 1;
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => select(i));
    tab.addEventListener("keydown", event => {
      if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
        event.preventDefault(); const index = event.key === "Home" ? 0 : event.key === "End" ? 1 : 1 - i;
        select(index); tabs[index].focus();
      }
    });
  });
  window.addEventListener("pageshow", () => { if (Account.getUser()) location.replace(destination); });
});
