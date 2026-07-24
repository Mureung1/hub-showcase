# 작업 로그 (Log)

날짜별로 진행한 작업, 이슈, 다음 할 일을 기록합니다.

## 템플릿
### YYYY-MM-DD
- 진행한 작업:
- 이슈/막힌 점:
- 다음 할 일:

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

### 2026-07-16
- 진행한 작업:
  - 이슈 #5 마감: Analysis 24시간 캐시(대소문자 무시 조회 + 정식 login 키로 upsert, DB 장애 시 무캐시 폴백) + `GET /api/analysis/:githubId`(이력 없음 404) + ApiUsage 일별 집계(토큰은 SHA-256 해시 키, GitHub 호출 성공/실패 무관 finally 집계)
  - analyses 테이블에 `recent_repos`·`contribution_history` 컬럼 추가 마이그레이션 — 캐시 응답이 명세(Analysis 스키마)와 동일해지도록
  - GET 조회에 7일 경과 시 재분석 적용 — 배치 삭제 대신 조회 시점 검사 ([decisions.md](decisions.md) 기록, openapi.yaml 갱신)
  - 검증: 캐시 적중 1.7s→0.09s, 대소문자 다른 요청 동일 캐시, 8일 경과 GET 재분석 후 갱신본 반환, api_usage는 실제 GitHub 호출만 정확히 집계
  - 2주차 발표 슬라이드 12장 제작(토스 스타일, 비개발자 대상) — 아키텍처·API 5개·호출 흐름·응답 필드·DB 6테이블 포함
- 이슈/막힌 점:
  - 캐시 구현 중 스키마에 recentRepos/contributionHistory 컬럼이 없어 캐시 응답이 명세와 달라질 뻔 — 마이그레이션으로 선행 해결
  - 어제 로그에 #5 마감일이 목/금으로 엇갈리게 적혀 있었음 — 목요일 기준으로 정리
- 다음 할 일:
  - (금) 주간 Task 정리 + 노션 보드 정리, dev → main(원격 N034) 푸시
  - (W3) 이슈 #6: 이슈 추천 + LLM 분석 — 제공자 선정부터

### 2026-07-15
- 진행한 작업:
  - 이슈 #5 대부분 완료 (캐시·ApiUsage만 금요일분으로 남음): GitHub GraphQL 클라이언트(`config/github.js`) → `githubService`(쿼리 1개로 언어·활동·레포 수집, 404/429 매핑) → `analysisService`(언어 비율·skillLevel·활동 요약) → `POST /api/analysis` 라우트 연결
  - FE 분석 흐름 실제 API 연동: `createAnalysis` fetch 교체, 분석 실패 화면 추가 (추천 목록·상세는 mock 유지)
  - 언어 비율 로직 교체: 레포 바이트 → **최근 12개월 커밋 수 가중** ([decisions.md](decisions.md) 기록). 본인 계정 Swift 43% → Java 47%로 체감 일치, 조직 레포 누락 해소
  - 프로필 레포 표시 신설: `recentRepos`(1년·소속 조직 포함·커밋 수) / `contributionHistory`(평생·외부만·스타순) 분리 ([decisions.md](decisions.md) 기록). kakao/actionbase ⭐222가 기여 이력 1위로 노출
  - 로고 교체: 파란 PR 심볼 (파비콘 + 랜딩 로고 마크), OSS 기여 뱃지/추천 가중치 아이디어는 이슈 #5 코멘트로 기록
- 이슈/막힌 점:
  - `.env`는 `node --watch`가 감지 못 함 → 토큰 추가 후 서버 재시작 필요했음
  - 백그라운드로 띄운 테스트 서버의 자식 프로세스가 살아남아 3000 포트를 점유 → 재시작해도 옛 프로세스가 응답하던 문제 (taskkill /T로 해결)
  - Chrome이 SVG 파비콘 렌더 실패(지구본) → PNG로 교체. 파비콘 링크는 Vite base(`/hub/`) 때문에 상대경로 필수
  - GraphQL `orderBy: STARGAZERS`가 정렬 미보장 → 코드에서 직접 정렬. `organizations` 조회는 read:org 스코프 필요(토큰 스코프 업데이트)
- 다음 할 일:
  - (목) 이슈 #5 마감: Analysis 캐시(24h) + ApiUsage 기록 + 에러/유효성 마무리
  - (목) 노션 태스크 보드 동기화
  - dev → main 푸시는 내일 아침 확인 후

### 2026-07-14
- 진행한 작업:
  - 이슈 #3 완료: FE mock 데이터 연결 — `src/mocks/` 4종(빈 분석 포함), `src/api/` 데이터 레이어(W3 교체 지점), 7화면 하드코딩 제거 + Outlet context 상태 공유, 분석중/이슈검색 자동 전환, 프로필 빈 상태 UI
  - 이슈 #4 완료: Supabase 연결 + Prisma 스키마 — 테이블 6개 마이그레이션 적용, Client 싱글턴(`src/config/prisma.js`), 부팅 시 연결 성공 로그 (DB 없어도 서버는 부팅)
  - LLM 이슈 분석 기능 결정: 경량 LLM API(제공자 W3 확정) + 지연 생성 + `issue_cache` 캐싱 ([decisions.md](decisions.md) 기록, openapi.yaml에 옵셔널 필드 추가, 이슈 #6 등록)
- 이슈/막힌 점:
  - Prisma 7이 스키마 내 `url = env(...)` 를 금지(driver adapter 필수)해서 표준 워크플로가 유지되는 Prisma 6으로 고정
  - `.env`의 DATABASE_URL 구분자 실수(`:`) 확인 과정에서 DB 비밀번호가 터미널에 노출 → Supabase 비밀번호 리셋 필요
- 다음 할 일:
  - Supabase DB 비밀번호 리셋 + `backend/.env` 갱신
  - (수~금) 이슈 #5: 프로필 분석 API (`POST /api/analysis`) — GitHub 토큰 발급부터
  - (W3) 이슈 #6: LLM 이슈 분석 — 제공자 선정부터

### 2026-07-13
- 진행한 작업:
  - 주간 계획 수립 → GitHub 이슈 #1~#5 등록 (날짜별, 토·일 제외)
  - DB 전환 결정: MongoDB → Supabase(PostgreSQL) + Prisma ([decisions.md](decisions.md) 기록). Spring Boot 검토 후 Node.js 유지 결정도 기록
  - 이슈 #1 완료: API 명세 4개 확정 — [openapi.yaml](openapi.yaml) 작성(공통 에러 형식, 활동 없는 사용자 200 빈 분석), [architecture.md](architecture.md) 요약표
  - 이슈 #2 완료: Express 스캐폴딩 — `server/` 독립 패키지, 레이어드 구조, `/health`, 404·500 공통 에러 핸들러, winston 로거, `/api-docs` Swagger 서빙(파일 부재 폴백)
  - 노션 태스크 보드 동기화 (FE 완료분 9개 체크, 스택 변경 반영)
  - 디렉토리 구조 개편: `frontend/` / `backend/` 독립 패키지로 분리, 루트 `package.json` 프록시 스크립트 구성 (`npm run dev`, `dev:backend` 등)
  - README에 GitHub 이슈 트래커 링크 추가
  - 업스트림 PR 제출 (API 명세 확정 + Express 스캐폴딩 + frontend/backend 구조 분리)
- 이슈/막힌 점:
  - main은 대회 운영진(crong) 관리 브랜치 → 직접 푸시 금지, 원격 반영은 `N034_김선호` 브랜치로 확정
  - 원격 N034 브랜치에 auto-merge 봇 커밋이 쌓여 있어 pull 머지 후 푸시 필요했음
- 다음 할 일:
  - (화) 이슈 #3: FE mock 데이터 연결 — openapi.yaml example에서 mock JSON 생성, 빈 분석 mock 포함
  - (화) 이슈 #4: Supabase 프로젝트 생성 + Prisma 스키마 6테이블 (`prisma migrate dev`)
  - (수~금) 이슈 #5: 프로필 분석 API — GitHub 토큰 발급부터
