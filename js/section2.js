// Control the secondary content tab and slide transition.
document.addEventListener("DOMContentLoaded", () => {
  // 1. 메인 HTML에 이미 존재하는 6개의 카드 요소 직접 선택
  const restCards = document.querySelectorAll(".rest-card");

  if (restCards.length === 0) return;

  // 2. 마우스 호버 인터랙션 등록
  restCards.forEach((card) => {
    // 마우스를 올렸을 때
    card.addEventListener("mouseenter", () => {
      card.classList.add("is-hovered");
    });

    // 마우스가 벗어났을 때
    card.addEventListener("mouseleave", () => {
      card.classList.remove("is-hovered");
    });
  });
});
