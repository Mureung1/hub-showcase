# Core Loop Builder

게임 기획자를 꿈꾸는 사용자가 장르와 참고 게임을 입력하면, AI가 게임의 핵심 반복 구조인 코어 루프를 같이 설계하고 포트폴리오용 기획 초안으로 정리하도록 돕는 AI Agent 서비스.

기획서: [`project-plan.md`](./project-plan.md) (Wiki 최신본: [Core-Loop-Builder-기획서](https://github.com/geulcho/hub/wiki/Core-Loop-Builder-기획서))

## 디렉토리 구조

```
core-loop-builder/
  client/     Vite + React 19 프론트엔드
  server/     Express 백엔드 (LLM 호출은 여기서만)
  design/     디자인 토큰 + 디자인 시스템 문서
  docs/       API 설계, 회고 등 장문 문서
  prototype/  초기 흐름 검증용 정적 HTML/CSS 프로토타입 (참고용, 유지보수 대상 아님)
  .claude/skills/design-guide/   새 화면 디자인 시 자체 점검용 skill
```

## 기술 스택

- **Frontend**: React 19 + Vite, `react-router-dom`(화면 전환), `framer-motion`(마이크로 인터랙션). UI 프레임워크는 쓰지 않는다(디자인 시스템 직접 구현).
- **Backend**: Node.js + Express, `@anthropic-ai/sdk`(Claude API), `cors`, `dotenv`.
- **Storage**: MVP 범위에서는 별도 DB 없음(요청-응답 흐름 위주). 필요해지면 이 문서에 먼저 기록하고 도입한다.

## 아키텍처 규칙

- **LLM 키는 server에서만 다룬다.** `ANTHROPIC_API_KEY`는 `server/.env`에만 두고, client 번들에는 절대 노출하지 않는다. client는 항상 `server`의 REST 엔드포인트를 통해서만 AI 결과를 받는다.
- 기획서의 7-Agent 파이프라인(Input → Genre Loop → Reference Analysis → Brainstorming → Loop Visualizer → Portfolio Writer → Critic)은 하나의 거대 프롬프트가 아니라 server 쪽에서 단계별 함수/엔드포인트로 나눠 구현한다.

## 디자인 시스템

새 화면을 만들거나 기존 화면을 수정하기 전에 반드시 아래를 확인한다.

1. [`design/DESIGN_SYSTEM.md`](./design/DESIGN_SYSTEM.md) — 색상 역할, 글래스 패널 레시피, 컴포넌트 패턴, game-feel 모티프 규칙
2. [`design/design-tokens.css`](./design/design-tokens.css) — 실제 CSS 커스텀 프로퍼티
3. `.claude/skills/design-guide` skill — 완성된 화면을 자체 체크리스트로 점검할 때 사용

한 줄 요약: 블루→바이올렛→시안 쿨톤 그라디언트 배경 위에 천천히 표류하는 블러 오브, 그 위에 화이트 프로스티드 글래스 패널. 강조색은 gold 하나만. game-feel은 진행바·배지·순환 다이어그램 같은 "진행/성취" 모티프로만 표현하고 장식적 게임 클리셰는 쓰지 않는다.

## 컨벤션

- **커밋**: Conventional Commits — `type(scope): description`. type = `feat|fix|docs|refactor|chore|test`, scope = `client|server|design|docs`. (예: `feat(client): 입력 폼 UI 구현`)
- **브랜치**: `feature/*`
- **CSS**: client 쪽 컴포넌트 클래스는 기존 `clb-` 프리픽스를 계속 사용한다.
- **코드 스타일**: `.prettierrc.json`(세미콜론 없음, 싱글쿼트) 기준. client는 `npm run format`, server도 동일.

## 실행

```bash
cd client && npm install && npm run dev      # http://localhost:5173
cd server && npm install && npm run dev      # http://localhost:4000
```

## 진행 상태와 다음 할 일

단일 출처는 [`docs/BACKLOG.md`](./docs/BACKLOG.md)다. 우선순위(P0/P1/P2)와 주차별 Task, "이번 주까지 끝낼 것"이 전부 거기 있으니 여기에 따로 체크리스트를 중복 유지하지 않는다.
