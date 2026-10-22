# 계정 및 마이페이지 동작

프론트엔드 인증은 FastAPI의 JWT API를 사용합니다.

- 회원가입: `POST /api/v1/auth/register`
- 로그인: `POST /api/v1/auth/login`
- 현재 사용자: `GET /api/v1/users/me`
- 관리자 권한 확인: `GET /api/v1/admin/check`
- 토큰 저장 키: `casamia.auth.token.v1`
- 사용자 표시용 캐시 키: `casamia.auth.user.v1`

로그인 성공 후 발급된 Access Token은 `js/api.js`가 Bearer 헤더에 자동으로 첨부합니다. 권한은 토큰의 role 값만으로 결정하지 않고 서버가 DB의 현재 사용자와 역할을 다시 확인합니다. 로그아웃하면 토큰과 사용자 캐시를 삭제합니다.

장바구니와 찜 목록은 현재 브라우저 `localStorage`에 유지합니다. 주문과 장바구니의 서버 저장은 아직 구현하지 않았습니다.

프론트 단위 검증:

```powershell
node tests/account.test.cjs
node tests/shop.test.cjs
```
