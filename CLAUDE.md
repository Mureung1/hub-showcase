# CLAUDE.md

이 파일은 Claude Code(claude.ai/code)가 이 저장소에서 작업할 때 참고하는 가이드다.

## 프로젝트

**잔소리봇 (Nagging-bot)** — ""AI Agent Challenge" 프로젝트. 대학생은 학업(과제·시험공부·발표·조별과제 등)을 시작하지 못하고 미루는 이유가 저마다 다르다 — 뭐부터 해야 할지 몰라서, 하기 싫어서, 놀고 싶어서 등. 하지만 기존 리마인더 앱은 "시간 됐어요" 같은 획일적 알림만 보낼 뿐, 사용자가 _왜_ 못 시작하는지에 맞춘 해법을 제시하지 못해 같은 회피가 반복된다.

핵심 아이디어는 **회피 이유에 맞춘 맞춤 개입**이다: 에이전트가 사용자가 시작하지 못하는 이유를 파악하고, 그에 맞는 첫 행동(마이크로태스크)을 제안해 실제로 시작하도록 돕는다. 단순한 "리마인더 + AI + 캐릭터"가 아니라, 회피 이유를 진단하고 그에 맞게 반응하는 것이 차별점이며, 챗봇형 UI로 넛지를 전달하는 것 자체가 핵심은 아니다.

저장소는 현재 스캐폴드 단계다: Vite + React 기반 랜딩/소개 페이지(`src/components/ProjectIntro.jsx`)가 컨셉(문제 정의, 서비스 흐름 타임라인, 기능 그룹)을 보여준다. 백엔드, 에이전트 로직, 데이터 영속화는 아직 없다.

참고 문서: [@docs/plan.md](docs/plan.md) (기획서), [@docs/checklist.md](docs/checklist.md) (작업 분해), [@docs/wireframe.md](docs/wireframe.md) (화면 단위 와이어프레임).

1주차 프로토타입 범위: 등록~홈 화면까지. 포커스 화면(및 레벨 시스템)은 2주차.

## 핵심 기능

- ① 첫 행동(마이크로태스크) 제안 — "무엇부터 시작할지"를 해결
- ② 회피 원인 기반 맞춤 개입 — "왜 시작하지 못하는지"를 해결
- 두 기능이 함께 동작해야 사용자가 실제로 첫 행동을 시작함 — 하나만으로는 불충분.

## 기술 스택

- 프런트엔드: Vite + React (구현됨)
- 백엔드: Express — **아직 미착수**. 관련 코드를 이미 있는 것처럼 작성하지 말 것.
- 라우팅: `react-router-dom`
- DB: Turso(libSQL, SQLite 방언) + Prisma. 로컬 SQLite 파일은 쓰지 않는다 — 서버리스 배포 시 디스크가 인스턴스 간 공유/영속되지 않아 데이터가 유실되기 때문.
- Web Push: `web-push`(VAPID)
- PWA/서비스워커: 별도 라이브러리 없이 수기 `manifest.json` + 최소 `service-worker.js` (기본 캐싱만). `vite-plugin-pwa` 등은 지금 필요 이상의 기능이라 쓰지 않는다.
- 타입 검사: tsconfig(`allowJs` + `checkJs` + `strict`)로 "any 금지"를 강제한다. 기존 `.jsx`는 그대로 두고 `// @ts-check`로 점진 적용하며, 새로 만지는 파일부터 `.ts`/`.tsx`로 전환한다. `@types/react`는 이미 devDependency로 있음. `npm run typecheck`(`tsc --noEmit`)로 확인.
- 테스트: 아직 도입하지 않음. checklist.md에 테스트 작성 항목이 없고 4주 일정상 우선순위가 낮기 때문. 나중에 필요해지면 Vite와 궁합이 좋은 Vitest를 쓴다.
- 날짜/시간: DB에는 UTC ISO 8601 문자열로 저장한다. 프론트의 D-day 계산/포맷팅에는 `date-fns`를 쓴다(tree-shakeable, 불필요한 로케일 번들 없음).

## 명령어

```
npm run dev          # Vite 개발 서버 실행 (프론트만)
npm run dev:server   # Express dev 서버 실행 (server/, tsx watch, PORT=3001)
npm run dev:all      # 프론트+백엔드 동시 실행 (concurrently)
npm run build        # 프론트 프로덕션 빌드
npm run build:server # server/를 tsc로 dist/에 빌드 (api/index.js가 이 결과물을 import)
npm run lint         # oxlint 실행
npm run preview      # 로컬에서 프로덕션 빌드 미리보기
```

Express 앱은 `server/`에 있다(`npm install`을 루트에서 실행하면 `workspaces`로 함께 설치됨). `api/index.js`는 Vercel 서버리스 진입점으로 `server/dist/app.js`를 그대로 감싸서 노출하며, `vercel.json`의 rewrite로 `/api/*` 요청이 전부 이 함수로 간다. 로컬 개발 중에는 `vite.config.js`의 `server.proxy`가 `/api`를 `http://localhost:3001`(Express dev 서버)로 넘겨주므로, 프론트 코드는 로컬/배포 구분 없이 항상 `/api`로만 호출하면 된다.

DB 연결은 Prisma + Turso(libSQL)로 설정돼 있다(`server/prisma/schema.prisma`, `server/.env.example` 참고). 아직 `tasks`/`avoidance_reasons`/`task_events`/`feedbacks` 모델은 정의하지 않았다 — 다음 단계에서 추가.

이 저장소에는 아직 구성된 테스트 스위트가 없다.

## 디렉토리 구조

```
/hub
├── src/                    # 기존 프론트 (Vite 루트, 그대로 유지)
│   ├── components/
│   ├── lib/                 # api.js(fetch 래퍼) 등
│   └── hooks/               # 필요해지면 추가
├── server/                  # Express 앱 본체 (TypeScript)
│   ├── src/
│   │   ├── app.ts             # Express 앱 정의(라우트 등록)
│   │   ├── index.ts           # 로컬 dev 리스너 (PORT=3001)
│   │   ├── routes/            # 필요해지면 추가
│   │   └── db/
│   │       └── client.ts      # Prisma Client 싱글톤
│   ├── prisma/
│   │   └── schema.prisma      # datasource/generator만 정의됨, 모델은 다음 단계
│   ├── .env.example
│   └── package.json          # 루트 npm workspace로 연결
├── api/
│   └── index.js              # Vercel 서버리스 진입점 — server/dist/app.js를 감싸기만 함
├── vercel.json                # /api/* rewrite
└── docs/
```

- 로컬 개발: `server/`를 Express 앱으로 직접 구동(별도 포트). 배포: `api/index.js`가 같은 Express 앱을 서버리스 함수로 감싸 실행 — "Express"라는 기술 선택과 "서버리스 함수"(checklist.md `send-push`, `daily-checkin-scan`)라는 배포 요구사항을 동시에 만족시키기 위함.
- 루트 `package.json`에 `workspaces: ["server"]`를 추가해 `npm install` 한 번으로 프론트/백엔드를 함께 관리한다.
- `daily-checkin-scan`처럼 주기 실행이 필요한 함수는 Vercel Cron이 `api/` 아래의 라우트를 스케줄대로 호출하는 방식으로 구현한다.

## 아키텍처

- 엔트리 포인트: `src/main.jsx`가 `<App />`(`src/App.jsx`)을 `index.html`의 `#root`에 마운트한다.
- `App.jsx`는 현재 `ProjectIntro`(프로젝트 소개 페이지)만 렌더링한다. 온보딩, 체크인, 넛지, 대시보드 등 실제 기능이 추가되면 `App.jsx`는 단일 정적 페이지가 아니라 실제 라우터/레이아웃으로 확장될 예정이다.
- `ProjectIntro.jsx`는 콘텐츠-as-데이터 패턴을 따른다: 페이지 카피는 파일 상단의 평범한 배열/객체(`PROBLEM_CARDS`, `TIMELINE_ITEMS`, `FEATURE_GROUPS`)에 두고, 아래 JSX는 그것을 매핑만 한다. 앞으로 추가할 섹션도 반복되는 JSX 블록을 하드코딩하는 대신 이 패턴을 따를 것.
- 아이콘은 손으로 작성한 인라인 SVG 컴포넌트다(아이콘 라이브러리 의존성 없음) — 새 아이콘도 이 방식(viewBox 24x24, stroke 기반, `aria-hidden`/`focusable="false"`)과 일관되게 유지할 것.
- 스타일링은 컴포넌트별 순수 CSS(`ComponentName.css`를 `ComponentName.jsx` 옆에 두고 직접 import)다 — CSS-in-JS나 Tailwind는 쓰지 않는다.
- 린팅은 ESLint가 아니라 `oxlint`를 사용한다 — 설정은 `.oxlintrc.json`, `react`/`oxc` 플러그인 활성화(`react/rules-of-hooks`는 error).

## 컨벤션

- 린팅: `oxlint` (`.oxlintrc.json`, `react`/`oxc` 플러그인, `react/rules-of-hooks`는 error) — 기존과 동일.
- 스타일링: 컴포넌트별 순수 CSS(`ComponentName.css`를 옆에 두고 import) — 기존과 동일.
- 콘텐츠: `ProjectIntro.jsx`처럼 페이지 카피는 파일 상단 배열/객체로 분리하고 JSX는 매핑만 하는 content-as-data 패턴을 유지한다.
- 환경변수: 프론트는 `.env`(`VITE_` 접두사), 백엔드는 `server/.env`로 분리한다. 각각 `.env.example`을 커밋하고, `.env`는 `.gitignore`에 추가돼 있다.
- 로컬 개발 포트/프록시: Vite dev 서버(5173) → `vite.config.js`의 `server.proxy`로 `/api`를 Express dev 서버(3001)로 프록시한다. 프로덕션의 "동일 오리진 `/api`" 구조와 로컬 환경을 일치시키기 위함.
- CORS 설정 안 함: 로컬은 Vite proxy, 배포는 `vercel.json` rewrite로 항상 동일 오리진에서 `/api`를 호출하므로 CORS 자체가 발생하지 않는다. `cors` 미들웨어를 추가할 필요 없음.
- API 응답 포맷: 성공 응답은 리소스를 그대로 반환하고, 에러는 `{ error: { code, message } }` 형태 + 적절한 HTTP status로 통일한다.
- 프론트 API 호출: `fetch`를 직접 흩어 쓰지 않고 `src/lib/api.js`의 `apiFetch(path, options)`를 통해서만 호출한다. 성공 시 응답 body를 그대로 반환하고, 실패 시 서버의 `{ error: { code, message } }`를 파싱해 `ApiError`를 throw한다 — 에러 처리를 호출부마다 반복하지 않기 위함.
- "시작 예정 시각" 와이어 포맷: 등록 폼의 `<input type="time">`은 시:분만 담고 있으므로, 프론트에서 "오늘 날짜 + 입력한 시:분"을 합쳐 완전한 ISO 8601 datetime(UTC)으로 변환한 뒤 API로 보낸다. 서버/DB도 항상 완전한 datetime 문자열로 주고받는다 — 시:분만 있는 값으로는 "시작 예정 시각 도달" 여부를 판정할 기준(어느 날짜인지)이 없기 때문. 마감 D-day는 이 시작 시각과 무관한 별도 필드로 유지한다(plan.md 3의 "시작 예정 시각"과 "마감까지 D-day"는 서로 다른 입력값).
- Prisma Client는 `server/src/db/client.ts`에서 싱글톤으로 export해서 쓴다. 서버리스 환경에서 요청마다 `new PrismaClient()`를 만들면 커넥션이 금방 고갈되기 때문.
- Node 버전은 `.nvmrc`(루트) + 각 `package.json`의 `engines.node`로 고정한다(`>=24.11.1`). 팀원 간 로컬 Node 버전이 어긋나면 `tsx`/ESM 관련 문제가 날 수 있어서.

## 커밋 규칙

- Conventional Commits 축약형을 쓴다: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:` + 한글 설명. 기존 커밋 이력은 그대로 두고 이 시점 이후부터 적용한다.
- 예시:
  - `feat: 할일 등록 폼과 회피 이유 선택 UI 추가`
  - `fix: 압력 게이지가 레벨 4에서 100%를 넘게 표시되는 버그 수정`
  - `chore: server 워크스페이스 초기 세팅 및 Prisma+Turso 연결`
- 브랜치 전략은 별도로 두지 않는다 — `main` + 짧은 feature 브랜치를 PR로 병합하는 트렁크 기반이면 충분하다. 4주 단기 해커톤 규모이고, 이미 `.github/workflows/auto-merge.yml`로 PR 자동병합이 갖춰져 있어 develop/release 같은 장기 브랜치를 둘 이유가 없기 때문.

## 하지 말 것

**(컨벤션)**

- `any` 타입 금지
- 외부 UI 라이브러리 금지 — 별도 합의 전까지

**(설계)**

- `subjects`(과목) 테이블을 두지 않는다 — plan.md 문제 정의에 근거 없음
- 체크인은 날짜 단위 기록이 아니라 할일별 이벤트 로그(`task_events`) 구조로 설계한다 — "매일 체크인"이 아니라 "세션 재개용 재트리거"임에 유의
