// Control the first recommendation slider on the legacy detail page.
document.addEventListener("DOMContentLoaded", () => {
  const gridContainer = document.getElementById("productGrid");
  const emptyCard = gridContainer ? gridContainer.querySelector(".empty-card") : null;

  // 1. JSON 데이터 비동기 로드 및 카드 렌더링
  fetch("json/sub_section1.json")
    .then((res) => {
      if (!res.ok) throw new Error("데이터를 불러오지 못했습니다.");
      return res.json();
    })
    .then((products) => {
      renderProducts(products);
      initHoverEvents();
    })
    .catch((err) => console.error(err));

  function renderProducts(items) {
    if (!gridContainer) return;

    items.forEach((item) => {
      const card = document.createElement("div");
      card.className = "product-card interactive";
      card.innerHTML = `
        <div class="card-img-box">
          <img src="${item.image}" alt="${item.name}">
          <!-- 마우스 호버 시 노출되는 돋보기 레이어 -->
          <div class="zoom-badge">
            <svg class="zoom-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <span>자세히보기</span>
          </div>
        </div>
        <div class="card-info">
          <span class="badge">${item.badge}</span>
          <p class="title">${item.name}</p>
          <span class="brand">${item.brand}</span>
          <div class="price-row">
            <span class="discount">${item.discount}</span>
            <span class="price">${item.price}</span>
          </div>
        </div>
      `;

      if (emptyCard) {
        gridContainer.insertBefore(card, emptyCard);
      } else {
        gridContainer.appendChild(card);
      }
    });
  }

  // 2. 마우스 진입/이탈 시 is-hovered 클래스 토글
  function initHoverEvents() {
    const cards = document.querySelectorAll(".product-card.interactive");

    cards.forEach((card) => {
      card.addEventListener("mouseenter", () => {
        card.classList.add("is-hovered");
      });

      card.addEventListener("mouseleave", () => {
        card.classList.remove("is-hovered");
      });
    });
  }
});
