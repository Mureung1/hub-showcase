# Beacon

> 말을 걸면 지켜보고, 내 기록을 기억해 코치하는 AI 투자 에이전트

자연어로 조건을 걸면 KIS Open API로 시장을 감시해 Discord로 알림하고, 그렇게 실행한 매매를 **AI 코칭 에이전트**가 과거 기록을 근거로 복기해 반복 실수를 짚어준다. Naver AI Agent Challenge 제출물.

## 문서 (읽는 순서)

- **[docs/plan.md](docs/plan.md)** — 기획서: 문제·페르소나·차별점·에이전트다움·핵심기능(MoSCoW)·화면흐름·아키텍처·KPI·일정
- **[docs/prd.md](docs/prd.md)** — 상세 구현 스펙: DB 스키마(0006 포함)·에이전트 도구 계약·화면 스펙·수용 기준
- **[docs/design.md](docs/design.md)** — 디자인 시스템: 색·타이포·간격·컴포넌트 토큰의 단일 원천 (UI 작업 시 필독)
- **[docs/roadmap.md](docs/roadmap.md)** — 실행 문서: 현재 상태 스냅샷(실측) + 작업 백로그(WP-A~H, 의존 순서) — **다음 작업은 여기서 고른다**
- **[docs/discord-linking.md](docs/discord-linking.md)** — Discord 계정 연동(연동 코드 방식) 설계: DB 마이그레이션·봇 커맨드·웹 UI (WP-G 착수 전 참조)

## 폴더 구조

단일 Vite 앱을 저장소 루트에서 운영한다.

- `src/`, `public/`, `index.html`, `vite.config.js` — Vite+React 웹앱
- `supabase/` — Edge Functions·마이그레이션·종목 seed
- `scripts/` — 계정·Discord·Supabase 초기화 도구
- `docs/` — 기획·디자인·개발 계획·운영 문서
- `.claude/` — 개발 스킬·로컬 실행 설정

## 핵심 결정 (요약 — 근거는 plan.md)

- **에이전트 배치**: 복기 = 코칭 에이전트. 도구 3종(`search_past_trades`·`get_price_context`·`get_past_reviews`)을 **스스로 다단계 호출**해 근거를 모아 판단(1-shot LLM 호출 아님). + 알림 문구에 과거 복기 한 줄 연결(얕은 메모리).
- **감시는 스케줄러**(Supabase Cron)가, 단 **알림 문구 생성만 에이전트**가 담당.
- **단계**: 1단계 MVP는 1인용으로 감시→기록→복기 루프를 끝까지 완주. 2단계에서 다중 사용자(Auth·RLS)로 확장.
- **North Star**: 끊기지 않은 루프 수(감시→기록→복기 완주 건수). 보조: 복기의 과거기록 인용률.

## 스택 (전부 무료 티어)

- **웹**: Vite + React SPA.
- **백엔드**: Supabase — Postgres + Auth + Edge Functions(Deno)로 Discord 인터랙션·KIS 폴링·에이전트 실행.
- **감시 스케줄**: Supabase Cron (pg_cron + pg_net) → Edge Function 호출.
- **LLM**: Gemini Flash (function calling + structured output). 파싱·복기 모두 담당.
- **외부**: KIS Open API(현재가/일봉), Discord(슬래시 커맨드 + 버튼).
- **원본 참고 레포** (코드 마이그레이션 아님, **참고만** 하고 신규 구축):
  - [KIS_openapi](https://github.com/gyuwonlee1/KIS_openapi) — 자연어 조건 알림 봇
  - [investment_journal](https://github.com/gyuwonlee1/investment_journal) — 차트 기록·AI 복기 저널

## 명령어

저장소 루트에서 실행:

- `npm install` — 의존성 설치
- `npm run dev` — 개발 서버 (http://localhost:5173)
- `npm run build` / `npm run preview`
- `npm run lint` — oxlint

## 컨벤션 / 주의

- 문서·UI 카피는 **한국어**.
- **디자인은 [docs/design.md](docs/design.md)가 단일 원천**. 색/라운드/그림자는 항상 CSS 토큰 변수로(하드코딩 금지). 토큰 원본: [src/index.css](src/index.css). **Stripe/Linear풍 클린 SaaS · 라이트 온리**: 밝은 캔버스(page `#f6f8fb`/card `#fff`) + 인디고 accent `#635bff` + 소프트 섀도우 + 사각-라운드. accent(인디고)는 브랜드/CTA/에이전트 전용이고, 국내 시장 관례색은 상승/매수=빨강·하락/매도=파랑·관망=앰버로 유지.
- UI 작업 시 **`beacon-design` 스킬**([.claude/skills/beacon-design/SKILL.md](.claude/skills/beacon-design/SKILL.md))을 따른다.
- 매일 작업 PR 초안은 **`daily-pr` 스킬**([.claude/skills/daily-pr/SKILL.md](.claude/skills/daily-pr/SKILL.md))로 작성한다(그날 커밋+대화 맥락 → 템플릿 4개 섹션, 붙여넣기용 텍스트).
- DB는 처음부터 **RLS 전제**로 설계(2단계 다중사용자 전환 비용 최소화).
- 복기 결과에는 인용한 `cited_trade_ids`를 함께 저장해 에이전트 판단을 검증 가능하게 한다.
- `/`(홈)은 **인증 인지형**: 로그아웃 시 랜딩(`LandingPage`), 로그인 시 앱 진입점([src/lib/routes.js](src/lib/routes.js)의 `APP_HOME`)으로 리다이렉트.
