# Beacon

> 말을 걸면 지켜보고, 내 기록을 기억해 코치하는 AI 투자 에이전트

자연어로 조건을 걸면 KIS Open API로 시장을 감시해 Discord로 알림하고, 그렇게 실행한 매매를 **AI 코칭 에이전트**가 과거 기록을 근거로 복기해 반복 실수를 짚어준다. Naver AI Agent Challenge 제출물.

## 문서 (읽는 순서)

- **[docs/plan.md](docs/plan.md)** — 기획서: 문제·페르소나·차별점·에이전트다움·핵심기능(MoSCoW)·화면흐름·아키텍처·KPI·일정
- **[docs/prd.md](docs/prd.md)** — 상세 구현 스펙: DB 스키마·에이전트 도구 계약·화면 스펙·수용 기준 *(작성 예정)*
- **[docs/design.md](docs/design.md)** — 디자인 시스템: 색·타이포·간격·컴포넌트 토큰의 단일 원천 (UI 작업 시 필독)
- **[docs/checklist.md](docs/checklist.md)** — 작업 체크리스트 (1단계 MVP / 2단계 다중사용자)
- **[mockups/](mockups/)** — 핵심 화면 UI 목업(HTML). 스크린샷은 `docs/images/`

## 폴더 구조 (npm workspaces)

루트는 워크스페이스 관리자이고, 실제 앱은 두 하위 패키지에 있다.

- **[mvp/](mvp/)** — 동작하는 MVP ver1 (Vite+React SPA + Supabase Edge Functions·scripts·마이그레이션). 실배선.
- **[prototype/](prototype/)** — 디자인 프로토타입 (Vite+React + 목데이터, 비동작). 디자인 시스템 시연용이자 2주차 개발의 UI 토대.
- 루트 공통: `docs/`, `mockups/`, `.claude/`(스킬·launch.json), `CLAUDE.md`, `README.md`.

## 핵심 결정 (요약 — 근거는 plan.md)

- **에이전트 배치**: 복기 = 코칭 에이전트. 도구 3종(`search_past_trades`·`get_price_context`·`get_past_reviews`)을 **스스로 다단계 호출**해 근거를 모아 판단(1-shot LLM 호출 아님). + 알림 문구에 과거 복기 한 줄 연결(얕은 메모리).
- **감시는 스케줄러**(Supabase Cron)가, 단 **알림 문구 생성만 에이전트**가 담당.
- **단계**: 1단계 MVP는 1인용으로 감시→기록→복기 루프를 끝까지 완주. 2단계에서 다중 사용자(Auth·RLS)로 확장.
- **North Star**: 끊기지 않은 루프 수(감시→기록→복기 완주 건수). 보조: 복기의 과거기록 인용률.

## 스택 (전부 무료 티어)

- **웹**: Vite + React SPA. 프로토타입 단계는 정적 HTML/CSS로 핵심 흐름 시연.
- **백엔드**: Supabase — Postgres + Auth + Edge Functions(Deno)로 Discord 인터랙션·KIS 폴링·에이전트 실행.
- **감시 스케줄**: Supabase Cron (pg_cron + pg_net) → Edge Function 호출.
- **LLM**: Gemini Flash (function calling + structured output). 파싱·복기 모두 담당.
- **외부**: KIS Open API(현재가/일봉), Discord(슬래시 커맨드 + 버튼).
- **원본 참고 레포** (코드 마이그레이션 아님, **참고만** 하고 신규 구축):
  - [KIS_openapi](https://github.com/gyuwonlee1/KIS_openapi) — 자연어 조건 알림 봇
  - [investment_journal](https://github.com/gyuwonlee1/investment_journal) — 차트 기록·AI 복기 저널

## 명령어

루트에서 실행 (npm workspaces):

- `npm install` — 루트에서 한 번. 두 워크스페이스 의존성을 함께 설치.
- `npm run dev:mvp` — MVP dev 서버 (http://localhost:5173)
- `npm run dev:proto` — 프로토타입 dev 서버 (http://localhost:5174)
- `npm run build:mvp` / `build:proto` / `preview:mvp` / `preview:proto`
- `npm run lint` — oxlint (mvp)

## 컨벤션 / 주의

- 문서·UI 카피는 **한국어**.
- **디자인은 [docs/design.md](docs/design.md)가 단일 원천**. 색/라운드/그림자는 항상 CSS 토큰 변수로(하드코딩 금지). 토큰 원본: [prototype/src/index.css](prototype/src/index.css), [mvp/src/index.css](mvp/src/index.css). **Robinhood 기반**: 다크 우선(블랙 `#000`) + 브랜드 그린 accent `#00c805`(라이트 `#00a306`) + pill 버튼. 그린은 브랜드/CTA 전용이고 국내 관례색은 상승=빨강/하락=파랑 유지.
- UI 작업 시 **`beacon-design` 스킬**([.claude/skills/beacon-design/SKILL.md](.claude/skills/beacon-design/SKILL.md))을 따른다.
- DB는 처음부터 **RLS 전제**로 설계(2단계 다중사용자 전환 비용 최소화).
- 복기 결과에는 인용한 `cited_trade_ids`를 함께 저장해 에이전트 판단을 검증 가능하게 한다.
- 알려진 정리 대상: 인트로 페이지 [mvp/src/components/ProjectIntro.jsx](mvp/src/components/ProjectIntro.jsx)의 `.stack` 칩에 아직 `Next.js` 잔재가 있음(실제 스택은 Vite+React).
