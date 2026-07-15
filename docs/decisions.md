# 결정 기록 (Decisions)

기술/기획상의 주요 선택과 그 이유를 기록합니다.

## 템플릿
### [결정 제목]
- 날짜:
- 배경/문제:
- 선택한 방안:
- 고려했던 대안:
- 이유:

---

## 기록

### GitHub API 클라이언트: @octokit/rest + @octokit/graphql (용도별 분담)
- 날짜: 2026-07-09
- 배경/문제: 프로필 분석·레포/이슈 조회에 GitHub API를 호출해야 함. 비인증 60회/시간 제한, 페이지네이션, rate limit 헤더 처리가 필요. GitHub는 REST와 GraphQL을 모두 제공하며, 작업 성격에 따라 유불리가 다름.
- 선택한 방안: 공식 클라이언트 계열을 용도별로 나눠 사용.
  - **프로필 분석 → GraphQL (`@octokit/graphql`)**: 레포 목록 + 언어 비율 + 커밋/PR 이력을 한 쿼리로 조회해 REST의 N+1 호출을 회피.
  - **이슈 검색 → REST (`@octokit/rest`의 `/search/issues`)**: 라벨·언어 필터 검색이 단순하고 직관적.
  - 우리 서버가 프론트에 노출하는 API는 REST로만 제공하고, GitHub의 GraphQL 호출은 백엔드 내부 구현으로 감춘다(우리 쪽 GraphQL 서버는 만들지 않음).
- 고려했던 대안: `axios`로 직접 호출 (KNU_Capstone_Backend에서 사용해 익숙) / REST만으로 프로필 분석까지 처리.
- 이유: 인증·페이지네이션·rate limit 처리가 내장돼 보일러플레이트가 줄고, GitHub 전용이라 유지보수가 편함. 프로필 분석은 중첩·집계 데이터라 GraphQL이 호출 수·전송량 모두 유리하고, 검색은 REST가 간단해 각각의 강점을 취함.

### 프론트 데이터 페칭에 TanStack Query 사용
- 날짜: 2026-07-09
- 배경/문제: 프로필 분석은 시간이 걸려 로딩 상태 표시가 필요하고(plan 화면 4 "분석 중"), 추천 결과 재조회/필터링도 요구됨(화면 5).
- 선택한 방안: `TanStack Query`(React Query)로 서버 상태·캐싱·로딩/에러 관리.
- 고려했던 대안: `axios` + `useState`로 직접 상태 관리.
- 이유: 로딩·캐싱·재조회를 라이브러리가 처리해 화면 4·5 요구를 적은 코드로 충족. 의존성 1개 추가 대비 이득이 큼. HTTP 자체는 axios로 호출.

### DB(MongoDB) 저장 범위: 분석·추천까지 저장
- 날짜: 2026-07-09
- 배경/문제: GitHub API rate limit 대응과 재조회/필터링 지원을 위해 어디까지 영속화할지 결정 필요. 단, 공개 GitHub 정보만 사용하고 별도 개인정보는 수집하지 않음(plan §6).
- 선택한 방안: 프로필 분석 결과와 추천 결과까지 저장. 컬렉션 설계는 아래 참조.
- 고려했던 대안: (a) 캐시 최소(레포/이슈 캐시 + API 사용량만, 분석·추천은 stateless로 매번 계산) (b) 북마크·기여 이력까지 포함한 풀 스키마.
- 이유: (a)는 재조회가 느리고 API를 더 소모, (b)는 MVP 범위를 넘음. 분석·추천 저장이 plan의 MVP 기능(재조회/필터링)과 정확히 일치하며 rate limit 방어에도 유리. 북마크·이력은 향후 확장으로 미룸.

#### DB 컬렉션 설계 (초안)
> 상세 스키마·인덱스는 백엔드 착수 시 [architecture.md](architecture.md)에 확정. 여기서는 저장 범위 결정에 따른 컬렉션 윤곽만 기록.

- **Analysis** — 프로필 분석 결과 캐시
  - `githubId`(unique index), `languages[]`, `skillLevel`, `activitySummary`(커밋/PR 수, 기여 레포 등), `analyzedAt`
- **RepoCache** — 레포 메타 캐시(rate limit 대응)
  - `fullName`(owner/repo, unique index), `description`, `primaryLanguage`, `languages[]`, `stars`, `topics[]`, `goodFirstIssueCount`, `fetchedAt`
- **IssueCache** — 이슈 메타 캐시
  - `repoFullName` + `number`(복합 index), `title`, `labels[]`, `difficulty`, `url`, `state`, `fetchedAt`
- **Recommendation** — 추천 결과(재조회/필터링용)
  - `githubId`, 선호조건 스냅샷(`languages[]`, `difficulty`, `topics[]`), `items[]`(`repoFullName`, `issueNumber`, `matchScore`, `reason`), `createdAt`
- **ApiUsage** — GitHub 토큰 rate limit 추적 (KNU 패턴 재사용)
  - 토큰/날짜 키, `count`

공통: 캐시 컬렉션은 `fetchedAt` 기준 만료 처리(TTL 또는 조회 시 갱신), 스키마에 `timestamps: true`.

### DB 전환: MongoDB → Supabase(PostgreSQL) + Prisma
- 날짜: 2026-07-13
- 배경/문제: 백엔드 착수 직전, MongoDB 결정(2026-07-09)을 재검토. 저장 데이터가 캐시·스냅샷 성격이라 문서 DB 우위로 판단했으나, 그 근거가 결정적인지 다시 확인 필요.
- 선택한 방안: Supabase 무료 티어(PostgreSQL) + Prisma ORM. 기존 컬렉션 윤곽은 테이블로 매핑(`analyses`, `repo_cache`, `issue_cache`, `recommendations` + `recommendation_items` FK 분리, `api_usage`). 배열은 `text[]`, 요약·스냅샷은 `JSONB`.
- 고려했던 대안: (a) MongoDB Atlas 유지(기존 결정) (b) 기존에 사용 중인 Atlas 클러스터에 DB만 분리해 공용 사용.
- 이유:
  - Mongo의 우위였던 "배열·중첩 데이터"는 Postgres의 네이티브 배열·JSONB로 충분히 커버 — 결정타가 아니었음.
  - 향후 확장(북마크, 기여 이력, 활동 기반 스코어링)은 관계·집계 중심이라 SQL이 유리. "관계 복잡해지면 전환" 예정이었다면 코드 착수 전인 지금이 전환 비용 0인 시점.
  - `Recommendation.items[]` 임베딩을 FK 분리로 바꾸면 추천-레포/이슈 관계가 스키마로 명시됨.
  - 국내 백엔드 취업 시장이 RDB 중심이라 포트폴리오 통용 범위가 넓음.
- 주의: Supabase 무료 티어는 1주 비활성 시 프로젝트 일시정지 → 데모 시연 전 상태 확인 또는 주기적 ping 필요. 캐시 만료는 TTL 인덱스 대신 조회 시 `fetched_at` 검사로 처리.

### 이슈 분석 기능: 경량 LLM API 도입 — 지연 생성 + 캐싱
- 날짜: 2026-07-14
- 배경/문제: 추천 상세 화면의 "기여 시작 가이드"가 이슈와 무관한 고정 문구뿐. 이슈 본문·코멘트를 분석해 요약/필요 기술/시작 가이드를 제공해 "초보자가 이슈를 보고 겁먹지 않게" 하는 핵심 가치를 채우고 싶음.
- 선택한 방안: 경량(저비용) LLM API로 이슈 분석. **제공자/모델은 구현 착수 시(W3) 확정** — 각 제공자의 경량 티어 기준 이슈 1건당 $0.01 미만이라 어느 쪽이든 비용은 무시 가능. JSON 스키마 보장 기능(structured outputs/JSON 모드)이 있는 제공자를 우선한다: 응답 `{issueSummary, requiredSkills, guide[]}` 파싱 안정성 확보.
  - **지연 생성(lazy)**: 추천 목록 생성 시가 아니라 사용자가 상세 화면에 진입한 이슈만 그 시점에 분석 — 안 열어본 이슈엔 비용 0, 추천 API 응답 속도 유지.
  - **캐싱**: 분석 결과를 `issue_cache`에 저장해 같은 이슈는 재분석하지 않음.
- 고려했던 대안: 규칙 기반 분석(본문 길이·코드블록·라벨 등 휴리스틱) — 비용 0이지만 요약 품질이 얕음.
- 이유: 경량 모델 기준 비용이 무시 가능한 수준이고 lazy+캐싱으로 실비용은 0에 수렴. 구현도 `services/`에 llmService 추가 정도로 가벼움. 포트폴리오 관점에서 LLM 연동 경험 어필 포인트.
- 주의: API 키는 `.env`로 관리(커밋 금지). LLM 호출 실패/rate limit 시 분석 필드 없이 상세 화면이 정상 동작하도록 폴백(필드는 명세상 옵셔널). 제공자 교체가 쉽도록 호출부는 `llmService` 한 곳에 격리.

### 백엔드 런타임: Spring Boot 검토 후 Node.js(Express) 유지
- 날짜: 2026-07-13
- 배경/문제: 국내 백엔드 채용이 Spring 중심이고 Spring Boot 프로젝트 경험(2개)이 있어, FirstPR 백엔드를 Spring으로 전환할지 검토.
- 선택한 방안: Node.js + Express 유지.
- 고려했던 대안: Spring Boot + Spring Data JPA (세 번째 Spring 프로젝트로 포트폴리오 강화).
- 이유:
  - 배포용 개인 인스턴스가 없어 무료 티어 호스팅이 전제인데, Spring Boot는 메모리 요구가 커서 무료 티어에서 데모를 상시 유지하기 어려움. Node는 가볍게 상시 데모 가능.
  - Spring 역량은 기존 프로젝트 2개로 이미 증명됨 — FirstPR은 "살아있는 데모 + 의사결정 기록"으로 어필하는 역할.
  - GitHub 생태계(octokit 공식 클라이언트) 이점을 그대로 유지.

### 프로젝트 라이브러리 스택 정리
- 날짜: 2026-07-09
- 배경/문제: MVP 구현에 쓸 라이브러리를 확정해 중복 검토를 줄일 필요.
- 선택한 방안:
  - Frontend: `react-router-dom`(라우팅), `@tanstack/react-query`(데이터 페칭), `axios`(HTTP), 스타일은 순수 CSS + design.md 토큰 유지. 폼은 MVP에서 `useState`로 시작.
  - Backend(예정): `express`, `mongoose`, `@octokit/rest`, `dotenv`, `cors`, `helmet`, `winston`, `express-validator`, `express-rate-limit`. 캐싱은 MongoDB 컬렉션(또는 `node-cache`)로 시작, 필요 시 Redis.
- 고려했던 대안: 폼에 react-hook-form 즉시 도입, 캐싱에 Redis 선도입 — 모두 현 단계에선 과함.
- 이유: 대부분 KNU_Capstone_Backend에서 써본 스택이라 학습 비용이 낮고, GitHub API/비동기 로딩 요구에 맞는 최소 조합. 무거운 선택은 필요해질 때 도입.

### 프로필 분석: 언어 비율은 최근 12개월 커밋 가중 + skillLevel 판정 규칙
- 날짜: 2026-07-15
- 배경/문제: 초기 구현(본인 소유 레포의 언어별 바이트 합산)이 실사용자 검증에서 체감과 어긋남 — 파일 용량 큰 옛 Swift 레포가 1위로 나오고, 조직 레포(캡스톤·인턴십)의 Java 작업은 OWNER 필터에 걸려 통째로 누락.
- 선택한 방안: `contributionsCollection.commitContributionsByRepository`(최근 12개월, 조직 레포 포함)로 레포별 커밋 수를 얻고, 각 레포의 언어 구성 비율을 **커밋 수로 가중 평균**. 반올림 후 1% 미만 언어는 표시 제외. skillLevel 규칙: advanced = 커밋 300+ 그리고 (PR 20+ 또는 기여 레포 3+) / intermediate = 커밋 50+ 또는 PR 5+ 또는 타인 레포 기여 1+ / 나머지 beginner.
- 고려했던 대안: (a) 바이트 기준 유지 + 최근 푸시 순 정렬(부분 보완) (b) 레포별 커밋 히스토리 전수 조회(정확하지만 N+1).
- 이유: "레포에 쌓인 코드 용량"이 아니라 "최근에 실제로 작성한 언어"가 첫 기여 추천의 입력으로 옳음. 쿼리 1개 유지(N+1 회피). 검증 결과 본인 계정이 Swift 43% → Java 47%로 체감과 일치. advanced 조건을 AND에서 완화한 것은 자기 레포 위주 활동자(예: torvalds)는 contributedRepos가 0이라 영원히 도달 불가한 결함 때문.
- 주의: 커밋 수는 최근 12개월 한정(GraphQL 제약). 언어 구성은 여전히 레포 내부 바이트 비율 기반이므로 레포 간 비중만 커밋이 정함.

### 프로필 레포 표시: 최근 활동(1년·소속 포함)과 기여 이력(평생·외부만) 분리
- 날짜: 2026-07-15
- 배경/문제: "어디에 기여했는가"를 프로필에 보여주고 싶은데, GitHub의 소유 개념과 사용자 체감이 어긋남 — 소속 조직(캡스톤·인턴십) 레포는 GitHub상 '타인 소유'라 기여 이력에 섞이고, 정작 진짜 오픈소스 기여(kakao/actionbase, 1커밋)는 언어 비율에 묻힘.
- 선택한 방안: 두 목록으로 분리. `recentRepos` = 최근 12개월 커밋한 모든 레포(본인+소속 조직, 커밋 수 표시), `contributionHistory` = 진짜 외부 레포 기여만(평생, 스타 수 표시). 외부 판별 = 본인/소속 조직(`organizations`, read:org 스코프) 소유가 아니고 스타 10개 이상.
- 고려했던 대안: (a) 소유 기준만으로 분리(조직 레포가 기여 이력에 섞임) (b) 조직 필터만 사용(비공개 멤버십이면 누수) (c) 스타 컷만 사용(유명 조직 소속원의 사내 레포 오분류).
- 이유: 조직 필터+스타 컷 병행이 서로의 구멍을 메움 — 멤버십이 비공개라도 팀프로젝트류는 스타가 없어 걸러짐. 기여 이력은 기간 제한이 없어 오래된 오픈소스 기여도 유지(첫 기여자 대상 서비스에서 강한 동기부여 신호). 레포별 평생 커밋 수는 N+1이라 제공하지 않음.
- 주의: GitHub GraphQL `repositoriesContributedTo`의 `orderBy: STARGAZERS`가 실제 정렬을 보장하지 않아 코드에서 직접 정렬(상위 N 자르기 전에 정렬 필수). 서버 토큰에 read:org 스코프 필요(.env.example 기록).
