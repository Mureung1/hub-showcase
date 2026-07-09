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

### GitHub API 클라이언트로 @octokit/rest 사용
- 날짜: 2026-07-09
- 배경/문제: 프로필 분석·레포/이슈 조회에 GitHub API를 호출해야 함. 비인증 60회/시간 제한, 페이지네이션, rate limit 헤더 처리가 필요.
- 선택한 방안: 공식 클라이언트 `@octokit/rest`.
- 고려했던 대안: `axios`로 직접 호출 (KNU_Capstone_Backend에서 사용해 익숙).
- 이유: 인증·페이지네이션·rate limit 처리가 내장돼 있어 보일러플레이트가 줄고, GitHub 전용이라 유지보수가 편함. 학습 비용은 있으나 GitHub API에 한정되므로 부담이 작음.

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

### 프로젝트 라이브러리 스택 정리
- 날짜: 2026-07-09
- 배경/문제: MVP 구현에 쓸 라이브러리를 확정해 중복 검토를 줄일 필요.
- 선택한 방안:
  - Frontend: `react-router-dom`(라우팅), `@tanstack/react-query`(데이터 페칭), `axios`(HTTP), 스타일은 순수 CSS + design.md 토큰 유지. 폼은 MVP에서 `useState`로 시작.
  - Backend(예정): `express`, `mongoose`, `@octokit/rest`, `dotenv`, `cors`, `helmet`, `winston`, `express-validator`, `express-rate-limit`. 캐싱은 MongoDB 컬렉션(또는 `node-cache`)로 시작, 필요 시 Redis.
- 고려했던 대안: 폼에 react-hook-form 즉시 도입, 캐싱에 Redis 선도입 — 모두 현 단계에선 과함.
- 이유: 대부분 KNU_Capstone_Backend에서 써본 스택이라 학습 비용이 낮고, GitHub API/비동기 로딩 요구에 맞는 최소 조합. 무거운 선택은 필요해질 때 도입.
