// Initialize shared top-bar menus and search interactions.
document.addEventListener("DOMContentLoaded", () => {
  const searchForm = document.getElementById("searchForm");
  const searchInput = document.querySelector(".search-input");
  const menuToggleBtn = document.querySelector(".btn-menu");

  // 검색창 엔터 및 돋보기 클릭 이벤트
  searchForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const query = searchInput?.value.trim();
    if (!query) {
      alert("검색어를 입력해주세요.");
      searchInput.focus();
      return;
    }
    window.location.href = `search.html?q=${encodeURIComponent(query)}`;
  });

  // 전체 메뉴 (햄버거 버튼) 클릭 이벤트
  menuToggleBtn?.addEventListener("click", () => {
    alert("전체 메뉴가 클릭되었습니다.");
  });
});
