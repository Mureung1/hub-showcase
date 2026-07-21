# 역기획소 (respec)

게임 기획자 지망생이 역기획서를 "틀부터" 배우고, 작성하고, 사람과 AI 양쪽에게 피드백을 받는 웹 플랫폼. 가이드형 템플릿 에디터 + 아카이브(섹션별 코멘트) + 격주 챌린지 + LLM 자동 피드백이 핵심 기능이다.

기획서: [`project-plan.md`](./project-plan.md) (v0.1)

> Core Loop Builder에서 피벗했다. 구 프로젝트 문서는 `docs/archive/core-loop-builder/`에 보존.

## 디렉토리 구조

```
respec/ (폴더명은 respec, 저장소는 geulcho/hub)
  frontend/     Vite + React 19 프론트엔드 (frontend/src)
  backend/      Express 백엔드 (LLM 호출은 여기서만, backend/src)
  design/       디자인 토큰 + 디자인 시스템 문서
  docs/         백로그, 회고 등 장문 문서 (archive/에 구 프로젝트 문서)
  .claude/skills/design-guide/   새 화면 디자인 시 자체 점검용 skill
```

## 기술 스택

- **Frontend**: React 19 + Vite, `react-router-dom`(화면 전환), `framer-motion`(마이크로 인터랙션). UI 프레임워크는 쓰지 않는다(디자인 시스템 직접 구현).
- **Backend**: Node.js + Express, `@google/genai`(Gemini API — AI 자동 피드백. 무료 티어), `cors`, `dotenv`. (`@anthropic-ai/sdk`도 설치돼 있으나 현재 미사용)
- **Storage / Auth**: Supabase PostgreSQL(`documents`/`profiles`/`ai_feedback_logs`, 스키마 `backend/db/schema.sql`)에 연결됨. **인증은 Supabase Auth(이메일 + Google + Github)** — 프론트는 anon 키로 Supabase Auth를 직접 쓰고(`frontend/src/lib/supabaseClient.js`), backend는 `Authorization: Bearer` JWT를 `requireAuth`(`backend/src/middleware/requireAuth.js`)로 검증한다. 회원 문서는 `author_id`로 소유, 비회원 문서는 `edit_password_hash`(scrypt)로 수정 잠금. Storage(이미지 업로드)는 미도입.

## 아키텍처 규칙

- **LLM 키는 backend에서만 다룬다.** `ANTHROPIC_API_KEY`는 `backend/.env`에만 두고, frontend 번들에는 절대 노출하지 않는다. frontend는 항상 backend의 REST 엔드포인트를 통해서만 AI 결과를 받는다.
- **LLM 피드백(기획서 §3.4, 3주차 개정)**: **회원 전용**. 발행(제출) 직후 자동 호출로 섹션별 코멘트 + 전체 총평을 생성한다(작성 중 미리보기 버튼도 회원에 한해 유지). 비회원은 AI 없이 사람 코멘트만. 유저당 일일 호출 제한(`ai_feedback_logs`, 기본 5회). LLM 호출은 backend에서만(`backend/src/lib/aiFeedback.js`, Google Gemini, 기본 모델 `gemini-2.5-flash`, 무료 티어). 응답은 구조적 출력(JSON schema)으로 **섹션별 코멘트 + overall**을 강제하고, frontend는 이를 사람 코멘트와 동일한 UI(`is_ai` 라벨만 다름)로 렌더링한다(전체 총평은 `section_id='__overall__'`인 특수 코멘트로 상세 상단 "AI 총평" 패널에 노출). 피드백 관점은 4가지로 한정: 구조 완결성 / 구체성 / 예외 처리 질문 생성 / 역기획 관점(요약 vs 의도 분석). 게임 사실관계 평가는 시키지 않는다.
  - 참고: 기획서 §3.4 원문은 "온디맨드 호출만"이었으나, 사용자 요청으로 "제출 직후 자동(회원 전용)"으로 변경했다. 비용 방어는 회원 전용 + 일일 제한으로 한다.
- **목데이터 스키마는 기획서 §5의 DB 초안(documents/sections/comments)과 맞춘다.** 백엔드 연동이 "데이터 출처 교체"로 끝나게 하기 위함이다. `frontend/src/data/`가 그 위치다.

## 디자인 시스템

새 화면을 만들거나 기존 화면을 수정하기 전에 반드시 아래를 확인한다.

1. [`design/DESIGN_SYSTEM.md`](./design/DESIGN_SYSTEM.md) — 색상 역할, 글래스 패널 레시피, 컴포넌트 패턴, game-feel 모티프 규칙
2. [`design/design-tokens.css`](./design/design-tokens.css) — 실제 CSS 커스텀 프로퍼티
3. `.claude/skills/design-guide` skill — 완성된 화면을 자체 체크리스트로 점검할 때 사용

한 줄 요약: 블루→바이올렛→시안 쿨톤 그라디언트 배경 위에 천천히 표류하는 블러 오브, 그 위에 화이트 프로스티드 글래스 패널. 강조색은 gold 하나만. game-feel은 진행바·배지 같은 "진행/성취" 모티프로만 표현하고 장식적 게임 클리셰는 쓰지 않는다.

## 컨벤션

- **커밋**: Conventional Commits — `type(scope): description`. type = `feat|fix|docs|refactor|chore|test`, scope = `frontend|backend|design|docs`. (예: `feat(frontend): 가이드형 에디터 구현`)
- **브랜치**: `feature/*`
- **CSS**: 새 화면의 컴포넌트 클래스 프리픽스는 `rs-`. 단 CSS 변수는 기존 `--clb-*`를 당분간 그대로 소비한다(변수 일괄 리네임은 DESIGN_SYSTEM.md·skill까지 번지는 churn이라 후속 PR로 분리).
- **코드 스타일**: `.prettierrc.json`(세미콜론 없음, 싱글쿼트) 기준. frontend는 `npm run format`, backend도 동일.

## 실행

```bash
cd frontend && npm install && npm run dev    # http://localhost:5173
cd backend && npm install && npm run dev     # http://localhost:4000
```

## 진행 상태와 다음 할 일

단일 출처는 [`docs/BACKLOG.md`](./docs/BACKLOG.md)다. 우선순위(P0/P1/P2)와 주차별 Task, "이번 주까지 끝낼 것"이 전부 거기 있으니 여기에 따로 체크리스트를 중복 유지하지 않는다.
