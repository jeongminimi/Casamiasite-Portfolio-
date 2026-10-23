// Control autoplay and navigation for the secondary main slider.
document.addEventListener("DOMContentLoaded", () => {
  // 1. 메인 HTML에 이미 존재하는 슬라이더 트랙과 인디케이터 점 선택
  const track = document.getElementById("sliderTrack");
  const dots = document.querySelectorAll(".slider2-section .dot");

  // 요소가 없으면 실행 중단
  if (!track || dots.length === 0) return;

  const totalSlides = dots.length; // 총 4개 슬라이드
  let currentIndex = 0;

  // 2. 슬라이드 위치 및 점 활성화 갱신 함수
  function updateSlider(index) {
    // 가로 방향(-100%, -200%...) 이동 애니메이션
    track.style.transform = `translateX(-${index * 100}%)`;

    // 현재 순번의 점만 active 클래스 적용
    dots.forEach((dot, i) => {
      dot.classList.toggle("active", i === index);
    });
  }

  // 3. 2초(2000ms)마다 자동 롤링
  setInterval(() => {
    currentIndex = (currentIndex + 1) % totalSlides;
    updateSlider(currentIndex);
  }, 2000);

  // 4. 하단 점(Dot) 클릭 시 해당 위치로 즉시 이동
  dots.forEach((dot, i) => {
    dot.addEventListener("click", () => {
      currentIndex = i;
      updateSlider(currentIndex);
    });
  });
});
