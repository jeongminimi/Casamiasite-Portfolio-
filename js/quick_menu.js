document.addEventListener("DOMContentLoaded", () => {
  // 카테고리 데이터 정의
  const categories = [
    {
      id: "campo",
      name: "캄포 할인",
      link: "#campo",
      imgSrc: "img/quick_menu/sofa.avif", // 준비된 이미지 경로로 변경
      type: "image"
    },
    {
      id: "dining",
      name: "다이닝",
      link: "#dining",
      imgSrc: "img/quick_menu/dinning.avif",
      type: "image"
    },
    {
      id: "bed",
      name: "침대",
      link: "#bed",
      imgSrc: "img/quick_menu/bed.avif",
      type: "image"
    },
    {
      id: "materasso",
      name: "마테라소",
      link: "#materasso",
      imgSrc: "img/quick_menu/matrix.avif",
      type: "image"
    },
    {
      id: "dressroom",
      name: "드레스룸",
      link: "#dressroom",
      imgSrc: "img/quick_menu/dressroom.avif",
      type: "image"
    },
    {
      id: "wedding",
      name: "웨딩클럽",
      link: "#wedding",
      type: "wedding"
    },
    {
      id: "guud",
      name: "입점 브랜드",
      link: "#guud",
      type: "guud"
    }
  ];

  const categoryListContainer = document.getElementById("quickCategoryList");

  if (!categoryListContainer) return;

  // 템플릿 렌더링
  categoryListContainer.innerHTML = categories
    .map((item) => {
      let iconInnerHtml = "";

      if (item.type === "image") {
        iconInnerHtml = `<div class="quick-icon-wrap"><img src="${item.imgSrc}" alt="${item.name}"></div>`;
      } else if (item.type === "wedding") {
        iconInnerHtml = `
          <div class="quick-icon-wrap pink-bg">
            <div class="wedding-text">
              <span>♥</span>Wedding<br>CLUB
            </div>
          </div>`;
      } else if (item.type === "guud") {
        iconInnerHtml = `
          <div class="quick-icon-wrap">
            <span class="guud-text">Guud</span>
          </div>`;
      }

      return `
        <li>
          <a href="${item.link}" class="quick-category-item" data-id="${item.id}">
            ${iconInnerHtml}
            <span class="category-name">${item.name}</span>
          </a>
        </li>
      `;
    })
    .join("");

  // 클릭 이벤트 바인딩
  const categoryItems = document.querySelectorAll(".quick-category-item");
  categoryItems.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const targetId = btn.getAttribute("data-id");
      // 필요 시 페이지 이동 또는 상품 필터링 로직 연결
    });
  });
});
