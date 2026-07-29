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

## Issue 12. 발표 직전 최소 데이터 파이프라인 + ALIO 수집 방식 전환(제목→NCS 코드)

**요구사항**
`job_posting`엔 Issue 11로 실제 ALIO 데이터가 쌓이는데, 랭킹 화면이 읽는 `certification_mention`은 Issue 1의 가짜 시드값뿐이었음. 발표 직전 최소 범위로 실제 데이터가 랭킹 화면까지 반영되게 만들고, 이후 수집 자체의 근본 한계(제목 검색)를 NCS 코드 기반으로 전환.

**1단계 — 룰 기반 재계산 파이프라인 (LLM 정규화 FR-2 원안은 범위 밖)**
- [x] `normalizer/CertificationTextMatcher`(순수 static, `String.contains` 기반 null-safe 매칭)
- [x] `service/CertificationMentionRecalculationService`(`@Transactional`) — Kafka 이벤트 하나 들어올 때마다 해당 `job_title`의 `job_posting` 전체를 재스캔해 `certification_mention`을 **덮어씀**(누적 아님). `total_posting_count`가 "실제 수집된 공고 수"라는 의미인데 가짜 시드와 섞이면 분모 자체가 거짓이 되기 때문 — "카더라 대신 실제 데이터"라는 프로젝트 취지에 직결
- [x] `JobPostingCollectedConsumer`에 재계산 호출 1줄 추가, `JobPostingRepository`/`CertificationMentionRepository`에 `findByJobTitle` 파생 쿼리 추가
- [x] `CertificationTextMatcherTest`(4) + `JobPostingCollectedConsumerTest` 확장(실제 Kafka+Postgres 통합, `certification_mention` 갱신까지 검증) — 전체 52개 테스트 통과

**2단계 — 버그 발견: `pbancEndYmd`를 오늘 날짜로 보내면 `ongoingYn=Y`와 충돌**
실제 데모용으로 "반도체 품질관리"/"전산직"을 수집 트리거했더니 `job_posting`이 0건. 원인을 실제 ALIO 서버에 직접 curl로 이분탐색 검증(Issue 11의 `recrutPbancTtl` 디버깅과 동일한 방식): `pbancEndYmd`(공고 마감일 조회 상한)를 오늘 날짜로 고정하면, `ongoingYn=Y`(진행중인 공고만)와 결합했을 때 아직 마감 전이라 종료일이 미래인 진행중 공고가 전부 이 상한선에 걸려 제외됨 — 같은 키워드가 `ongoingYn=Y` 없이는 결과가 나오지만 `pbancEndYmd=오늘`과 결합하면 0건이 되는 것으로 직접 확인. `AlioJobPostingCollectorService.buildRequestParams()`의 `pbancEndYmd`를 `오늘+3개월`로 수정.
- [x] 데모 데이터로 "안전"(13건 실수집, 산업안전기사 2건=15.4% 실제 언급률) 확보해 파이프라인 실증
- [x] 부수 이슈: "전산직"을 실제로 수집했다가 `CertificationMentionMapperTest`(V2 시드값 하드코딩 가정)를 깨뜨림 — job_posting/certification_mention을 시드값으로 복원

**3단계 — 수집 방식 자체를 제목 검색 → NCS 코드 기반으로 전환**
`recrutPbancTtl`(제목) 검색은 문구가 실제 공고 제목에 리터럴로 존재해야만 매칭되는 구조적 한계가 있어(실측: "반도체 품질관리"/"전산직" 대부분 0~1건) 근본적으로 데이터가 안 쌓임. ALIO의 `ncsCdLst`(NCS 대분류 코드) 필드를 실제 엔드포인트로 직접 검증(추측 금지 원칙 — 이번 세션에 파라미터 추측이 실제와 달라 0건이 반복됐기 때문): `R6000` + NCS 대분류 순번(01~24) 패턴 확인, 요청에 넣은 코드와 응답 `ncsCdNmLst`가 정확히 일치.

| 코드 | 분류명 | 실측 totalCount |
|---|---|---|
| R600020 | 정보통신 | 31 |
| R600019 | 전기·전자 | 25 |
| R600016 | 재료 | 1 |
| R600017 | 화학 | 4 |

- [x] `collector/alio/AlioJobTitleNcsMapping`(신규) — "전산직"→`[R600020]`, "반도체 품질관리"→`[R600019, R600016, R600017]`(NCS 대분류는 산업분야 단위라 "품질관리"라는 직무 기능 자체가 없음 — 인접 산업분야 코드를 복수로 묶어 커버). 매핑에 없는 jobTitle(예: "안전")은 기존 제목 검색으로 폴백 — 2단계에서 이미 실증한 경로를 그대로 보존
- [x] `AlioJobPostingCollectorService` 리팩터링 — `buildRequestParams(recrutPbancTtl, ncsCdLst)`로 일반화(15개 필드 전부 채우는 Issue 11 규칙은 유지), `searchByNcsCodes`는 코드별 개별 요청 후 `recrutPblntSn` 기준 병합·중복 제거(하나의 공고가 여러 NCS 분류에 동시에 속하는 경우가 실제로 확인됨). 콤마 다중값 단일요청 지원 여부는 미검증이라 검증된 동작(코드당 1요청)만 사용
- [x] `./gradlew compileJava` 성공 확인 — 이번 스코프는 데이터 양 확보 우선이라 테스트 커버리지는 다음으로 미룸(사용자 명시적 지시)
- [x] 실제 `job_posting` 적재량 재확인 — "반도체 품질관리"/"전산직" `POST /api/job-postings/collect` 재트리거 결과 각각 28건/31건 실수집(제목검색 시절 0건/0~1건 대비 압도적 증가), `GET /api/certification?jobTitle=` 반영 확인(전산직 정보처리기사 5/31=16.1%, 반도체 품질관리 정보처리기사 2/28=7.1%), "안전" 폴백 경로 회귀 없음(15건, 산업안전기사 2/15=13.3%)

**해결 — "반도체 품질관리"/"전산직" job_title 문자열의 시드 픽스처 충돌**
`CertificationMentionMapperTest`가 V2 시드값을 정확히 이 두 job_title 문자열로 하드코딩하고 있었는데, NCS 코드 전환으로 이 두 job_title이 실제로도 잘 수집되는 정식 대상이 되면서 실수집 때마다 테스트가 깨지는 문제가 반복됐다(두 번 실측). `V2__seed.sql`/`AlioJobTitleNcsMapping`/프론트 예시 칩은 그대로 두고(실사용자 대상 제품 기본값이라는 실제 목적이 있음), `CertificationMentionMapperTest`만 전용 fixture(`TEST_JOB_TITLE_A`="테스트직무-mention랭킹A", `TEST_JOB_TITLE_B`="테스트직무-mention랭킹B")로 분리 — 기존 `JobPostingCollectedConsumerTest`의 `테스트직무-consumer` 컨벤션을 그대로 따름, `@BeforeEach`에서 시드값과 동일한 수치를 직접 insert, `@AfterEach`에서 delete. **재현 검증 완료**: "반도체 품질관리"/"전산직"으로 실제 ALIO 재수집을 다시 트리거해 `certification_mention`을 실데이터로 덮어쓴 상태에서 `./gradlew test --rerun-tasks`를 돌려도 52개 전부 통과 확인 — 두 job_title이 구조적으로 다시는 겹치지 않아 근본 해결.

**이번엔 하지 않은 것**
- ncsCdLst 콤마 다중값 단일요청 지원 여부 검증(개별요청+병합으로 충분한 규모라 보류, ALIO 호출 한도가 실제 문제가 될 때 재검토)
- jobTitle→NCS 코드 매핑의 외부 설정화(현재 직무가 2~3개뿐이라 과설계, Wiki_Home.md NFR "코드 재배포 없이 조정 가능"은 백로그로 유지)
- NCS 코드 전환 경로의 JUnit 테스트(사용자 지시로 다음 슬라이스)

---

## Issue 13. 강조도(필수/우대) 문맥 분류 고도화

**요구사항**
기획서_v1.md 기능1 / Wiki_Home.md FR-2: "필수"/"우대"/"있으면 좋음" 강조도를 문맥 기반으로 분류. Issue 12까지의 `CertificationTextMatcher`는 자격증 언급 여부만 카운트하고 어느 문맥(자격요건 vs 우대사항)에서 매칭됐는지는 버리고 있었음.

**범위 결정 — planner 검토 + 사용자 확인(AskUserQuestion)**
- ALIO가 이미 `aplyQlfcCn`(자격요건)/`prefCn`(우대사항)을 분리해 내려주므로, 자유 텍스트에서 "필수"/"우대" 키워드를 다시 찾는 것보다 이 필드 구조 자체를 신호로 쓰는 게 더 신뢰도 높음(구조적으로 이미 라벨링된 데이터)
- **중요 — 기존 `EmphasisLevel`(`CertificationRankingService`)과는 다른 축**: `EmphasisLevel`은 언급률(mentionCount/totalPostingCount) 임계치 기반이고, 이번에 만드는 건 공고 단위 문맥(자격요건란에 적혔는지 우대사항란에 적혔는지) 기반 — 이름도 겹치는 라벨(ESSENTIAL/PREFERRED)을 피해 `MentionField`(QUALIFICATION/PREFERENCE/NONE)로 명명. Issue 8이 애초에 "언급률 기반 EmphasisLevel은 FR-2 원시 데이터가 생기기 전까지의 대체 지표"라고 문서화해뒀던 것과 일치 — 랭킹 API/`EmphasisLevel` 통합은 이번 스코프가 아니고 다음 슬라이스로 명시적으로 미룸
- DB 저장 여부(스키마 변경 동반)는 사용자에게 직접 확인받음 — "지금 저장"으로 확정(`V5` 마이그레이션). `CertificationMentionMapper`가 명시적 컬럼 SELECT라 순수 additive라 기존 랭킹 쿼리엔 영향 없음을 사전 확인

**작업 단계**
- [x] `V5__certification_mention_context.sql` — `certification_mention`에 `essential_mention_count`/`preferred_mention_count`(`NOT NULL DEFAULT 0`) 추가
- [x] `CertificationMention` 엔티티에 두 필드 추가(`@Builder.Default = 0`)
- [x] `CertificationTextMatcher.classify(name, qualificationText, preferenceText)` 신규 — `MentionField`(QUALIFICATION/PREFERENCE/NONE) 반환. 양쪽 다 매칭되면 QUALIFICATION 우선(essential+preferred가 항상 mentionCount와 정확히 같아지도록 이중 집계 방지). 기존 `mentions()`는 하위 호환용으로 그대로 유지
- [x] `CertificationMentionRecalculationService.recalculate()` 리팩터링 — `classify()`로 essential/preferred를 같은 순회에서 함께 계산·저장, `mentionCount = essentialCount + preferredCount`
- [x] `CertificationTextMatcherTest`에 `classify()` 테스트 6종(자격요건만/우대사항만/양쪽 매칭 시 우선순위/둘 다 미매칭/blank 자격증명/null 텍스트) 추가
- [x] `JobPostingCollectedConsumerTest`에 essential/preferred 단언 추가(SQLD는 preferenceDetail에만 있어 PREFERENCE로 분류돼야 함)

**완료 기준**
- [x] `./gradlew test --rerun-tasks` 전체 58개 통과(기존 52 + classify 6종)
- [x] `essential_mention_count + preferred_mention_count == mention_count` 불변식이 코드 구조상 항상 성립함을 확인 — 실측으로도 재검증("안전" 재수집 후 7개 자격증 행 전부 성립)
- [x] `GET /api/certification?jobTitle=` 응답 계약 무변경 확인(essential/preferred 필드 미노출) — `CertificationMentionMapper` SELECT가 명시적 컬럼 나열이라 새 컬럼과 무관함을 코드로 재확인
- [x] `CertificationRankingService`/`EmphasisLevel`/`CertificationMentionMapper`/`CertificationRankingController` 전혀 미변경 확인(git diff)
- [x] verifier 서브에이전트 검증 — Blocker/Warning 없음

**이번엔 하지 않은 것**
- 랭킹 API에 essential/preferred 가중합 반영 통합(다음 슬라이스, `EmphasisLevel`을 언급률 대신 문맥 가중합 기반으로 재설계할지는 별도 판단 필요)
- "있으면 좋음"(3단계 강조도) 분류 — 지금은 필수/우대 2단계만, ALIO 필드가 2개뿐이라 3단계째는 근거 데이터가 없음

---

## Issue 15. 수집 데이터 볼륨 확장 — NCS 코드 매핑 확대 + ALIO 구조적 한계 확인

**요구사항**
"반도체 품질관리"(28건)/"전산직"(31건)의 실제 수집량이 적어 강조도/상대비교 랭킹 기능의 설득력이 떨어짐. 볼륨을 늘릴 방법(페이지네이션, NCS 코드 확장) 검토.

**1단계 — 페이지네이션은 이번 스코프 아님(실측으로 확인)**
`AlioJobPostingCollectorService`는 `pageNo=1` 고정, `AlioResponseParser`는 `data.totalCount`를 아예 버리는 구조라 "100건 넘으면 조용히 유실"이라는 구조적 버그가 실재함. 하지만 실제 ALIO 서버에 직접 curl로 확인한 결과 현재 매핑된 모든 NCS 코드의 totalCount(전산직 33/전기전자 25/재료 1/화학 4)가 전부 `numOfRows=100` 미만이라, 지금 고쳐도 수집 건수는 0건도 안 늘어남 — 사용자 확인 후 이번 라운드에서 제외, 백로그 P1로 이관(아래 표).

**2단계 — NCS 코드 확장, 관련성 실측으로 한 번 되돌림**
- [x] "반도체 품질관리"에 R600015(기계, 실측 19건)/R600023(환경·에너지·안전, 실측 43건) 둘 다 추가 시도(사용자가 트레이드오프 검토 후 확정) — `job_posting` 28→62건으로 증가
- [x] **정성적 확인(기관명/제목 샘플링)에서 실제 문제 발견**: 62건 중 반도체 관련은 1건(학교법인한국폴리텍 반도체융합캠퍼스)뿐. 나머지는 국립생태원/한국마사회/한전KPS 발전소 정비/한국환경보전원 등 범산업 안전·환경·시설관리 공고 — R600023(환경·에너지·안전)이 관련성을 크게 희석시킴이 실측으로 확인됨
- [x] 사용자 확인 후 R600023 제거, R600015(기계)만 유지 — `job_posting` 34건으로 재수렴(단순 합산이 아니라 dedup 영향)
- [x] **더 근본적인 발견**: 기계만 남겨도 진짜 반도체 관련 공고는 거의 안 잡힘 — ALIO는 공공기관(공기업/준정부기관 등) 채용정보만 다루는데, 삼성전자/SK하이닉스 등 민간 반도체 기업은 애초에 ALIO 대상이 아님. 그래서 "반도체 품질관리"는 NCS 코드를 아무리 조정해도 "인접 산업분야 공공기관 기술직"(한국수자원공사, 한전KPS, 가스안전공사 등)까지가 한계이지 진짜 반도체 QC 공고는 구조적으로 잡을 수 없음. **CLAUDE.md 제약(ALIO 공식 API만 사용, 커뮤니티/타 사이트 크롤링 금지)을 유지하는 한 이 job_title은 본질적으로 이 한계 안에서만 개선 가능** — 사용자 확인 후 34건으로 확정, 한계를 문서화하고 종료
- [x] 회귀 확인 — "전산직"(31→34, 자연 증가) / "안전"(15, 제목검색 폴백 무변경) 재수집 후 기존 랭킹 API 정상 동작 확인
- [x] `./gradlew test --rerun-tasks` 67개 전체 통과(코드 변경이 `AlioJobTitleNcsMapping`의 Map 값 하나뿐이라 기존 테스트 영향 없음)

**완료 기준**
- [x] `AlioJobTitleNcsMapping`에 R600015 추가, R600023은 실측 후 제외
- [x] 재수집 실측: "반도체 품질관리" 28→34건, "전산직" 31→34건(회귀 없음), "안전" 15건 유지(회귀 없음)
- [x] `./gradlew test --rerun-tasks` 67개 통과
- [x] 정성적 관련성 확인 완료 — 신규 유입 공고 기관명/제목 샘플링으로 R600023 배제 근거 확보

**이번엔 하지 않은 것**
- ALIO 페이지네이션 방어 로직(`AlioResponseParser`/`search()` 리팩터링) — 지금 볼륨엔 영향 없어 P1 백로그로 이관
- "전산직"의 추가 NCS 코드 탐색 — 현재 33~34건으로 상대적으로 충분
- ALIO의 공공기관 전용 구조적 한계에 대한 근본 해결(민간 채용 사이트 추가 등) — CLAUDE.md가 명시적으로 금지(커뮤니티/타 사이트 크롤링 금지, ALIO 공식 API만 사용)하므로 범위 밖. "반도체 품질관리"는 이 한계 안에서의 최선치라는 점을 발표/문서에 명시 필요

---

## Issue 16. LLM 기반 정규화 도입

**요구사항**
`CertificationTextMatcher`는 순수 리터럴 매칭이라 동의어/축약형 표기를 놓친다. 원래 기획 FR-2("룰 기반 1차 매칭 + 애매한 표현만 LLM 배치 정규화")의 마지막 조각 — Issue 8/13에서 반복적으로 스코프 밖으로 미뤄뒀던 항목.

**실측 확인(진행 여부 판단 근거)**: 85건 공고 중 75건이 규칙 매칭 0건, 그중 자격증 관련 일반 키워드(자격/면허/기사/기능사) 포함은 51건. 샘플 8건을 직접 읽어본 결과 대부분 범용 문구("관련 자격증소지자 우대")이거나 무관 자격증(운전면허 등)이었고 우리 7종의 숨은 동의어는 없었음 — 이번 데이터셋 규모에서 신규 매칭 효과는 제한적일 수 있음. 사용자 확인 후 그럼에도 전체 구현 진행(FR-2 완성 자체가 목적, 데이터가 늘어나면 실제 효과를 낼 구조).

**범위 결정 — planner 검토 + 사용자 확인(AskUserQuestion 3건)**
- **배치 트리거 아키텍처**: 기존 Kafka 컨슈머(`JobPostingCollectedConsumer`)가 메시지 1건마다 즉시 `recalculate()`하는 구조에 LLM 호출을 얹으면 "실시간 스트리밍 금지"/"LLM은 배치 호출만" 원칙을 직접 위반함을 사전에 발견 — **완전히 분리된 신규 엔드포인트**(`POST /api/certification-mentions/normalize-llm?jobTitle=`)로 해결. Kafka/컨슈머/`AlioJobPostingCollectorService`는 전혀 무변경
- **LLM 제공자**: Groq(OpenAI 호환 chat completions, vanilla feign-core로 `AlioClientConfig`와 동일 패턴). 실제 키 테스트는 사용자가 로컬에서 — ALIO 키와 동일 원칙(대화에 실키 안 씀)
- **저장 모델**: essential/preferred(문맥 축, Issue 13)와 충돌 안 하게 컬럼을 늘리는 대신 `certification_llm_match` 원장 테이블 신설(공고×자격증 단위, LLM이 새로 찾아낸 것만 기록) — `CertificationMentionRecalculationService.recalculate()`가 규칙 매칭 실패 시 이 원장도 확인해 essential/preferred에 반영(규칙이 이미 잡은 조합은 원장에 없으므로 이중 집계 없음)

**작업 단계**
- [x] `V6__certification_llm_match.sql`, `domain/CertificationLlmMatch`, `repository/jpa/CertificationLlmMatchRepository`
- [x] `collector/groq` 패키지 — `GroqChatClient`(vanilla feign-core), `GroqClientConfig`, `application.yml`에 `devpulse.groq.api-key`/`devpulse.groq.model`(`DEVPULSE_GROQ_API_KEY`/`DEVPULSE_GROQ_MODEL` 환경변수, 모델명은 Groq 무료 tier 로스터가 바뀔 수 있어 오버라이드 가능하게)
- [x] `normalizer/LlmNormalizationCandidateSelector` — 규칙 매칭 7종 전부 실패 + 자격증 관련 키워드(자격/면허/기사/기능사) 포함 공고만 LLM 후보로 선별(전체 텍스트를 매번 LLM에 넘기지 않는다는 원칙의 핵심 장치)
- [x] `normalizer/GroqNormalizationPrompt`/`GroqNormalizationResult`/`GroqNormalizationResponseParser` — 우리 7종 정확한 명칭 목록을 프롬프트에 포함, "목록에 없으면 언급하지 말 것"/"확실하지 않으면 빈 배열" 지시로 할루시네이션 방지, JSON 모드 강제. 파싱은 개별 항목 단위로 방어적(목록에 없는 자격증명·잘못된 필드는 그 항목만 버리고 나머지는 정상 처리)
- [x] `service/CertificationLlmNormalizationService` — 후보 선별 → 프롬프트 생성 → Groq 호출(실패 시 예외를 잡아 0건으로 안전 처리) → 원장 저장(중복 방지) → `recalculate()` 재호출
- [x] `api/CertificationLlmNormalizationController` — `POST /api/certification-mentions/normalize-llm?jobTitle=`
- [x] `CertificationMentionRecalculationService.recalculate()` 확장 — 규칙 매칭이 `NONE`일 때만 원장 조회로 보충
- [x] 신뢰도 표시(요청 3번) — `CertificationMentionMapper` SQL에 `EXISTS` 서브쿼리로 `llmAssisted` 컬럼 추가, `CertificationMentionAggregateRow`/`CertificationRankingResult`/`CertificationRankingResponse`까지 관통(기존 essential/preferred 확장과 동일한 패턴)
- [x] 테스트 17종 신규 — 후보 선별 3, 응답 파서 5, 정규화 서비스 5(할루시네이션 방지·중복 방지·Groq 실패 방어 포함), 재계산 확장 3, 랭킹 서비스 llmAssisted 통과 1

**완료 기준**
- [x] `./gradlew test` 84개 전체 통과(기존 67 + 신규 17)
- [x] 실제 서버 기동 후 `POST /api/certification-mentions/normalize-llm?jobTitle=` 실호출 — 실키 없이도 `https://api.groq.com/openai/v1/chat/completions`까지 실제 도달해 `401 Unauthorized`를 받는 것으로 엔드포인트/헤더/요청 바디 구조가 맞다는 것 확인(404·연결 실패가 아니라 인증 실패라는 게 핵심 — ALIO 때와 동일한 "실제 호출로 확정" 원칙), 예외가 안전하게 처리돼 500 없이 `{"newMatchCount":0}` 정상 응답
- [x] 후보 선별 로직이 실제로 후보를 찾음(로그로 "안전"/"반도체 품질관리" 둘 다 Groq 호출까지 도달 확인, "후보 없음" 조기 종료가 아니었음)
- [x] 기존 랭킹/재계산 경로 회귀 없음

**이번엔 하지 않은 것**
- LLM 신뢰도(`llmAssisted`)의 프론트 화면 표시 — API까지만, 카드 UI 반영은 후속(데모에서도 의도적으로 미노출, 아래 한계 참고)

**실키 라이브 검증 후 추가 구현(2026-07-28)**
- 사용자가 실제 `DEVPULSE_GROQ_API_KEY`로 라이브 테스트하는 과정에서 애초 가정("공고당 후보 수십 건이면 한 번의 배치 호출로 충분")이 틀렸음을 실측으로 확인 — 반도체 품질관리 후보 32건 = 15923 토큰 요청, Groq 무료 tier 분당 토큰 한도(TPM 12000) 초과로 413. `MAX_CANDIDATES_PER_BATCH`(8건)로 쪼개 여러 번 호출하도록 `CertificationLlmNormalizationService`를 리팩터링, 배치 사이 간격(`BATCH_INTERVAL_MILLIS`) 삽입 + 429 발생 시 1회 재시도 추가
- 최초 실측에서 카탈로그 존재 여부 가드만으로는 할루시네이션을 못 막는 게 확인돼(아래 한계 참고), `GroqNormalizationResult.CertificationMatch`에 `evidence`(원문 그대로 인용) 필드를 추가하고 `CertificationLlmNormalizationService.evidenceExistsInSourceText()`로 그 인용이 실제 원문에 있는지 기계적으로 재검증하는 2차 가드 추가 — 그럼에도 완전히 막지는 못함(아래 한계 참고)

---

## Issue 16 — 알려진 한계: LLM 매칭 정확도 (실키 라이브 검증 결과, 2026-07-28)

**결론: 현재 상태로는 `auto-apply 금지`. 랭킹에 영향 주지 않는 격리 상태로 유지한다.**

사용자가 실제 발급받은 Groq API 키로 3라운드에 걸쳐 라이브 검증한 결과, `llama-3.3-70b-versatile`(Groq 무료 tier) 기준 매칭 정확도가 신뢰할 수 있는 수준이 아님을 확인했다:

- **1라운드(카탈로그 존재 가드만 있던 상태)**: 11건 매칭 발견, 그중 6건을 원문과 직접 대조 — 5건이 명백한 오매칭/할루시네이션. 2건은 원문에 자격증 언급 자체가 아예 없는데 지어냄, 나머지는 "산업기사"(등급을 뜻하는 일반 명사, 예: 전기산업기사)를 "산업안전기사"(우리 카탈로그의 구체적 자격증)로 표면적 글자 유사성만으로 혼동
- **2라운드(evidence-quote 가드 추가 후)**: 프롬프트에 위 실패 사례를 반례로 명시하고, "원문 그대로 인용을 못 하면 답하지 마라"는 지시 + 그 인용이 실제 원문에 있는지 기계적 재검증을 추가 — "반도체 품질관리"/"전산직"에서는 할루시네이션이 0건으로 줄었으나(모델이 아예 답을 안 함), "안전"에서 나온 2건은 **evidence 자체는 원문에 실존하는 구절이었지만 그 구절이 가리키는 자격증명을 엉뚱하게 붙인 경우**(전기기능사/기계기능사/운전면허 관련 구절을 인용하면서 "정보처리기사"/"컴퓨터활용능력 1급"이라고 라벨링)였음. 즉 "인용문이 원문에 있는가"만으로는 "그 인용문이 실제로 이 자격증을 가리키는가"까지는 검증이 안 됨 — 가드의 구조적 사각지대
- **정리**: 두 라운드 다 합쳐 실제로 원문과 대조 검증한 매칭 중 신뢰할 수 있던 건 사실상 0건. 발견된 매칭은 전부 삭제하고 `certification_mention`을 순수 룰 기반 상태로 복원함(재확인: `certification_llm_match` 0행, 4개 job_title 전부 `essential+preferred == mention_count` 불변식 성립 — 즉 현재 랭킹에 LLM 데이터가 전혀 섞여있지 않음)

**다음에 시도해볼 방향**
- (a) 2차 검증 단계 추가 — 1차로 찾은 매칭 후보를 별도 프롬프트로 "이 인용문이 정말 이 자격증을 가리키는가"만 다시 확인하는 검증 전용 LLM 호출
- (b) 사람이 확인 후 반영하는 리뷰 큐 방식으로 전환 — `certification_llm_match`를 "확정 매칭"이 아니라 "검토 대기" 상태로 두고, 관리자가 승인해야 `recalculate()`에 반영되게 상태 필드 추가
- (c) 다른 무료 모델(Gemini 등)로 교차 검증 — 서로 다른 모델이 동의하는 매칭만 채택

**지금 상태**
- 엔드포인트(`POST /api/certification-mentions/normalize-llm`)와 코드는 그대로 유지 — 이미 완전히 분리된 테이블(`certification_llm_match`)/엔드포인트 구조라 격리 자체는 잘 돼 있었음
- 랭킹 API의 `llmAssisted` 필드는 이번 데모에서 노출하지 않음(현재 값도 전부 `false` — 실제로 반영된 LLM 매칭이 없으므로)
- `CertificationMentionRecalculationService`는 원장이 비어 있으면 항상 순수 룰 기반 결과와 동일 — 이 기능을 트리거하지 않는 한 기존 동작에 아무 영향 없음

---

## Issue 17. Kafka 컨슈머 정식화

**요구사항**
`JobPostingCollectedConsumer`는 Issue 10 때 만든 최소 뼈대였지만, Issue 11(ingest 연결)/12(recalculate 연결)를 거치며 이미 실질적 파이프라인이 됨. Issue 10이 "실제 메시지 스키마 확정 후 설계"로 미뤄뒀던 컨슈머 에러 처리 정책을, `JobPostingCollectedEvent` 스키마가 안정된 지금 정식화.

**범위 결정** (planner 검토 + 사용자 확인)
- 에러 처리: 프레임워크 암묵적 기본값(`FixedBackOff(0, 9)` — 즉시 9회 재시도 후 조용히 스킵)을 명시적 `DefaultErrorHandler(FixedBackOff(1000, 2))`(1초 간격 2회 재시도 후 스킵)로 교체. 신규 의존성 없음(spring-kafka 내장 기능).
- **DLQ는 이 규모에서 과설계로 기각**: 데이터 규모(수십~백 건), 단일 컨슈머 인스턴스, 재수집 트리거(`POST /api/job-postings/collect`)가 이미 실질적 복구 수단으로 존재·실사용 중이라는 점 — 별도 DLQ 토픽+모니터링을 볼 대상이 없음
- 멱등성: 이미 확보돼 있음을 재확인만 함(코드 변경 없음) — `JobPostingIngestService.ingest()`는 upsert, `CertificationMentionRecalculationService.recalculate()`는 매번 전체 재계산(덮어쓰기)이라 재시도/중복 처리돼도 최종 상태 동일
- 컨슈머 그룹/파티션 전략(`.partitions(1).replicas(1)`, 단일 인스턴스): 현행 유지 확정 — 병렬 처리할 이유가 없는 규모에서 파티션을 늘리는 건 순수 오버엔지니어링

**작업 단계**
- [x] `KafkaTopicConfig`에 `kafkaErrorHandler()` 빈 추가 — `DefaultErrorHandler(new FixedBackOff(1000L, 2))`
- [x] `JobPostingCollectedConsumerTest`에 중복 이벤트 재전송 멱등성 테스트 추가 — 동일 이벤트 2회 발행 시 `JobPosting` 중복 없음, `certification_mention` 카운트가 1회 처리 때와 동일함을 확인
- [x] `JobPostingCollectedConsumerTest`에 재시도-후-스킵 테스트 추가 — `title` 컬럼(`VARCHAR(500)`) 제약을 넘는 값(501자)으로 실제 DB 제약 위반을 재현해 지속적으로 실패하는 메시지가 결국 스킵되고, 스킵 후에도 컨슈머가 죽지 않고 다음 메시지를 정상 처리하는지 확인

**설계 노트 — Mockito 스파이로 재시도 횟수를 세려던 시도는 폐기**
처음엔 `CertificationMentionRecalculationService`를 `@MockitoSpyBean`으로 감싸 특정 jobTitle 호출만 강제로 던지게 하고 정확히 3회(최초 1회+재시도 2회) 호출됐는지 `verify(times(3))`로 세려 했음. 실측 결과 스파이가 항상 "zero interactions"로 실패 — DB를 직접 확인해보니 실제로는 spy가 아니라 진짜 구현이 그대로 실행되고 있었음(certification_mention이 정상적으로 채워짐). 즉 `@KafkaListener` 빈이 참조하는 인스턴스와 테스트가 검증하는 spy 인스턴스가 일치하지 않는 구조적 문제였고, 원인을 스프링 카프카 내부(`FailedBatchProcessor`/`FailedRecordProcessor`)까지 리플렉션으로 파고드는 건 이 프로젝트 규모에 맞지 않는 과설계라 판단해 중단. 대신 `title` 컬럼 길이 제약이라는 **진짜 DB 제약 위반**으로 목(mock) 없이 재현하는 방식으로 바꿈 — 정확한 재시도 횟수 검증은 포기하고(스프링 카프카 프레임워크 자체의 동작이라 신뢰), "결국 스킵되고 컨슈머가 살아있는지"라는 우리 코드가 실제로 신경 써야 할 지점만 확인

**완료 기준**
- [x] `./gradlew test` 전체 통과 (신규 2개 테스트 포함)
- [x] `docs/BACKLOG.md` 갱신 — 컨슈머 재시도/DLQ 정책을 Todo에서 Done으로 전환, DLQ 기각 근거·컨슈머 그룹/파티션 현행 유지 결론 기록

---

## Issue 7. 경로 최적화 DB/서비스/API 연동

**요구사항**
Issue 6에서 만든 위상 정렬 그래프 알고리즘(`pathfinder` 패키지)이 DB/서비스/API/화면 어디에도 연결되지 않은 채 남아있었음. 기획서 FR-4가 아직 실제로 동작하는 걸 보여주지 못하는 유일한 핵심 기능이라, `pathfinder`를 실제 자격증 데이터와 REST API, 프론트 화면까지 끝까지 연결.

**핵심 사실 확인 및 범위 결정**
시드된 7종 자격증(산업안전기사/품질경영기사/위험물산업기사/정보처리기사/컴퓨터활용능력1급/SQLD/리눅스마스터1급) 사이에는 실제로 검증 가능한 공식 선수조건이 없음 — 서로 다른 분야의 독립적인 기사/1급 등급 자격증들이라, 산업기사→기사 같은 등급 체계 내 선후관계도 이 목록엔 없음. Issue 6이 이미 "지어낸 데이터를 넣지 않는다"고 결정했던 문제가 그대로라, **사용자 확인 결과 `certification_prerequisite` 테이블은 만들되 시드 데이터는 비워둠** — 배관(선택한 자격증 → 그래프 계산 → 순서 반환)이 실제로 끝까지 동작하는 걸 증명하는 게 목표. 지금은 "선수조건 없음 → 제약 없이 정렬(id 오름차순)"로 정직하게 반영. 나중에 검증된 선수조건을 알게 되면 그때 데이터만 추가하면 되는 구조.

**작업 단계**
- [x] `V7__certification_prerequisite.sql` — 빈 시드로 테이블만 생성
- [x] `domain/CertificationPrerequisite.java`, `repository/jpa/CertificationPrerequisiteRepository.java`
- [x] `service/CertificationPathService.computeOrder(List<Long>)` — 선택한 자격증 id로 `CertificationNode` 구성, 선택 범위 안의 선수조건만 필터링해 `PrerequisiteGraph`/`TopologicalSorter` 재사용
- [x] `api/CertificationPathResponse.java`(`order`/`stuckCertifications`/`hasCycle`), `api/CertificationPathController.java` — `GET /api/certification-path?certificationIds=`
- [x] `CertificationPathServiceTest` — 선수조건 0건, 선택 범위 내 엣지 반영, 선택 범위 밖 엣지 무시, 순환 참조 탐지, 존재하지 않는 id 예외 5케이스. 컨트롤러 테스트는 만들지 않음(백엔드 전체에 컨트롤러 테스트가 없는 기존 컨벤션 유지, 수동 curl로 검증)
- [x] 프론트: `useCertificationPath` 훅, `CertPathPlanner`/`PathResult` 컴포넌트, `App.jsx`에 "경로 최적화" 탭 추가, `PathResult.test.jsx`

**완료 기준**
- [x] `./gradlew test` 전체 통과
- [x] `npm run test` 전체 통과 (신규 `PathResult.test.jsx` 포함)
- [x] 실제 `bootRun` 기동 후 `curl "http://localhost:8080/api/certification-path?certificationIds=1,2,3"` 확인 — 선수조건 0건 상태이므로 `hasCycle:false`, `order`가 id 오름차순으로 반환됨을 실측 확인
- [x] 존재하지 않는 자격증 id 요청 시 404 확인(`CertificationNotFoundException` 재사용)

---

## 백로그 (다음 슬라이스 이후, 우선순위순)

| Task | 설명 | 우선순위 | 예상 시점 | 상태 |
|---|---|---|---|---|
| ALIO Collector | Feign 클라이언트, 채용공고 실제 수집 + Kafka 프로듀서/컨슈머 원문 저장. **주의**: MyBatis 집계 쿼리가 `total_posting_count=0`일 때 division-by-zero(500)를 던짐 — 실 데이터 수집 전 방어 로직 필요 (Issue 8 참고) | P0 | - | Done (Issue 11) |
| `recrutPbancTtl` 검색 파라미터 재확인 | 원인 규명 완료 — ALIO 검색 폼이 요구하는 15개 필드 중 9개를 키째로 누락해서 발생. `AlioJobPostingCollectorService`에 반영 완료, 실제 공고 41건 수집 검증 | P0 | - | Done (Issue 11) |
| 자격증 정규화 에이전트 | 룰 기반 1차 매칭 + 애매 항목 LLM 배치 정규화(Groq), 완전 분리된 신규 엔드포인트로 구현 — **단, 실키 라이브 검증 결과 매칭 정확도 미달로 auto-apply 금지, 랭킹 미반영 격리 상태 유지** (Issue 16 알려진 한계 참고) | P0 | - | Done (Issue 16, 정확도 이슈로 격리) |
| LLM 매칭 정확도 개선 | 2차 검증 단계 / 사람 리뷰 큐 / 타 모델(Gemini) 교차검증 중 하나로 신뢰도 확보 필요 — 그 전까지 `certification_llm_match` auto-apply 금지 유지 | P0 | 다음 슬라이스 | Todo |
| `llmAssisted` 신뢰도 프론트 표시 | API 필드는 노출 완료(Issue 16)이나 매칭 정확도 이슈로 이번 데모에서 의도적으로 미노출. 정확도 개선 후 재검토 | P2 | 다음 슬라이스 | Todo |
| 강조도 분류 (필수/우대) | 문맥 기반(자격요건 vs 우대사항 필드) 분류 로직 구현, `certification_mention`에 essential/preferred 카운트 저장 | P1 | - | Done (Issue 13) |
| MyBatis 집계 쿼리 | 언급 빈도·강조도 join 집계 → 랭킹 | P1 | - | Done (Issue 8) |
| Kafka 파이프라인 분리 | `jobposting.collected` 토픽·컨슈머 뼈대, docker-compose 인프라 | P1 | - | Done (Issue 10) |
| Java 그래프 알고리즘 (경로 최적화) | 선수조건 그래프 구성, 위상정렬, 순환탐지 | P1 | - | Done (Issue 6) |
| 진행 상황 대시보드 (QueryDsl 동적 필터) | 자격증 단위 완료/준비중/예정 추적, QueryDsl 첫 실사용 | P1 | - | Done (Issue 9) |
| 경로 최적화 DB/서비스/API 연동 | `certification_prerequisite` 테이블(빈 시드)/엔티티/서비스/API/화면까지 pathfinder를 실전 연동. 선수조건 데이터는 검증된 게 없어 의도적으로 비워둠 — 나중에 Issue 9의 `target_date`를 경로 기반 스케줄과 연동하는 건 향후 과제로 남음 | P1 | - | Done (Issue 7) |
| `CertificationMentionMapperTest` 시드 픽스처 충돌 근본 해결 | "반도체 품질관리"/"전산직" job_title이 V2 시드 픽스처이면서 동시에 NCS 코드 기반 실제 수집 대상이라 실수집할 때마다 테스트가 깨짐(Issue 12에서 반복 확인) — 전용 픽스처 job_title(`테스트직무-mention랭킹A/B`)로 분리, 실수집 재현 후에도 테스트 통과 확인 | P0 | - | Done |
| ALIO 수집 결과 job_title 회귀 테스트 | Issue 12의 NCS 코드 전환 경로(`AlioJobTitleNcsMapping`, `searchByNcsCodes` 병합·중복제거)에 대한 JUnit 테스트 — 이번 슬라이스는 데이터 양 확보 우선으로 명시적으로 미룸 | P1 | 다음 슬라이스 | Todo |
| 랭킹 API에 essential/preferred 가중합 반영 | Issue 13에서 저장만 해둔 문맥 기반 강조도(essential/preferred)를 `CertificationRankingService`의 `EmphasisLevel`(언급률 임계치 기반)과 통합할지 재설계 — 정규화(가중합/total_posting_count) 방식부터 다시 정해야 하는 별도 설계 결정이라 의도적으로 분리 | P1 | 다음 슬라이스 | Todo |
| ALIO 페이지네이션 방어 로직 | `AlioResponseParser`가 `data.totalCount`를 버리고 `pageNo=1` 고정이라 단일 NCS 코드 결과가 100건을 넘으면 조용히 유실됨(Issue 15에서 발견, 현재는 전부 100 미만이라 당장 영향 없음) — `totalCount`를 반환에 포함시키고 `search()`에 페이지 루프 + 최대 페이지 캡 추가 필요 | P1 | 다음 슬라이스 | Todo |
| ALIO NCS 코드 경로 JUnit 테스트 | `AlioJobTitleNcsMapping`/`searchByNcsCodes` 병합·중복제거 로직에 대한 테스트(Issue 12에서 미룸, Issue 15에서도 재확인만 하고 미룸) — 페이지네이션 리팩터링과 같은 파일이라 함께 진행 권장 | P1 | 다음 슬라이스 | Todo |
| 랭킹 API에 certificationId 추가 | `CertificationRankingResponse`에 id 노출 — 랭킹 카드 → 진행 상황 크로스탭 "추적하기" 연동의 선행 조건 (Issue 9에서 범위 밖으로 분리) | P2 | 추후 | Todo |
| 컨슈머 재시도/DLQ 정책 | 명시적 `DefaultErrorHandler(FixedBackOff(1000, 2))` 등록 완료. DLQ는 이 규모(재수집 트리거가 실질적 복구 수단)에서 과설계로 기각, 컨슈머 그룹/파티션(1개)도 현행 유지 확정 | P2 | - | Done (Issue 17) |
| 통합 테스트 · 예외처리 고도화 | 전체 파이프라인 e2e 확인 | P2 | 추후 | Todo |
| 최종 문서화 · 데모 준비 | README/위키 최신화, 발표 자료 | P2 | 추후 | Todo |

---

## 개발 환경 메모

- 로컬 Git Bash에서 `curl --data-urlencode`로 한글을 직접 타이핑하면 UTF-8이 깨질 수 있음 — 디버깅 시 퍼센트인코딩된 리터럴을 직접 쓰거나 파일로 저장해서 사용할 것 (Issue 11에서 `recrutPbancTtl` 디버깅 중 발견 — `--trace-ascii`로 실제 전송 바이트 비교해 확인)
