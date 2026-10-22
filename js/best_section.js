document.addEventListener("DOMContentLoaded", () => {
  const seriesGrid = document.getElementById("seriesGrid");
  const bestSection = document.querySelector(".best-series-section");

  if (!seriesGrid) return;

  // 1. best_section.json 데이터 비동기 호출
  fetch("json/best_section.json")
    .then((res) => {
      if (!res.ok) throw new Error("best_section.json 로드 실패");
      return res.json();
    })
    .then(async (data) => {
      const catalog = await CasamiaApi.get("/products");
      const catalogIds = [
        ["reno-head-cushion-ivory", "reno-sofa-3-ivory", "reno-sofa-4-ivory"],
        ["carne-dining-set-2-brown-100", "carne-dining-set-4-brown-140", "carne-dining-set-6-brown-180"],
        ["campo-family-bed-guard-ss", "campo-family-bed-wood-q", "campo-family-bed-full-guard-q-ss"]
      ];

      // 2. JSON 데이터를 기반으로 3단 그리드 HTML 생성
      const columnsHtml = data
        .map((col, columnIndex) => {
          // 열 내부 상품 리스트 생성
          const productsHtml = col.products
            .map(
              (item, productIndex) => {
                const productId = catalogIds[columnIndex]?.[productIndex];
                const catalogProduct = catalog.find(product => product.id === productId);
                const productUrl = catalogProduct ? `product.html?id=${encodeURIComponent(catalogProduct.id)}` : null;
                const itemName = catalogProduct?.name || item.name;
                const itemBrand = catalogProduct?.brand || item.brand;
                const itemImage = catalogProduct?.image || item.thumb;
                const itemPrice = catalogProduct?.price_krw ?? Shop.number(item.price);
                const wishId = columnIndex === 0 ? ["reno-cushion", "reno-3", "reno-4"][productIndex] : productId;
                return `
              <div class="mini-product-item">
                <a class="mini-product-link" href="${productUrl || "#"}" ${productUrl ? "" : "aria-disabled=\"true\""} data-product-id="${productId || ""}">
                  <div class="thumb-wrap">
                    <span class="badge">${item.badge}</span>
                    <img src="${itemImage}" alt="${itemName}" />
                  </div>
                  <div class="product-details">
                    <span class="brand">${itemBrand}</span>
                    <p class="name">${itemName}</p>
                    <del class="original-price">${item.originalPrice}</del>
                    <div class="price-wrap">
                      <span class="discount">${item.discount}</span>
                      <span class="price">${itemPrice.toLocaleString("ko-KR")}</span>
                    </div>
                  </div>
                </a>
                <button type="button" class="wish-btn" aria-label="찜하기" ${Shop.wishAttributes({ id: wishId, name: itemName, price: itemPrice, image: itemImage, brand: itemBrand, detail: columnIndex === 0 })}>♡</button>
              </div>
            `;
              }
            )
            .join("");

          // 배너 + 상품 리스트를 포함한 1개 열 완성
          return `
            <div class="series-column">
              <div class="series-banner">
                <img src="${col.banner.img}" alt="${col.banner.title}" class="banner-img" />
                <div class="banner-info">
                  <h3 class="banner-title">${col.banner.title}</h3>
                  <p class="banner-desc">${col.banner.desc}</p>
                </div>
              </div>
              <div class="series-products">
                ${productsHtml}
              </div>
            </div>
          `;
        })
        .join("");

      // 3. 화면에 HTML 삽입
      seriesGrid.innerHTML = columnsHtml;

      Shop.sync();
    })
    .catch((err) => console.error("BEST SERIES 로딩 오류:", err));

  // 배너 클릭은 기존 상세 페이지로, 상품 카드는 상품별 상세 페이지로 이동합니다.
  if (bestSection) {
    bestSection.addEventListener("click", (e) => {
      if (e.target.closest(".wish-btn")) return;
      const productLink = e.target.closest(".mini-product-link");
      if (productLink?.dataset.productId) return;
      if (productLink?.getAttribute("aria-disabled") === "true") { e.preventDefault(); return; }
      if (e.target.closest(".series-banner")) window.location.href = "sub.html";
    });
  }
});
