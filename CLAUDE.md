# CLAUDE.md

## 프로젝트

**Briefy** — 자연어 한 문장으로 일정/과제/루틴/식단을 기록하고, 하루를 한 화면으로 브리핑하는 개인 생활 관리 웹앱.
사용자 입력 → Claude API가 JSON으로 파싱(intent + type + 속성) → DB 저장 → 브리핑 대시보드에 반영.

## 기술 스택

- **FE**: React + TypeScript (Vite, Tailwind CSS) — 모바일 화면(390px) 기준 반응형
- **BE**: Express — 자연어 파싱 엔드포인트(Claude API 호출) + 엔티티 CRUD API
- **DB**: Supabase(Postgres)
- **AI**: Claude API — 자연어 파싱 전용 (범용 챗봇 아님), 호출은 반드시 Express 서버에서

## 아키텍처 원칙

- **비즈니스 로직과 UI를 분리한다.** 파싱 결과 처리·브리핑 구성·루틴 순환 계산은 프론트 `src/lib/` 또는 서버 `server/services/`에 순수 함수로 작성하고, 컴포넌트는 호출만 한다. (plan.md 6.4)
- **FE는 DB에 직접 접근하지 않는다.** 모든 데이터는 Express API를 거친다. Supabase 클라이언트는 서버에서만 사용.
- **엔티티(=테이블)는 7개로 고정**: schedules, tasks, routines, routine_logs, meals, memos, reminders. 새 테이블이 필요해 보이면 구현하지 말고 먼저 물어볼 것. (plan.md 4장)
- **모든 엔티티는 `raw_input`(사용자 입력 원문) 컬럼을 보존한다.** 파싱 실패 시 원문을 memo로 저장 — 사용자 입력은 절대 유실되지 않는다. (plan.md 3.1.5)
- **파싱 결과는 저장 전에 스키마(zod)로 검증한다.** 모호한 입력은 임의 저장하지 않고 되묻기 선택지를 응답으로 반환한다. intent는 create/update/delete/query/complete 5개만 허용.

## 컨벤션

- 컴포넌트: PascalCase (`BriefingCard.tsx`)
- 함수/변수: camelCase, 상수: UPPER_SNAKE_CASE, DB 컬럼: snake_case
- 커밋: `feat` / `fix` / `refactor` / `docs` (예: `feat: A-1 자연어 저장 파이프라인`)
- 날짜/시간: ISO 8601 (`YYYY-MM-DD`, `HH:mm`), 타임존 Asia/Seoul 고정

## 하지 말 것

- `any` 타입 금지 — 엔티티 타입 정의를 사용
- 외부 UI 라이브러리 금지 (별도 합의 전까지)
- API 키(Claude, Supabase)를 프론트 코드·환경변수(`VITE_*`)에 노출 금지 — 서버 전용
- MVP 범위 밖 기능 선제 구현 금지: 음성 입력(STT)/음성 대화(TTS), 푸시 알림, 주간·월간 뷰, 통계, 외부 캘린더 동기화 (plan.md 3.1.6, 3.2.4)
- 일정 관리 외 응답(잡담, 검색) 기능 추가 금지 (plan.md 7.3)
- P0(A-1 저장+되묻기, 브리핑 홈) 완성 전에 P1(A-2 조회, A-3 수정·삭제) 착수 금지 (plan.md 3.1.3)

## 참고

- 기획서: @docs/plan.md
- 디자인: @docs/design.md