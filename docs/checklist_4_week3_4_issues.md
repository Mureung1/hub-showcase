# SpecFit 3~4주차 이슈 목록 (2026-07-20 갱신)

> `#1~14`는 이미 완료(P0/P1 13개 + 홈 화면 #14) — 상세는 `project_specfit_progress.md` 참고. 원래 3주차 로드맵의 필터 API·갭 분석 로직, 4주차 로드맵의 시각화·결과 화면·보완 인사이트 팝업은 이미 앞당겨 끝났다. 아래는 **원래 로드맵(`개발_Task.md`)에서 아직 남은 것** + **로그인/북마크 확장 기능**만 다룬다. 우선순위 표기는 `개발_Task.md`와 동일하게 P0/P1/P2.
>
> **`checklist_2.md` 대조 검증 완료 (2026-07-16)**: 결과 화면 상태 탭/정렬은 이미 구현돼 있음(`ResultPage.jsx`의 `sort`/`statusFilter`) — 갭 아님. 백엔드 에러 핸들링 미들웨어도 이미 존재함(`server/src/middleware/errorHandler.js`) — 갭 아님. `GET /api/jobs`(공고 원본 목록+페이지네이션)와 분석 이력 목록 조회 API(`analysis_results` 전체 조회)는 실제로 쓰일 화면이 없어 **의도적으로 스코프 아웃** — 앱의 실제 API 표면은 `POST /api/gap-analysis` 중심이라 둘 다 불필요. 재검토 없이 다시 이슈로 올리지 말 것.

---

## #15 — AppStateContext: 라우트 간 상태 공유 [P0]

**설명**: 현재 `/filter`→`/spec`→`/result`는 React Router의 `location.state`로만 데이터를 넘기고 있다. 결과 화면은 분석 id를 localStorage에 저장해 새로고침 시 복원되지만(#9), **필터·스펙 값 자체는 새로고침하거나 직접 URL로 들어오면 사라진다**. CLAUDE.md "Planned: cross-route state sharing"에 설계된 대로 `Context` + `localStorage` 동기화를 도입한다.

**완료 기준**
- [x] `src/context/AppStateContext.jsx` — `filters`/`spec`/`result` 상태와 `setFilters(patch)`/`setSpec(patch)` 류 mutator 제공
- [x] Provider가 `App.jsx`에서 `<Routes>` 상위에 마운트 (라우트 전환 시 리셋 안 됨)
- [x] `useAppState()` 훅으로 각 페이지에서 읽기/쓰기
- [x] localStorage 동기화: 최초 렌더 시 저장된 값 복원, 변경 시 `useEffect`로 저장. **키 컨벤션 결정: 기존 `specfit_analysis_id` 키는 그대로 유지(#9의 결과 복원 로직이 이미 의존 중이라 건드리지 않음), Context 상태(filters/spec/result)는 별도 키 `specfit_app_state`로 신규 저장 — 두 시스템을 분리해 기존 로직 회귀 위험을 없앤다.**
- [x] `FilterPage`/`SpecPage`/`ResultPage`의 기존 `location.state` 전달 방식을 Context 기반으로 교체 (단, SpecPage→ResultPage 사이엔 "방금 제출했는지" 구분용 `fresh` 불리언 플래그만 라우터 state로 남겨둠 — 데이터 자체는 안 실림)
- [x] `/result` 가드: `result` 없이 진입 시 `<Navigate to="/filter" />` (기존 #9의 분석 id 복원 로직과 통합 — 이중 리다이렉트 안 나게). 가드는 `status==='loading'` 상태머신이 GET 응답을 받을 때까지 판단을 미루므로 느린 네트워크에서도 레이스 컨디션 없음 (리뷰로 확인)
- [x] `/filter` → `/spec` 이동 후 새로고침해도 필터 값이 유지됨 (현재는 결과만 유지됨 — 이게 실질적으로 달라지는 부분)
- [x] 기존 FE 테스트 전부 통과, 회귀 없음 (lint/test/build 전부 통과 + 사용자 브라우저 클릭 테스트 완료, 2026-07-20)

**완료 (2026-07-20, 커밋 `d3c9964`)**. **참고**: 헤더/스테퍼/초기화 버튼 등 실제 화면 UI는 이 이슈 범위가 아니다 — `#21`에서 별도로 다룬다(그래서 `#21`은 이 이슈 완료 후 착수). 이 이슈는 상태 관리 로직(Context+localStorage)만 다룸.

---

## #16 — E2E 플로우 테스트 [P0]

**설명**: 랜딩→필터→스펙→로딩→팝업→결과→상세 전체 플로우와 "홈"(상태 보존) vs "초기화"(완전 리셋) 차이를 자동화 테스트로 검증한다. 지금까지는 매 기능마다 사용자가 직접 브라우저에서 수동 확인해왔음(이 개발 환경엔 headless 브라우저가 없어 Claude 쪽에서 직접 구동/검증 불가 — 이번에도 실제 실행 확인은 사용자 쪽에서 필요).

**완료 기준**
- [x] 테스트 도구: **Playwright로 확정** (지금까지 개발 과정에서 매 이터레이션 검증에 이미 써온 도구라 연속성 있음). `e2e/` 폴더에 별도로 두고 `npm run test:e2e` 스크립트로 분리 — 기존 `npm run test`(vitest)는 유닛/컴포넌트 테스트 전용으로 그대로 둠
- [x] 전체 플로우(랜딩→필터→스펙→로딩→팝업→결과→상세) 최소 1개 시나리오 통과
- [x] "홈" 버튼(상태 보존) vs "초기화" 버튼(완전 리셋) 차이 검증 — `#21` 완료 후 진행. (배너 UI는 `#21` 스코프 정정으로 없어졌으므로 "지난 분석 이어하기" 버튼 노출 여부로 검증)
- [x] 스펙 케이스별 테스트 — 매우 낮음/매우 높음/일부만 입력/외국어 미입력, 각각 결과 화면까지 정상 도달
- [x] CI 연동 여부는 이번 스코프 아웃 (로컬 실행만)

**완료 (2026-07-23, 커밋 `84584c4`)**. 구현 메모:
- `playwright.config.js`: `webServer`를 배열로 설정해 백엔드(`cd server && npm start`, `/api/health`로 준비 확인)+프론트(`npm run dev`, `:5173`)를 테스트 실행 시 자동 기동. 로컬에 이미 시드된 `server/data/specfit.db`를 그대로 사용(별도 시드 단계 없음).
- `vite.config.js`의 `test.exclude`에 `e2e/**` 추가 — 안 하면 vitest 기본 include 패턴이 Playwright 테스트 파일도 주워서 실행하려다 깨짐.
- `e2e/helpers.js`: `fillSpec()`/`submitSpecAndWaitForResult()` 공통 헬퍼. 경력/외국어 필드는 select+input이 한 `<label>` 안에 같이 있어 `getByLabel`이 여러 요소에 매칭되는 문제가 있어, `.field` 클래스를 라벨 텍스트로 스코핑하는 방식으로 우회.
- `e2e/full-flow.spec.js`(1개), `e2e/spec-cases.spec.js`(4케이스: 매우낮음=기본값 그대로/매우높음=박사·경력240개월·TOEIC 990·자격증 2개·컴활보유/일부만입력=학력만 변경/외국어미입력=나머지는 채우되 외국어만 비움), `e2e/home-vs-reset.spec.js`(1개) — 총 6개 테스트.
- 실행 결과: `npm run test:e2e` 6/6 통과(20.0s). 기존 `npm run test`(vitest, 3파일/15개)·`npm run lint` 회귀 없음 확인.
- 로그인/북마크 플로우, CI 연동은 사용자 지시대로 이번 범위에서 제외.

---

## #17 — 배포: 프론트 Vercel + 백엔드 Render/Railway [P1]

**설명**: `checklist_2.md` 4단계의 배포 항목. 로컬 개발 환경에서만 검증된 것을 실제 배포 환경으로 옮긴다.

**완료 기준**
- [x] 프론트 Vercel 배포, 프로덕션 URL 확보 (`https://specfit-six.vercel.app`)
- [x] 백엔드 Render 배포, 프로덕션 URL 확보 (`https://specfit-62w2.onrender.com`)
- [x] 프로덕션에서 프론트→백엔드 API 호출 정상 동작 (CORS 설정 포함) — `ALLOWED_ORIGIN`에 Vercel URL 추가 후 실제 preflight(`OPTIONS`) 요청으로 `access-control-allow-origin` 헤더 확인, 갭 분석/로그인/북마크 전부 프로덕션에서 정상 동작 확인
- [x] SQLite 파일 영속성 확인 — Render 무료 인스턴스는 재배포/재시작 시 파일시스템이 초기화될 수 있음. `jobs` 테이블은 서버 시작 시 자동 시드(코드 준비 단계에서 구현, `seedJobsIfEmpty()`)로 복구되므로 문제 없음. `analysis_results`(재조회용 저장 이력)는 초기화되면 유실될 수 있으나, 게스트 플로우의 "새로고침 시 결과 복원"에만 영향(로그인/북마크는 Supabase Postgres라 무관) — 필요해지면 Render 유료 플랜의 Persistent Disk로 해결 가능, 지금은 스코프 아웃
- [x] 프로덕션 환경변수 정리 — Render: `PORT`/`DB_PATH`/`SUPABASE_URL`/`SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY`/`ALLOWED_ORIGIN`, Vercel: `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`/`VITE_API_BASE_URL`. `.env.example`/`server/.env.example`는 코드 준비 단계에서 이미 갱신됨(커밋 `868e06c`)
- [ ] (낮은 우선순위, 스코프 아웃 유지) 쿼리 성능/인덱스 점검 — 862건 규모라 실익 낮다고 판단, 실제 지연 문제가 보고되면 그때 진행

**완료 (2026-07-23)**. 코드 준비(커밋 `868e06c`: API base URL 환경변수화, CORS 환경변수화, 서버 시작 시 자동 시드)는 별도 세션에서 먼저 끝냈고, 이번엔 사용자가 직접 Render/Vercel 계정 생성부터 실제 배포까지 진행 — Render(백엔드) 배포 → Vercel(프론트) 배포 시 `VITE_API_BASE_URL`에 Render URL 연결 → Render의 `ALLOWED_ORIGIN`에 Vercel URL 추가, 순서로 진행. 첫 시도에서 브라우저 콘솔에 CORS 에러가 떴는데, 이는 `ALLOWED_ORIGIN` 저장 직후 Render가 재배포되기 전 타이밍이었던 것으로 확인 — 잠시 후 재확인하니 실제 preflight 응답에 올바른 `Access-Control-Allow-Origin` 헤더가 붙어 있었고 갭 분석/로그인/북마크 전부 정상 동작.

**추가 수정 (2026-07-27)**: `/bookmarks`에 직접 접근(새로고침/북마크/주소창 입력)하면 Vercel이 `404 NOT_FOUND`를 반환하는 걸 발견 — `vercel.json`이 아예 없어서 SPA(React Router 클라이언트 라우팅) 경로에 대한 rewrite 규칙이 없었음. 지금까지 프로덕션 테스트가 전부 홈에서 클릭으로만 이동(클라이언트 사이드 네비게이션, 서버에 새 요청 안 감)했던 탓에 이 구멍이 안 드러났던 것 — `/filter`/`/spec`/`/result`/`/login` 등 다른 라우트도 직접 접근하면 동일하게 404였을 가능성이 높음(#25 작업 중 북마크 페이지를 새로고침하며 처음 발견). `vercel.json`(신규, 커밋 `939ac72`)에 `{ rewrites: [{ source: "/(.*)", destination: "/index.html" }] }` 추가해서 모든 경로를 `index.html`로 rewrite, React Router가 클라이언트에서 라우팅하도록 함.

---

## #18 — 반응형 레이아웃 & 모달 접근성 폴리싱 [P2, 시간 남으면]

**설명**: `개발_Task.md`에서도 가장 먼저 뺄 항목으로 명시된 폴리싱 작업. 데스크톱/모바일 레이아웃 점검과 모달 키보드 접근성.

**완료 기준**
- [ ] 결과 화면 등 주요 화면이 모바일 폭에서 레이아웃 깨짐 없음 (데스크톱 ≥860px 2컬럼 / 모바일 세로 스택은 이미 구현돼 있음 — 실측 점검만 남음)
- [ ] 모달(공고 상세/인사이트) ESC 키로 닫힘
- [ ] 모달 오픈 시 포커스 트랩 적용

---

## #19 — 로그인/회원가입 (Supabase Auth) [확장 기능]

**설명**: 북마크 기능을 쓰려면 계정이 필요하다는 요구로 추가된 확장 트랙. **인증 방식 변경 확정 (2026-07-21)**: 원래 계획이던 자체 세션(bcrypt+sessions 테이블+httpOnly 쿠키)을 폐기하고 **Supabase Auth**로 결정 — 프론트/백엔드가 다른 origin에 배포될 때 세션 쿠키에 필요한 `sameSite=None; Secure`+CORS `credentials:true` 설정이 로컬에서는 재현 안 돼 배포 시점에야 발견될 위험이 있었기 때문. Supabase Auth는 프론트에서 `@supabase/supabase-js`로 직접 호출하고 토큰(JWT)을 `Authorization` 헤더로 넘기는 방식이라 이 문제가 아예 없다. 게스트 플로우(필터→스펙→결과 갭 분석)는 로그인 여부와 무관하게 지금과 100% 동일하게 유지 — 로그인은 선택 기능. 상세 작업 분해와 사용자 시나리오는 `checklist_3_login_bookmark.md` 참고.

**완료 기준**
- [ ] Supabase 프로젝트 생성 (사용자 직접 수행) + 프론트에 `@supabase/supabase-js` 연결
- [ ] 회원가입/로그인/로그아웃/세션 확인 — 전부 Supabase Auth 클라이언트 SDK로 처리 (Express `/api/auth/*` 라우트는 만들지 않음)
- [ ] `/login`, `/signup` 페이지 — `?redirect=` 파라미터 유지, 회원가입 성공 시 자동 로그인 후 `redirect` 경로로 이동
- [ ] 헤더에 로그인/회원가입 진입점 ↔ 로그인 시 사용자 메뉴(로그아웃) 전환
- [ ] Supabase 세션 만료/무효화 감지 시 `/login?redirect=...`로 유도하는 공통 처리
- [ ] 게스트로 필터→스펙→결과 플로우를 끝까지 실행해도 로그인 관련 변화가 전혀 없음을 회귀 확인

---

## #20 — 북마크 기능 (Supabase Postgres) [확장 기능, ⚠️ #19 완료 후 착수]

**설명**: 로그인 사용자가 결과 화면의 공고를 저장해뒀다가 마이페이지에서 다시 볼 수 있게 한다. **#19(로그인)가 선행돼야 함**. `bookmarks` 데이터는 **Supabase가 호스팅하는 별도 Postgres**에 저장(로컬 `better-sqlite3`가 아님) — 계정/북마크처럼 유실되면 안 되는 데이터를 배포 시 파일시스템이 초기화될 수 있는 로컬 SQLite에 두지 않기 위함. `jobs`/`analysis_results`는 그대로 로컬 SQLite 유지, 손대지 않는다.

**완료 기준**
- [x] Supabase Postgres에 `bookmarks` 테이블 (`user_id`, `job_id` 유니크) + Row Level Security 정책 (본인 것만 CRUD)
- [x] 백엔드에 Supabase JWT 검증 미들웨어(`requireSupabaseAuth`) 추가 — `Authorization: Bearer <token>` 헤더 검증
- [x] `POST /api/bookmarks`(등록 전 `job_id`가 로컬 SQLite `jobs`에 실제 존재하는지 확인), `DELETE /api/bookmarks/:job_id`, `GET /api/bookmarks`(Supabase 북마크 목록 + 로컬 SQLite jobs를 애플리케이션 레벨에서 join — DB가 분리돼 있어 진짜 FK/SQL join 불가)
- [x] `JobCard`/`JobDetailModal`에 북마크 토글 버튼(☆/★), 비로그인 상태 클릭 시 `/login?redirect=...`로 유도
- [x] `/bookmarks` 마이페이지 — 북마크한 공고 목록, 빈 상태 UI 포함
- [x] 마이페이지에서도 북마크 해제 가능 (기존 `JobDetailModal` 재사용)
- [x] 로그아웃 시 화면은 유지하되 북마크 버튼 전부 ☆(미확인) 상태로 리셋 (`useBookmarks`가 `user`를 의존성으로 구독 — 로그아웃되면 북마크 Set을 즉시 비움)
- [x] 북마크 API 테스트 통과 (`supabaseAdmin.js`/`supabaseAuthClient.js`를 `vi.mock`, 로컬 SQLite `jobs`는 실제 시드 데이터로 검증)
- [x] **마이페이지 상세 비교 (2026-07-22 추가 결정)**: 마이페이지를 열 때 북마크한 공고를 "북마크했을 때의 스펙"이 아니라 **지금 Context에 저장된 최신 스펙** 기준으로 재평가해서, 결과 화면에서 공고를 클릭했을 때와 동일한 체크리스트/상태 배지를 보여준다. `POST /api/bookmarks/evaluate`(신규) — 기존 `evaluateJob`(공고 1건 판정 함수)을 그대로 재사용해 결과 화면의 `jobList` 원소와 동일한 모양을 응답하므로, FE도 기존 `buildJobDisplay`를 그대로 재사용한다(별도 판정 로직 중복 없음).

**완료 (2026-07-22)**. 구현 메모:
- 백엔드: `server/src/db/supabaseAuthClient.js`(anon key, 토큰 검증 전용)/`supabaseAdmin.js`(service_role key, RLS 우회 CRUD) 두 클라이언트 분리, `requireSupabaseAuth` 미들웨어(throw 없이 401 직접 응답, `gapAnalysis.routes.js`의 404 스타일과 동일), `bookmarks.routes.js`(POST/DELETE/GET). 테스트가 `app.js`를 직접 import해 `index.js`의 `dotenv/config` 로딩을 거치지 않는 문제를 발견해 `server/vitest.config.js`에 `setupFiles: ['dotenv/config']` 추가.
- 프론트: `src/hooks/useBookmarks.js`(로그인 사용자의 북마크 id Set을 들고 토글) — `ResultPage`에서 사용. `BookmarksPage.jsx`는 목록 자체가 곧 북마크라 이 훅을 쓰지 않고 직접 조회. `JobCard`/`JobDetailModal`은 `checklist`/`statusLabel`이 없는 경우(마이페이지의 원본 job row)를 옵셔널로 처리하도록 가드 추가 — 갭 분석을 거치지 않은 공고이기 때문.
- `JobCard`는 최상위가 `<button>`이라 북마크 버튼을 진짜 `<button>`으로 중첩할 수 없어(무효 HTML) `role="button"` span + 수동 키보드 핸들러로 구현.
- 검증: 백엔드 56개 테스트 통과, 프론트 lint/test/build 통과. 실제 Supabase 프로젝트에 대해 인증 미들웨어 curl 검증(토큰 없음/잘못된 토큰 모두 401). 이번에도 headless 브라우저가 없어 실제 북마크 클릭/토글 동작은 사용자 브라우저 확인 필요.

---

## #21 — 헤더/스테퍼/초기화 버튼 + 히어로 이어하기 버튼 고도화 [P0, ⚠️ #15 완료 후 착수]

**설명**: `개발_Task.md` 3주차 P0에서 `AppStateContext`와 같이 묶여 있던 UI 작업인데 `#15`를 상태 관리 로직만으로 좁히면서 빠졌다. **`#15`가 끝나야 착수 가능** — 스테퍼가 표시할 "지금 단계" 정보가 `#15`의 Context 상태에서 나온다.

**⚠️ 범위 정정 (2026-07-21)**: 이 항목은 원래 `checklist_2.md` 2단계의 `getResumeStep`/`renderResumeBanner`를 인용해서 "이어하기 배너를 완성한다"고 적혀 있었는데, 이는 이미 지나간 스펙이다 — `renderResumeBanner()`와 그 배너 UI는 2026-07-20 프로토타입 리디자인(`demo_11.html`→`demo_12.html`) 때 죽은 코드로 이미 삭제됐고, "이어하기" 역할은 히어로의 "지난 분석 이어하기" 버튼(`갭 분석 시작하기` 버튼 옆) 하나로 완전히 흡수됐다. 배너라는 별도 UI 요소는 만들지 않는다. `#22`에서 이 버튼을 처음 넣을 때 남아있던 `#14`의 옛 `.resume-banner` div(중복 UI)도 같이 정리했다 — 커밋 확인.
`getResumeStep()`(저장된 상태를 보고 "필터만 선택함" / "스펙까지 입력함" / "결과까지 있음" 3단계 판정) 자체는 여전히 유효한 로직이지만, 그 결과를 렌더링할 곳은 배너가 아니라 **히어로의 "지난 분석 이어하기" 버튼**이다 — 지금 그 버튼은 `hasSavedAnalysis`(분석 id 존재 여부)만 보고 있어서 필터만 선택하고 중단한 경우를 못 잡는다.

**완료 기준**
- [x] 헤더 컴포넌트 — 로고(클릭 시 홈 이동), 스테퍼(조건 필터링/스펙 입력/결과, 완료된 단계는 클릭해서 이동 가능), "홈" 버튼, "초기화" 버튼 (`#22`에서 만든 `Header.jsx`는 로고+다크모드 토글만 있는 최소 버전이었고, 이번에 그 위에 확장)
- [x] `resetAll` — Context(filters/spec/result)와 localStorage(`specfit_app_state`, `specfit_analysis_id`) 전부 초기화하고 랜딩으로 이동
- [x] `getResumeStep` 이식 — `src/context/AppStateContext.jsx`에 추가. 저장된 상태를 보고 "필터만 선택함" / "스펙까지 입력함" / "결과까지 있음" 3단계 판정
- [x] `LandingPage.jsx`의 히어로 "지난 분석 이어하기" 버튼이 `getResumeStep`의 판정 결과에 따라 표시 여부와 이동 대상(`/filter`·`/spec`·`/result`)을 결정하도록 교체 (기존 `hasSavedAnalysis` 단일 불리언 + `/result` 고정 이동 → 제거)
- [x] 판정 결과가 없으면(아무 것도 저장 안 됨) 버튼 자체를 표시하지 않음
- [x] 손상된 저장 상태 안전장치 — `getResumeStep`이 `result`가 있어도 `stats`/`jobList`가 없으면(불완전한 저장값) 신뢰하지 않고 spec/filters 판정으로 폴백
- [ ] "홈"(상태 보존) vs "초기화"(완전 리셋)의 동작 차이가 실제로 다름을 확인 (→ 이 확인 자체는 `#16`의 E2E 테스트 항목에서 자동화됨, 이 이슈에선 수동 확인만 — 사용자 브라우저 확인 대기)

**완료 (2026-07-21)**. 구현 메모:
- `Header.jsx`의 스테퍼 "완료된 단계" 판정은 데모 프로토타입처럼 "지금 보고 있는 화면"이 아니라 `getResumeStep`이 보는 **실제 저장된 진행 상태** 기준으로 계산했다 — 예를 들어 스펙 페이지로 URL을 직접 쳐서 들어가도(스펙을 아직 안 건드렸다면) 결과 단계로는 못 넘어간다. 프로토타입은 단일 페이지 상태머신이라 "현재 화면"과 "진행 상태"가 사실상 같았지만, 실 라우팅 앱에서는 구분해야 더 정확함
- `App.css`에 `.stepper-inline`/`.step-item`/`.step-circle`/`.step-label`/`.step-line`/`.nav-link.pill`과 680px 모바일 브레이크포인트 이식
- 검증: FE lint/test/build 통과, dev 서버로 모듈 트랜스폼 확인. 이번에도 headless 브라우저가 없어 실제 클릭 동작(스테퍼 이동, 초기화 vs 홈 차이)은 사용자 브라우저 확인 필요

---

## #22 — 디자인 토큰 포팅 (크림/더스티로즈 + 다크네이비, 다크모드 포함) [P1]

**설명**: 지금까지 만든 모든 화면(랜딩 포함, `#14`)은 프로토타입의 실제 디자인 톤이 아니라 CLAUDE.md에 명시된 대로 임시 dark+violet placeholder 톤으로 만들어져 있다. `prototype/demo_13.html`의 `:root` CSS 변수(`--gray-900`, 상태별 `--green-bg`/`--green-text` 등)를 실제 값으로 포팅한다. 변수 이름은 프로토타입과 동일하게 유지해야 `STATUS_STYLE`/`JOBTYPE_STYLE` 등 이름으로 값을 읽는 JS 코드가 그대로 작동한다.

**참고**: `prototype/demo_11.html`(민트/파스텔 톤)은 2026-07-20 레퍼런스 디자인(공공 아동돌봄서비스 사이트풍) 반영을 위해 `demo_12.html`(인디고/바이올렛 단일 액센트 + 라벤더 배경)로 대체·삭제됐고, `demo_12.html`은 2026-07-21 색감/다크모드 재작업을 거쳐 `demo_13.html`로 다시 대체·삭제됐다 — **이제 `demo_13.html`이 유일한 정본**, 인디고/바이올렛이 아니라 크림·더스티로즈 라이트 톤 + 쿨톤 다크네이비 텍스트(`--accent: #2b3480` / `--gray-50: #fbf5f8`)다. 구조(히어로 2단 카피+도넛차트 미리보기 카드, `.site-frame` 없는 풀블리드 레이아웃)는 demo_12부터 변화 없음. React 쪽 placeholder(`src/App.css`의 dark+violet)와는 별개의 색이니 혼동 금지.

**다크모드 스코프 결정 (2026-07-21)**: 이 문서를 처음 쓸 때(다크모드 없던 demo_12 기준) "다크모드는 프로토타입 기준 그대로 (별도 대응 범위 아님)"이라고 적었었는데, `demo_13.html`이 실제 다크모드 토글(`data-theme="dark"`, 헤더 버튼, `specfit_theme_v1` localStorage 키, `prefers-color-scheme` 폴백)을 갖추면서 그 전제가 깨졌다. **사용자 확정: React에도 다크모드를 실제로 포팅한다.** 아래 완료 기준에 반영함.

**완료 기준**
- [x] `src/styles/tokens.css` — 프로토타입 `:root` 변수를 실제 값으로 이식 (변수명 동일 유지, 값만 교체)
- [x] `src/styles/tokens.css`에 `:root[data-theme="dark"]` 오버라이드 블록도 함께 이식 (라이트와 동일한 변수명, 다크 값만 재정의 — demo_13.html 그대로)
- [x] 다크모드 토글 UI + 로직 포팅 — 헤더에 토글 버튼, `data-theme` 속성 전환, 별도 localStorage 키(`specfit_theme_v1`, `specfit_app_state`/`specfit_analysis_id`와 분리)로 저장, `prefers-color-scheme` 폴백. `index.html`에 첫 페인트 전 인라인 스크립트도 추가해 라이트→다크 전환 시 FOUC(깜빡임) 방지
- [x] Pretendard Variable / JetBrains Mono 폰트 `index.html`에 연결
- [x] 기존 placeholder 톤으로 만들어진 모든 화면(랜딩/필터/스펙/결과) 새 토큰으로 교체 — CSS 변수 기반이라 라이트/다크 모두 자동 대응
- [x] `STATUS_STYLE`/`JOBTYPE_STYLE`(`resultDisplay.js`) 등 변수명 문자열로 값을 읽는 코드가 새 토큰에서도 정상 동작 (다크모드 전환 시에도) — 하드코딩 hex였던 것을 `var(--green-bg)` 등으로 교체, 실제 9개 job_category를 5개 토큰 색상에 재배분
- [x] 토큰(색상 값)뿐 아니라 `demo_13.html`의 구성 변화도 함께 반영: 랜딩 히어로 2단 레이아웃(카피+도넛차트 미리보기 카드, `#14`의 기존 히어로를 대체), `.site-frame` 없는 풀블리드 페이지 레이아웃, sticky 헤더

**완료 (2026-07-21)**. 구현 메모:
- 새 파일: `src/styles/tokens.css`(토큰), `src/hooks/useTheme.js`(토글 훅), `src/components/layout/Header.jsx`(sticky 헤더)
- `src/App.css` 전면 재작성(하드코딩 dark+violet → `var(--...)` 참조), `src/index.css`는 레거시 Vite 템플릿 잔재(`#root` 1126px 박스 프레임 + 자체 색상 변수 체계) 제거 — 풀블리드 레이아웃과 충돌해서 정리 필요했음
- `Header.jsx`는 **로고+다크모드 토글만** 있는 최소 버전 — 스테퍼/초기화/홈 버튼/이어하기 배너 완전판은 여전히 `#21` 스코프, 이번에 같이 만들지 않음
- `DonutChart.jsx`의 SVG stroke 색이 하드코딩 hex(`#7fd9a8` 등)였던 것도 `var(--donut-ok)`/`var(--donut-no)`로 교체 — 안 그러면 다크모드에서 도넛 색이 안 바뀜
- FilterPage/SpecPage 폼을 `.form-card`로 감싸서 카드 스타일 통일 (JS 로직 무변경)
- 검증: FE lint/test/build 전부 통과, dev 서버(FE+BE) 기동해 모든 페이지 모듈이 200으로 정상 트랜스폼되는 것 확인. **이 환경엔 headless 브라우저가 없어(chromium-cli 없음, claude-in-chrome도 이번 세션엔 미연결) 실제 렌더링/다크모드 토글 클릭은 사용자가 브라우저에서 직접 확인 필요** — 이전 세션들과 동일한 패턴

---

## #23 — 컴퓨터활용능력 참고 정보 노출 [P2]

**설명**: 스펙 입력 폼에서는 이미 "판정에 미반영" 문구와 함께 입력받고 있지만(`#7`), 결과 화면 어디에도 이 값이 다시 보이지 않는다. 우대 항목이라는 취지를 살리려면 공고 상세 모달에서라도 참고 정보로 노출하는 게 자연스럽다.

**완료 기준**
- [x] `JobDetailModal`에 사용자가 입력한 컴퓨터활용능력 보유 여부 표시 (다른 5개 항목과 구분되는 "참고용" 스타일 — 충족/미충족 판정 색상 사용 금지)
- [x] "판정에 포함되지 않는 참고 정보"라는 문구 함께 표시

**완료 (2026-07-23, 커밋 `bbc6a48`)**. TDD로 진행: `describeComputerSkill(hasComputerSkill)` 순수 함수를 `src/lib/gapAnalysis.js`에 추가하기 전에 `src/lib/gapAnalysis.test.js`로 red 테스트부터 작성(`true`→`'보유'`/`false`→`'미보유'` 2케이스만 — `has_computer_skill`은 Context 기본값이 `false`인 체크박스 제어값이라 undefined/null 방어 케이스는 프로젝트 컨벤션대로 스코프 아웃), 구현 후 green 확인. `buildJobDisplay`에 `has_computer_skill: spec.has_computer_skill` 필드를 추가해 `JobDetailModal`이 `job` prop 하나로 계속 동작하게 함(기존 checklist/statusLabel과 동일 패턴). `.checklist-row-reference`(점선 테두리+회색 배경)로 시각적으로 분리, ok/no 색상 미사용. `ResultPage`/`BookmarksPage` 둘 다 `buildJobDisplay`를 거치므로 두 화면 모두 코드 수정 없이 자동 적용됨.

---

## #24 — README 합성 데이터 고지 문구 + API 문서화 [P1]

**설명**: `checklist_2.md` 0/1단계에 있던 "합성 데이터 고지 문구"가 README 어디에도 없다 (실제 862건 공고 + 규칙 기반 합성 스펙 필드라는 사실을 명시해야 함 — `checklist_2.md`의 확정 사항). API 문서화도 아직 없어 `POST/GET /api/gap-analysis`, `/api/bookmarks`(`#20`) 등 엔드포인트를 파악하려면 라우트 코드를 직접 읽어야 하는 상태. (`#19`는 Supabase Auth로 결정되면서 — 2026-07-21 — Express `/api/auth/*` 라우트 자체가 없어졌으니 여기서 문서화할 대상이 아니다. 대신 프론트가 Supabase를 직접 호출한다는 사실 자체는 README나 `docs/api.md`에 한 줄 언급 필요.)

**완료 기준**
- [x] README에 합성 데이터 고지 문구 추가 ("JOB-ALIO 실제 862건 공고 + 규칙 기반 합성 스펙 필드" 명시)
- [x] README 또는 별도 `docs/api.md`에 엔드포인트별 요청/응답 스키마 정리 (`/api/gap-analysis`, `/api/bookmarks` — 각 이슈 완료 시점에 맞춰 추가. `#20`은 확장 트랙이라 미착수 시 해당 부분은 생략) + 인증은 Supabase Auth를 쓴다는 사실과 필요한 프론트 환경변수 한 줄 언급

**완료 (2026-07-27)**. 합성 데이터 고지 문구는 README 상단(프로젝트 소개 직후)에 인용 블록으로 추가. `docs/api.md`(신규) — `/api/health`, `/api/gap-analysis`(POST/GET), `/api/bookmarks`(POST/DELETE/GET/evaluate) 6개 엔드포인트 전부를 실제 라우트 코드(`gapAnalysis.routes.js`/`bookmarks.routes.js`/`gapAnalysisValidation.js`) 기준으로 문서화 — 요청/응답 예시, 검증 규칙, 인증 방식(`requireSupabaseAuth`가 매 요청마다 Supabase에 토큰 검증을 위임한다는 점) 포함. README의 Tech Stack 섹션도 실제와 맞게 갱신(Recharts→커스텀 SVG, "Backend (예정)"→Express, DB에 Supabase Postgres/Auth 추가, Vercel/Render 실제 배포 URL 추가).

---

## #25 — 공고 상세 모달에 항목별 참고링크 추가 [확장 기능]

**설명**: 공고 상세 모달(`JobDetailModal`)에서 미충족 항목을 볼 때, 그 항목을 준비할 수 있는 외부 사이트로 바로 이동할 수 있는 참고링크를 추가한다. 대상은 **어학·경력·자격증 3개 항목만**이고, 학력·전공은 "준비할 수 있는 외부 사이트"라는 개념 자체가 성립하지 않으므로 제외한다. 판정 로직(`evaluateJob`/`checks`)에는 관여하지 않는다 — `#23` 때와 같은 원칙.

**완료 기준**
- [x] `buildJobDisplay`(`src/lib/gapAnalysis.js`)의 checklist 항목에 카테고리별 원본 요구값(예: `foreignLanguage`의 `job.foreign_lang_test`)을 함께 실어서 노출 — 현재 checklist 항목은 `{category, label, ok, detail}`뿐이라 `detail`은 사람이 읽는 한글 문장이라 이걸 재파싱해서 시험명을 뽑는 방식은 문구가 바뀌면 깨지므로 채택하지 않음
- [x] 어학 미충족 시 → 시험 종류별(TOEIC / TOEFL / OPIc / TOEIC Speaking, 데이터셋에 존재하는 4종 전부) 공식 사이트 링크 매핑 테이블 작성, 위에서 노출한 원본 요구 시험명 기준으로 정확한 링크 연결
- [x] 경력 미충족 시 → 사람인(saramin.co.kr) 채용정보 페이지로 고정 링크
- [x] 자격증 미충족 시 → 큐넷(Q-net, 한국산업인력공단) 단일 링크로 고정. 링크 바로 옆에 "정확한 시행기관은 자격증마다 다를 수 있음"을 작은 캡션(muted 톤)으로 표시 — 27종 전부가 큐넷 소관은 아니라는 걸 사용자가 알 수 있게
- [x] 학력·전공 항목에는 참고링크 자체를 렌더링하지 않음 (학력무관/전공무관처럼 조건이 없는 케이스 포함)
- [x] 이미 충족(✓)된 항목에는 참고링크를 노출하지 않음 — 미충족(✕) 항목에만 표시
- [x] 참고링크는 새 탭으로 열림 (`target="_blank" rel="noopener noreferrer"`)
- [x] 링크 URL에 사용자의 스펙 값(학력·경력·자격증 등 개인 입력값)이 쿼리 파라미터로 들어가지 않음 — 고정 URL만 사용
- [x] 기존 `.checklist-detail`/`.checklist-detail-fail` 레이아웃 안에 자연스럽게 들어가도록 배치, 별도 팝업이나 모달을 새로 만들지 않음
- [x] 결과 화면과 마이페이지(북마크) 상세 모달 양쪽 진입점에서 동일하게 동작 (`JobDetailModal` 하나를 공유하므로 자연히 만족됨)
- [ ] 데스크톱·모바일 뷰포트 양쪽에서 링크 클릭 영역·줄바꿈이 깨지지 않는지 확인 — 사용자 브라우저 확인 대기
- [x] 862건 공고를 순회해 어학 4종 각각 최소 1건, 경력 미충족 케이스, 자격증 미충족 케이스에서 링크가 각각 올바른 대상으로 연결되는지 확인

**진행 상황 (2026-07-27)**: 구현 완료, 마지막 뷰포트 확인만 남음. `src/constants/referenceLinks.js`(신규) — `getReferenceLink(category, requirementValue)`. 링크는 WebSearch로 공식 사이트 직접 확인: TOEIC `exam.ybmnet.co.kr/toeic`, TOEIC Speaking `toeicswt.co.kr`, TOEFL `kr.ets.org/toefl.html`, OPIc `opic.or.kr`, 경력 `saramin.co.kr`, 자격증 `q-net.or.kr`. `buildJobDisplay`의 checklist 항목에 `requirementValue`(foreignLanguage만 `job.foreign_lang_test`, 나머지는 `undefined`) 추가. `JobDetailModal.jsx`가 `!c.ok`인 항목에서만 `getReferenceLink` 호출, 자격증 항목에만 시행기관 안내 캡션 추가. 실제 시드 DB(862건) 기준 검증: TOEIC/TOEFL/OPIc/TOEIC Speaking 4종 전부 실존(23/25/31/31건), 경력 미충족·자격증 미충족 케이스 각각 실제 공고로 `evaluateJob` 통과시켜 checks=false + 올바른 링크 확인. FE lint/test 회귀 없음(15/15 통과). 사용자가 브라우저에서 로컬 확인 완료("잘 만들어진 것 같다").

**범위 추가 (2026-07-27, 같은 세션)**: 원래 완료 기준은 학력·전공 둘 다 "준비할 수 있는 외부 사이트 개념이 성립하지 않는다"며 제외했었는데, 사용자가 학력은 실제로 올릴 방법(학점은행제)이 있지 않냐고 물어봄 — 확인해보니 맞음. **학력만** 추가: 국가평생교육진흥원 학점은행제(`cb.or.kr`, WebSearch로 확인) 고정 링크 추가, 경력/자격증과 달리 학위 취득은 학기 단위로 걸리는 일이라 캡션 문구도 "정확한 시행기관은 다를 수 있음" 대신 "학위 취득에는 보통 학기 단위의 기간이 걸려요"로 다르게 작성. **전공은 그대로 제외 유지** — 전공을 바꾸는 것은 재입학/편입 수준이라 링크 하나로 해결될 개념이 아니고, 전공무관/관련전공 케이스는 이미 통과 처리되므로 실제 미충족 전공 공고는 애초에 그 학위 자체가 필요한 경우라 외부 사이트가 의미 없다는 논리로 사용자와 합의.

**후속 기능 추가 (2026-07-27, 같은 세션): 북마크 페이지 전용 "필요 사이트 모아보기" 팝업**. 사용자 요청: 북마크한 공고는 이미 관심 있는 공고만 모아둔 것이므로 상세 모달을 열지 않고도 카드에서 바로 참고링크에 접근할 수 있게 강조해달라는 요청. 상세 모달을 새로 만들지 않는다는 완료 기준 취지를 지키기 위해 상세 모달과는 별개로, 그 항목에 미충족+링크가 있는 것만 모아서 보여주는 전용 팝업을 추가. 여러 차례 사용자 피드백을 받아 반복 수정:
- `src/constants/referenceLinks.js`에 `getReferenceCaption(category)`/`collectJobReferenceLinks(checklist)` 추가 — `JobDetailModal`의 캡션 로직도 이걸로 통합해 문구 중복 제거.
- `src/components/result/ReferenceLinksModal.jsx`(신규) — 미충족+링크 있는 항목만 나열, 없으면 "보완이 필요한 항목이 없어요" 안내. 다른 모달보다 크게 보이게 `.reflinks-modal` 클래스로 폭/패딩/폰트 전부 별도로 키움(다른 모달엔 영향 없음).
- 처음엔 `JobCard` 내부(별 아이콘 옆)에 작은 버튼으로 넣었다가, 사용자 피드백("버튼이 안 보인다") 반영해 `BookmarksPage.jsx`에서 `JobCard` 오른쪽에 별도의 큰 버튼(`.reflinks-btn-large`)으로 분리 — 이때는 카드와 버튼이 각자 테두리/그림자를 가진 별개 박스라 "이 공고 전용"이라는 느낌이 안 든다는 피드백을 다시 받음. 최종적으로 `.bookmark-job-row`(카드+버튼을 감싸는 줄) 하나에만 테두리/그림자/hover를 걸고 내부 두 요소는 이어 붙여서(구분선만 `border-left`) 하나의 카드처럼 보이게 병합 — `JobCard.jsx`는 이 과정에서 결국 원래 모습(#25 이전)으로 되돌아갔고, 버튼은 `BookmarksPage.jsx`가 직접 렌더링.
- 버튼 색: 라이트 모드는 공고 카드와 동일한 배경/글자색(`:root[data-theme='light'] .reflinks-btn-large`), 다크 모드는 기존 accent 색상 유지(사용자가 다크모드 디자인은 그대로 두라고 요청).
- 결과 화면(`ResultPage`)에는 이 버튼이 없음 — 북마크 페이지 전용으로 의도적으로 한정.
- 검증: 매 반복마다 FE lint/test 회귀 없음(15/15) 확인, 사용자가 로컬 브라우저에서 최종본 확인 완료("확인했는데 좋아").

**검토 메모 (2026-07-27)**: 원안은 "`detail`에 표시된 요구 시험명 기준으로" 링크를 고르는 방식이었으나, `detail`은 표시용 한글 문장이라 이를 파싱하는 대신 `buildJobDisplay` 단계에서 원본 요구값을 checklist 항목에 함께 실어 보내는 쪽으로 완료 기준을 수정함. 나머지 항목은 코드 확인 결과 그대로 유효.

**추가 기능 (2026-07-27, 같은 세션): 북마크 페이지에도 인사이트 배너 추가**. 사용자 아이디어: 결과 화면처럼 팝업으로 한 번 뜨고 닫으면 사라지는 게 아니라, 북마크 목록 맨 위에 항상 보이는 배너로 "경력을 보완하면 N건 더 지원할 수 있어요!" 같은 안내를 띄우자는 것. 백엔드에 통계 계산이 없던 부분을 채움:
- `server/src/services/gapAnalysisService.js` — `runGapAnalysis`가 인라인으로 하던 통계 계산(total/matched/ratio/improvementRanking)을 `buildStats(jobList)`로 뽑아내서 재사용 가능하게 함(로직 중복 없음).
- `server/src/routes/bookmarks.routes.js`의 `POST /api/bookmarks/evaluate` 응답에 `stats: buildStats(jobList)` 추가 — **북마크한 공고만 대상으로** 계산된 통계(결과 화면의 통계는 필터링된 862건 전체 대상이라 서로 다른 집합).
- `src/components/result/BookmarkInsightBanner.jsx`(신규) — `InsightModal`과 같은 분기(전부 충족/1건 보완/복합 미충족) 로직을 팝업이 아닌 상시 배너로. "북마크 없음" 분기는 다루지 않음(그 경우는 이미 별도 `EmptyState`가 처리).
- `BookmarksPage.jsx`에 `stats` 상태 추가, `CATEGORY_LABELS`로 라벨 매핑(백엔드는 category 키만 내려주므로 `ResultPage.jsx`와 동일한 방식) 후 배너에 전달.
- 검증: 백엔드 59/59(새 assertion 추가), FE lint/test 15/15 회귀 없음. 실제 시드 DB로 `buildStats` 직접 호출해 통계 형태 확인.

**배너 문구/클릭 이동 보완 (2026-07-27, 같은 세션)**: 사용자가 결과 화면 팝업과 문구가 완전히 같아서 "같은 결과를 또 보는 느낌"이라고 피드백. 두 가지 개선:
- 문구를 "~만 채우면 +N건 늘어나요"(결과 화면과 동일)에서 "{항목}부터 먼저 보완하는 걸 추천해요!"로 변경 — "부터"는 조사 활용(을/를, 은/는)과 달리 받침 유무와 무관하게 항상 동일한 형태라 라벨(학력/경력/자격증/면허/전공/외국어 성적)이 뭐든 문법이 깨지지 않음.
- 배너 자체를 클릭하면 그 항목의 참고 사이트로 바로 이동(새 탭) — `hasTip`이고 링크가 있을 때만 `<a>`로 렌더링, 마우스를 올리면 "누르면 신청 사이트로 넘어갈 수 있어요." 툴팁. `src/constants/referenceLinks.js`에 `getTopTipLink(jobList, category)` 추가 — 어학은 통계에 시험 종류 정보가 없어서 북마크한 공고 중 미충족+가장 많이 요구되는 시험 종류를 직접 집계해서 그 시험 사이트로 연결(실제 데이터로 검증: 샘플 10건 중 OPIc 5건 → OPIc 사이트로 정확히 연결). 전공은 애초에 링크가 없어 클릭 불가(정보성 배너로만 표시).

---

## #26 — 로그인/회원가입 이메일 형식 검증 강화 [P2, 버그성 개선]

**설명**: 현재 회원가입·로그인 폼(`LoginPage`/`SignupPage`)은 `<input type="email">`의 브라우저 네이티브 검증에만 의존한다. 이 네이티브 검증은 도메인에 `.`(최상위도메인)을 요구하지 않아 `abc@abc`처럼 실제로는 잘못된 형식도 통과한다. 프론트엔드에 정규식 기반 이메일 형식 검사를 추가해, 명백히 잘못된 형식은 Supabase Auth 호출 전에 걸러낸다.

**완료 기준**
- [ ] 이메일 정규식 검증 추가 (`로컬파트@도메인.최상위도메인` 형태, 예: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`) — `LoginPage`/`SignupPage` 제출 시 클라이언트 단에서 우선 확인
- [ ] 형식이 맞지 않으면 Supabase Auth 호출 자체를 하지 않고, 기존 에러 메시지 영역에 "올바른 이메일 형식이 아닙니다" 안내
- [ ] `student@university.ac.kr`처럼 흔한 정상 형식은 회귀 없이 그대로 통과 (정규식이 너무 빡빡해서 정상 이메일까지 막지 않는지 케이스별 확인)
- [ ] Supabase Auth 자체 검증에만 기대지 않고 클라이언트에서 즉시 피드백 (네트워크 왕복 없이 바로 안내)
- [ ] 기존 로그인/회원가입 정상 케이스, 게스트 플로우 회귀 없음 확인

---

## #27 — 비밀번호 찾기 (재설정 이메일) [확장 기능, #19 연장선]

**설명**: 확장 가능성 슬라이드에서 언급했던 비밀번호 재설정 기능. Supabase Auth의 `resetPasswordForEmail` API로 재설정 이메일을 보내고, 이메일의 링크를 클릭하면 새 비밀번호를 입력하는 페이지로 이어지는 흐름을 추가한다.

**완료 기준**
- [ ] `LoginPage`에 "비밀번호를 잊으셨나요?" 진입점 추가
- [ ] 이메일 입력 → `supabase.auth.resetPasswordForEmail(email, { redirectTo: ... })` 호출 → 발송 완료 안내. 계정 존재 여부와 무관하게 동일한 안내 문구 표시 (가입 여부가 외부에 노출되지 않도록)
- [ ] 재설정 이메일의 링크로 들어오면 Supabase가 세션을 심어주는 리다이렉트 경로(`/reset-password` 등) 신설, 새 비밀번호 입력 폼 제공
- [ ] `supabase.auth.updateUser({ password })`로 실제 비밀번호 변경 처리
- [ ] 변경 완료 후 로그인 페이지로 이동 (또는 자동 로그인 상태로 전환 — 택 1, 구현 전 확정)
- [ ] 기존 로그인 플로우·게스트 플로우 회귀 없음 확인
- [ ] Playwright e2e에 비밀번호 재설정 플로우 테스트 추가 (`e2e/`) — `#19`엔 자동화 테스트 스위트가 없음(당시 사용자 브라우저 확인 + curl로 Supabase 설정만 검증), 새로 추가하는 것이 맞음

**검토 메모 (2026-07-27)**: 원안의 "인증 API 테스트 통과 (`#19` 테스트 스위트에 추가)"는 실제로 존재하지 않는 스위트를 가리키고 있어 "Playwright e2e에 신규 추가"로 정정함. 구현 시 주의사항(문서에는 반영하지 않지만 기록): Supabase 대시보드의 Redirect URLs 허용목록에 `localhost:5173`과 배포 URL(`specfit-six.vercel.app`)이 둘 다 등록돼 있어야 `redirectTo`가 동작하며, `#19` 때의 `mailer_autoconfirm` 사례처럼 대시보드 토글이 조용히 안 저장되는 경우가 있었으니 실제 이메일 발송/링크 클릭으로 직접 검증할 것.

---

## #28 — 어학 성적 데이터 품질 수정 (OPIc 등급화 + TOEFL/TOEIC Speaking 실제 범위) [버그 수정]

**설명**: 사용자가 결과 화면에서 발견 — 어학 시험 4종(TOEIC/TOEFL/OPIc/TOEIC Speaking) 전부 `foreign_lang_score`가 시험 구분 없이 600/650/700/750/800 5단계로 합성돼 있었음. TOEIC(0~990)은 그럭저럭 말이 되지만 TOEFL(0~120)/TOEIC Speaking(0~200)은 범위 밖이고, OPIc은 원래 등급(NL~AL) 체계라 숫자 점수 자체가 성립하지 않음. 원본 합성 스크립트(`synthesize_specs.py`)가 저장소에 없어 재실행 불가 — 시드 시점 재매핑 + 기존 DB 보정으로 처리. 완료 기준:

- [x] `server/src/db/seed.js`에 `normalizeForeignLangScore(test, rawScore)` 추가 — OPIc은 600~800→IM1~AL 등급 문자열로, TOEFL은 80~110로, TOEIC Speaking은 110~170로 재매핑(TOEIC은 그대로). 시드 시점(CSV insert)에 적용
- [x] `fixForeignLangScoresIfNeeded()` 추가, `index.js`에서 서버 시작 시마다 실행 — 이미 옛 값으로 시드된 기존 DB(로컬/배포)도 자동 보정. idempotent(이미 고쳐진 값은 매핑 테이블에 없어 그대로 반환)
- [x] `gapAnalysisService.js`에 `OPIC_RANK`(NL~AL 순서) 추가, `compareForeignLanguage`가 OPIc일 때만 등급 순서로 비교(그 외는 기존 숫자 비교 그대로)
- [x] `gapAnalysisValidation.js` — OPIc이면 `foreign_lang_score`가 `OPIC_RANK`에 있는 등급 문자열인지 검증, 그 외는 기존처럼 0 이상 숫자 검증
- [x] `SpecPage.jsx` — 어학 시험을 OPIc으로 선택하면 숫자 입력 대신 등급 선택 `<select>`로 전환(`OPIC_GRADE_OPTIONS`, 신규). 시험 종류를 바꾸면 이전 점수/등급 값 초기화
- [x] `src/lib/gapAnalysis.js`의 `describeRequirement` — OPIc은 "IM2 등급 이상", 그 외는 "700점 이상"으로 표기 구분(`formatForeignLangScore` 헬퍼)
- [x] 검증: 백엔드 64/64(OPIc 등급 비교 3케이스 + 검증 2케이스 신규), FE lint/test 15/15, e2e 6/6 전부 회귀 없음. 실제 로컬 DB에 마이그레이션 적용 확인(OPIc 5종 전부 문자열 등급으로 저장됨), 실제 서버에 `POST /api/gap-analysis`로 OPIc spec 보내서 등급 비교가 실제로 동작하는 것 확인, SpecPage/JobDetailModal 실제 화면 스크린샷으로 등급 select·문구 확인

**참고**: 프로덕션(Render) DB는 서버가 재시작/재배포될 때 `fixForeignLangScoresIfNeeded()`가 자동으로 실행되므로 별도 수동 작업 없이 다음 배포 때 반영됨.

---

## 의존관계 요약

핵심 트랙: `#15` → `#21` → `#16`(단, "홈 vs 초기화" 검증 항목만 `#21` 이후) · `#17` · `#22` · `#24`는 순서 제약 없이 병행 가능.
확장 트랙: `#19` → `#20` → `#27`(비밀번호 재설정은 로그인 기능이 있어야 의미가 있음). `#18`/`#23`/`#25`/`#26`은 순서 제약 없음.
