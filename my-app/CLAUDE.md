# 알리장 (AlriJang)

소상공인을 위한 AI 홍보 에이전트. 전체 기획은 [PROJECT.md](PROJECT.md) 참고.

## 스택

- 프론트: Vite + React 19, Tailwind CSS v4 (`@tailwindcss/vite`)
- 백엔드: Node.js + Express 예정 (아직 미구현, [docs/api-spec.md](docs/api-spec.md)가 계약)
- 라우팅: `react-router-dom` (`/` 대시보드, `/posts/promotion/new` 홍보글 작성 인터뷰)
- 상태: 화면은 목데이터로 하나씩 구현 중 (대시보드, 홍보글 작성 인터뷰 완료). 백엔드는 아직 미구현.

## 실행

```
npm install
npm run dev
```

`.env`에 `VITE_API_BASE_URL` 설정 (`.env.example` 참고). 백엔드 없이 프론트만 개발할 때는 목업 데이터 사용.

## 폴더 구조

```
design-reference/   프로토타입 정적 HTML (참고 전용, 수정하지 않음)
docs/api-spec.md    API 명세서
src/
  pages/            라우트 단위 화면
  components/       여러 페이지에서 재사용하는 UI 조각
  hooks/            API 연동 커스텀 훅
  api/client.js     fetch 래퍼 (VITE_API_BASE_URL 사용)
  index.css         Tailwind 진입점 + 디자인 토큰(@theme)
```

## 디자인 시스템

화면 레이아웃/구조는 [WIREFRAME.md](WIREFRAME.md), 색상/타이포/spacing/radius 토큰과 컴포넌트 스타일 가이드는 [DESIGN.md](DESIGN.md) 참고. 새 컴포넌트를 만들기 전에 `design-system` 스킬(`.claude/skills/design-system/`)이 이 두 문서를 확인하도록 되어 있다. `src/index.css`의 Tailwind `@theme`는 DESIGN.md의 토큰을 그대로 반영한 것이다.

## 작업 방식

- 화면은 컴포넌트 단위로 하나씩 만든다. 큰 덩어리를 한 번에 구현하지 말고, 각 컴포넌트 시작 전에 요구사항이나 애매한 부분을 먼저 질문한다.
- 여러 단계를 진행할 때는 지금 무슨 작업을 하고 있는지 한국어로 짧게 설명하면서 진행한다.
- 세션 범위(오늘 어디까지 할지)는 미리 정한 선에서 멈추고, 다음 확장은 사용자에게 먼저 확인한다.

## 커밋 규칙

- 형식: `<type>: <한국어 한 줄 요약>` (예: `feat: 메인 대시보드 화면 구현`). 명사형으로 짧게, 마침표 없음.
- type 종류
  - `feat`: 새 기능/화면/컴포넌트 추가
  - `fix`: 버그 수정
  - `refactor`: 동작 변화 없는 구조 개선
  - `chore`: 설정, 의존성, 빌드 등 잡무성 변경
  - `docs`: PROJECT.md/DESIGN.md/WIREFRAME.md/CLAUDE.md/docs 등 문서만 변경
- 본문: 트러블슈팅이 있었던 경우(버그 원인 파악, 여러 방법 시도 후 하나를 선택, design-reference/WIREFRAME.md/DESIGN.md에 없는 내용을 임의로 채운 경우 등)에만 1~3줄로 추가한다. 단순 추가/수정은 제목만으로 충분하다.
- 관련 없는 변경은 한 커밋에 묶지 않는다. 예: 화면 A 작업과 화면 B로의 라우팅 연결은 별도 커밋으로 분리.
- 커밋 전 `git diff --cached`로 실제 스테이징된 내용이 커밋 메시지와 맞는지 확인한다.
- `Co-Authored-By` 트레일러는 쓰지 않는다.
