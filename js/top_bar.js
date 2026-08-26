document.addEventListener("DOMContentLoaded", () => {
  const searchForm = document.getElementById("searchForm");
  const searchInput = document.getElementById("searchInput");
  const menuToggleBtn = document.getElementById("menuToggleBtn");

  // 검색창 엔터 및 돋보기 클릭 이벤트
  searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const query = searchInput.value.trim();
    if (!query) {
      alert("검색어를 입력해주세요.");
      searchInput.focus();
      return;
    }
    console.log(`검색어 전송: ${query}`);
    // 실제 검색 페이지로 이동할 때:
    // window.location.href = `/search?q=${encodeURIComponent(query)}`;
  });

  // 전체 메뉴 (햄버거 버튼) 클릭 이벤트
  menuToggleBtn.addEventListener("click", () => {
    alert("전체 메뉴가 클릭되었습니다.");
  });
});