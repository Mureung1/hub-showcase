# CLAUDE.md

## 프로젝트

**Briefy** — 자연어 한 문장으로 일정/과제/루틴/식단을 기록하고, 하루를 한 화면으로 브리핑하는 개인 생활 관리 웹앱.
사용자 입력 → Claude API가 JSON으로 파싱(intent + type + 속성) → DB 저장 → 브리핑 대시보드에 반영.

## 기술 스택

- **FE**: React + TypeScript (Vite, Tailwind CSS) — 모바일 화면(390px) 기준 반응형
- **BE**: Express (TypeScript, tsx로 실행) — 자연어 파싱 엔드포인트(Claude API 호출) + 엔티티 CRUD API
- **DB**: Supabase(Postgres) — 접근은 서버에서만 (`@supabase/supabase-js`)
- **AI**: Claude API (`@anthropic-ai/sdk`) — 자연어 파싱 전용 (범용 챗봇 아님), 호출은 반드시 Express 서버에서
- **공통**: zod (스키마 검증), date-fns (날짜 계산)
- Node 20 LTS, npm 사용. TypeScript는 strict 모드.

## 디렉토리 구조

```
src/          # FE — components/(UI), lib/(순수 로직), api/(서버 호출), types/
server/       # BE — index.ts, routes/, services/(Claude 파싱·Supabase CRUD), lib/(프롬프트)
shared/       # FE/BE 공유 zod 스키마 (schemas.ts) — 엔티티·파싱 결과의 단일 정의
supabase/     # migrations/ — 테이블 생성 SQL (반드시 파일로 커밋)
docs/         # plan.md, design.md, wireframes/, hifi/
.claude/      # skills/briefy-ui/ — 디자인 토큰·컴포넌트 규칙
```

## API 규칙

- `POST /api/parse` — 자연어 문장 → 구조화 결과 (저장까지 수행, 모호하면 되묻기 선택지 반환)
- `GET /api/briefing?date=YYYY-MM-DD` — 해당 일자 브리핑 데이터
- `GET/POST/PATCH/DELETE /api/items/:type` — 엔티티 CRUD (type: schedules|tasks|routines|meals|memos|reminders)
- 에러 응답은 항상 `{ error: { code, message } }` 형태로 통일

## 아키텍처 원칙

- **비즈니스 로직과 UI를 분리한다.** 브리핑 구성·루틴 순환 계산은 `src/lib/` 또는 `server/services/`의 순수 함수로 작성하고, 컴포넌트는 호출만 한다. (plan.md 6.4)
- **FE는 DB에 직접 접근하지 않는다.** 모든 데이터는 Express API를 거친다. Supabase 클라이언트는 서버 전용.
- **엔티티(=테이블)는 7개로 고정**: schedules, tasks, routines, routine_logs, meals, memos, reminders. 새 테이블이 필요해 보이면 구현하지 말고 먼저 물어볼 것. (plan.md 4장)
- **모든 엔티티는 `raw_input`(사용자 입력 원문) 컬럼을 보존한다.** 파싱 실패 시 원문을 memo로 저장 — 사용자 입력은 절대 유실되지 않는다. (plan.md 3.1.5)
- **파싱 결과는 저장 전에 `shared/schemas.ts`의 zod 스키마로 검증한다.** 모호한 입력은 임의 저장하지 않고 되묻기 선택지를 응답으로 반환한다. intent는 create/update/delete/query/complete 5개만 허용.
- **스키마는 `shared/`에 한 번만 정의한다.** FE 타입과 BE 검증이 같은 정의를 공유하며, 타입을 손으로 복제하지 않는다.

## 컨벤션

- 컴포넌트: PascalCase (`BriefingCard.tsx`), 그 외 파일: camelCase
- 함수/변수: camelCase, 상수: UPPER_SNAKE_CASE, DB 컬럼: snake_case
- 커밋: `feat` / `fix` / `refactor` / `docs` (예: `feat: A-1 자연어 저장 파이프라인`)
- 브랜치: `main` 직접 커밋 금지, 기능 브랜치(`feat/a1-parse-pipeline`)에서 작업 후 머지
- 날짜/시간: ISO 8601 (`YYYY-MM-DD`, `HH:mm`), 타임존 Asia/Seoul 고정
- 린트/포맷: ESLint + Prettier, 커밋 전 `npm run lint` 통과

## 환경변수

- `.env`는 커밋 금지, `.env.example`에 키 이름만 유지
- 필수 키: `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PORT`

## 하지 말 것

- `any` 타입 금지 — `shared/schemas.ts`에서 추론된 타입을 사용
- 외부 UI 라이브러리 금지 (별도 합의 전까지 Tailwind만). 상태관리 라이브러리도 별도 합의 전까지 금지 (useState/useReducer 사용)
- API 키(Claude, Supabase)를 프론트 코드·`VITE_*` 환경변수에 노출 금지 — 서버 전용
- Supabase 테이블을 대시보드에서 수동 생성 금지 — 반드시 `supabase/migrations/` SQL 파일로
- MVP 범위 밖 기능 선제 구현 금지: 음성 입력(STT)/음성 대화(TTS), 푸시 알림, 주간·월간 뷰, 통계, 외부 캘린더 동기화, 로그인/계정 (plan.md 3.1.6, 3.2.4)
- 일정 관리 외 응답(잡담, 검색) 기능 추가 금지 (plan.md 7.3)
- P0(A-1 저장+되묻기, 브리핑 홈) 완성 전에 P1(A-2 조회, A-3 수정·삭제) 착수 금지 (plan.md 3.1.3)

## 미결 사항

- 배포 방식: FE(Vercel) + BE 호스팅(Render 등) vs 로컬 시연 — 과제 요건 확인 후 결정

## 참고

- 기획서: @docs/plan.md
- 디자인: @docs/design.md