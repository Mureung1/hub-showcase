# 자격증·스펙 취득 경로 플래너 — 개발 백로그

> 상태 갱신 방식: 작업 완료 시 상태를 Done으로 바꾸고, 새 작업 발견 시 하단에 추가

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

## 백로그 (개발 단계, 우선순위순)

| Task | 설명 | 우선순위 | 예상 주차 | 상태 |
|---|---|---|---|---|
| DB 스키마 설계 | Certification, JobPosting, CertificationMention, PrerequisiteEdge 등 | P0 | 2주차 | Todo |
| JPA 엔티티/Repository | 스키마 기반 엔티티·기본 CRUD | P0 | 2주차 | Todo |
| 워크넷/사람인 Collector | Feign 클라이언트, 채용공고 수집 | P0 | 2주차 | Todo |
| 자격증 정규화 에이전트 | 룰 기반 1차 매칭 + 애매 항목 LLM 배치 정규화 | P0 | 2주차 말~3주차 초 | Todo |
| 강조도 분류 (필수/우대/낮음) | 문맥 기반 분류 로직 | P1 | 3주차 | Todo |
| MyBatis 집계 쿼리 | 언급 빈도·강조도 join 집계 → 랭킹 | P1 | 3주차 | Todo |
| Java 그래프 알고리즘 (경로 최적화) | 선수조건 그래프 구성, 위상정렬, 순환탐지 | P1 | 3주차 | Todo |
| QueryDsl 동적 조회 API | 진행상황/필터 조회 REST API | P1 | 3주차 | Todo |
| Kafka 파이프라인 분리 | 수집→정규화→집계 비동기화 (동기 흐름 검증 후) | P2 | 3주차 말~4주차 초 | Todo |
| React 화면 실제 연동 | 프로토타입 2화면 → 실 데이터 연동, CORS 설정 | P1 | 4주차 | Todo |
| 통합 테스트 · 예외처리 | 전체 파이프라인 e2e 확인 | P2 | 4주차 | Todo |
| 최종 문서화 · 데모 준비 | README/위키 최신화, 발표 자료 | P2 | 4주차 | Todo |
