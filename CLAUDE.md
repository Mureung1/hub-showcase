# hub_ — 리뷰 매니저 AI

이 저장소는 "리뷰 매니저 AI"(구 "리뷰 답변 도우미") 프로젝트다. 소상공인이 손님 리뷰를 붙여넣으면 감정 분석·키워드 추출·반복 문제 감지·답변 초안 3종을 생성해주는 것을 넘어, 리뷰마다 AI 점수를 매기고 총 분석·월별 통계까지 제공하는 리뷰 관리 도구로 범위를 확장했다(2026-07-13 컨셉 확장). 2026-07-15에는 회원가입/로그인(토큰 기반 인증)도 추가했다. 기획 배경과 기능 스펙은 [`review-assistant-react/기획서.md`](review-assistant-react/기획서.md)를 따른다.

이 문서는 **개발 환경/컨벤션 관련 결정**을 정리한다(2주차 본격 개발 전 사전 세팅). 화면 전용 디자인 규칙은 [`review-assistant-react/CLAUDE.md`](review-assistant-react/CLAUDE.md)에 따로 있다.

## 디렉토리 구조

모노레포 툴(npm workspaces 등) 없이, **독립된 두 패키지를 형제 폴더**로 둔다. 이 프로젝트 규모(2주 단기 프로젝트, API 표면 2개)에서 워크스페이스 설정은 과한 복잡도라 판단했다.

```
hub_/
├── index.html                  # 초기 순수 HTML/CSS/JS 프로토타입 (기획서 1:1 대응 참고용, 더 이상 수정 안 함)
├── review-assistant-react/     # 프론트엔드 (Vite + React)
│   ├── design/                 # 디자인 핸드오프 원본 (design-build 스킬 참고)
│   ├── src/
│   └── CLAUDE.md                # 디자인 시스템 규칙
└── review-assistant-server/    # 백엔드 (Express) — 이번에 신규 추가
    ├── src/
    │   ├── routes/
    │   ├── controllers/
    │   ├── services/            # 향후 분석 엔진(규칙 기반 → Claude API 교체) 위치
    │   └── middleware/
    ├── .env.example
    └── package.json
```

새 API 엔드포인트가 늘어나면 `routes/*.route.js` + `controllers/*.controller.js` + 필요 시 `services/*.service.js` 패턴을 유지한다.

## 라이브러리

**프론트엔드** (`review-assistant-react`) — 기존 그대로 유지, 이번에 lint 도구만 추가:
- `react`, `react-dom`, `vite` (기존)
- 신규: `eslint` (flat config, `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh`), `prettier`

**백엔드** (`review-assistant-server`) — 신규:
- `express` — API 서버
- `cors` — 프론트엔드 dev origin 허용
- `dotenv` — `.env` 로드
- `@supabase/supabase-js` — DB(Postgres) + Auth 클라이언트 (2026-07-22 추가)
- `eslint` + `prettier` — 프론트엔드와 동일 스택
- 개발 서버 재시작: 별도 `nodemon` 의존성 대신 **Node 18+ 내장 `node --watch`** 사용 (`npm run dev`)
- **DB**: Supabase(Postgres) 사용. `@supabase/supabase-js`로 백엔드에서만 접근하며, `SUPABASE_SERVICE_ROLE_KEY`로 RLS를 우회한다(백엔드 전용 키 — `ANTHROPIC_API_KEY`와 동일 원칙으로 프론트엔드에 절대 노출하지 않음). 테이블은 `reviews`, `dashboard_insights` 두 개뿐 — 반복 문제 감지, 총 분석 요약, 월별 통계, 인사이트 캐시의 공통 데이터 소스.
  - (2026-07-13 결정 변경: 애초 "DB 없음, 인메모리"로 시작했으나 "리뷰 매니저 AI" 컨셉 확장으로 영속 저장이 필요해져 `node:sqlite`로 전환.)
  - (2026-07-22 결정 변경: `node:sqlite`(로컬 파일) → Supabase(Postgres)로 재전환. 회원 인증도 같은 시점에 Supabase Auth로 옮기면서 함께 결정.)

## 컨벤션

### 커밋 메시지
`<type>: <한글 설명>` 형식을 새로 도입한다. `type`은 `feat` / `fix` / `docs` / `refactor` / `chore` / `style` / `test` 중 하나.
- 예: `feat: 리뷰 분석 API 검증 로직 추가`, `docs: 백엔드 환경설정 문서화`
- 기존 커밋 로그(타입 접두사 없는 한글 설명체)를 소급 변경하지는 않는다 — 이 시점부터 적용.

### 코드 스타일
- 세미콜론 없음(`semi: false`), 작은따옴표, 줄 길이 100자, trailing comma — 루트 [`.prettierrc.json`](.prettierrc.json)이 두 패키지에 공통 적용된다(prettier가 상위 디렉토리로 설정을 탐색하므로 각 패키지에 따로 만들 필요 없음).
- 프론트엔드: 함수형 컴포넌트 + hooks, 컴포넌트는 PascalCase 파일명(`App.jsx`), 나머지 유틸은 camelCase.
- 백엔드: 파일명은 kebab-case + 역할 접미사(`reviews.route.js`, `reviews.controller.js`) — Node 생태계 관례.
- 각 패키지에서 `npm run lint` / `npm run format`으로 검사·정리한다.

### 브랜치 / PR
이 저장소는 코호트 공유 리포([[project_connect-aiagentchallenge-hub|메모리 참고]])이며 학생별 고정 브랜치(`N112_엄기윤`)를 사용한다. 기능별로 서브 브랜치를 새로 파지 않고 해당 브랜치에서 작업 후 업스트림 동일 이름 브랜치로 PR을 연다.

## 그 외 결정 사항

- **패키지 매니저**: npm (두 패키지 모두 `package-lock.json` 사용).
- **Node 버전**: 18 이상 (`engines.node` 명시). 로컬 개발 환경은 Node 24.
- **포트**: 프론트엔드 5173(Vite 기본값), 백엔드 4000. `review-assistant-server/.env.example`에 `PORT=4000` 기본값 포함.
- **CORS**: 백엔드가 `CORS_ORIGIN` 환경변수(기본 `http://localhost:5173`)만 허용.
- **세션 ID**: 리뷰 분석·반복 문제 감지·통계는 여전히 로그인과 무관한 익명 세션 기준으로 동작한다. 백엔드 `sessionId` 미들웨어가 `X-Session-Id` 요청 헤더를 읽고, 없으면 `crypto.randomUUID()`로 생성해 응답 헤더로 그대로 돌려준다. 프론트엔드가 이 값을 `localStorage`에 저장해 재사용한다(구현 완료, 2주차).
- **회원 인증** (2026-07-15 결정, 2026-07-22 구현 방식 변경): 애초 "로그인 없는 익명 세션"만으로 가기로 했으나, 회원가입/로그인 화면 + 토큰 기반 인증을 실제로 구현하기로 컨셉을 확장했다. 처음엔 자체 `users`/`auth_tokens` 테이블(SQLite) + `node:crypto` `scrypt` 해싱으로 구현했으나, 2026-07-22 DB를 Supabase로 옮기면서 인증도 **Supabase Auth**로 교체했다 — **프론트엔드 코드는 한 줄도 안 바뀌었다**: `review-assistant-server`의 `/api/v1/auth/*` 라우트가 여전히 같은 요청/응답 모양(`{user:{id,email}, token}`)을 유지하고, 내부적으로만 `supabase.auth.admin.createUser`/`signInWithPassword`/`getUser`를 호출하는 방식으로 바뀌었다(백엔드가 대신 Supabase를 부르는 구조 — Claude API를 서버에만 감춰둔 것과 같은 패턴). 로그인 시 내려주는 `token`은 이제 Supabase가 발급한 JWT다. 리뷰 저장은 여전히 `X-Session-Id` 기준이 기본이지만, **2026-07-20부터 로그인 상태면 `reviews.user_id`도 함께 채워 계정과 연결**한다(타입은 Supabase 유저 id에 맞춰 `uuid`) — `session_id` 저장을 대체하는 게 아니라 병행. `/my-reviews` 화면(`GET /api/v1/reviews/mine`)에서 계정에 연결된 리뷰를 기기·세션 상관없이 모아볼 수 있다.
- **에러 응답 형식**: `{ "error": { "code": "...", "message": "..." } }` — 기획서 5-4절과 동일. 코드: `EMPTY_INPUT` / `NO_VALID_REVIEW` / `TOO_MANY_REVIEWS` / `INVALID_JSON`(400), `ANALYSIS_FAILED` (500). `review-assistant-server/src/middleware/errorHandler.js`에서 일괄 처리.
- **환경변수**: `.env`는 git에 올리지 않고 `.env.example`만 커밋. 향후 Claude API 연동 시 `ANTHROPIC_API_KEY`는 **백엔드 전용** — 프론트엔드에 절대 노출하지 않는다.

## 배포 (4주차, 2026-07-27 결정)

- **플랫폼**: 프론트엔드는 **Vercel**, 백엔드는 **Render**로 결정.
- **프론트엔드**: `review-assistant-react/vercel.json`에 React Router SPA용 rewrite(`/(.*)` → `/index.html`) 설정 — 이게 없으면 `/dashboard` 같은 경로를 새로고침하거나 직접 접속할 때 404가 난다. `src/lib/api.js`의 `API_BASE`는 하드코딩된 `http://localhost:4000` 대신 `import.meta.env.VITE_API_BASE_URL`을 우선 쓰도록 변경(없으면 로컬 기본값 유지) — Vercel 프로젝트 환경변수에 배포된 Render 백엔드 URL을 등록해야 한다(`review-assistant-react/.env.example` 참고).
- **백엔드**: 루트의 `render.yaml`(Render Blueprint)로 서비스 정의 — `rootDir: review-assistant-server`, 빌드 `npm install`, 시작 `npm start`. `PORT`는 Render가 자동 주입하므로 별도 설정 안 함. `CORS_ORIGIN`/`ANTHROPIC_API_KEY`/`SUPABASE_URL`/`SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY`는 값 없이 키만 선언해두고, 실제 값은 Render 대시보드에서 직접 등록(git에 노출 안 됨).
- **CORS_ORIGIN 프로덕션 값**: 백엔드 배포(화요일) 시점엔 아직 프론트 URL을 모르므로, 프론트를 먼저 배포하거나 임시 값으로 등록한 뒤 실제 Vercel URL이 나오면 업데이트해야 한다.

## 향후 Claude API 연동 (2주차 이후, 지금은 미구현)

기획서 4번(향후 확장)에 명시된 대로, 현재 브라우저 내 규칙 기반 분석을 실제 Claude API 호출로 교체할 예정이다.
- 추천 모델: **`claude-haiku-4-5`** (입력 $1.00 / 출력 $5.00 per MTok) — 리뷰 감정 분류·키워드 추출·짧은 답변 초안 생성 정도의 경량 작업에 적합. 답변 품질을 더 높이고 싶으면 `claude-sonnet-5`(입력 $3.00 / 출력 $15.00, 2026-08-31까지 인트로가 $2.00/$10.00)로 상향 가능.
- 호출은 `review-assistant-server`에서만 수행 (API 키를 서버에만 보관). 현재 `src/services/`에 분석 엔진 자리를 비워뒀다.
- 정확한 모델 ID/가격은 시점에 따라 바뀔 수 있으므로, 실제 연동 시점에 다시 확인할 것 (모델 ID를 임의로 추측하지 말 것).
