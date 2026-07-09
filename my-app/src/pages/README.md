# pages

라우트 단위 화면 컴포넌트. `design-reference/`의 프로토타입 1개가 대략 페이지 1개에 대응한다.

- `main.html` → 대시보드 페이지
- `brand_onboarding1~3.html` → 브랜드 온보딩 인터뷰 플로우
- `notice_write1~2.html` → 공지사항 작성 플로우
- `post_write.html`, `post_result.html` → 홍보글 작성/결과
- `upload_later.html` → 예약 발행

페이지 컴포넌트는 레이아웃과 데이터 연결만 담당하고, 실제 UI 조각은 `../components`에서 가져다 쓴다.
