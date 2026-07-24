# 자격증·스펙 취득 경로 플래너 — 개발 백로그

## 완료 (기획 단계)

| Task | 설명 | 상태 |
|---|---|---|
| 주제 전환 결정 | DevPulse 폐기, 자격증 경로 플래너로 전환 | Done |
| 기존 도메인 코드 초기화 | domain/collector/repository/DB 스키마 삭제, 인프라(Gradle/Flyway/Feign 등)는 유지 | Done |
| 기획서 작성 | 문제정의, 사용자 시나리오, 핵심기능 3개 | Done |
| 위키 작성 | 기능/비기능요구사항/기술스택/제약조건/구현매핑 | Done |
| 경로 최적화 방식 결정 | SQL 재귀 대신 Java 그래프 알고리즘(위상정렬)으로 확정 | Done |
| README/CLAUDE.md 갱신 | 새 도메인 기준으로 재작성 | Done |
| 프로토타입 (HTML/CSS) | 목표입력/수요분석·상세 2화면 | Done |
| 디자인 Skill 저장 | `.claude/skills/design-tone/SKILL.md` | Done |

---

## 슬라이스 - 목표 직무 입력 → 자격증 랭킹 조회 → 화면 표시

### 프로젝트 개요
사용자가 목표 직무별로 자주 언급되는 자격증을 확인하고 시험 등록 사이트로 연결하는 기능을 개발.

### 목표
수직 슬라이스 완성: 목표 직무 입력 → 자격증 랭킹 조회 → 화면 표시

### 이번 슬라이스 범위
- 포함: 시드 데이터 기반 조회, FE-BE 실제 연동
- 제외: 워크넷/사람인 실제 API 연동, 정규화 에이전트, 경로 최적화 — 다음 슬라이스로 이동

### 진행할 작업 (Issue 1~4)
- [x] Issue 1. [DB] 스키마 설계 및 초기 세팅
- [x] Issue 2. [백엔드] GET API 구현
- [x] Issue 3. [프론트엔드] 화면 구현 및 컴포넌트 구현
- [x] Issue 4. FE-BE 연결 및 검증 테스트

### 슬라이스 전체 완료 기준
- [x] 웹 서비스에서 탐색에 필요한 정보 입력 후 그에 맞는 랭킹 화면 표시까지 수동 테스트 통과
- [x] mock 데이터 흔적 없이 실제 데이터베이스만 출력
- [x] `./gradlew compileJava`, `npm run build` 둘 다 빌드 성공

---

### Issue 1. [DB] 스키마 설계 및 초기 세팅

**요구사항**
목표 직무별 자격증 언급 데이터를 저장할 스키마 설계 후, 슬라이스에서 조회할 시드 데이터까지 삽입.

**작업 단계**
- [x] 테이블 목록 확정 — 자격증 목록, 직무별 언급 통계
- [x] 컬럼 초안 정리
  - `certification`: id, 자격증 이름, 주관처
  - `certification_mention`: id, FK(certification_id), 직무 이름, 전체 채용공고 수, 해당 자격증이 언급된 공고 수
- [x] 컬럼 확정 (강조도는 DB 컬럼으로 두지 않고 Issue 2 Service에서 언급률 임계치로 계산하는 것으로 확정, `(certification_id, job_title)` UNIQUE 제약 추가)
- [x] Flyway 마이그레이션 파일 작성 (`V1__init.sql` 스키마, `V2__seed.sql` 시드 데이터)
- [x] PostgreSQL 기동 확인 및 `./gradlew bootRun` 실행 (레포 루트 `docker-compose.yml` 신규 작성, 호스트 포트 5433 — 로컬에 기존 네이티브 Postgres 17이 5432를 이미 점유 중이라 충돌 회피)
- [x] 테이블 생성·외래키 생성 확인
- [x] 시드 데이터 예시 SQL 작성 (자격증 7종 × 직무 2개 — 반도체 품질관리/전산직, 언급률 2.5~78.3% 분포로 랭킹이 의미있게 갈리도록 구성)

**완료 기준**
- [x] 마이그레이션 오류 없이 잘 작동 — `Successfully applied 2 migrations to schema "public", now at version v2`
- [x] 각 테이블 간 릴레이션(FK)이 잘 이루어졌는지 확인 — `certification_mention_certification_id_fkey` (ON DELETE CASCADE) 확인
- [x] SELECT로 잘 조회되는지 확인 — job_title별 언급률 랭킹 쿼리로 10개 행 정상 조회

---

### Issue 2. [백엔드] GET API 구현

**요구사항**
목표 직무명을 받고 관련 자격증을 언급률 순으로 반환하는 API 구현.

**작업 단계**
- [x] QueryDsl 의존성 + APT 플러그인 build.gradle 추가 (Wiki 확정 스택, Q타입 생성 확인 완료)
- [x] JPA 엔티티 작성 (certification, certification_mention)
- [x] 각 엔티티에 대응하는 JpaRepository 인터페이스 작성
- [x] 조회 쿼리 메서드 정의 (QueryDsl로 동적 조회 — jobTitle 기준, fetch join으로 N+1 방지)
- [x] 언급률 계산 로직을 Service 계층에 작성 (내림차순 정렬)
- [x] 강조도 태그 매핑 로직 작성 (필수/우대/낮음 — 언급률 50%/20% 임계치 기준, DB 컬럼 아닌 Service 계산)
- [x] 응답 DTO 정의
- [x] `GET /api/certification?jobTitle=` 컨트롤러 구현
- [x] 예외 처리 (jobTitle 누락/공백 400, 결과 0건 404)

**완료 기준**
- [x] 직무 이름 파라미터로 검색 요청 시 200 OK 반환 — 반도체 품질관리/전산직 둘 다 curl로 실제 확인
- [x] 응답 JSON에 필요한 필드 포함 — certificationName/issuer/mentionCount/totalPostingCount/mentionRatePercent/emphasis
- [x] 예외 처리 정상 동작 — 미존재 직무 404, 파라미터 누락/공백 400 확인

---

### Issue 3. [프론트엔드] 화면 구현 및 컴포넌트 구현

**요구 조건**
목표 직무 입력 화면과 자격증 랭킹 리스트 화면을 프로토타입(docs/prototype.html)과 유사하게 제작, mock 데이터로 먼저 완성.

**작업 단계**
- [x] 백엔드 응답과 동일 구조로 mock 데이터 작성 (`mock/certificationRankings.js` — CertificationRankingResponse 필드명/타입 100% 일치, Issue 1 시드값과 동일한 수치 사용)
- [x] 직무 입력창과 분석 시작 버튼 (`CertSearchForm` — 목표 직무 1개 필드만, 프로토타입의 기업/전공/학기 필드는 실제 API 파라미터와 안 맞아 이번 슬라이스 범위에서 제외)
- [x] 카드 리스트 컴포넌트 (`CertRankingList` — 로딩/빈 상태/결과 3분기 렌더)
- [x] 이름/언급률/강조도 태그 표시 (`CertRankingCard`)
- [x] 입력·결과 리스트·로딩 상태를 위한 state 설계 (`useCertificationRanking` 훅에 캡슐화 — jobTitle/rankings/isLoading/showValidationError/search, Issue 4에서 mock→fetch 전환 시 인터페이스 유지)
- [x] `.claude/skills/design-tone/SKILL.md` 색상·폰트 적용 (`--surface`/`--surface-2`/`--border`/`--accent-warn`/`--accent-danger` 토큰 보강)
- [x] mock 데이터로 결과 표시까지 테스트 (Playwright로 실제 브라우저 구동·스크린샷 확인)

**완료 기준**
- [x] 입력창과 버튼이 화면에 정상 표시
- [x] 버튼 클릭 시 mock 데이터가 제대로 렌더링 — 반도체 품질관리 입력 시 5개 카드, 언급률 내림차순(78.3%→6.7%) 확인
- [x] 각 카드에 이름·언급률·강조도가 명확히 표시됨 — 강조도 3단계(필수=코럴/우대=앰버/언급 적음=회색) 색상 구분 확인. (버그 발견·수정: `.cert-card__rate`에 `color`와 `background`를 같은 규칙에 묶어 퍼센트 텍스트가 안 보이던 문제를 분리해서 해결)

---

### Issue 4. FE-BE 연결 및 검증 테스트

**요구 조건**
프론트엔드에서 mock 데이터가 잘 표시되는지 확인 후, mock 데이터를 제거하고 실제 API와 연결하여 전체 사이클이 끊기지 않고 작동하는지 검증.

**작업 단계**
- [x] mock 데이터 제거 후 fetch로 `GET /api/certification?jobTitle=` 실제 호출 연결 (`useCertificationRanking.js`)
- [x] 프론트 개발 서버 포트 허용하는 CORS 설정 추가 (`WebCorsConfig` — `/api/**`에 `localhost:5173`만 GET 허용, curl로 허용/비허용 오리진 둘 다 확인)
- [x] 로딩·에러 등 소강 상태 UI 추가 (`CertRankingList` — 로딩/에러/미검색/0건/결과 5분기 렌더)
- [x] 실제 DB 데이터 표시되는지 수동 테스트 (Playwright로 브라우저 구동, "전산직" 입력 → 시드 데이터 5건 정상 렌더 확인)
- [x] 개발자도구에서 경고/에러 없는지 확인 및 요청·응답 구조 확인 (Playwright console/pageerror 캡처 — 에러 없음, `/api/certification` 200 확인)
- [x] 전체 사이클 검증 (verifier 서브에이전트 실행 — Blocker/Warning 없음)

**완료 기준**
- [x] 탐색에 필요한 정보 입력 → 그에 맞는 랭킹 화면 표시까지 테스트 성공
- [x] mock 데이터 흔적이 완전히 없고 실제 가져온 데이터만 표시됨 (grep 재확인, mock 파일/문자열 0건)
- [x] 빌드 성공 (프론트/백엔드) — 경로 이전(`C:\dev\hub`) 후 clean 빌드로 재확인, 이전 Blocker였던 crash 재현 안 됨
- [x] F12(개발자도구) 에러 없이 잘 작동
- [x] 서브에이전트 실행 시 Blocker 없음 (2026-07-15 재검증: Blocker 없음, Warning 없음)

---

## Issue 6. 자격증 취득 경로 최적화 — 그래프 알고리즘 (pathfinder)

**요구사항**
기획서_v1.md 기능2 / Wiki_Home.md FR-4: 자격증 간 선수조건을 그래프로 모델링하고 위상 정렬로 취득 순서를 계산. CLAUDE.md에 따라 SQL 재귀 쿼리(`WITH RECURSIVE`) 대신 Java 그래프 알고리즘으로 구현 (순환 참조 탐지, 테스트 용이성).

**범위 결정** — planner 서브에이전트 검토 후 사용자 승인: 이번 이슈는 알고리즘 계층(`pathfinder` 패키지 + JUnit)만 완성. 시드된 자격증 7종에 검증된 선수조건 데이터가 없어 지금 DB 스키마를 확정하면 지어낸 데이터를 넣게 됨 — DB 테이블/엔티티/서비스/API 연동은 Issue 7로 분리.

**작업 단계**
- [x] 순수 Java 값 객체 설계 (`CertificationNode`, `PrerequisiteEdge`) — Spring/JPA 무의존, LazyInitializationException 위험 원천 차단
- [x] `PrerequisiteGraph` 구성 시점 검증 (자기참조 엣지 거부, 존재하지 않는 노드 참조 거부, 중복 엣지 자동 dedupe)
- [x] `TopologicalSorter` — Kahn's algorithm(indegree 기반) 구현, 동일 진입차수 후보는 id 오름차순으로 꺼내 결정적 순서 보장
- [x] `TopologicalSortResult` sealed interface (`Sorted` / `CycleDetected`) — 순환을 예외가 아닌 정상 결과 타입으로 표현
- [x] JUnit 테스트 9종 (`TopologicalSorterTest`: 선형/독립컴포넌트/다이아몬드/2·3노드 순환/순환+하류노드/순환+무관노드/빈 입력/엣지 없음)
- [x] JUnit 테스트 3종 (`PrerequisiteGraphTest`: 자기참조 거부/미존재 노드 거부/중복 엣지 dedupe)

**완료 기준**
- [x] `./gradlew test --tests "com.punchman.devpulse.pathfinder.*"` 12개 테스트 전부 통과
- [x] `./gradlew compileJava` 빌드 성공
- [x] DB 마이그레이션/엔티티/서비스/API 없음 (의도된 범위 — Issue 7로 분리)

---

## Issue 8. 자격증 언급 빈도·강조도 집계 (MyBatis 전환)

**요구사항**
Wiki_Home.md FR-3: 직무별 자격증 언급 빈도·강조도를 집계해 랭킹으로 제공. CLAUDE.md 기술 스택은 이 집계 쿼리를 MyBatis 몫으로 명시하지만, Issue 2에서는 임시로 QueryDsl로 구현돼 있었음 (이 백로그 표에도 "현재는 QueryDsl 단순 조회"라고 이미 기록돼 있었음). 사람인 API 승인 대기 중이라 외부 API와 무관한 이 작업을 진행.

**범위 결정** — planner 서브에이전트 검토 후 사용자 승인:
- QueryDsl은 원래 FR-5(진행 상황 대시보드, 아직 미구현)의 동적 필터 조회를 위해 예약된 기술 — 이번 변경은 "쿼리를 나누는" 게 아니라 "잘못 배치된 기술을 올바른 자리로 되돌리는" 것
- **가중합 해석 범위**: `certification_mention`은 이미 (certification_id, job_title) 단위로 집계된 카운트만 저장하고, "공고 하나가 자격증을 어떤 강조도로 언급했는지"를 나타내는 원시 매핑 테이블은 없음 (FR-2 정규화 에이전트 미구현). 이번 슬라이스의 "집계"는 이미 합산된 카운트에 대한 join + 언급률(mentionRate) 산출까지이며, 문자 그대로의 공고 단위 원시 가중합(`SUM(CASE WHEN emphasis=...)`)은 FR-2가 원시 데이터를 만들 때로 남겨둠 — Issue 6에서 검증 안 된 선수조건 데이터를 지어내지 않기로 한 것과 같은 원칙
- 강조도(ESSENTIAL/PREFERRED/LOW) 임계치 분류는 SQL로 옮기지 않고 Service에 유지 — Issue 1 완료 기준에 "강조도는 DB 컬럼으로 두지 않고 Service에서 계산"이 이미 확정돼 있어 재확인된 기존 결정

**작업 단계**
- [x] `mybatis-spring-boot-starter` 의존성 추가, `DevpulseApplication`에 `@MapperScan` 배선, `application.yml`에 `map-underscore-to-camel-case` 설정
- [x] `repository/mybatis` 패키지 신설 — `CertificationMentionAggregateRow`(프로젝션 레코드), `CertificationMentionMapper`(`@Select` 기반 join + 언급률 계산 쿼리)
- [x] `CertificationRankingService`를 Mapper 의존으로 전환 — 강조도 임계치 분류는 그대로 유지, 정렬은 SQL의 `ORDER BY`로 이관해 Service 로직 축소
- [x] Issue 2의 QueryDsl 랭킹 조회 삭제 (`CertificationMentionQuerydslRepository`/`Impl`), `CertificationMentionRepository`는 순수 JPA로 축소
- [x] Mapper 통합 테스트 3종 (`CertificationMentionMapperTest`: 반도체 품질관리 5건 정렬 확인, 전산직 정확한 mentionRate 확인, 존재하지 않는 직무 빈 리스트)

**완료 기준**
- [x] `./gradlew test` 전체 15개 테스트 통과 (pathfinder 12개 + MyBatis 3개)
- [x] 리팩터링 전(QueryDsl)/후(MyBatis) API 응답 바이트 단위 동일 확인 (`반도체 품질관리`, `전산직` 두 jobTitle, curl diff로 검증) — jobTitle 누락 400, 존재하지 않는 직무 404도 동일 유지
- [x] `./gradlew compileJava` 빌드 성공, 삭제된 QueryDsl 파일에 대한 잔여 참조 없음 (grep 확인)
- [x] `QuerydslConfig`(JPAQueryFactory 빈)는 FR-5용으로 보존, 스키마(V1/V2) 변경 없음

**알려진 이슈 (verifier 검증 중 발견, 이번 슬라이스 범위 밖)**
- MyBatis 강조도 집계 쿼리에서 `total_posting_count=0`일 때 division-by-zero(500) 발생 — 사람인 API 실연동(다음 슬라이스) 시 반드시 방어 로직 필요

---

## Issue 9. 진행 상황 대시보드 (FR-5)

**요구사항**
기획서_v1.md 기능3 / Wiki_Home.md FR-5: 계획한 경로 대비 취득 완료/준비 중/예정 상태를 추적하고, QueryDsl로 동적 필터 조회. Issue 8에서 QueryDsl(`QuerydslConfig`)을 "FR-5용으로 보존"하며 남겨뒀던 것을 이번에 처음 실사용.

**범위 결정** — planner 서브에이전트 검토 후 사용자 승인:
- User/인증 없음 — `user_id` 컬럼 대신 `certification_progress.certification_id`에 `UNIQUE` 제약을 걸어 암묵적 단일 사용자를 표현 (인증 도입 시 `UNIQUE(user_id, certification_id)`로 확장 가능)
- "경로" 대신 "자격증" 단위 추적 — Issue 7(경로 DB 저장)이 아직 없어 "계획한 경로" 개념 자체가 DB에 없음. 사용자가 직접 입력하는 `target_date`를 "개인이 세운 계획의 대리물"로 사용
- 진행 상태는 자기 선언 데이터라 지어낸 데이터 문제가 없음(Issue 6과 다름) — Issue 1~4, Issue 8처럼 DB까지 가는 수직 슬라이스로 진행, 이번 세션에서 DB→API→프론트→검증 전체 완성

**작업 단계**
- [x] `V3__certification_progress.sql` 마이그레이션 (`UNIQUE(certification_id)`)
- [x] `CertificationProgress` 엔티티, `ProgressStatus` enum, JPA+QueryDsl 레포지토리(`search` 동적 필터 — status 다중값·targetDate range)
- [x] `UrgencyLevel`(OVERDUE/IMMINENT/UPCOMING/NONE, Service에서 targetDate 기준 계산, `EmphasisLevel`과 동일 패턴) + `CertificationProgressService`(생성/조회/수정, 중복·미존재 예외)
- [x] `GET /api/certifications`, `GET/POST/PATCH /api/certification-progress` API, `ApiExceptionHandler`에 404×2/409 매핑 추가, `WebCorsConfig`에 POST/PATCH 허용 추가
- [x] 프론트 3번째 탭('진행 상황') — `ProgressDashboard`/`ProgressAddForm`/`ProgressList`/`ProgressCard`, `useCertificationOptions`/`useCertificationProgress` 훅. 상태(완료=accent/준비중=accent-warn/예정=중립)와 임박도(지남·임박=danger/여유=warn)를 별도 축으로 분리해 3색 팔레트 재사용
- [x] JUnit 테스트 — `CertificationProgressServiceTest`(urgency 계산 8종 + 예외 2종), `CertificationProgressQuerydslRepositoryTest`(필터 없음/status/날짜range, 실제 Postgres 대상)

**중요 발견 — `@EnableJpaRepositories` basePackages 버그 수정**
QueryDsl 커스텀 구현체(`*QuerydslRepositoryImpl`)가 `repository.querydsl` 패키지에 있는데 `@EnableJpaRepositories(basePackages = "...repository.jpa")`가 그 패키지를 스캔 범위에서 빠뜨리고 있었음 — Spring Data가 커스텀 구현체를 못 찾고 메서드명을 파생 쿼리로 잘못 해석해 부팅 실패(`No property 'search' found`). `git show b8fa50f`로 직접 확인 — Issue 1~4 커밋 시점에도 동일하게 `basePackages`가 `repository.jpa`만 지정돼 있었고 구조적으로 이미 존재하던 버그였음. 다만 당시 메서드명이 `findByJobTitle(String jobTitle)`이라 `CertificationMention.jobTitle`과 일치하는 유효한 파생 쿼리로도 해석돼, Spring Data가 커스텀 구현체 대신 자체 생성한 쿼리로 조용히 대체됨(에러 없음, 응답 데이터도 동일 — 차이는 의도한 `fetchJoin` 최적화 없이 N+1 가능성 정도). `search()`라는 파생 쿼리로 해석 불가능한 메서드명을 처음 도입한 이번에 실패로 드러남. Issue 8이 그 구현체를 삭제(MyBatis로 교체)해서 Issue 8 push 시점엔 이미 이 버그의 영향 대상이 없었음 — 실사용자가 체감할 기능 오류는 없었던 것으로 판단. `DevpulseApplication`의 `basePackages`에 `repository.querydsl`을 추가해 해결.

**후속 개선 메모**: `@EnableJpaRepositories` basePackages를 패키지별로 나열하는 대신 상위 패키지(`com.punchman.devpulse.repository`) 통째로 지정하는 방식으로 리팩터링 고려 — 새 QueryDsl 구현체 패키지 추가 시 누락 방지. (MyBatis 매퍼는 `Repository` 마커 인터페이스를 상속하지 않아 이렇게 스캔 범위를 넓혀도 안전)

**완료 기준**
- [x] `./gradlew test` 전체 26개 테스트 통과 (pathfinder 12 + MyBatis 3 + Progress Service 8 + Progress QueryDsl 3)
- [x] curl로 POST(성공 201/400/404/409)·PATCH(성공 200/404)·GET(필터 조합) 전부 확인
- [x] Playwright로 실제 브라우저 구동 — 자격증 추가 → 카드 반영 → 상태 변경(select) → 필터 칩 동작까지 전체 사이클 확인, 콘솔 에러 없음
- [x] 기존 랭킹 탭(`GET /api/certification?jobTitle=`) 회귀 없음 확인
- [x] `./gradlew compileJava`, `npm run build` 통과

---

## Issue 10. Kafka 파이프라인 기초 셋업

**요구사항**
CLAUDE.md/Wiki_Home.md: 채용공고 수집→정규화→집계 파이프라인을 Kafka로 비동기 분리. 사람인 API 승인 대기가 계속돼 외부 API와 무관한 인프라 작업으로 진행.

**범위 결정**
- Wiki_Home.md 5절 구현 매핑 표를 다시 확인한 결과 Kafka 홉은 "수집→정규화" 구간 1개뿐 (`jobposting.collected`) — 집계(3단계)는 Kafka 없이 `certification_mention`을 MyBatis로 직접 조회(Issue 8에서 이미 구현). "3단계 파이프라인 = 3개 토픽"이 아니라 **토픽 1개**가 맞음
- 프로듀서 코드는 이번엔 만들지 않음 — 발행 주체가 될 collector(사람인 Feign)가 아직 없음. 토픽 이름 상수(`KafkaTopics`)만 지금 만들어 미래 프로듀서와 지금 컨슈머가 공유
- 컨슈머 페이로드는 사람인 응답 스키마 미확정이라 `String`(원본 JSON)으로 둠 — Issue 6/9와 같은 원칙(검증 안 된 스키마를 미리 고정하지 않음)

**작업 단계**
- [x] `docker-compose.yml`에 Kafka 서비스 추가 (KRaft 모드, `apache/kafka:3.8.0`, Zookeeper 불필요)
- [x] `spring-kafka` 의존성, `application.yml`에 `spring.kafka.bootstrap-servers`/`consumer` 설정 추가
- [x] `kafka/KafkaTopics.java`(토픽 이름 상수), `kafka/KafkaTopicConfig.java`(`NewTopic` 빈, 앱 기동 시 자동 생성)
- [x] `normalizer/JobPostingCollectedConsumer.java` — `@KafkaListener` 빈 뼈대, 수신 로그만 남김
- [x] README.md에 `docker compose up -d`(Postgres+Kafka), `DEVPULSE_KAFKA_BOOTSTRAP_SERVERS` 환경변수 안내 추가

**알려진 이슈 — 호스트 포트 9092 충돌**
로컬 Windows 환경에서 호스트 포트 9092가 Hyper-V 동적 포트 예약 범위(9061-9160, `netsh interface ipv4 show excludedportrange protocol=tcp`로 확인)와 겹쳐 바인딩이 거부됨(`bind: An attempt was made to access a socket in a way forbidden by its access permissions`) — Postgres가 5433으로 옮긴 것과 동일한 종류의 문제. 호스트 포트를 19092로 리맵해 해결(`DEVPULSE_KAFKA_BOOTSTRAP_SERVERS` 기본값도 `localhost:19092`로 변경). 컨테이너 내부 리스너 자체는 여전히 9092.

**설계 노트 — 리스너 2개로 분리한 이유**
`KAFKA_ADVERTISED_LISTENERS`를 호스트 접속 주소(`localhost:19092`) 하나로만 두면, `docker exec`로 컨테이너 내부에서 `kafka-topics.sh` 등 CLI 도구를 돌릴 때 그 주소가 컨테이너 안에서는 존재하지 않아 연결이 안 됨(광고 리스너는 브로커가 클라이언트에게 "이후 요청은 이 주소로 하라"고 알려주는 값이라, 호스트용 주소 하나로는 호스트 접속과 컨테이너 내부 접속을 동시에 만족 못 함). PLAINTEXT(호스트용, 19092)와 INTERNAL(컨테이너 내부 도구용, 9094) 두 리스너로 분리해서 둘 다 되게 함.

**알려진 이슈 — 볼륨 미설정**
Kafka 컨테이너에 볼륨 미설정 — 현재는 빈 컨슈머라 무관하지만, 실제 정규화 파이프라인이 붙으면 컨테이너 재생성 시 토픽/오프셋 초기화로 메시지 유실 가능. 파이프라인 연결 시 볼륨 마운트 추가 필요.

**완료 기준**
- [x] `docker compose up -d` — Postgres+Kafka 둘 다 정상 기동 (`docker logs devpulse-kafka`에 에러 없음, "Kafka Server started")
- [x] `./gradlew bootRun` 기동 로그에서 `KafkaAdmin`이 `jobposting.collected` 토픽 자동 생성, 컨슈머가 파티션(`jobposting.collected-0`) 정상 할당받음 확인
- [x] `docker exec devpulse-kafka kafka-topics.sh --bootstrap-server localhost:9094 --list`로 토픽 존재 재확인
- [x] `docker exec ... kafka-console-producer.sh`로 테스트 메시지 수동 발행 → 애플리케이션 로그에 컨슈머의 수신 로그 라인이 실제로 찍히는 것까지 확인 (프로듀서 코드 없이 배선 자체가 동작함을 검증하는 유일한 방법)
- [x] `./gradlew test` 전체 26개 테스트 통과 (Kafka 컨슈머가 포함된 Spring 컨텍스트로 재부팅되는 `@SpringBootTest` 테스트들도 정상 통과 — 컨텍스트 로딩 자체에 문제없음을 추가로 확인)
- [x] 기존 랭킹/진행 상황 API 회귀 없음 확인
- [x] `./gradlew compileJava` 빌드 성공

**이번엔 하지 않은 것 (다음 백로그 항목으로 분리)**
- 프로듀서 코드 (collector 패키지, 사람인 Feign 연동과 함께)
- 실제 정규화 로직 (룰 기반 매칭 + LLM 배치)
- 컨슈머 재시도/DLQ/에러 핸들링 정책 (실제 메시지 스키마 확정 후 설계)

---

## Issue 11. ALIO 채용정보 API 연동 (수집 + 원문 저장)

**요구사항**
사람인 → ALIO(공공기관 채용정보 공개시스템) 완전 전환 확정(사용자 결정). CLAUDE.md/Wiki_Home.md/README.md의 "사람인" 표기 전부 ALIO로 갱신. `POST https://opendata.alio.go.kr/new/odaApiMng/recrutInquiryAjaxList.do` 연동으로 Kafka(Issue 10)가 예고했던 "프로듀서가 나올 때 같이 만든다"를 완성 — 이 프로젝트 최초의 실제 외부 API 연동.

**범위 결정**
- Issue 6 원칙(검증 안 된 스키마를 지어내지 않음)을 반영: 요청 파라미터(`key`/`pageNo`/`numOfRows`/`recrutPbancTtl`/`ongoingYn`/`pbancBgngYmd`/`pbancEndYmd`)와 응답 필드는 사용자 확인값 그대로 사용, 응답 envelope 구조는 원래 미확인 가정으로 설계
- **구현 중 셀트 검증으로 실제로 밝혀진 것** (인증키 없이도 이 엔드포인트가 응답한다는 것을 발견해서 직접 호출 가능했음 — 사용자의 실제 키 테스트 전에 상당 부분을 셀프 검증함):
  - envelope 구조 확정: `{"data": {"result": [...], "resultCode":, "totalCount":, "resultMsg":}, "pathParam": "recrut"}` — 가정이 아니라 실제 확인, 코드에 반영 완료
  - `pbancBgngYmd`/`pbancEndYmd` 포맷은 `yyyy-MM-dd`가 아니라 `yyyyMMdd`였음(사용자가 말한 스펙과 실제가 다름) — 요청/응답 양쪽 모두 확인, 코드 수정 완료
  - `recrutPblntSn`은 JSON 숫자형(예: `302988`)이라 `Long`으로 수정, 저장 시 문자열 변환
  - **미해결 발견**: `recrutPbancTtl`을 요청 파라미터로 보내도 제목 필터링이 안 되는 것으로 관찰됨 — "채용", "모집", "연구원" 등 부분 키워드는 물론 실제 공고의 **전체 제목 그대로**("2026년 직원 채용(3차) 공고")를 보내도 0건. `ongoingYn`/`pbancBgngYmd`/`pbancEndYmd`는 서버 측에서 정상적으로 필터링됨을 직접 확인(totalCount 변화로 검증). 즉 지금 코드에서 jobTitle을 이 파라미터로 보내는 방식은 **거의 항상 0건을 반환할 가능성이 높음** — 정확한 제목 검색 파라미터명을 ALIO 개발문서에서 재확인 필요(사용자에게 공식 문서 접근 권한 있음)
- 강조도 필드 없음 — "공고 안의 특정 자격증 언급" 단위 속성이라 공고 원문 엔티티 레벨에 자리가 없음(Issue 8 원칙과 동일선상)

**작업 단계**
- [x] `V4__job_posting.sql`, `domain/JobPosting.java`, `repository/jpa/JobPostingRepository.java`
- [x] `collector/alio` 패키지 — `AlioRecrutItem`, `AlioResponseParser`(envelope 파싱), `AlioResponseFilter`(ongoingYn+최근 3개월 방어 필터), `AlioFormEncoder`, `AlioRecruitInquiryClient`(vanilla feign-core), `AlioClientConfig`, `AlioJobPostingCollectorService`(오케스트레이션+Kafka 발행)
- [x] `kafka/JobPostingCollectedEvent`, `POST /api/job-postings/collect?jobTitle=` 온디맨드 트리거
- [x] `JobPostingCollectedConsumer`를 로그 전용에서 `JobPostingIngestService`(upsert) 호출로 교체
- [x] `application.yml`의 `devpulse.saramin.api-key` → `devpulse.alio.api-key`(`DEVPULSE_ALIO_API_KEY`)
- [x] CLAUDE.md/README.md/Wiki_Home.md 사람인→ALIO 갱신 (grep으로 잔여 0건 확인)
- [x] JUnit 테스트 14종 (`AlioFormEncoderTest` 4, `AlioResponseFilterTest` 6, `AlioResponseParserTest` 3 — 실제 캡처한 응답 원문을 픽스처로 사용, `JobPostingCollectedConsumerTest` 1 — 실제 로컬 Kafka+Postgres로 프로듀서→컨슈머→DB 저장 전체 확인)

**완료 기준**
- [x] `./gradlew test` 전체 40개 테스트 통과
- [x] `./gradlew compileJava`, `npm run build`(프론트 변경 없음 확인) 성공
- [x] 실제 `opendata.alio.go.kr` 호출로 envelope 구조·필드 타입·날짜 포맷을 직접 확인·보정 (인증키 없이도 응답이 와서 셀프 검증 가능했음 — 원래 계획한 "사용자가 결과 공유" 프로토콜보다 더 많은 것을 이번에 직접 검증함)
- [x] Kafka 프로듀서(`AlioJobPostingCollectorService`)→컨슈머(`JobPostingCollectedConsumer`)→DB(`JobPostingIngestService`) 전체 경로 실제 이벤트로 검증
- [x] `recrutPbancTtl` 0건 원인 규명 및 수정 완료 (아래 상세)
- [x] 기존 랭킹/진행 상황 API 회귀 없음 확인 (`job_posting` 테이블 신규 추가만, 기존 스키마 변경 없음)

**해결 — `recrutPbancTtl` 0건이었던 진짜 원인**
Feign/Java 인코딩 문제가 전혀 아니었다. ALIO 검색 폼(`recrutInquiryList.do.js`)의 실제 클라이언트 JS를 직접 받아 분석한 결과, 폼이 항상 15개 필드(pageNo~pbancEndYmd)를 전부 제출한다는 걸 확인했고, 우리 요청이 그중 9개(`instType`/`instClsf`/`pblntInstCd`/`ncsCdLst`/`workRgnLst`/`acbgCondLst`/`hireTypeLst`/`recrutSe`/`replmprYn`)를 **키 자체를 아예 안 보내고 있었던 것**이 원인이었다 — 빈 값이라도 키가 존재해야 서버가 검색 조건을 정상 바인딩한다. 세션 쿠키, `charset=UTF-8`, `Referer`/`Origin`/`User-Agent`/`Sec-Fetch-*`/`sec-ch-ua*` 등은 브라우저 "Copy as cURL" 캡처를 최소 헤더까지 하나씩 제거하며 이분탐색으로 전부 불필요함을 직접 증명했다(`X-Requested-With`+`Content-Type`+15개 필드만으로 재현 성공). `AlioJobPostingCollectorService.buildRequestParams()`에 9개 필드를 빈 문자열로 추가해 수정 — 인증키(`key`)를 더해 우리 코드는 총 16개 필드를 보낸다.

부수적으로 발견한 것(실제 버그 아님, 기록만): 디버깅 과정에서 로컬 Git Bash 셸에 한글을 직접 타이핑해 `curl --data-urlencode`로 넘기면 UTF-8이 깨지는 걸 발견했다(`--trace-ascii`로 실제 전송 바이트 비교해 확인: `%EC%B1%84%EC%9A%A9`이어야 할 것이 `%C3%A4%BF%EB`로 깨짐). 이건 순수히 로컬 bash 셸/도구 계층의 문제이고, Java `URLEncoder.encode(value, StandardCharsets.UTF_8)`는 OS/셸 로케일과 무관하게 항상 올바른 UTF-8이라 실제 Feign 코드는 영향 없음 — 미리 퍼센트인코딩된 리터럴로 우리 앱의 `/api/job-postings/collect?jobTitle=%EC%B1%84%EC%9A%A9`를 직접 호출해 실제 ALIO 공고 41건이 수집→Kafka 발행→컨슈머→DB 저장까지 전부 성공하는 것으로 최종 검증(검증 후 테스트 데이터 삭제).
- [x] `./gradlew test` 전체 48개 테스트 통과 재확인 (기존 40 + `AlioDateParser` TDD 8개, 이번 수정으로 인한 회귀 없음)

**이번엔 하지 않은 것**
- 에러 매핑(Feign 실패 시 502 등), 재시도/DLQ 정책
- 자격증 추출(정규화, FR-2) — `preferenceDetail`(prefCn 원문) 파싱은 다음 이슈
- 주기 재수집(`@Scheduled`) — 온디맨드 트리거만

---

## 백로그 (다음 슬라이스 이후, 우선순위순)

| Task | 설명 | 우선순위 | 예상 시점 | 상태 |
|---|---|---|---|---|
| ALIO Collector | Feign 클라이언트, 채용공고 실제 수집 + Kafka 프로듀서/컨슈머 원문 저장. **주의**: MyBatis 집계 쿼리가 `total_posting_count=0`일 때 division-by-zero(500)를 던짐 — 실 데이터 수집 전 방어 로직 필요 (Issue 8 참고) | P0 | - | Done (Issue 11) |
| `recrutPbancTtl` 검색 파라미터 재확인 | 원인 규명 완료 — ALIO 검색 폼이 요구하는 15개 필드 중 9개를 키째로 누락해서 발생. `AlioJobPostingCollectorService`에 반영 완료, 실제 공고 41건 수집 검증 | P0 | - | Done (Issue 11) |
| 자격증 정규화 에이전트 | 룰 기반 1차 매칭 + 애매 항목 LLM 배치 정규화, `JobPostingCollectedConsumer`(Issue 11)의 `preferenceDetail`(prefCn 원문) 파싱 + 전용 DTO 정의 | P0 | 다음 슬라이스 | Todo |
| 강조도 분류 (필수/우대/낮음) | 문맥 기반 분류 로직으로 고도화 (현재는 단순 규칙) | P1 | 다음 슬라이스 | Todo |
| MyBatis 집계 쿼리 | 언급 빈도·강조도 join 집계 → 랭킹 | P1 | - | Done (Issue 8) |
| Kafka 파이프라인 분리 | `jobposting.collected` 토픽·컨슈머 뼈대, docker-compose 인프라 | P1 | - | Done (Issue 10) |
| Java 그래프 알고리즘 (경로 최적화) | 선수조건 그래프 구성, 위상정렬, 순환탐지 | P1 | - | Done (Issue 6) |
| 진행 상황 대시보드 (QueryDsl 동적 필터) | 자격증 단위 완료/준비중/예정 추적, QueryDsl 첫 실사용 | P1 | - | Done (Issue 9) |
| Issue 7. 경로 최적화 DB/서비스/API 연동 | `certification_prerequisite` 테이블, 엔티티, `CertificationPathService`, `CertificationPathController` — pathfinder 결과를 실제 DB 데이터와 연결. 완성되면 Issue 9의 `target_date`를 경로 기반 스케줄과 연동 검토 | P1 | 다음 슬라이스 | Todo |
| 랭킹 API에 certificationId 추가 | `CertificationRankingResponse`에 id 노출 — 랭킹 카드 → 진행 상황 크로스탭 "추적하기" 연동의 선행 조건 (Issue 9에서 범위 밖으로 분리) | P2 | 추후 | Todo |
| 컨슈머 재시도/DLQ 정책 | `JobPostingCollectedConsumer` 에러 핸들링 — 실제 메시지 스키마 확정 후 설계 (Issue 10에서 범위 밖으로 분리) | P2 | 추후 | Todo |
| 통합 테스트 · 예외처리 고도화 | 전체 파이프라인 e2e 확인 | P2 | 추후 | Todo |
| 최종 문서화 · 데모 준비 | README/위키 최신화, 발표 자료 | P2 | 추후 | Todo |

---

## 개발 환경 메모

- 로컬 Git Bash에서 `curl --data-urlencode`로 한글을 직접 타이핑하면 UTF-8이 깨질 수 있음 — 디버깅 시 퍼센트인코딩된 리터럴을 직접 쓰거나 파일로 저장해서 사용할 것 (Issue 11에서 `recrutPbancTtl` 디버깅 중 발견 — `--trace-ascii`로 실제 전송 바이트 비교해 확인)
