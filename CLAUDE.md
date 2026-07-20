## 프로젝트
자격증·스펙 취득 경로 플래너 — 실제 채용공고 데이터를 기반으로 목표 직무에 필요한 자격증을
근거와 함께 걸러주고, 최적 취득 순서를 계산해주는 서비스

## 기술 스택
- React (FE) — 순수, 추가 UI 라이브러리 없음
- Java 17 + Spring Boot 3.x (BE)
- PostgreSQL (DB), Flyway로 마이그레이션 관리
- JPA(기본 CRUD) / QueryDsl(진행 상황 동적 필터 조회) / MyBatis(언급 빈도·강조도 집계 쿼리)
  — 역할 분리, 섞어 쓰지 말 것
- 자격증 취득 경로 최적화는 SQL 재귀 쿼리가 아니라 Java 그래프 알고리즘(위상 정렬)으로 구현
- Kafka — 채용공고 수집→정규화→집계 파이프라인 비동기 분리
- Feign — 사람인 Open API, 무료 LLM API(Groq/Gemini) 호출

## 컨벤션
- 패키지 루트: com.punchman.devpulse
- 계층 구조: bootstrap / domain / collector / normalizer / pathfinder(그래프 알고리즘) /
  repository(jpa, querydsl, mybatis) / service / kafka / api
- 커밋: feature / fix / refactor / docs / test / config
- PR: main 브랜치로 직접 타겟하지 말 것 (auto-merge.yml이 자동 스킵함)

## 하지 말 것
- 새 외부 의존성 추가 시 먼저 물어볼 것 (특히 UI 라이브러리, LLM 프레임워크)
- 로컬 무거운 LLM 실행 금지 — 무료 API(Groq/Gemini)만 사용
- 실시간 스트리밍 금지 — 사용자 트리거 + 주기적 배치 재수집만 사용
- LLM은 배치 호출만, 애매한 정규화 항목·최종 요약 생성에만 사용 (전체 텍스트를 매번 LLM에 넘기지 말 것)
- 잡코리아/인크루트/링커리어 등 커뮤니티 게시글 크롤링 금지 — 사람인 공식 API만 사용
- 자격증 취득 경로 계산에 SQL 재귀 쿼리(WITH RECURSIVE) 사용 금지 — Java 그래프 알고리즘으로 구현
  (순환 참조 탐지, 테스트 용이성 때문)

## 참고
- 기획서: @docs/기획서_v1.md
- 위키(기능/스택/제약조건): @docs/Wiki_Home.md
- PR 템플릿: @.github/pull_request_template.md
- docs/ 폴더는 이전 주제(DevPulse) 문서를 정리하고 새로 작성 중 — 화면 구조/프로토타입은 아직 없음
