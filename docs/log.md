# 작업 로그 (Log)

날짜별로 진행한 작업, 이슈, 다음 할 일을 기록합니다.
2주 이상 지난 기록은 [`docs/log-archive.md`](log-archive.md)로 옮깁니다 — 지금 로그가 그 시기를 다시 참조할 때만 열어보면 되고, 평소엔 안 읽어도 됩니다.

## 템플릿
### YYYY-MM-DD
- 진행한 작업:
- 이슈/막힌 점:
- 다음 할 일:

---

## 프로젝트 마무리 요약 (2026-08-02 작성)

네이버 AI Agent Challenge 4주(2026-07-06 ~ 07-31) 진행분 정리.

### 만든 것
GitHub 활동을 분석해 첫 오픈소스 기여에 맞는 이슈를 추천하는 서비스. GitHub ID 입력 → 프로필 분석(언어 비율·실력 수준) → 선호 조건 선택 → 추천 목록 → 이슈 상세(LLM 요약·기여 가이드)의 7화면 흐름.

- 프론트: React 19 + Vite + TanStack Query, GitHub Pages 배포
- 백엔드: Node.js + Express + Prisma, Supabase(PostgreSQL), Render 배포
- LLM: Google Gemini (`gemini-flash-lite-latest`) — 이슈 분석·추천 재순위

### 숫자
- 커밋 212개 · 업스트림 PR 19건(18 머지 + #2556 오픈)
- 결정 기록 22건([decisions.md](decisions.md))
- 테스트: 백엔드 유닛·통합 6파일(Vitest + Supertest, GitHub은 mock·DB는 실제 Supabase), 프론트 유닛 1파일, E2E 2파일(Playwright)
- 프로젝트 전용 Skill 8개([.claude/skills](../.claude/skills/README.md))

### 설계상 핵심이었던 것
- **추천 3단 구조** — 문턱(레포 건강도, 하드 필터) → 규칙 점수(언어·난이도 정량 매칭) → LLM 재순위(흥미·이슈 명확성). 사실 검증은 규칙이, 정성 판단은 LLM이 맡아 LLM 실패가 서비스 실패로 번지지 않는 폴백이 공짜로 확보됨
- **레포 우선 검색** — 이슈부터 검색하면 레포 품질 조건을 걸 수 없어 유령 레포가 상위에 오는 문제. 첫 기여자에게 중요한 건 이슈 신선도가 아니라 리뷰해 줄 메인테이너의 생존이라 판단해 파이프라인을 뒤집음
- **성공만 캐시하는 폴백** — LLM 실패(null)를 캐시하지 않는 규칙 하나로, 별도 재시도 로직 없이 "다음 조회가 곧 재시도"가 되는 복원력 확보

### 남은 것
- PR #2556 머지 확인
- 2026-07-31(최종 발표일) 로그 내용 — 커밋·PR이 없어 근거 없음
- `preferences.test.js`의 `TODO(human)` 폴백 3케이스
- 프론트 테스트를 CI/배포 게이트에 연결하는 방안 (지금은 수동 실행만)
- cron-job.org 무료 플랜 750시간 한도가 다른 프로젝트와 겹치는지 확인
- 향후 확장 후보: 매니페스트 기반 기술스택 매칭(타당성 검증만 하고 보류), 임베딩 기반 재순위(현 규모에선 불필요로 결론)

---

### 2026-08-02
- 진행한 작업:
  - **fork 재설정** — 업스트림(`connect-AIAgentChallenge-26-1/hub`)이 public으로 전환되며 fork 연결이 끊긴 것을 확인. 기존 `kimsunho2000/hub`는 삭제하지 않고 `hub-old`로 rename해 보존하고, 업스트림을 다시 fork해 `kimsunho2000/hub`를 재생성(parent 링크 정상 확인). `upstream` 원격을 새로 등록
  - fork 마이그레이션 시 브랜치별 대조: `N034_김선호`는 이미 업스트림에 머지된 상태(PR #2443)라 로컬을 fast-forward만으로 맞춤 — 강제 push 불필요. 업스트림에 없는 개인 브랜치 `dev`/`gh-pages`는 새 fork에 없어서 `hub-old`에서 따로 push
  - 저장소 rename이 GitHub Pages URL까지 바꾼 것(`/hub/` → `/hub-old/`)을 발견해 새 fork에서 Pages를 재설정, 데모 링크 복구
  - `AppFlowLayout.jsx`: 상단바 "이력" 링크를 `githubId`가 있을 때만 렌더링하도록 수정. `History.jsx`는 이미 `githubId` 없으면 안내 화면으로 막고 `useQuery`도 `enabled`로 차단하고 있었는데, 진입 링크만 조건 없이 노출돼 있었다. URL 직접 진입은 여전히 가능하므로 화면 쪽 가드는 유지
  - `showcase.json` 정합성 수정 — 스크린샷이 파일은 6장인데 JSON엔 3장만 등록, `agentTools`엔 존재하지 않는 `code-convention` 스킬 기재(컨벤션은 `.claude/rules/`의 경로 기반 규칙이라 Skill이 아님), 실제 있는 `submission-check`는 누락. 즐겨찾기·검색 이력·재추천 다양화가 README·checklist엔 완료인데 `features`에만 빠져 있던 것도 반영
  - `showcase.json` 내용 보강 — `decisions.md`의 결정 기록을 소재로 `techHighlights`를 3개 → 6개(레포 우선 검색 전환, 언어 비율 커밋 가중, 성공만 캐시하는 폴백)로 확장. `problem`에 문턱 필터의 근거(메인테이너 생존)를 추가. 구어체 어미와 대시 공식을 서술체로 통일
  - PR [#2556](https://github.com/connect-AIAgentChallenge-26-1/hub/pull/2556) 생성
  - 노션 Daily Log 정리 — PR 링크 10건(7/10·7/20~7/30)과 완료 체크가 비어 있던 것을 GitHub PR 목록과 대조해 채우고, 본문이 비어 있던 7/27~7/30 4일치를 이 로그 기준으로 작성. 8/2 행 신설
- 이슈/막힌 점:
  - Chrome 자동화 스크린샷이 6회 연속 `Script injection timed out`으로 실패(`javascript_tool`은 정상 동작) — 07-27에도 같은 증상이 있었던 반복 이슈. 누락 화면(분석 중·전체 이력) 캡처는 포기하고 스크린샷 6장 유지
  - `Desktop\네이버 ai 첼린지\screenshots\`의 7장은 7/8자 프로토타입(브랜딩 `First-pr`, 목업 데이터)이라 현재 앱 스크린샷보다 후퇴하는 것으로 판단, 사용하지 않음
- 다음 할 일:
  - PR #2556 머지 확인
  - 7/31(최종 발표일) 로그 내용 확정 — 커밋·PR이 없어 근거가 없음

---

### 2026-07-31
- 진행한 작업:
  - 대회 최종일 (발표 & 데모). 저장소 커밋·PR 없음 — 상세 내용 미확인
- 이슈/막힌 점:
  - (기록 없음)
- 다음 할 일:
  - (대회 종료)

---

### 2026-07-30
- 진행한 작업:
  - 밀려 있던 브랜치 반영: 로컬 `dev`를 `N034_김선호`로 fast-forward(65커밋). `main`은 손대지 않음
  - 열린 이슈 4건(`kimsunho2000/hub#6`·`#8`·`#9`·`#10`) 실제 코드와 대조 후 정리·종료. 미체크로 남아 있던 항목이 대부분 이미 구현돼 있어 구현 위치를 본문에 기입하고 닫음. 유일한 진짜 미구현은 #8의 "403 → 429를 rate limit 헤더로 세분화"인데, 인증 없이 공개 데이터만 읽는 구조라 권한 오류로서의 403이 발생할 경로가 없어 세분화해도 사용자에게 보이는 동작이 같음 → 스코프 아웃으로 기록
  - `POST /api/analysis` 통합테스트 신설 — 이 핵심 엔드포인트에 통합테스트가 없었다(기존 `analysis.test.js`는 GET 계열만 검증). 정상 생성·저장 확인 / 24시간 캐시 히트 시 GitHub 미호출 / 캐시 만료 시 재호출 / 400·404·429 6케이스
  - `isValidRepoFullName`·`isValidIssueNumber` 유닛테스트 추가 — 그동안 `favorites.test.js` 통합테스트를 통한 간접 검증만 있었음
  - `frontend/src/utils/preferences.test.js` 신설 — `buildDefaultPreferences`가 프로필 화면 칩 초기값과 첫 추천 요청 입력을 결정하는데 테스트가 없었음. skillLevel→difficulty 매핑 케이스 작성(폴백 3케이스는 `TODO(human)`으로 남김)
  - **`npm run test:frontend`가 계속 실패 상태였던 것을 발견·수정**: `vite.config.js`에 Vitest `include`가 없어 기본 패턴이 `frontend/e2e/*.spec.js`(Playwright)까지 잡아 무조건 2건 실패했다. `include: ['src/**/*.test.{js,jsx}']`로 좁힘. 배포 게이트(`render.yaml`)가 백엔드 `npm test`만 걸어서 아무 자동화 경로도 이 명령을 실행하지 않아 그동안 드러나지 않았음
  - `security-review`로 백엔드 전체 보안 감사 — 신뢰도 8/10 이상 발견 0건. 검색 qualifier 인젝션(`LANGUAGE_PATTERN` + sink에서 재차 따옴표 제거), GraphQL 별칭 인젝션(`JSON.stringify` 인코딩), 원시 SQL 부재, 경로 탐색(Octokit 파라미터 바인딩), 시크릿 로깅(SHA-256 12자 절단만 기록), CORS·에러 응답 전부 클린 확인
  - (저녁) 백엔드 통합테스트 타임아웃을 15초로 상향 — Render 빌드가 테스트 단계에서 실패하고 있었다. 실제 Supabase에 붙는 통합테스트라 로컬보다 네트워크 지연이 커서 기본 타임아웃(5초)을 넘긴 것
- 이슈/막힌 점:
  - `POST /api/analysis` 캐시 테스트가 처음 실패 — `upsert`의 `update` 분기에 `analyzedAt`만 넣어서 앞 테스트가 남긴 행의 `languages`가 그대로 남았다. 실제 Supabase를 쓰는 테스트 정책의 대가라, `create`/`update` 양쪽을 같은 값으로 채워 픽스처를 고정
- 다음 할 일:
  - cron-job.org 무료 플랜 월 750시간 한도 — 다른 프로젝트와 Render 무료 가동시간 겹치는지 확인 필요 (07-28에서 이월, 외부 서비스 확인 작업)
  - `preferences.test.js`의 `TODO(human)` 폴백 3케이스 채우기
  - 프론트 테스트를 배포 게이트나 CI에 어떻게 연결할지 검토 — 지금은 수동 실행 외에 아무도 돌리지 않음

---

### 2026-07-29
- 진행한 작업:
  - 대회 제출용 `showcase/showcase.json`에 `demoVideoUrl`(구글 드라이브 시연 영상) 필드 추가
  - 데모 URL을 `https://kimsunho2000.github.io/hub/#/`로 통일 — 해시 라우터를 쓰는데 해시 없는 URL을 안내하고 있었다. README·`docs/checklist.md`·`showcase.json` 세 곳이 서로 다른 형태였던 것도 함께 맞춤
  - `pr-draft` 스킬 개정: (1) 커밋 범위 기준을 `dev..HEAD` → "마지막 머지된 PR 이후"로 변경. 로컬 `dev`가 뒤처져 있으면 이미 올린 옛 커밋까지 초안에 딸려오던 문제. (2) 산출물을 `gh pr create` 명령어 대신 웹 UI에 붙여넣을 제목/본문 텍스트로 변경. (3) 라벨은 `gh label list`로 실제 존재하는 것만 후보로 제시
- 이슈/막힌 점:
  - (해당 없음)
- 다음 할 일:
  - `submission-check` 스킬로 제출 전 최종 점검 (07-28에서 이월)

---

### 2026-07-28
- 진행한 작업:
  - Week3 잔여 2건 마감: `[BE] rate limit/엣지케이스 대응`, `[FE/BE] 버그 디버깅 + 필터/재조회 마감`
  - `analysisService.js`의 `getAnalysis`: 7일 경과 재분석 시도 중 GitHub 429(RATE_LIMITED)를 만나면 기존 stale 분석으로 폴백하도록 수정(그 외 에러는 그대로 전파) — 재분석 실패로 이미 있던 데이터까지 못 보는 문제 해결
  - 빈 추천 결과(`items:[]`)·429 그대로 응답은 코드 검토 결과 이미 정상 동작 중이라 변경 없이 통합테스트로 고정
  - 신규 `backend/tests/integration/analysis.test.js`(stale+429 폴백/500 전파/404/7일 이내 캐시), `backend/tests/integration/recommendations.test.js` 보강(429 전파, 빈 후보 200 응답)
  - 조건 변경 재추천은 코드 추적 결과 이미 정상 동작(`normalizePreferences`가 조건별로 다른 키를 써서 하루 상한과 무관) — 신규 버그 없음, `frontend/e2e/change-preferences.spec.js` 회귀 테스트만 추가
  - filterbar(전체/언어/난이도/토픽 배지)는 `docs/plan.md` §7 "향후 확장"에 명시된 표시 전용 설계임을 확인, 클릭 UI 추가는 스코프 밖으로 판단
  - 렌더 백엔드 슬립 방지: 저장소 변경 없이 cron-job.org에 `https://firstpr-backend.onrender.com/health` 10분 주기 핑 등록(외부 서비스 설정, 코드/CI 변경 없음). 이후 cron-job.org가 "응답이 너무 크다"고 오탐하는 걸 확인 — 실제 응답은 15바이트라 코드 문제 아님, cron-job.org 자체의 알려진 버그(64KB 제한 오판)로 확인. HEAD 메서드로 우회 가능하다고 안내만 하고 코드는 변경 안 함
  - README 전면 개정: 라이브 데모 링크, 백엔드 실행법·환경변수, 테스트 명령어 추가. `showcase/screenshots/`의 랜딩·결과·상세 3장을 표로 삽입(showcase.json이 이미 골라둔 대표 3장과 동일하게 맞춤)
  - `docs/log.md` 아카이빙 체계 도입: 2주 이상 지난 기록(2026-07-13~07-16)을 `docs/log-archive.md`로 이전, `log.md`엔 포인터 한 줄만 남김 — 계속 불어나는 로그를 읽을 때마다 전부 로드하는 토큰 비용을 줄이기 위함
  - `submission-check` 스킬 신설(`.claude/skills/submission-check/`) — 대회 제출/데모 직전 라이브 URL·문서 정합성(README/showcase.json/checklist.md)·테스트·커밋 상태를 한 번에 점검하는 절차. `CLAUDE.md`·스킬 인덱스에 연결
- 이슈/막힌 점:
  - (해당 없음)
- 다음 할 일:
  - Week3 항목 전부 마감 — `submission-check` 스킬로 제출 전 최종 점검 실행
  - cron-job.org 무료 플랜 월 750시간 한도 — 다른 프로젝트와 Render 무료 가동시간 겹치는지 확인 필요
  - 오늘 변경분(analysisService 폴백/테스트/README/log 아카이빙/submission-check 스킬) 커밋 + dev→main 반영

---

### 2026-07-27
> 당시 로그가 누락돼 2026-08-02에 PR [#2051](https://github.com/connect-AIAgentChallenge-26-1/hub/pull/2051)·`checklist.md`·커밋 기록을 근거로 재구성했습니다. 세부 사항은 실제 진행과 다를 수 있습니다.

- 진행한 작업:
  - Week3에서 이월된 배포·E2E 항목을 한번에 마감
  - **재추천 다양화** — 같은 조건으로 다시 요청하면 매번 같은 목록이 나오던 문제 해결. 매칭 점수를 1순위로 두고 동점일 때만 안 본 이슈를 우선하는 `compareForDiversification` 방식(점수를 직접 깎지 않은 이유는 추천 품질 자체를 떨어뜨리지 않기 위해서). 하루(UTC) 동일 조건 3회 상한 도달 시 에러 대신 캐시된 결과 반환
  - **즐겨찾기 + 전체 검색 이력** — 로드맵 항목이었으나 조기 착수. `Favorite` 모델 추가, `GET /api/recommendations` 이력 조회, `/history` 화면(언어 필터·최신순/점수순 정렬·페이지네이션). 필터는 언어 하나만 남김 — 주제까지 더하니 복잡하다는 피드백 반영
  - **배포** — 백엔드 Render, 프론트 GitHub Pages. 프론트는 해시 라우터를 써서 `/hub/` 하위 경로 배포에 대응
  - E2E 테스트(Playwright) 도입
  - 코드리뷰 반영: 즐겨찾기 해제로 목록이 줄면 `totalPages`도 줄어드는데 `page` state가 그대로 남아 존재하지 않는 페이지를 가리키던 문제(빈 화면 + 못 돌아옴) 수정 — 렌더 도중 `setState` 대신 파생값(`safePage`) 계산으로 처리. `IssueCard`가 즐겨찾기 토글 함수를 `await` 없이 호출해 실패가 unhandled rejection으로 묻히던 것도 함께 수정
  - (저녁) `analysisService` 캐시 stale 폴백, README 전면 개정, `log.md` 아카이빙 체계 도입, `submission-check` 스킬 신설 — 상세는 07-28 항목 참고
- 이슈/막힌 점:
  - (기록 없음)
- 다음 할 일:
  - (07-28로 이어짐)

---

### 2026-07-24
- 진행한 작업:
  - 코드 컨벤션을 `.claude/skills/code-convention` 스킬에서 `.claude/rules/frontend-convention.md`·`.claude/rules/backend-convention.md`로 이전(경로별 `paths` frontmatter로 자동 로드), 관련 스킬(`security-convention`/`backend-testing`)·`CLAUDE.md`·`.claude/skills/README.md` 참조 갱신
  - `docs/architecture.md` 문서 마감: 비어있던 "프론트엔드"(폴더 구조·라우팅·상태 관리)·"백엔드"(레이어 구조·Prisma 모델 6개) 섹션 채움, "인프라/배포"는 배포를 다음 주로 미뤄 스텁만 남김 → `docs/checklist.md` W3 architecture.md 항목 체크
- 이슈/막힌 점:
  - (해당 없음)
- 다음 할 일:
  - 발표 준비
  - 배포·E2E 통합테스트·rate limit 엣지케이스 대응은 다음 주로 이월

---

### 2026-07-23
- 진행한 작업:
  - `validators.js`로 `isValidPreferences` 이전 + 프론트엔드 vitest 도입(`formatStars` 유닛테스트) — TDD로 선행
  - #6 이슈 상세 LLM 분석: 목록 생성 시점엔 캐시된 값만 병합(LLM 미호출)하고, 상세 화면 진입 시 해당 이슈 1건만 지연 분석 후 `IssueCache`에 영구 저장(`GET /api/recommendations/:id`에 선택적 쿼리 파라미터 `repoFullName`/`issueNumber` 추가 — 새 엔드포인트 대신 기존 계약 유지)
  - LLM 재순위(3단 구조 ③) 설계·구현: 목록의 10건 전체를 대상으로 병렬 호출 10회 → 분당 rate limit 초과가 실측돼 배치 호출 1회로 재설계(부분 실패 허용 `isValidBatchRerankResult`는 이슈 분석의 폴백 철학 재사용)
  - 모델을 `gemini-2.0-flash-lite` → `gemini-flash-lite-latest`로 교체(신규 키에서 실제 200 확인 후 경량 티어 선택)
  - 상세 화면(`Detail.jsx`)에 이슈 LLM 분석 결과 연동
  - Week4 "재추천 다양화" 스텁 항목 추가, 대회 제출용 `showcase.json`+스크린샷 추가
- 이슈/막힌 점:
  - 이슈별 병렬 LLM 호출(10회)이 분당 rate limit을 실측으로 초과 → 배치 1회 호출로 재설계해 해결
- 다음 할 일:
  - (금) #10: E2E·배포·문서 마감 — 발표 준비 우선으로 배포/E2E는 다음 주 이월, 문서 마감(architecture.md)만 진행
  - 재추천 다양화 세부 설계(중복 제외 저장 위치, 상한 카운트 단위)

---

### 2026-07-22
- 진행한 작업:
  - #9 착수: 프로필 화면의 언어/난이도/관심분야 칩을 정적 표시에서 실제 `useState` 토글로 전환 (`AppFlowLayout`에 `preferences` 공유 상태 추가, 백엔드 languages 최소 1개 제약에 맞춰 마지막 언어는 해제 불가하게 가드)
  - #9 이어서: 추천 API mock 제거 — `axios` + `@tanstack/react-query` 도입, `createRecommendation`/`getRecommendation`을 실제 `POST /api/recommendations`/`GET /api/recommendations/:id` 호출로 교체, `Analyze`/`IssueSearch`를 수동 `useEffect`+`cancelled` 패턴에서 `useMutation`으로 정리, 안 쓰는 `src/mocks/*.json` 4개 삭제
  - 코드리뷰 성격 후속조치: `IssueSearch`에서 `preferences` 미선택 시 `buildDefaultPreferences`가 매 렌더 새 객체를 반환해 `useEffect` 의존성이 매번 바뀌던 잠재 버그를 `useMemo`로 수정
  - 아키텍처 다이어그램 작성: `docs/architecture.md` 전체 구조·데이터 흐름 섹션에 화면 7개·API 경로 4개·서비스·GitHub·DB 연결 mermaid 다이어그램 기록
- 이슈/막힌 점:
  - Chrome 브라우저 자동화 도구가 스크린샷/페이지 읽기에서 계속 타임아웃 나서 실제 클릭 테스트는 사용자가 직접 확인 (`api-smoke-test`/lint/build로 대체 검증)
- 다음 할 일:
  - origin **N034_김선호**로 push (main 아님 — 대회 운영 브랜치라 직접 push 금지)
  - W2 잔여: 프로토타입 스타일 → design.md 토큰 이식
  - (목) #6: LLM 이슈 분석 + 추천 재순위

---

### 2026-07-21
- 진행한 작업:
  - #8 마감(화 파트): `GET /api/recommendations/:id` 상세 조회 구현 — uuid 형식 검증(400) → 조회(200) → 없으면 404 RECOMMENDATION_NOT_FOUND, analysisService의 404 패턴 재사용
  - 코드리뷰 지적사항 반영: preferences languages/topics 배열 길이 상한 검증, `fetchReposWithIssues`에 `owner/name` 형식 아닌 fullName 필터 추가(GraphQL 별칭 쿼리 파손 방지)
  - 점수 로직 다듬기: 스타 가점을 tier→로그 스케일로 전환(동점 뭉침 완화), skillLevel↔난이도 정합 가점 추가(decisions.md "추천 기준 3단 구조" ②), medium 난이도는 help wanted 이슈 수로 가점(GraphQL에 helpWantedIssues 필드 추가), 관심 주제 유사어(ml/ai/web 등) 매칭 확장
  - `api-smoke-test`로 실서버 검증: POST 생성 → GET 200, 없는 id GET 404, 잘못된 형식 GET 400, languages 길이 초과 POST 400 — 전부 확인 후 스모크용 레코드 삭제
  - (부가) 새 라우트/컨트롤러 작성 시 예외 처리·입력 검증·배포 보안 설정을 다루는 `security-convention` 스킬과 `docs/security.md` 신설 — 기존 코드(analysisService의 404 패턴, recommendationController의 화이트리스트 검증, githubService의 qualifier 이중 방어 등)를 근거로 정리, `docs/security-convention` 브랜치에 커밋
  - (부가) 백엔드 유닛/통합테스트 프레임워크 도입 — Vitest+Supertest, `backend/tests/unit`(validators·recommendationService 순수 함수, `judgeDifficulty`/`scoreItem`은 테스트를 위해 export만 추가)·`backend/tests/integration`(추천 API, GitHub는 mock·DB는 실제 Supabase 연결) 19개 테스트 작성. `docs/testing.md` + `backend-testing` 스킬로 컨벤션 정리(유닛/통합 구분 기준, api-smoke-test와의 역할 분리), `test/backend-vitest-setup` 브랜치에 커밋
  - 코드리뷰 후속조치: `TOPIC_PATTERN`이 ASCII만 허용해 한글 토픽 입력이 400으로 막히던 버그 수정(유니코드 허용), 통합테스트가 `beforeAll`에서 잔여 데이터를 선정리하도록 보강 → 테스트 20개로 증가
  - `explain-work` 스킬 신설 — 작업 설명을 기능 단위 뭘/왜/어떻게/더 나은 방법으로 답하도록
  - #6(LLM 이슈 분석) 착수 전 설계: LLM 실패 시 폴백 정책 결정(캐시는 성공 결과만 저장·TTL 없음·캐시 없고 실패 시 에러 페이지 대신 null+200) — decisions.md 기록. `IssueCache`에 `issueSummary`/`requiredSkills`/`guide`/`analyzedAt` 컬럼 선반영(전부 nullable, requiredSkills/guide는 Analysis와 같은 방식으로 Json 사용 — Prisma postgresql list는 nullable 불가라 null(미생성)과 빈 배열을 구분하기 위함)
- 이슈/막힌 점:
  - (해당 없음)
- 다음 할 일:
  - `dev` → `main` 푸시 (하루 1회 규칙 — #8 반영분은 이미 푸시, 테스트 프레임워크분은 `dev`까지만 반영된 상태)
  - (수) #9: FE 선호 조건 선택 화면 + mock→실제 API 교체

---

### 2026-07-20
- 진행한 작업:
  - W3 주간 계획 수립 → GitHub 이슈 등록: #8(추천 API, 월~화) · #9(FE 선호조건+실제 API 교체, 수) · #10(E2E·배포·문서 마감, 금), #6(LLM 분석)은 목요일로 일정 코멘트
  - #5 close 처리 (07/16 마감 완료분)
  - 체크리스트 정리: W1 라우팅 셋업·랜딩 화면 항목 완료 체크 (7/14 mock 연결 때 이미 구현됐던 것 반영)
  - dev → N034 반영 상태 확인 — 금요일분 이미 푸시 완료였음
  - #8 구현(`feat/be-recommendations-api`, 커밋 17개): 이슈 우선 검색이 유령 레포를 상위 노출하는 문제를 발견해 레포 우선 검색(stars/pushed/good-first-issues qualifier)으로 전환 → 레포·이슈 GraphQL 일괄 조회 → 규칙 기반 점수(문턱→점수→인터리브 3단 구조 결정, decisions.md 기록) → `POST /api/recommendations` 라우트 연결까지 완료. 실서버로 정상/빈결과/404/400 케이스 검증, DB 저장 확인
  - 코드리뷰 2회 진행 후 반영: 언어 qualifier 인젝션 방어, 다언어 라운드로빈+동점 언어 인터리브(position 컬럼 추가), hard 난이도를 "라벨 없음"에서 "enhancement 이슈"로 재정의(decisions.md 기록), 언어·토픽 매칭 대소문자 정규화, 미사용 searchIssues 제거, rate limit 판정 우선순위 수정
- 이슈/막힌 점:
  - 이슈 번호가 #7이 아닌 #8부터 배정됨(#7 선점) → 이슈 간 의존 참조 번호 수정
  - 이슈 검색 단독으로는 레포 품질(스타·활동성) qualifier가 없어 사후 필터가 후보를 고갈시킴 → 레포 우선 검색으로 파이프라인 자체를 뒤집어 해결
  - 동점 tie-break를 스타 수로만 하니 스타 인플레 큰 생태계(TS)가 동점 상위를 독식 → 언어 인터리브로 보완
- 다음 할 일:
  - (화) #8 마감: `GET /api/recommendations/:id` 상세 조회, skillLevel↔난이도 정합 가점, 남은 점수 다듬기(스타 로그 가점·토픽 유사어 등), preferences 입력 상한 검증
  - (화) dev 머지는 #8 마감 후
  - (목) #6 확장 범위 확정됨: LLM 이슈 분석 가이드 + 추천 재순위(프로필 컨텍스트 기반 개인화, 이슈 명확성 판단)

2026-07-16 이전 기록은 [`docs/log-archive.md`](log-archive.md) 참고.
