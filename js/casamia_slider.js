// 배너 슬라이드
document.addEventListener("DOMContentLoaded", () => {
  // 배너 이미지 목록
  const banners = [
    "img/slider/1.avif",
    "img/slider/2.avif",
    "img/slider/3.avif",
    "img/slider/4.avif",
    "img/slider/5.avif"
  ];

  const bannerImg = document.getElementById("bannerImg");
  let index = 0; // 현재 배너번호

  // 1. 첫 번째 이미지 즉시 로드
  bannerImg.src = banners[index];

  // 2. 3초마다 다음 배너로 자동 변경
  setInterval(() => {
    // 다음 인덱스 계산 (5가 되면 0으로 순환)
    index = (index + 1) % banners.length;

    // 이미지 변경
    bannerImg.src = banners[index];
  }, 2000); // 2000ms = 2초
});
