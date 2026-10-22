document.addEventListener("DOMContentLoaded", async () => {
  const state = document.getElementById("productState");
  const detail = document.getElementById("productDetail");
  const id = new URLSearchParams(location.search).get("id");
  if (!id) { state.textContent = "상품 주소가 올바르지 않습니다. 상품 목록에서 다시 선택해 주세요."; return; }
  const adaptProduct = raw => ({
    id: raw.id,
    name: raw.name,
    brand: raw.brand,
    category: raw.category,
    priceKrw: raw.price_krw,
    originalPriceKrw: raw.original_price_krw,
    discountRate: raw.discount_rate,
    image: raw.image,
    productUrl: raw.product_url || `product.html?id=${encodeURIComponent(raw.id)}`,
    officialProductCode: raw.official_product_code,
    officialCheckedAt: raw.official_checked_at,
    officialProductUrl: raw.official_product_url,
    description: raw.description,
    ragEnabled: raw.rag_enabled,
    rating: raw.rating === null ? null : Number(raw.rating),
    reviewCount: raw.review_count,
    qnaCount: raw.qna_count,
    attributes: raw.attributes || {},
    galleryImages: raw.gallery_images || [],
    officialBenefits: raw.official_benefits || [],
    officialAddons: raw.official_addons || [],
    missingFields: raw.missing_fields || [],
    source: raw.source || {},
  });
  try {
    const product = adaptProduct(await CasamiaApi.get(`/products/${encodeURIComponent(id)}`));
    const catalog = { priceNotice: "PostgreSQL 상품 DB에 등록된 예시 가격이며 실시간 판매가가 아닙니다." };
    document.title = `${product.name} | casamia 상품 상세`;
    document.getElementById("productBrand").textContent = product.brand || "까사미아";
    document.getElementById("productName").textContent = product.name;
    document.getElementById("productCategoryCrumb").textContent = product.category;
    document.getElementById("priceNotice").textContent = product.officialCheckedAt
      ? `공식 상품 페이지 확인 기준 ${product.officialCheckedAt} · 가격과 혜택은 변동될 수 있습니다.`
      : catalog.priceNotice;
    if (product.officialCheckedAt) document.getElementById("priceFootnote").textContent = "공식 상품 페이지에서 확인한 시점의 표시 가격이며, 현재 가격과 다를 수 있습니다.";
    if (product.originalPriceKrw) document.getElementById("originalPrice").textContent = `${product.originalPriceKrw.toLocaleString("ko-KR")}원`;
    if (product.discountRate) document.getElementById("priceDeal").textContent = `${product.discountRate}% 할인`;
    if (product.rating && product.reviewCount) document.getElementById("productRating").textContent = `★ ${product.rating} · 리뷰 ${product.reviewCount}개`;
    if (product.officialProductCode === "122648") {
      document.querySelector(".benefits").innerHTML = '<p><span>할부혜택</span> 최대 12개월 무이자 할부</p><p><span>결제혜택</span> GuudPay 즉시할인 최대 8만원</p><p><span>배송정보</span> 배송일 지정 상품 무료</p>';
    }
    if (product.officialProductCode === "269449") {
      const benefits = document.querySelector(".benefits");
      benefits.replaceChildren(...product.officialBenefits.map((text) => {
        const row = document.createElement("p");
        row.className = "official-benefit";
        row.textContent = text;
        return row;
      }));
      document.querySelector('.detail-tabs a[href="#reviewInfo"]').textContent = `상품리뷰 (${product.reviewCount})`;
      document.querySelector('.detail-tabs a[href="#qnaInfo"]').textContent = `Q&A (${product.qnaCount})`;
      document.querySelector("#reviewInfo h2").textContent = `상품리뷰 (${product.reviewCount})`;
      document.querySelector("#reviewInfo p").textContent = `★ ${product.rating} · 공식 상품 페이지 기준 리뷰 ${product.reviewCount}개`;
      document.querySelector("#qnaInfo h2").textContent = `Q&A (${product.qnaCount})`;
      document.querySelector("#qnaInfo p").textContent = `공식 상품 페이지 기준 상품 문의 ${product.qnaCount}건`;
      const addonSection = document.getElementById("officialAddons");
      const addonList = document.getElementById("officialAddonsList");
      addonList.replaceChildren(...product.officialAddons.map((addon) => {
        const item = document.createElement("div");
        item.className = "official-addon-card";
        const name = document.createElement("span");
        name.textContent = addon.name;
        const price = document.createElement("strong");
        price.textContent = `${addon.priceKrw.toLocaleString("ko-KR")}원`;
        item.append(name, price);
        return item;
      }));
      addonSection.hidden = false;
    }
    const image = document.getElementById("productImage");
    image.src = product.image; image.alt = product.name;
    document.getElementById("detailImage").src = product.image;
    document.getElementById("detailImage").alt = `${product.name} 상세 이미지`;
    document.getElementById("detailTitle").textContent = product.name;
    const thumbnails = document.getElementById("productThumbnails");
    // 상품 데이터에 galleryImages 배열을 추가하면 상세 사진을 순서대로 표시합니다.
    const galleryImages = Array.isArray(product.galleryImages) && product.galleryImages.length
      ? product.galleryImages.map((entry) => typeof entry === "string" ? { src: entry } : entry)
      : [{ src: product.image }];
    let activeImageIndex = 0;
    const previousButton = document.getElementById("galleryPrev");
    const nextButton = document.getElementById("galleryNext");
    const renderGalleryImage = (index) => {
      activeImageIndex = (index + galleryImages.length) % galleryImages.length;
      const photo = galleryImages[activeImageIndex];
      image.src = photo.src;
      image.alt = photo.alt || `${product.name} 상품 사진 ${activeImageIndex + 1}`;
      [...thumbnails.children].forEach((button, buttonIndex) => {
        const selected = buttonIndex === activeImageIndex;
        button.classList.toggle("active", selected);
        button.setAttribute("aria-pressed", String(selected));
      });
      previousButton.hidden = galleryImages.length < 2;
      nextButton.hidden = galleryImages.length < 2;
    };
    galleryImages.forEach((photo, index) => {
      const thumbnail = document.createElement("button");
      thumbnail.type = "button";
      thumbnail.className = "product-thumbnail";
      thumbnail.setAttribute("aria-label", `상품 사진 ${index + 1} 보기`);
      thumbnail.setAttribute("aria-pressed", "false");
      const thumbnailImage = document.createElement("img");
      thumbnailImage.src = photo.src;
      thumbnailImage.alt = "";
      thumbnail.append(thumbnailImage);
      thumbnail.addEventListener("click", () => renderGalleryImage(index));
      thumbnails.append(thumbnail);
    });
    previousButton.addEventListener("click", () => renderGalleryImage(activeImageIndex - 1));
    nextButton.addEventListener("click", () => renderGalleryImage(activeImageIndex + 1));
    const imageWrap = image.closest(".product-image-wrap");
    let touchStartX = null;
    imageWrap.addEventListener("touchstart", (event) => { touchStartX = event.changedTouches[0].clientX; }, { passive: true });
    imageWrap.addEventListener("touchend", (event) => {
      if (touchStartX === null || galleryImages.length < 2) return;
      const deltaX = event.changedTouches[0].clientX - touchStartX;
      if (Math.abs(deltaX) > 45) renderGalleryImage(activeImageIndex + (deltaX < 0 ? 1 : -1));
      touchStartX = null;
    }, { passive: true });
    renderGalleryImage(0);

    const facts = [["상품분류", product.category], ["좌석 수", product.attributes.seatCount ? `${product.attributes.seatCount}인` : null], ["침대 사이즈", product.attributes.bedSize?.join(" + ")], ["매트리스", product.attributes.mattressIncluded === false ? "미포함 · 별도 구매" : product.attributes.mattressIncluded === true ? "포함" : null], ["색상", product.attributes.color], ["소재", product.attributes.material], ["가로", product.attributes.widthCm ? `${product.attributes.widthCm}cm` : null], ["세로", product.attributes.depthCm ? `${product.attributes.depthCm}cm` : null], ["높이", product.attributes.heightCm ? `${product.attributes.heightCm}cm` : null], ["브랜드", product.brand]].filter(([, value]) => value);
    document.getElementById("productFacts").replaceChildren(...facts.map(([label, value]) => { const row = document.createElement("div"); row.className = "product-fact"; const term = document.createElement("dt"); term.textContent = label; const description = document.createElement("dd"); description.textContent = value; row.append(term, description); return row; }));
    document.getElementById("productDescription").textContent = product.description || "추가 상품 설명은 아직 등록되지 않았습니다.";
    const caveat = document.getElementById("productCaveat");
    if (!product.ragEnabled) { caveat.hidden = false; caveat.textContent = "원본 상품명이 일부 생략되어 상세 정보 확인이 필요하며, 현재 추천 검색 대상에서 제외되어 있습니다."; }
    else if (product.missingFields.some(field => ["material", "widthCm", "depthCm", "heightCm"].includes(field))) { caveat.hidden = false; caveat.textContent = "소재와 상세 치수 등 등록되지 않은 정보가 있습니다. 확인되지 않은 사양은 안내하지 않습니다."; }
    document.getElementById("sourceNote").textContent = product.source.file ? `상품 근거: ${product.source.file} ${product.source.pointer || ""}` : "상품 근거: PostgreSQL products 테이블";

    const price = document.getElementById("productPrice");
    const quantity = document.getElementById("productQuantity");
    const option = document.getElementById("productOption");
    option.options[1].textContent = `${product.name} · ${product.priceKrw.toLocaleString("ko-KR")}원`;
    const updatePrice = () => {
      price.textContent = `${product.priceKrw.toLocaleString("ko-KR")}원`;
      const total = document.getElementById("totalPrice");
      if (!option.value) {
        total.textContent = "0원";
        return;
      }
      const count = Number(quantity.value);
      total.textContent = Number.isInteger(count) && count > 0 && count <= 99
        ? `${(product.priceKrw * count).toLocaleString("ko-KR")}원`
        : "수량을 확인해 주세요";
    };
    quantity.addEventListener("input", updatePrice); option.addEventListener("change", updatePrice); updatePrice();

    const shopProduct = { id: product.id, name: product.name, brand: product.brand, image: product.image, price: product.priceKrw };
    Shop.register(shopProduct); document.getElementById("wishProduct").dataset.wishId = product.id; Shop.sync();
    document.getElementById("addToCart").addEventListener("click", () => {
      if (!option.value) { Shop.notify("상품 옵션을 선택해 주세요."); option.focus(); return; }
      const count = Number(quantity.value);
      if (!Number.isInteger(count) || count < 1 || count > 99) { Shop.notify("수량은 1~99개로 입력해 주세요."); quantity.focus(); return; }
      Shop.addToCart(shopProduct, product.attributes.color || "기본 옵션", count);
    });
    document.getElementById("viewCart").addEventListener("click", () => Shop.open("cart"));
    document.querySelectorAll(".detail-tabs a").forEach(tab => tab.addEventListener("click", () => { document.querySelectorAll(".detail-tabs a").forEach(link => link.classList.remove("active")); tab.classList.add("active"); }));
    state.hidden = true; detail.hidden = false;
  } catch (error) { console.error(error); state.textContent = "상품 자료를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."; }
});
