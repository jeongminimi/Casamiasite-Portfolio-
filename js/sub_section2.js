// Initialize supporting content on the legacy detail page.
document.addEventListener("DOMContentLoaded", () => {
  const blocks = document.querySelectorAll(".sub_section2 .content-block");

  // 세로로 긴 이미지 묶음도 화면 진입 즉시 부드럽게 보이도록 설정 보완
  const observer = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          // 한 번 화면에 나타나면 관찰을 해제해 불필요한 연산 방지
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.05, // 요소가 5%만 보여도 즉시 표시
      rootMargin: "0px 0px -50px 0px" // 뷰포트 하단 도달 시점 보정
    }
  );

  blocks.forEach((block) => observer.observe(block));
});
