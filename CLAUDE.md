## 프로젝트
DevPulse — 여러 GitHub 레포의 커밋·이슈 상태를 수집해 방치 여부·우선순위를 판단하고,
코드와 어긋난 문서를 감지해 갱신을 제안하는 개인용 개발 관제 시스템

## 기술 스택
- React (FE) — 순수, 추가 UI 라이브러리 없음
- Java 17 + Spring Boot 3.x
- PostgreSQL (DB), Flyway로 마이그레이션 관리
- JPA(CRUD) / QueryDsl(대시보드 동적 조회) / MyBatis(우선순위 집계 쿼리) — 역할 분리, 섞어 쓰지 말 것
- Kafka — 수집→분석 파이프라인 비동기 분리
- Feign — GitHub GraphQL API, 무료 LLM API(Groq/Gemini) 호출

## 컨벤션
- 패키지 루트: com.punchman.devpulse
- 계층 구조: bootstrap / domain / collector / analyzer / agent / repository(jpa, querydsl, mybatis) / kafka / api
- 커밋: feature / fix / refactor / docs / test / config
- PR: main 브랜치로 직접 타겟하지 말 것 (auto-merge.yml이 자동 스킵함)
- 엔티티 간 @ManyToOne 연관관계 매핑 금지 — N+1 방지를 위해 평범한 FK 컬럼으로만 연결

## 하지 말 것
- 새 외부 의존성 추가 시 먼저 물어볼 것 (특히 UI 라이브러리, LLM 프레임워크)
- 로컬 무거운 LLM 실행 금지 — 무료 API(Groq/Gemini)만 사용
- 실시간 스트리밍 금지 — 배치 폴링(스케줄러)만 사용
- LLM은 배치 호출만, 전체 커밋마다 호출 금지 — 에이전트가 자체 판단으로 선별한 것만 호출
- 문서 자동 덮어쓰기 금지 — 갱신 제안만 생성, 사람 승인 후 반영
- Oracle, 벡터DB/RAG 사용 금지 (이 프로젝트 스코프 아님)

## 참고
- 기획서: @docs/DevPulse_기획서_v1.md
- 위키(기능/스택/제약조건): @docs/DevPulse_Wiki_Home.md
- 프로토타입: @docs/prototype.html
- PR 템플릿: @.github/pull_request_template.md
