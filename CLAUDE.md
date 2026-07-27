# CLAUDE.md

## 프로젝트

**Briefy** — 자연어 한 문장으로 일정/과제/루틴/식단을 기록하고, 하루를 한 화면으로 브리핑하는 개인 생활 관리 웹앱.
사용자 입력 → Groq API가 JSON으로 파싱(intent + type + 속성) → DB 저장 → 브리핑 대시보드에 반영.

## 기술 스택

| 영역 | 기술 | 비고 |
| --- | --- | --- |
| **FE** | React 19 + TypeScript (Vite 8, Tailwind CSS v4) | 모바일(390px) 기준 반응형 |
| **BE** | Express 5 (TypeScript, tsx로 실행) | 자연어 파싱 + CRUD API |
| **DB** | Supabase (Postgres) | 서버에서만 접근 (`@supabase/supabase-js`) |
| **AI** | Groq API (`groq-sdk`, 모델 `openai/gpt-oss-120b`) | 자연어 파싱 전용, 서버에서만 호출 |
| **공통** | zod (스키마 검증), date-fns (날짜 계산) | |
| **라우팅** | react-router-dom | 클라이언트 사이드 라우팅 |
| **린트** | oxlint | ESLint 대신 사용 (더 빠름) |
| **포맷** | Prettier | `.prettierrc` 설정 참고 |
| **런타임** | Node 20 LTS, npm | TypeScript strict 모드 |

## 디렉토리 구조

```
briefy/
├─ src/                    # FE (React)
│  ├─ pages/               # 화면 단위 컴포지션 루트 (컴포넌트 조합 + 상태)
│  ├─ components/          # UI 컴포넌트 (PascalCase.tsx, 순수 표현 담당)
│  ├─ lib/                 # 순수 로직 함수
│  ├─ api/                 # 서버 호출 래퍼
│  ├─ types/               # FE 전용 타입
│  ├─ assets/              # 정적 에셋
│  ├─ App.tsx
│  ├─ main.tsx
│  └─ index.css            # Tailwind v4 import + 디자인 토큰
├─ server/                 # BE (Express)
│  ├─ index.ts             # Express 진입점
│  ├─ routes/              # 라우트 정의
│  ├─ services/            # Groq 파싱·Supabase CRUD (+ *.test.ts 유닛 테스트 colocate)
│  ├─ lib/                 # 프롬프트 템플릿, Groq/Supabase 클라이언트
│  └─ scripts/seed.ts      # 개발용 seed 스크립트 (`npm run seed`, 오늘 기준 상대 날짜)
├─ shared/                 # FE/BE 공유
│  └─ schemas.ts           # zod 스키마 (엔티티·파싱 결과 단일 정의)
├─ supabase/
│  ├─ migrations/          # 테이블 생성 SQL (반드시 커밋)
│  └─ seed.sql             # SQL Editor에서 직접 실행하는 seed (seed.ts와 동일 데이터 유지)
├─ docs/                   # plan.md, design.md, data-model.md, wireframes/, prototype/
├─ .claude/                # skills/(briefy-ui, tdd-workflow), agents/(planner, verifier)
├─ tsconfig.json           # FE + shared 용
├─ tsconfig.server.json    # BE + shared 용
├─ vite.config.ts          # Tailwind v4, @shared alias, /api 프록시
├─ vitest.config.ts        # 유닛 테스트 (@shared alias 재사용)
├─ .prettierrc
├─ .oxlintrc.json
└─ .env.example
```

## npm 스크립트

| 명령어 | 설명 |
| --- | --- |
| `npm run dev` | FE(Vite) + BE(Express) 동시 실행 (concurrently) |
| `npm run dev:client` | FE만 실행 (localhost:5173) |
| `npm run dev:server` | BE만 실행 (localhost:3001, tsx watch) |
| `npm run build` | FE 프로덕션 빌드 |
| `npm run lint` | oxlint 실행 |
| `npm run format` | Prettier 포맷 적용 |
| `npm run format:check` | Prettier 포맷 검사 |
| `npm run typecheck` | FE + BE TypeScript 타입 검사 |
| `npm run test` | Vitest 유닛 테스트 1회 실행 |
| `npm run test:watch` | Vitest 감시 모드 |
| `npm run seed` | 개발용 seed 데이터 삽입 (오늘 기준 상대 날짜, 기존 데이터 초기화 후 재삽입) |

## API 규칙

- `POST /api/parse` — 자연어 문장 → 구조화 결과 (`resolved`면 저장까지 수행, `clarify`면 되묻기 후보 반환)
- `POST /api/parse/resolve` — 되묻기 후보 확정 → Groq 재호출 없이 바로 저장
- `GET /api/briefing?date=YYYY-MM-DD` — 해당 일자 브리핑 데이터
- `GET/POST/PATCH/DELETE /api/items/:type` — 엔티티 CRUD (type: schedules|tasks|routines|meals|memos|reminders). `GET /api/items/tasks|memos`는 `?completed=true|false` 쿼리로 필터링 가능(완료함 화면이 `?completed=true`로 조회)
- `POST /api/items/routines/:id/complete` — 루틴 완료 체크(`routine_logs` upsert, `routine_logs`는 `ItemType`에 없어 별도 라우트)
- `GET /api/health` — 서버 상태 확인
- 에러 응답은 항상 `{ error: { code, message } }` 형태로 통일
- intent는 스키마상 5개(create/update/delete/query/complete) 전부 허용하지만, 현재 실제 구현은 **create(6종 전부) + complete(루틴만)** 뿐이다. update/delete/query는 원문을 memo로 안전하게 저장하는 동일한 안전망으로 강등된다 (A-2/A-3 범위, checklist.md 참고)

## 아키텍처 원칙

- **비즈니스 로직과 UI를 분리한다.** 브리핑 구성·루틴 순환 계산은 `src/lib/` 또는 `server/services/`의 순수 함수로 작성하고, 컴포넌트는 호출만 한다.
- **FE는 DB에 직접 접근하지 않는다.** 모든 데이터는 Express API를 거친다. Supabase 클라이언트는 서버 전용.
- **엔티티(=테이블)는 7개로 고정**: schedules, tasks, routines, routine_logs, meals, memos, reminders. 새 테이블이 필요해 보이면 구현하지 말고 먼저 물어볼 것.
- **모든 엔티티는 `raw_input`(사용자 입력 원문) 컬럼을 보존한다.** 파싱 실패 시 원문을 memo로 저장 — 사용자 입력은 절대 유실되지 않는다.
- **파싱 결과는 저장 전에 `shared/schemas.ts`의 zod 스키마로 검증한다.** 모호한 입력은 임의 저장하지 않고 되묻기 선택지를 응답으로 반환한다. intent는 create/update/delete/query/complete 5개만 허용.
- **스키마는 `shared/`에 한 번만 정의한다.** FE 타입과 BE 검증이 같은 정의를 공유하며, 타입을 손으로 복제하지 않는다.
- **path alias**: FE에서 shared 접근 시 `@shared/schemas` 사용 (vite.config.ts에 설정됨)
- **과제·메모의 완료 처리는 아카이브다.** 체크박스로 완료 처리하면 `completed=true`로 저장되고 브리핑(`GET /api/briefing`)에서는 즉시 사라진다(서버가 `completed=false`만 반환). 완료된 항목은 헤더의 "완료한 Task로 이동" 화면(`CompletedView`)에서만 조회되며, 거기서 **복구**(`completed=false`로 되돌림) 또는 **영구 삭제**(`DELETE`)만 가능하다 — 별도 mutation 엔드포인트 없이 기존 `PATCH`/`DELETE`를 재사용한다. 루틴은 이 모델과 무관하다(완료 체크는 당일 로그일 뿐 순환에서 사라지지 않음).

## 컨벤션

### 파일·네이밍
- 컴포넌트: PascalCase (`BriefingCard.tsx`), 그 외 파일: camelCase
- 함수/변수: camelCase, 상수: UPPER_SNAKE_CASE, DB 컬럼: snake_case
- CSS: Tailwind utility 우선, 커스텀 스타일은 index.css의 CSS 변수(디자인 토큰) 사용

### 커밋 메시지
Conventional Commits 형식을 따른다:
```
<type>: <scope> <설명>
```

| type | 용도 |
| --- | --- |
| `feat` | 새 기능 |
| `fix` | 버그 수정 |
| `refactor` | 기능 변경 없는 코드 개선 |
| `style` | 포맷팅, 세미콜론 누락 등 |
| `docs` | 문서 추가/수정 |
| `chore` | 빌드, 설정, 의존성 등 |
| `test` | 테스트 추가/수정 |

예시:
- `feat: A-1 자연어 저장 파이프라인`
- `fix: 브리핑 날짜 필터 오류 수정`
- `chore: 개발 환경 초기 세팅`

### 브랜치 전략
- `main` 직접 커밋 금지, 기능 브랜치에서 작업 후 머지
- 브랜치 이름: `feat/a1-parse-pipeline`, `fix/briefing-date`

### 코드 스타일 (Prettier)
- 세미콜론 사용, 작은따옴표, trailing comma
- 줄 너비 100자, 탭 2칸
- 커밋 전 `npm run lint && npm run format:check` 통과

### 날짜/시간
- ISO 8601 (`YYYY-MM-DD`, `HH:mm`)
- 타임존: Asia/Seoul 고정

## 환경변수

- `.env`는 커밋 금지 (`.gitignore`에 등록됨), `.env.example`에 키 이름만 유지
- 필수 키(BE): `GROQ_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PORT`
- 선택 키(BE, 배포 시): `CORS_ORIGIN` — FE 배포 도메인만 CORS 허용. 비워두면 전체 허용(로컬 개발 기본값)
- 선택 키(FE, 배포 시): `VITE_API_BASE_URL` — FE/BE를 다른 도메인에 배포할 때만 BE 주소로 설정. 비워두면 상대 경로(`/api/...`)로 호출(로컬 개발 기본값). `src/api/http.ts`의 `apiFetch`가 유일한 참조 지점 — API 요청은 항상 이 헬퍼를 거친다

## 개발 서버 설정

- Vite dev server: `localhost:5173` (FE)
- Express dev server: `localhost:3001` (BE)
- Vite에서 `/api/*` 요청은 Express로 프록시됨 (vite.config.ts)
- `npm run dev`로 FE+BE 동시 실행

## 하지 말 것

- `any` 타입 금지 — `shared/schemas.ts`에서 추론된 타입을 사용
- 외부 UI 라이브러리 금지 (별도 합의 전까지 Tailwind만). 상태관리 라이브러리도 별도 합의 전까지 금지 (useState/useReducer 사용)
- API 키(Groq, Supabase)를 프론트 코드·`VITE_*` 환경변수에 노출 금지 — 서버 전용 (`VITE_API_BASE_URL`은 비밀값이 아닌 BE 주소 설정이라 예외)
- Supabase 테이블을 대시보드에서 수동 생성 금지 — 반드시 `supabase/migrations/` SQL 파일로
- MVP 범위 밖 기능 선제 구현 금지: 음성 입력(STT)/음성 대화(TTS), 푸시 알림, 주간·월간 뷰, 통계, 외부 캘린더 동기화, 로그인/계정
- 일정 관리 외 응답(잡담, 검색) 기능 추가 금지
- P0(A-1 저장+되묻기, 브리핑 홈) 완성 전에 P1(A-2 조회, A-3 수정·삭제) 착수 금지

## 배포

- **FE**: Vercel (Vite 프리셋 자동 감지, Build Command `npm run build`, Output Directory `dist`). 환경변수 `VITE_API_BASE_URL`을 Render BE 주소로 설정
- **BE**: Render (Build Command `npm install`, Start Command `npm start` — `tsx server/index.ts`를 컴파일 없이 직접 실행). 환경변수는 위 "환경변수" 절 전부(BE 필수 4개 + `CORS_ORIGIN`)
- 상세 절차는 [README.md의 "배포" 절](README.md#배포) 참고
- Supabase 마이그레이션은 배포 파이프라인에 없음 — 새 마이그레이션 추가 시 Supabase SQL Editor에서 수동 실행 (기존 규칙과 동일)

## 참고

- 기획서: @docs/plan.md
- 디자인: @docs/design.md
- 작업 목록: @checklist.md