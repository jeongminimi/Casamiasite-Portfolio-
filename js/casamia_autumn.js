document.addEventListener("DOMContentLoaded", () => {
  // 1. 메인 HTML 6층의 가을/신혼 상품 리스트 컨테이너 선택
  const listContainer = document.querySelector(".autumn-list");
  if (!listContainer) return;

  // 2. 가을 기획전 JSON 상품 데이터 바로 호출
  fetch("json/casamia_autumn.json")
    .then((res) => {
      if (!res.ok) throw new Error("casamia_autumn.json 로드 실패");
      return res.json();
    })
    .then((data) => {
      // 3. 상품 카드 HTML 생성
      const html = data
        .map((item) => {
          const discount = item.discount || 0;
          const originalPrice =
            item.original_price ||
            (discount > 0 && item.price ? Math.round(item.price / (1 - discount / 100)) : null);
          const brand = item.brand || "까사미아";
          const badgeHtml = item.badge ? `<span class="badge-deal">${item.badge}</span>` : "";

          return `
            <a href="#" class="product-card-link">
              <div class="product-card">
                <div class="img-wrap">
                  ${badgeHtml}
                  <img src="${item.main_img}" alt="${item.name}">
                </div>
                <div class="brand-name">${brand}</div>
                <h4 class="product-name">${item.name}</h4>
                ${originalPrice ? `<div class="original-price">${originalPrice.toLocaleString()}</div>` : ""}
                <div class="price-row">
                  <div class="price-wrap">
                    ${discount > 0 ? `<span class="discount-rate">${discount}%</span>` : ""}
                    <span class="final-price">${item.price.toLocaleString()}</span>
                  </div>
                  <button type="button" class="wish-btn" aria-label="찜하기">
                    <svg viewBox="0 0 24 24">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                  </button>
                </div>
              </div>
            </a>
          `;
        })
        .join("");

      // 4. 리스트 컨테이너에 HTML 삽입
      listContainer.innerHTML = html;

      // 5. 마우스 드래그 좌우 슬라이드 기능 연결
      initAutumnSliderDrag(listContainer);
    })
    .catch((err) => console.error("가을 기획전 처리 실패:", err));
});

// 가을 기획전 전용 마우스 드래그 슬라이더 함수
function initAutumnSliderDrag(slider) {
  let isDown = false;
  let startX;
  let scrollLeft;

  slider.addEventListener("mousedown", (e) => {
    isDown = true;
    slider.style.cursor = "grabbing";
    startX = e.pageX - slider.offsetLeft;
    scrollLeft = slider.scrollLeft;
  });

  slider.addEventListener("mouseleave", () => {
    isDown = false;
    slider.style.cursor = "default";
  });

  slider.addEventListener("mouseup", () => {
    isDown = false;
    slider.style.cursor = "default";
  });

  slider.addEventListener("mousemove", (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - slider.offsetLeft;
    const walk = (x - startX) * 1.5;
    slider.scrollLeft = scrollLeft - walk;
  });
}