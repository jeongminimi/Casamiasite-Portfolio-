document.addEventListener("DOMContentLoaded", () => {
  "use strict";
  const $ = id => document.getElementById(id);
  const form = $("checkoutForm");
  const money = Shop.money;
  const escape = value => String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const methods = { card: "신용·체크카드", easy: "간편결제", bank: "계좌이체" };
  const hints = {
    card: "카드 결제 화면을 모의로 체험합니다. 카드번호는 입력하지 않습니다.",
    easy: "간편결제를 모의로 체험합니다. 결제 앱이나 외부 서비스로 이동하지 않습니다.",
    bank: "계좌이체를 모의로 체험합니다. 계좌번호 입력이나 실제 이체는 필요하지 않습니다."
  };
  let cart = [];
  let completed = false;
  let submitting = false;
  function total(items) { return items.reduce((sum, item) => sum + item.price * item.quantity, 0); }
  function itemMarkup(items) {
    return items.map(item => `<article class="order-item">
      <img src="${escape(item.image)}" alt="${escape(item.name)}" width="88" height="88" />
      <div class="order-item-info"><small>${escape(item.brand || "까사미아")}</small><h3>${escape(item.name)}</h3><p>색상: ${escape(item.option)} · 수량 ${item.quantity}개</p></div>
      <strong>${money(item.price * item.quantity)}</strong>
    </article>`).join("");
  }
  function showError(message) { $("checkoutError").textContent = message; $("checkoutError").hidden = false; }
  function refreshCart(showChange = false) {
    if (completed) return;
    const latest = Shop.getCart();
    const changed = JSON.stringify(cart) !== JSON.stringify(latest);
    cart = latest;
    $("checkoutView").hidden = !cart.length;
    $("emptyView").hidden = !!cart.length;
    $("orderItems").innerHTML = itemMarkup(cart);
    $("orderCount").textContent = cart.reduce((sum, item) => sum + item.quantity, 0) + "개";
    $("subtotal").textContent = money(total(cart));
    $("grandTotal").textContent = money(total(cart));
    $("payButton").textContent = `${money(total(cart))} 모의 결제하기`;
    if (showChange && changed) {
      $("demoConsent").checked = false;
      showError("장바구니가 변경되었습니다. 상품과 금액을 다시 확인해 주세요.");
    }
  }
  function validateField(id, valid, message) {
    const input = $(id);
    input.setCustomValidity(valid ? "" : message);
    if (!valid) input.reportValidity();
    return valid;
  }
  ["recipient", "phone", "address"].forEach(id => $(id).addEventListener("input", () => $(id).setCustomValidity("")));
  form.addEventListener("change", event => {
    if (event.target.name === "payment") $("paymentHint").textContent = hints[event.target.value];
    if (event.target.id === "demoConsent" && event.target.checked) $("checkoutError").hidden = true;
  });
  $("editCart").addEventListener("click", () => Shop.open("cart"));
  form.addEventListener("submit", event => {
    event.preventDefault();
    if (completed || submitting) return;
    if (!validateField("recipient", !!$("recipient").value.trim(), "받는 분 이름을 입력해 주세요.")) return;
    if (!validateField("phone", /^[0-9 ()+-]+$/.test($("phone").value) && /^\d{9,11}$/.test($("phone").value.replace(/\D/g, "")), "연락처 숫자 9~11자리를 입력해 주세요.")) return;
    if (!validateField("address", !!$("address").value.trim(), "주소를 입력해 주세요.")) return;
    const method = form.elements.payment.value;
    if (!methods[method]) { showError("결제수단을 선택해 주세요."); return; }
    if (!form.reportValidity()) return;
    submitting = true;
    $("payButton").disabled = true;
    const snapshot = cart.map(item => ({ ...item }));
    const result = Shop.completeDemoOrder(snapshot, method);
    if (!result.ok) {
      submitting = false;
      $("payButton").disabled = false;
      if (result.reason === "storage_failed") showError("주문을 완료하지 못했습니다. 브라우저 저장 공간과 설정을 확인한 뒤 다시 시도해 주세요.");
      else {
        refreshCart();
        $("demoConsent").checked = false;
        showError("장바구니가 변경되었습니다. 상품과 금액을 다시 확인하고 결제해 주세요.");
      }
      return;
    }
    completed = true;
    // 배송 정보는 DOM에만 입력되며 localStorage나 서버에 저장하지 않습니다.
    const now = new Date(result.order.createdAt);
    const orderId = result.order.id;
    const time = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" }).format(now);
    $("receiptDetails").innerHTML = `<div><dt>체험 주문번호</dt><dd>${escape(orderId)}</dd></div><div><dt>주문 일시</dt><dd>${escape(time)}</dd></div><div><dt>결제수단</dt><dd>${escape(methods[method])} (모의)</dd></div><div class="receipt-amount"><dt>모의 결제금액</dt><dd>${money(total(snapshot))}</dd></div>`;
    $("receiptItems").innerHTML = itemMarkup(snapshot);
    form.reset();
    $("checkoutView").hidden = true;
    $("emptyView").hidden = true;
    $("completeView").hidden = false;
    $("checkoutStep").removeAttribute("aria-current");
    $("completeStep").setAttribute("aria-current", "step");
    document.title = "모의 주문 완료 | casamia 포트폴리오";
    $("completeTitle").focus();
  });
  // 같은 페이지의 장바구니 편집과 다른 탭에서의 변경을 모두 반영합니다.
  $("shopDialog").addEventListener("close", () => refreshCart(true));
  window.addEventListener("storage", event => { if (event.key === "casamia.shop.v1" || event.key === null) refreshCart(true); });
  window.addEventListener("pageshow", () => refreshCart(true));
  refreshCart();
});
