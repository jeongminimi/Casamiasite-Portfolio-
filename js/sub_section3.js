// Control recommendation cards and pagination dots.
document.addEventListener("DOMContentLoaded", () => {
  const recommendGrid = document.getElementById("recommendGrid");
  const viewport = document.getElementById("sliderViewport");
  const dotsContainer = document.getElementById("paginationDots");

  let currentPage = 0;
  let totalPages = 1;
  const itemsPerPage = 4;

  // JSON 비동기 로드
  fetch("json/sub_section3.json")
    .then((res) => {
      if (!res.ok) throw new Error("JSON 파일을 불러올 수 없습니다.");
      return res.json();
    })
    .then((items) => {
      totalPages = Math.ceil(items.length / itemsPerPage);
      renderRecommendCards(items);
      renderDots(totalPages);
      Shop.sync();
      initSwipeEvents();
    })
    .catch((err) => console.error(err));

  // 1. 카드 렌더링
  function renderRecommendCards(products) {
    if (!recommendGrid) return;
    recommendGrid.innerHTML = products
      .map((item) => {
        const hasOriginal = item.originalPrice ? item.originalPrice : "";
        const discountHtml = item.discount ? `<span class="rec-discount">${item.discount}</span>` : "";

        return `
          <div class="rec-card" data-id="${item.id}">
            <div class="rec-img-box">
              <img src="${item.image}" alt="${item.name}">
            </div>
            <div class="rec-info">
              <span class="rec-brand">${item.brand}</span>
              <p class="rec-name">${item.name}</p>
              <span class="rec-original-price">${hasOriginal}</span>
              <div class="rec-price-row">
                <div class="rec-price-wrap">
                  ${discountHtml}
                  <span class="rec-price">${item.price}</span>
                </div>
                <button type="button" class="rec-heart-btn" aria-label="찜하기" ${Shop.wishAttributes({ id: "recommend-" + item.id, name: item.name, price: item.price, image: item.image, brand: item.brand })}>♥</button>
              </div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  // 2. 도트 렌더링 및 페이지 이동
  function renderDots(pages) {
    if (!dotsContainer) return;
    dotsContainer.innerHTML = "";
    for (let i = 0; i < pages; i++) {
      const dot = document.createElement("span");
      dot.className = `dot ${i === 0 ? "active" : ""}`;
      dot.addEventListener("click", () => goToPage(i));
      dotsContainer.appendChild(dot);
    }
  }

  function goToPage(pageIndex) {
    if (pageIndex < 0) pageIndex = 0;
    if (pageIndex >= totalPages) pageIndex = totalPages - 1;
    currentPage = pageIndex;

    // gap(16px) 포함 뷰포트 너비만큼 이동
    const movePercent = -(currentPage * 100);
    const gapOffset = -(currentPage * 16);
    recommendGrid.style.transform = `translateX(calc(${movePercent}% + ${gapOffset}px))`;

    // 도트 활성화 상태 갱신
    const dots = dotsContainer.querySelectorAll(".dot");
    dots.forEach((dot, idx) => {
      dot.classList.toggle("active", idx === currentPage);
    });
  }

  // 3. 마우스 드래그(스와이프) 기능
  function initSwipeEvents() {
    let startX = 0;
    let isDragging = false;

    viewport.addEventListener("mousedown", (e) => {
      startX = e.pageX;
      isDragging = true;
    });

    window.addEventListener("mouseup", (e) => {
      if (!isDragging) return;
      isDragging = false;
      const endX = e.pageX;
      const diffX = endX - startX;

      // 50px 이상 드래그했을 때 페이지 전환
      if (diffX < -50) {
        goToPage(currentPage + 1); // 다음 4개 상품
      } else if (diffX > 50) {
        goToPage(currentPage - 1); // 이전 4개 상품
      }
    });
  }

});
