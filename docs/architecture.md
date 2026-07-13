# 환경 단계 아키텍처

## 현재 경계

현재 저장소는 루트 Gradle 멀티 프로젝트와 `backend` Spring Boot 모듈로
구성한다. 환경 단계의 공개 HTTP 표면은 Actuator health와 Prometheus endpoint로
제한한다. 추천·투표·SSE 같은 비즈니스 기능은 계약이 확정되는 후속 단계다.

```text
Developer / Agent
  -> Makefile and scripts
    -> Gradle :backend
    -> Docker Compose local services
    -> documentation policy checks

Spring Boot
  -> PostgreSQL (schema authority: Flyway)
  -> Redis
  -> Mock Naver API
  -> Mock LLM API
  -> Actuator -> Prometheus -> Grafana
```

## 책임 경계

- Compose는 사람이 실행하는 장기 로컬 서비스와 관측성·부하 도구를 제공한다.
- Testcontainers는 테스트 프로세스가 PostgreSQL과 Redis의 생명주기를 소유한다.
- WireMock은 외부 Naver·LLM 응답, 오류와 timeout 계약을 재현한다.
- Flyway migration이 스키마를 만들고 JPA는 시작 시 매핑을 검증한다.
- k6는 환경 단계에서 health smoke만 수행하며 비즈니스 API 부하는 구현 후 추가한다.

통합 테스트 CI에 Compose service container를 함께 띄우지 않는다. 서로 다른
생명주기 관리자가 같은 의존성을 중복 제공하면 포트 충돌과 환경 차이를 만든다.

## 목표 모듈 규칙

후속 도메인 구현은 Controller, application, domain, adapter 경계를 유지한다.
외부 API DTO를 도메인·Entity에 노출하지 않고 외부 호출을 DB 트랜잭션 내부에서
수행하지 않는다. 추천 요청은 `RecommendationJob` 저장 후 Redis Streams 이벤트를
발행하고 Worker가 처리하는 비동기 흐름으로 확장한다.

## 품질과 관측성

단위 테스트는 Docker 없이 순수 규칙을 검증한다. 통합/계약 테스트는 실제 DB·Redis
프로토콜과 mock 외부 계약을 검증한다. 현재 Eval은 fixture 형식과 외부 연동 안전
정책을 검증하고, LLM 기능이 생기면 입력·출력 형식과 금지 표현 검증으로 확장한다.
k6는 현재 health smoke만 수행하고 API 계약·부하 특성 검증은 비즈니스 API 구현 후
추가한다. 도메인 메트릭은 기능이 생긴 뒤 낮은 cardinality로 추가하며 측정 전
수치를 문서 성과로 주장하지 않는다.
