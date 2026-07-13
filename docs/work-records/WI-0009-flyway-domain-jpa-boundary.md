---
id: WI-0009
title: PP-007 Flyway 스키마 도메인 JPA 경계
type: work-record
status: planned
date: 2026-07-13
owners:
  - placepick-team
related:
  - ../roadmap.md
  - ../adr/ADR-0004-service-boundary.md
  - ../adr/ADR-0005-anonymous-session-room-capability.md
  - ../adr/ADR-0006-api-worker-outbox-events.md
paths:
  - backend/build.gradle
  - backend/src/main/resources/db/migration/**
  - backend/src/main/java/com/placepick/domain/**
  - backend/src/main/java/com/placepick/infrastructure/persistence/**
  - backend/src/test/java/com/placepick/domain/**
  - backend/src/integrationTest/java/com/placepick/infrastructure/persistence/**
  - docs/architecture.md
---

# WI-0009 PP-007 Flyway 스키마 도메인 JPA 경계

> GitHub Issue: [PP-007 #9](https://github.com/gdh0730/hub/issues/9)

## 문제와 근거

현재 V1 migration은 환경 검증용 metadata 테이블만 만들며 서비스 aggregate와
영속성 제약이 없다. 애플리케이션 코드만으로 UUID, vote uniqueness, room 최종 확정,
outbox lease와 만료를 보장하면 동시 요청이나 process 재시작에서 불변식이 깨질 수
있다. JPA entity를 domain model로 직접 사용하면 persistence annotation과 lazy
loading이 비즈니스 규칙에 침투한다.

## 목적과 성공 기준

목적은 PP-003 도메인 정책과 PP-004 전달 구조를 PostgreSQL 제약과 분리된 persistence
adapter로 구현하는 것이다.

- anonymous_session, recommendation_draft, recommendation_job, outbox_event,
  processed_event, candidate, evidence, voting_room, vote, final_result,
  idempotency_record와 product_event 테이블을 Flyway 순방향 migration으로 만든다.
- PK와 외부 식별자는 PostgreSQL uuid이며 필요한 FK, unique, check, version,
  expires_at와 조회 index가 명시된다.
- share token, organizer capability, session과 CSRF secret은 원문이 아니라 hash만
  저장한다.
- domain object는 JPA·Spring·HTTP annotation에 의존하지 않고 repository port와
  mapper를 통해 entity와 변환된다.
- Hibernate ddl-auto validate로 신규 설치와 V1에서 upgrade가 모두 통과한다.
- ArchUnit이 domain에서 adapter, Spring, JPA와 외부 provider package로 향하는
  의존성을 거부한다.

## 범위, 비범위와 제약

범위는 Flyway migration, table·constraint·index, JPA entity, repository adapter,
domain model·repository port, mapping과 persistence 통합 테스트다. HTTP Controller,
Redis relay, 외부 API와 전체 추천 pipeline은 포함하지 않는다.

Vote는 room, session, place 조합 unique를 가지며 final_result는 room당 하나다.
outbox는 state와 available_at index, idempotency record는 session·operation·key
unique와 request hash를 가진다. 원문 provider response와 credential은 어떤
테이블에도 저장하지 않는다.

## 판단 기준과 대안

기준은 DB 수준 정합성, domain 독립성, migration 재현성, 동시성, 조회 패턴과
개인정보 최소화다.

- Hibernate schema 자동 생성은 빠르지만 운영 정본과 review 가능한 변경 이력이 없어
  제외하고 Flyway를 유지한다.
- entity를 domain으로 겸용하면 파일 수는 줄지만 영속성 세부사항과 proxy가 규칙에
  섞이므로 분리한다.
- token 원문 저장은 조회가 쉽지만 DB 노출 시 즉시 권한 탈취가 가능해 hash lookup을
  선택한다.
- application 검사만으로 unique를 보장하는 방식은 race가 있어 DB constraint를
  최종 정합성 기준으로 사용한다.

모든 migration은 이미 배포된 파일을 수정하지 않고 새 version으로 추가한다. 삭제는
TTL과 FK 순서를 따른 명시적 cleanup service가 수행하며 database cascade는 room
하위 vote·final result처럼 소유권이 분명한 관계에만 사용한다.

## 문제 해결 기록

1. PP-003 aggregate와 query를 table, key, lifecycle column으로 매핑한다.
2. PP-002의 외부 UUID와 PP-005의 데이터 최소화가 schema에 반영됐는지 검토한다.
3. 동시 생성·투표·확정·outbox claim을 unique, version과 transaction으로 모델링한다.
4. Flyway 신규 설치, V1 upgrade와 반복 시작 시나리오를 Testcontainers로 실행한다.
5. entity-domain mapper round trip과 repository query·만료 index를 검증한다.
6. ArchUnit 음성 사례로 domain의 persistence·HTTP 의존을 차단한다.

## 구현 결과와 검증 증거

현재 status는 planned이며 migration, entity와 통합 테스트 결과는 존재하지 않는다.
완료 증거에는 schema diff, Flyway 신규·upgrade 실행 로그, Hibernate validate,
constraint 경쟁 테스트, repository integration report, ArchUnit 결과와
./gradlew check가 필요하다. migration 파일만 존재하는 상태를 persistence 완료로
간주하지 않는다.

## AI 사용과 사람의 검증

AI는 aggregate-table mapping, index 후보, constraint 경계와 migration test 초안을
지원할 수 있다. 사람은 개인정보 column, cascade 삭제, transaction·lock 선택,
실제 query plan과 migration 안전성을 검토한다. 자동 생성 DDL이 기존 migration을
덮어쓰거나 과도한 index·원문 token 저장을 포함하면 거절한다.

## 남은 위험과 학습

초기 query 예상이 실제 부하와 다르면 index가 쓰이지 않거나 쓰기 비용을 늘릴 수
있다. PP-034 측정에서 slow query와 lock contention이 확인되면 실행 계획을 근거로
index를 새 migration에서 조정한다. schema 삭제·축소는 데이터 보존과 rollback
영향을 별도 결정하기 전에는 수행하지 않는다.
