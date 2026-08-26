document.addEventListener("DOMContentLoaded", () => {
  /* ==========================================================================
     0. 상단 로고: 메인화면(index.html) 이동 기능
     ========================================================================== */
  const logoLink = document.querySelector(".logo a");
  if (logoLink) {
    logoLink.addEventListener("click", (e) => {
      e.preventDefault(); // 기본 '#' 이동 동작 방지
      location.href = "index.html"; // 메인 화면 파일명으로 이동
    });
  }

  /* ==========================================================================
     1. 왼쪽 섹션: 이미지 슬라이더 및 썸네일 기능
     ========================================================================== */
  const images = [
    "img/sub/main1.avif",
    "img/sub/main2.avif",
    "img/sub/main3.avif",
    "img/sub/main4.avif"
  ];

  let currentIndex = 0;
  const mainImage = document.getElementById("mainImage");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const thumbnails = document.querySelectorAll(".thumb");

  // 메인 이미지 및 썸네일 활성화 상태 변경 함수
  function updateImage(index) {
    if (!mainImage) return;
    currentIndex = index;
    mainImage.src = images[currentIndex];
    thumbnails.forEach((thumb, idx) => {
      thumb.classList.toggle("active", idx === currentIndex);
    });
  }

  // 이전 버튼 클릭
  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      const nextIdx = (currentIndex - 1 + images.length) % images.length;
      updateImage(nextIdx);
    });
  }

  // 다음 버튼 클릭
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      const nextIdx = (currentIndex + 1) % images.length;
      updateImage(nextIdx);
    });
  }

  // 하단 썸네일 클릭
  thumbnails.forEach((thumb) => {
    thumb.addEventListener("click", (e) => {
      const idx = parseInt(e.currentTarget.dataset.index, 10);
      if (!isNaN(idx)) {
        updateImage(idx);
      }
    });
  });

  /* ==========================================================================
     2. 오른쪽 섹션: 찜(하트) 토글 기능
     ========================================================================== */
  const wishBtn = document.getElementById("wishBtn");
  if (wishBtn) {
    wishBtn.addEventListener("click", () => {
      wishBtn.classList.toggle("liked");
    });
  }

  /* ==========================================================================
     3. 오른쪽 섹션: 상품 커스텀 드롭다운 & 하위 옵션 활성화 & 총 금액 계산
     ========================================================================== */
  const customSelect = document.getElementById("customProductSelect");
  const optionSelect = document.getElementById("optionSelect");
  const totalPrice = document.getElementById("totalPrice");

  if (customSelect) {
    const selectedDisplay = customSelect.querySelector(".selected-option");
    const optionItems = customSelect.querySelectorAll(".option-list li");

    // 드롭다운 열기 / 닫기 토글
    selectedDisplay.addEventListener("click", () => {
      customSelect.classList.toggle("active");
    });

    // 드롭다운 외부 클릭 시 목록 닫기
    document.addEventListener("click", (e) => {
      if (!customSelect.contains(e.target)) {
        customSelect.classList.remove("active");
      }
    });

    // 커스텀 옵션 목록 항목 클릭 시
    optionItems.forEach((item) => {
      item.addEventListener("click", () => {
        const imgElement = item.querySelector("img");
        const titleElement = item.querySelector(".option-text span");
        const price = parseInt(item.dataset.value, 10);

        // 선택 영역의 내용(이미지 + 텍스트) 갱신
        if (imgElement && titleElement) {
          selectedDisplay.innerHTML = `
            <img src="${imgElement.src}" alt="선택 상품">
            <span>${titleElement.textContent}</span>
          `;
        }

        // 드롭다운 닫기
        customSelect.classList.remove("active");

        // 2차 옵션선택(컬러) 활성화 및 기본값 초기화
        if (optionSelect) {
          optionSelect.disabled = false;
          optionSelect.selectedIndex = 0;
        }

        // 총 상품금액 반영
        if (totalPrice && !isNaN(price)) {
          totalPrice.textContent = `${price.toLocaleString()}원`;
        }
      });
    });
  }
});