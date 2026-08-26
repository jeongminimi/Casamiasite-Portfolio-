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
    .then((data) => {
      // 2. JSON 데이터를 기반으로 3단 그리드 HTML 생성
      const columnsHtml = data
        .map((col) => {
          // 열 내부 상품 리스트 생성
          const productsHtml = col.products
            .map(
              (item) => `
              <div class="mini-product-item">
                <div class="thumb-wrap">
                  <span class="badge">${item.badge}</span>
                  <img src="${item.thumb}" alt="${item.alt}" />
                </div>
                <div class="product-details">
                  <span class="brand">${item.brand}</span>
                  <p class="name">${item.name}</p>
                  <del class="original-price">${item.originalPrice}</del>
                  <div class="price-wrap">
                    <span class="discount">${item.discount}</span>
                    <span class="price">${item.price}</span>
                  </div>
                </div>
                <button type="button" class="wish-btn" aria-label="찜하기">♡</button>
              </div>
            `
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

      // 4. 찜하기 버튼 클릭 이벤트 (새 창 이동 방지)
      const wishButtons = seriesGrid.querySelectorAll(".wish-btn");
      wishButtons.forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation(); // 상위 섹션의 sub.html 새 창 이동 이벤트 차단

          btn.classList.toggle("active");
          btn.textContent = btn.classList.contains("active") ? "♥" : "♡";
        });
      });
    })
    .catch((err) => console.error("BEST SERIES 로딩 오류:", err));

  // 5. 상품 및 배너 영역 클릭 시 sub.html 새 창 열기 (이벤트 위임)
  if (bestSection) {
    bestSection.addEventListener("click", (e) => {
      // 찜하기 버튼 클릭 시에는 실행하지 않음
      if (e.target.closest(".wish-btn")) return;

      // 배너 또는 상품 아이템 클릭 시 새 창 열기
      const target = e.target.closest(".series-banner, .mini-product-item, .series-column");
      if (target) {
        e.preventDefault();
        window.open("sub.html", "_blank");
      }
    });
  }
});