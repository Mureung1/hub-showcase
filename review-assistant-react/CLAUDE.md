# review-assistant-react

React app (Vite) — 소상공인이 손님 리뷰를 붙여넣으면 감정 분석·키워드 추출·반복 문제 감지·답변 초안 3종을 생성해주는 도구.

## Design system

이 프로젝트는 claude.ai/design에서 만든 디자인 핸드오프를 따른다. **UI를 새로 만들거나 수정할 때는 항상 아래 파일을 먼저 확인할 것.**

- [`design/handoff.md`](design/handoff.md) — 화면별 스펙(레이아웃, 색상, 타이포, 인터랙션), 데이터 흐름, 에러 메시지 문구까지 포함한 원본 핸드오프 문서.
- [`design/reference_리뷰답변도우미.dc.html`](design/reference_리뷰답변도우미.dc.html) — 픽셀 단위로 확정된 레퍼런스 프로토타입(사내 프로토타이핑 포맷, 그대로 복사하지 말고 구조/값만 참고).
- [`src/design-tokens.css`](src/design-tokens.css) — 위 핸드오프에서 추출한 CSS 커스텀 프로퍼티(OKLCH 색상, radius, shadow, 폰트). `main.jsx`에서 전역 로드됨.

새 컴포넌트나 화면을 추가할 때:
1. 색상/spacing/radius/shadow는 하드코딩하지 말고 `design-tokens.css`의 변수(`var(--color-*)`, `var(--radius-*)` 등)를 사용한다.
2. 새 디자인 스펙이 추가되면 `design/` 폴더에 원본 핸드오프를 먼저 추가하고, 거기서 토큰을 뽑아 `design-tokens.css`에 반영한 뒤 컴포넌트를 구현한다.
3. 토큰에 없는 값이 필요하면 임의로 만들지 말고, 디자인 핸드오프에 없는 값인지 먼저 확인 — 없으면 사용자에게 확인.
