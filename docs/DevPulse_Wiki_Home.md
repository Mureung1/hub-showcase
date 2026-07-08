# DevPulse Wiki

> Status: Plan (초안 — 개발 진행에 따라 갱신)

---

## 1. 핵심 기능 (Functional Requirements)

### FR-1. 레포 등록 및 수집
- **내용**: GitHub owner/repo를 등록하면 주기적으로 커밋·이슈·PR 데이터를 수집
- **구현 방식**: GitHub GraphQL API v4 호출 (Feign 클라이언트), `Project.lastAnalyzedAt` 이후 데이터만 `since` 파라미터로 증분 조회. 스케줄러(Spring `@Scheduled`)가 4~6시간 주기로 트리거

### FR-2. 변경사항 분류 (AST 기반)
- **내용**: 커밋 diff를 분석해 `FEATURE / FIX / REFACTOR / DOCS / TEST / CONFIG`로 자동 분류
- **구현 방식**: JavaParser로 변경 전/후 파일의 AST를 비교. 신규 클래스·메서드 시그니처 등장 여부, 기존 메서드 바디 변경 여부를 1차 판단 근거로 사용. 커밋 메시지 키워드는 보조 신호로만 사용

### FR-3. 방치도·우선순위 판단
- **내용**: 커밋 빈도, 미해결 이슈 수, 문서 staleness를 종합한 우선순위 스코어 산출
- **구현 방식**: MyBatis 집계 쿼리로 세 지표를 join + 가중합. 가중치는 하드코딩하지 않고 설정값(DB 또는 config)으로 분리해 튜닝 가능하게 함

### FR-4. 문서 최신성 감지 및 갱신 제안
- **내용**: FEATURE로 분류된 변경 중 문서에 반영 안 된 항목 탐지 → 갱신 제안(diff 형태)만 생성, 자동 반영은 안 함
- **구현 방식**: 문서 감지 컨슈머가 "반영 가능성 높음"으로 자체 판단한 항목만 선별 → 선별된 것만 무료 LLM API(Feign, Groq/Gemini)에 배치 요청해 초안 문구 생성. 전체 커밋에 대해 LLM을 부르지 않음

### FR-5. 통합 대시보드
- **내용**: 등록된 전체 프로젝트를 우선순위 순으로 노출, 필터링 가능
- **구현 방식**: QueryDsl로 동적 조건 조회 API 구성 (예: 우선순위 상위 N개 + 문서 미갱신만). React 프론트에서 REST API 호출해 카드 형태로 렌더링

### FR-6. 프로젝트 소개 페이지
- **내용**: 프로젝트를 소개하는 정적 페이지
- **구현 방식**: React(순수, 추가 라이브러리 없음), `ProjectIntro` 컴포넌트 — 완료

---

## 2. 비기능 요구사항 (Non-Functional Requirements)

| 항목 | 요구사항 |
|---|---|
| 비용 | 개발·테스트 전 구간 $0 |
| 실시간성 | 스트리밍 금지 — 스케줄러 기반 배치 폴링만 사용 |
| API 호출 효율 | GraphQL로 필요한 필드만 단일 요청에 조회, 증분 수집으로 중복 호출 방지 |
| LLM 사용 범위 | 배치 호출만, 레포당 1일 수 회 이내, 무료 tier 한도 내 |
| 확장성 | 등록 레포 수 증가 시 Kafka 컨슈머 분리로 병목 방지 |
| 유지보수성 | 우선순위 가중치·분류 규칙은 코드 재배포 없이 조정 가능해야 함 |
| 보안 | GitHub Token은 환경변수로만 관리, 저장소에 커밋 금지 |
| 테스트 용이성 | 실제 개인 레포로 즉시 반복 테스트 가능해야 함 |

---

## 3. 기술 스택

| 구분 | 기술 | 역할 |
|---|---|---|
| 언어 | Java 17 | 백엔드 전체 |
| 프레임워크 | Spring Boot 3.x | 애플리케이션 기반 |
| CRUD | JPA (Hibernate) | Project, CommitLog, IssueLog, AgentRun 저장/조회 |
| 동적 조회 | QueryDsl | 대시보드 조건 조합형 필터 조회 |
| 집계 쿼리 | MyBatis | 우선순위 스코어링 (join + 가중합 raw SQL) |
| DB | PostgreSQL | 전체 데이터 저장 (Docker 로컬) |
| 메시징 | Kafka | 수집 → 분석 파이프라인 비동기 분리 |
| 외부 API 클라이언트 | Feign | GitHub GraphQL, 무료 LLM API |
| AST 파싱 | JavaParser | 커밋 diff 구조 분석 |
| 프론트엔드 | React (순수) | 프로젝트 소개 페이지, 대시보드 UI |
| CI/CD | GitHub Actions | 기존 auto-merge.yml 컨벤션 유지 |
| 컨테이너 | Docker Compose | PostgreSQL, Kafka 로컬 실행 |

---

## 4. 제약조건 (Constraints)

- 개발 환경: 개인 노트북 — 로컬에서 무거운 LLM 실행 불가
- API 비용: 무료 tier만 사용 (GitHub API, Groq/Gemini)
- 실시간 스트리밍 금지: rate limit·비용 문제로 배치 폴링만 허용
- Oracle 미사용: 개인 개발 환경에 부적합, PostgreSQL로 대체 (Repository 계층 추상화로 교체 가능성만 열어둠)
- RAG/벡터DB 미사용: 검색증강생성이 필요 없는 구조 (정형 데이터 기반 판단)
- 개발 기간: 4주 (캠프 일정)
- 문서 자동 갱신은 사람 승인 없이 반영되지 않음 (안전장치)

---

## 5. 기능별 구현 매핑 요약

| 기능 | 사용 기술/API | 데이터 흐름 |
|---|---|---|
| 레포 데이터 수집 | GitHub GraphQL API (Feign) | 외부 API → Kafka(`project.commit.collected`) → DB(JPA) |
| 변경 유형 분류 | JavaParser | Kafka 컨슈머 내부 로직 → `commit_log.change_type` 업데이트(JPA) |
| 우선순위 스코어링 | MyBatis | `commit_log` + `issue_log` + `doc_status` join 집계 → `priority_score` 저장 |
| 문서 갱신 제안 | 무료 LLM API (Feign) | 컨슈머 자체 판단 → 선별된 항목만 LLM 배치 호출 → `doc_suggestion` 저장 |
| 대시보드 조회 | QueryDsl | REST API → 동적 조건 조회 → React 프론트 렌더링 |
| 프로젝트 소개 | React | 정적 컴포넌트 (외부 데이터 없음) |

---

*(다음 갱신 예정: DB 스키마 상세, 에이전트 시퀀스 다이어그램, API 명세)*
