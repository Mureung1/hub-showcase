# DevPulse 개발 백로그

> 상태 갱신 방식: 작업 완료 시 상태를 Done으로 바꾸고, 새 작업 발견 시 하단에 추가

## 완료 (1주차)

|Task|설명|상태|
|-|-|-|
|기획서 확정|핵심 기능 3개, 사용자 시나리오, 화면구조|Done|
|프로토타입|순수 HTML/CSS, 3화면 (대시보드/상세/문서제안)|Done|
|DB 스키마|7테이블 + 복합FK + CHECK제약, Flyway 검증 완료|Done|
|JPA 엔티티/Repository|엔티티 7개, enum 4개, Repository 7개|Done|
|GitHub GraphQL Collector (기본)|Feign 클라이언트, DTO, 단일 페이지 조회|Done|
|React 환경 + 소개 컴포넌트|Vite, ProjectIntro.jsx|Done|
|CLAUDE.md|컨텍스트 파일 작성|Done|

## 백로그 (2\~4주차, 우선순위순)

|Task|설명|우선순위|예상 주차|상태|
|-|-|-|-|-|
|docker-compose.yml 영구화|PostgreSQL(+추후 Kafka) 로컬 실행 고정|P0|2주차|Todo|
|Collector 페이지네이션 + 저장|hasNextPage 반복 조회, 엔티티 매핑 후 JPA 저장 (Service 계층)|P0|2주차|Todo|
|AST 분류 에이전트|JavaParser로 커밋 diff 분석 → FEATURE/FIX/REFACTOR 등 분류|P0|2주차|Todo|
|MyBatis 우선순위 스코어링|commit\_log+issue\_log+doc\_status join 집계 → priority\_score 저장|P1|2주차 말\~3주차 초|Todo|
|QueryDsl 대시보드 조회 API|우선순위 정렬 + 조건 필터 REST API|P1|3주차|Todo|
|React 대시보드 실제 연동|프로토타입 화면 3개를 실 데이터로 재구현, CORS 설정|P1|3주차|Todo|
|Kafka 파이프라인 분리|수집→분석 비동기화 (동기 흐름 검증 후 진행)|P2|3주차 말\~4주차 초|Todo|
|문서 갱신 제안 (LLM 연동)|무료 LLM API 배치 호출, diff 제안 생성|P2|4주차|Todo|
|통합 테스트 · 예외처리|전체 파이프라인 e2e 확인|P2|4주차|Todo|
|최종 문서화 · 데모 준비|README/위키 최신화, 발표 자료|P2|4주차|Todo|



