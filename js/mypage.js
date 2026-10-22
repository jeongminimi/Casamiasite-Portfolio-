document.addEventListener("DOMContentLoaded", () => {
  const $ = id => document.getElementById(id);
  const escape = value => String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const methods = { card: "신용·체크카드", easy: "간편결제", bank: "계좌이체" };

  function renderShopping() {
    if (!Account.getUser()) return;
    const orders = Shop.getOrders(), wishes = Shop.getWishes(), cart = Shop.getCart();
    $("orderStat").textContent = orders.length;
    $("wishStat").textContent = wishes.length;
    $("cartStat").textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
    $("myOrders").innerHTML = orders.length ? orders.map(order => {
      const date = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium" }).format(new Date(order.createdAt));
      return `<details class="my-order"><summary><div><span class="order-date">${escape(date)} <span class="demo-badge">모의 주문 완료</span></span><h3>${escape(order.items[0].name)}${order.items.length > 1 ? ` 외 ${order.items.length - 1}건` : ""}</h3><small>${escape(order.id)}</small></div><strong>${Shop.money(order.total)}</strong><span aria-hidden="true" class="order-chevron">⌄</span></summary><div class="my-order-detail"><p>${escape(methods[order.payment])} · 실제 청구 없음</p>${order.items.map(item => `<div class="my-order-item"><img src="${escape(item.image)}" alt="${escape(item.name)}" width="64" height="64" /><div><h4>${escape(item.name)}</h4><p>${escape(item.option)} · ${item.quantity}개</p></div><strong>${Shop.money(item.price * item.quantity)}</strong></div>`).join("")}</div></details>`;
    }).join("") : '<div class="account-empty"><span aria-hidden="true">↗</span><h3>아직 주문한 상품이 없어요.</h3><p>상품을 담고 모의 주문을 체험해 보세요.</p><a href="sub.html">상품 둘러보기 →</a></div>';
    $("myWishes").innerHTML = wishes.length ? wishes.slice(0, 4).map(item => `<article class="my-wish"><img src="${escape(item.image)}" alt="${escape(item.name)}" /><button type="button" class="my-wish-heart" ${Shop.wishAttributes(item)}>♥</button><small>${escape(item.brand || "까사미아")}</small><h3>${escape(item.name)}</h3><strong>${Shop.money(item.price)}</strong></article>`).join("") : '<div class="account-empty wishes-empty"><h3>마음에 드는 상품을 담아보세요.</h3><p>상품의 하트를 누르면 여기에 모입니다.</p><a href="index.html">구경하러 가기 →</a></div>';
    Shop.sync();
  }

  function renderUser() {
    const user = Account.getUser();
    $("accountError").hidden = true;
    $("accountGate").hidden = !!user;
    $("accountDashboard").hidden = !user;
    if (user) {
      $("greetingName").textContent = user.name;
      $("profileNameDisplay").textContent = user.name;
      $("profileEmailDisplay").textContent = user.email;
      $("profileRoleDisplay").textContent = user.role;
      $("adminPageLink").hidden = user.role !== "ADMIN";
      renderShopping();
    } else {
      $("myOrders").replaceChildren();
      $("myWishes").replaceChildren();
    }
  }

  $("logoutButton").addEventListener("click", () => Account.logout());
  window.addEventListener("accountchange", renderUser);
  window.addEventListener("shopchange", renderShopping);
  window.addEventListener("storage", event => { if (event.key === "casamia.shop.v1" || event.key === null) renderShopping(); });
  window.addEventListener("pageshow", renderUser);
  renderUser();
  if (CasamiaApi.getToken()) {
    Account.refresh().then(renderUser).catch(error => {
      $("accountError").textContent = error.message;
      $("accountError").hidden = false;
      renderUser();
    });
  }
});
