// 로그인 전 찜·장바구니: 같은 출처의 모든 페이지와 탭에서 공유합니다.
(() => {
  "use strict";
  const KEY = "casamia.shop.v1";
  const products = new Map();
  const money = value => `${value.toLocaleString("ko-KR")}원`;
  const number = value => Number(String(value).replace(/[^\d.]/g, ""));
  const escape = value => String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const quantity = value => Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 99;
  function validProduct(item) {
    return item && typeof item.id === "string" && typeof item.name === "string" &&
      typeof item.image === "string" && /^img\/[\w/.-]+$/.test(item.image) &&
      Number.isSafeInteger(item.price) && item.price >= 0;
  }
  function read() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY));
      return {
        orders: Array.isArray(saved?.orders) ? saved.orders.filter(order => order && /^DEMO-\d{8}-[A-Z0-9]{6}$/.test(order.id) &&
          Number.isFinite(Date.parse(order.createdAt)) && ["card", "easy", "bank"].includes(order.payment) &&
          Array.isArray(order.items) && order.items.length && order.items.every(item => validProduct(item) &&
            typeof item.option === "string" && Number.isInteger(item.quantity) && quantity(item.quantity)) &&
          Number.isSafeInteger(order.total) && order.total === order.items.reduce((sum, item) => sum + item.price * item.quantity, 0)).slice(0, 20) : [],
        wishes: Array.isArray(saved?.wishes) ? saved.wishes.filter(validProduct) : [],
        cart: Array.isArray(saved?.cart) ? saved.cart.filter(item => validProduct(item) &&
          typeof item.option === "string" && Number.isInteger(item.quantity) && quantity(item.quantity) &&
          item.key === JSON.stringify([item.id, item.option])) : []
      };
    } catch { return { wishes: [], cart: [], orders: [] }; }
  }
  let state = read();
  let dialog, view = "cart", toastTimer;
  function notify(message) {
    const toast = document.getElementById("shopToast");
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 3500);
  }
  function save(next) {
    try { localStorage.setItem(KEY, JSON.stringify(next)); }
    catch {
      notify("브라우저에 저장하지 못했습니다. 저장 공간과 사이트 저장 허용 설정을 확인해 주세요.");
      return false;
    }
    state = next;
    sync();
    if (dialog?.open) render();
    window.dispatchEvent?.(new Event("shopchange"));
    return true;
  }
  function register(item) {
    const product = { ...item, price: number(item.price) };
    if (!validProduct(product)) throw new Error("상품 데이터를 확인해 주세요.");
    products.set(product.id, product);
    return product;
  }
  function wishAttributes(item) {
    const product = register(item);
    return `data-wish-id="${escape(product.id)}" aria-pressed="false"`;
  }
  function sync() {
    document.querySelectorAll("[data-wish-id]").forEach(button => {
      const liked = state.wishes.some(item => item.id === button.dataset.wishId);
      button.classList.toggle("is-saved", liked);
      button.setAttribute("aria-pressed", String(liked));
      button.setAttribute("aria-label", liked ? "찜 취소" : "찜하기");
      const heart = button.querySelector(".heart-icon");
      if (heart) heart.textContent = liked ? "♥" : "♡";
      else if (!button.querySelector("svg")) button.textContent = liked ? "♥" : "♡";
    });
    const count = state.cart.reduce((total, item) => total + item.quantity, 0);
    document.querySelectorAll("[data-shop-count]").forEach(badge => {
      const value = badge.dataset.shopCount === "cart" ? count : state.wishes.length;
      badge.textContent = value;
      badge.hidden = !value;
    });
    document.querySelectorAll("[data-shop-open]").forEach(button => {
      const cart = button.dataset.shopOpen === "cart";
      button.setAttribute("aria-label", cart ? `장바구니 ${count}개` : `찜 목록 ${state.wishes.length}개`);
    });
  }
  function toggleWish(id) {
    state = read();
    const exists = state.wishes.some(item => item.id === id);
    const product = products.get(id) || state.wishes.find(item => item.id === id);
    if (!product) return;
    const wishes = exists ? state.wishes.filter(item => item.id !== id) : [...state.wishes, product];
    if (save({ ...state, wishes })) notify(exists ? "찜 목록에서 삭제했습니다." : "찜 목록에 저장했습니다.");
  }
  function addToCart(product, option, count) {
    if (!quantity(count)) { notify("수량은 1~99개로 입력해 주세요."); return false; }
    register(product);
    state = read();
    const key = JSON.stringify([product.id, option]);
    const existing = state.cart.find(item => item.key === key);
    const nextQuantity = (existing?.quantity || 0) + Number(count);
    if (nextQuantity > 99) { notify("같은 상품·옵션은 최대 99개까지 담을 수 있습니다."); return false; }
    const item = { ...products.get(product.id), option, key, quantity: nextQuantity };
    const cart = existing ? state.cart.map(row => row.key === key ? item : row) : [...state.cart, item];
    const saved = save({ ...state, cart });
    if (saved) notify("장바구니에 담았습니다.");
    return saved;
  }
  function changeQuantity(key, value) {
    if (!quantity(value)) { notify("수량은 1~99개로 입력해 주세요."); render(); return; }
    state = read();
    save({ ...state, cart: state.cart.map(item => item.key === key ? { ...item, quantity: Number(value) } : item) });
  }
  function getCart() {
    return read().cart.map(item => ({ ...item }));
  }
  function getWishes() { return read().wishes.map(item => ({ ...item })); }
  function getOrders() { return read().orders.map(order => ({ ...order, items: order.items.map(item => ({ ...item })) })); }
  // 모의 주문 전 마지막으로 확인한 장바구니와 현재 내용을 비교합니다.
  // 실제 결제에서는 상품 가격 검증과 결제 승인을 서버에서 처리해야 합니다.
  function completeDemoOrder(expectedCart, payment = "card") {
    const latest = read();
    if (!latest.cart.length) return { ok: false, reason: "empty_cart" };
    if (JSON.stringify(latest.cart) !== JSON.stringify(expectedCart)) return { ok: false, reason: "cart_changed" };
    if (!["card", "easy", "bank"].includes(payment)) return { ok: false, reason: "invalid_payment" };
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
    const date = ["year", "month", "day"].map(type => parts.find(part => part.type === type).value).join("");
    const order = { id: `DEMO-${date}-${Math.random().toString(36).slice(2, 8).padEnd(6, "0").toUpperCase()}`, createdAt: now.toISOString(), payment,
      items: latest.cart.map(({ id, name, image, price, brand, option, quantity }) => ({ id, name, image, price, brand, option, quantity })),
      total: latest.cart.reduce((sum, item) => sum + item.price * item.quantity, 0) };
    if (!save({ ...latest, cart: [], orders: [order, ...latest.orders].slice(0, 20) })) return { ok: false, reason: "storage_failed" };
    return { ok: true, order };
  }
  function render() {
    const cart = view === "cart";
    const items = cart ? state.cart : state.wishes;
    document.getElementById("shopTitle").textContent = cart ? "장바구니" : "찜 목록";
    dialog.querySelectorAll("[data-shop-view]").forEach(button => {
      button.setAttribute("aria-pressed", String(button.dataset.shopView === view));
    });
    const content = document.getElementById("shopContent");
    content.innerHTML = items.length ? items.map((item, i) => `
      <article class="shop-row">
        <img src="${escape(item.image)}" alt="${escape(item.name)}" width="96" height="96">
        <div class="shop-row-info">
          <p class="shop-brand">${escape(item.brand || "까사미아")}</p>
          <h3>${escape(item.name)}</h3>
          ${cart ? `<p class="shop-option">색상: ${escape(item.option)}</p>` : ""}
          <p>${money(item.price)}${!cart && item.fromPrice ? "부터" : ""}</p>
          ${cart ? `<div class="shop-quantity">
            <button type="button" data-quantity-step="-1" data-index="${i}" aria-label="${escape(item.name)} 수량 줄이기" ${item.quantity <= 1 ? "disabled" : ""}>−</button>
            <input type="number" min="1" max="99" step="1" value="${item.quantity}" data-quantity-index="${i}" aria-label="${escape(item.name)} 수량">
            <button type="button" data-quantity-step="1" data-index="${i}" aria-label="${escape(item.name)} 수량 늘리기" ${item.quantity >= 99 ? "disabled" : ""}>+</button>
          </div>` : item.detail ? '<a class="shop-detail-link" href="sub.html">상품 상세 · 옵션 선택</a>' : ""}
        </div>
        <div class="shop-row-end">
          <button type="button" class="shop-remove" data-remove-index="${i}" aria-label="${escape(item.name)} 삭제">삭제</button>
          ${cart ? `<strong>${money(item.price * item.quantity)}</strong>` : ""}
        </div>
      </article>`).join("") : `<div class="shop-empty"><span aria-hidden="true">${cart ? "♧" : "♡"}</span><p>${cart ? "장바구니가 비어 있습니다." : "아직 찜한 상품이 없습니다."}</p><p>${cart ? "상세 페이지에서 상품과 옵션을 선택해 담아보세요." : "마음에 드는 상품의 하트를 눌러보세요."}</p></div>`;
    const footer = document.getElementById("shopSummary");
    const total = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    footer.innerHTML = cart && items.length ? `<div class="shop-total"><span>총 상품금액</span><strong>${money(total)}</strong></div><p class="shop-note">실제 결제 없이 주문 과정을 체험할 수 있습니다.</p><a class="shop-checkout" href="checkout.html">주문·결제하기</a>` : "";
    document.getElementById("shopClear").hidden = !items.length;
  }
  function open(nextView) {
    view = nextView;
    state = read();
    sync();
    render();
    dialog.append(document.getElementById("shopToast"));
    if (!dialog.open) dialog.showModal();
  }
  document.addEventListener("DOMContentLoaded", () => {
    document.body.insertAdjacentHTML("beforeend", `
      <div class="shop-toast" id="shopToast" role="status" aria-live="polite" hidden></div>
      <dialog class="shop-dialog" id="shopDialog" aria-labelledby="shopTitle">
        <div class="shop-heading"><h2 id="shopTitle">장바구니</h2><button type="button" class="shop-close" aria-label="닫기" autofocus>×</button></div>
        <div class="shop-tabs"><button type="button" data-shop-view="wishes" aria-pressed="false">찜 목록</button><button type="button" data-shop-view="cart" aria-pressed="true">장바구니</button></div>
        <p class="shop-note">이 브라우저에 저장됩니다.</p>
        <div id="shopContent"></div><div id="shopSummary"></div>
        <div class="shop-bottom"><button type="button" id="shopClear">전체 삭제</button><button type="button" class="shop-continue">쇼핑 계속하기</button></div>
      </dialog>`);
    dialog = document.getElementById("shopDialog");
    dialog.addEventListener("close", () => document.body.append(document.getElementById("shopToast")));
    dialog.querySelectorAll(".shop-close, .shop-continue").forEach(button => button.addEventListener("click", () => dialog.close()));
    dialog.addEventListener("click", event => {
      if (event.target === dialog) {
        const bounds = dialog.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
      }
      const tab = event.target.closest("[data-shop-view]");
      if (tab) { view = tab.dataset.shopView; render(); }
      const remove = event.target.closest("[data-remove-index]");
      if (remove) {
        const item = (view === "cart" ? state.cart : state.wishes)[Number(remove.dataset.removeIndex)];
        const latest = read();
        if (view === "cart") save({ ...latest, cart: latest.cart.filter(row => row.key !== item.key) });
        else save({ ...latest, wishes: latest.wishes.filter(row => row.id !== item.id) });
        dialog.querySelector(".shop-close").focus();
      }
      const step = event.target.closest("[data-quantity-step]");
      if (step) {
        const index = Number(step.dataset.index);
        const item = state.cart[index];
        changeQuantity(item.key, item.quantity + Number(step.dataset.quantityStep));
        dialog.querySelector(`[data-quantity-index="${index}"]`)?.focus();
      }
    });
    dialog.addEventListener("change", event => {
      if (event.target.matches("[data-quantity-index]")) {
        const index = Number(event.target.dataset.quantityIndex);
        changeQuantity(state.cart[index].key, Number(event.target.value));
        dialog.querySelector(`[data-quantity-index="${index}"]`)?.focus();
      }
    });
    document.getElementById("shopClear").addEventListener("click", () => {
      const latest = read();
      save({ ...latest, [view === "cart" ? "cart" : "wishes"]: [] });
      dialog.querySelector(".shop-close").focus();
    });
    sync();
  });
  document.addEventListener("click", event => {
    const wish = event.target.closest("[data-wish-id]");
    if (wish) { event.preventDefault(); event.stopPropagation(); toggleWish(wish.dataset.wishId); return; }
    const opener = event.target.closest("[data-shop-open]");
    if (opener) { event.preventDefault(); open(opener.dataset.shopOpen); }
  }, true);
  window.addEventListener("storage", event => {
    if (event.key === KEY || event.key === null) { state = read(); sync(); if (dialog?.open) render(); }
  });
  window.addEventListener("pageshow", () => { state = read(); sync(); });
  window.Shop = { register, wishAttributes, sync, notify, addToCart, open, money, number, getCart, getWishes, getOrders, completeDemoOrder };
})();
