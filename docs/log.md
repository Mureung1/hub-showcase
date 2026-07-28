# 작업 로그 (Log)

날짜별로 진행한 작업, 이슈, 다음 할 일을 기록합니다.
2주 이상 지난 기록은 [`docs/log-archive.md`](log-archive.md)로 옮깁니다 — 지금 로그가 그 시기를 다시 참조할 때만 열어보면 되고, 평소엔 안 읽어도 됩니다.

## 템플릿
### YYYY-MM-DD
- 진행한 작업:
- 이슈/막힌 점:
- 다음 할 일:

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
