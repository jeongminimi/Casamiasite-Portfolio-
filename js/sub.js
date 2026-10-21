document.addEventListener("DOMContentLoaded", () => {
  const thumbnails = [...document.querySelectorAll(".thumb")];
  const mainImage = document.getElementById("mainImage");
  let currentIndex = 0;
  function updateImage(index) {
    currentIndex = index;
    mainImage.src = thumbnails[index].getAttribute("src");
    thumbnails.forEach((thumb, i) => thumb.classList.toggle("active", i === index));
  }
  document.getElementById("prevBtn")?.addEventListener("click", () => updateImage((currentIndex - 1 + thumbnails.length) % thumbnails.length));
  document.getElementById("nextBtn")?.addEventListener("click", () => updateImage((currentIndex + 1) % thumbnails.length));
  thumbnails.forEach((thumb, index) => {
    thumb.tabIndex = 0;
    thumb.setAttribute("role", "button");
    thumb.addEventListener("click", () => updateImage(index));
    thumb.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); updateImage(index); }
    });
  });

  const variants = [
    { id: "reno-3", name: "리노 스윙 3인소파", price: 1160000, image: "img/sub/main1.avif", brand: "까사미아", detail: true },
    { id: "reno-4", name: "리노 스윙 4인소파", price: 1592000, image: "img/sub/main2.avif", brand: "까사미아", detail: true },
    { id: "reno-cushion", name: "리노 헤드쿠션", price: 36000, image: "img/sub/main4.avif", brand: "까사미아", detail: true }
  ];
  variants.forEach(Shop.register);
  const customSelect = document.getElementById("customProductSelect");
  if (!customSelect) return;
  const display = customSelect.querySelector(".selected-option");
  const options = [...customSelect.querySelectorAll(".option-list li")];
  const colorSelect = document.getElementById("optionSelect");
  const quantityInput = document.getElementById("productQuantity");
  const totalPrice = document.getElementById("totalPrice");
  const wishButton = document.getElementById("wishBtn");
  let selected = null;

  function setExpanded(expanded) {
    customSelect.classList.toggle("active", expanded);
    display.setAttribute("aria-expanded", String(expanded));
  }
  function updateTotal() {
    const count = Number(quantityInput.value);
    totalPrice.textContent = selected && Number.isInteger(count) && count >= 1 && count <= 99 ? Shop.money(selected.price * count) : "0원";
  }
  function updateWish(product) {
    wishButton.dataset.wishId = product.id;
    Shop.sync();
  }
  updateWish(variants[2]);
  display.addEventListener("click", () => setExpanded(!customSelect.classList.contains("active")));
  display.addEventListener("keydown", event => {
    if (["Enter", " ", "ArrowDown"].includes(event.key)) {
      event.preventDefault(); setExpanded(true); options[0].focus();
    }
  });
  customSelect.addEventListener("keydown", event => {
    if (event.key === "Escape") { setExpanded(false); display.focus(); }
  });
  document.addEventListener("click", event => { if (!customSelect.contains(event.target)) setExpanded(false); });
  options.forEach((item, index) => {
    function select() {
      selected = variants[index];
      const image = document.createElement("img");
      image.src = selected.image;
      image.alt = "";
      const label = document.createElement("span");
      label.textContent = selected.name;
      display.replaceChildren(image, label);
      colorSelect.disabled = false;
      colorSelect.selectedIndex = 0;
      setExpanded(false);
      display.focus();
      updateWish(selected);
      updateTotal();
    }
    item.addEventListener("click", select);
    item.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); select(); }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault(); options[(index + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length].focus();
      }
    });
  });
  const requestedProduct = new URLSearchParams(window.location.search).get("product");
  const requestedIndex = variants.findIndex(product => product.id === requestedProduct);
  if (requestedIndex >= 0) {
    options[requestedIndex].click();
    colorSelect.value = "ivory";
    updateTotal();
  }
  quantityInput.addEventListener("input", updateTotal);
  function add() {
    if (!selected) { Shop.notify("상품을 먼저 선택해 주세요."); display.focus(); return false; }
    if (!colorSelect.value) { Shop.notify("색상 옵션을 선택해 주세요."); colorSelect.focus(); return false; }
    const count = Number(quantityInput.value);
    if (!Number.isInteger(count) || count < 1 || count > 99) {
      Shop.notify("수량은 1~99개로 입력해 주세요."); quantityInput.focus(); return false;
    }
    return Shop.addToCart(selected, colorSelect.options[colorSelect.selectedIndex].text, count);
  }
  document.querySelector(".cart-btn")?.addEventListener("click", () => { if (add()) Shop.open("cart"); });
  const buyButton = document.querySelector(".buy-btn");
  if (buyButton) {
    buyButton.textContent = "장바구니 보기";
    buyButton.addEventListener("click", () => Shop.open("cart"));
  }
});
