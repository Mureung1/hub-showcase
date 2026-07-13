---
id: WI-0013
title: PP-011 추천 Job 202 Outbox 멱등성
type: work-record
status: planned
date: 2026-07-13
owners:
  - placepick-team
related:
  - ../roadmap.md
  - ../adr/ADR-0004-service-boundary.md
  - ../adr/ADR-0006-api-worker-outbox-events.md
paths:
  - backend/src/main/java/com/placepick/recommendation/job/**
  - backend/src/main/java/com/placepick/messaging/outbox/**
  - backend/src/test/java/com/placepick/recommendation/job/**
  - backend/src/integrationTest/java/com/placepick/recommendation/job/**
  - docs/contracts.md
  - docs/openapi/placepick-v1.yaml
  - docs/openapi/examples/recommendations/**
---

# WI-0013 PP-011 추천 Job 202 Outbox 멱등성

## 문제와 근거

추천 생성은 외부 검색과 LLM 처리를 HTTP 요청 안에서 완료할 수 없으므로 수락과
처리를 분리해야 한다. Job 저장과 Redis publish를 각각 실행하면 둘 중 하나만
성공하는 dual-write 장애가 생긴다. 브라우저 timeout 뒤 재시도나 double click이
중복 Job과 외부 API 비용으로 이어지지 않도록 Draft 소비와 멱등성도 같은 transaction
경계에서 결정해야 한다.

## 목적과 성공 기준

목적은 확인된 Draft를 정확히 한 추천 Job으로 수락하고 Job·idempotency·outbox를
원자적으로 저장한 뒤 202 계약을 반환하는 것이다.

- POST /api/v1/recommendations는 소유 session의 유효하고 추천 가능한 draftId와
  Idempotency-Key를 요구한다.
- 성공 응답은 202, UUID jobId, QUEUED status와
  /api/v1/recommendations/{jobId} Location을 반환하며 결과 후보를 포함하지 않는다.
- Draft row lock, CONSUMED 전이, Job 생성, idempotency record와
  recommendation.requested.v1 outbox 저장이 한 PostgreSQL transaction이다.
- 동일 session·operation·key와 동일 request hash 재시도는 기존 Job의 같은 202
  응답을 반환한다.
- 같은 key의 다른 payload, 이미 다른 key로 소비된 Draft와 동시 경쟁의 패자는
  각각 안정적인 409 errorCode를 받으며 추가 Job을 만들지 않는다.
- transaction rollback, DB timeout과 process 종료 뒤에도 orphan Job이나 소비만 된
  Draft가 남지 않는다.

## 범위, 비범위와 제약

범위는 추천 수락 application service, Job aggregate 생성, Draft 소비, idempotency
repository, outbox 기록, Controller와 계약·DB 통합 테스트다. Redis relay, Worker,
상태 조회와 SSE는 PP-012·PP-017~PP-019에서 구현한다.

Controller는 입력 변환과 application 위임만 담당하고 transaction 안에서 Redis나
외부 HTTP를 호출하지 않는다. request hash는 canonical draftId와 operation version을
기준으로 계산하며 원문 key를 로그에 출력하지 않는다. Idempotency record는 24시간
뒤 정리하되 연결된 Job은 7일 정책을 따른다.

## 판단 기준과 대안

기준은 202 의미의 정확성, 중복 비용 방지, DB 원자성, 장애 복구, client 재시도와
보안 격리다.

- 동기 200 결과는 timeout과 확장 문제뿐 아니라 확정 계약과 충돌해 제외한다.
- DB commit 후 Redis 직접 publish는 유실 간격이 있어 outbox를 선택한다.
- 같은 Draft에 여러 Job을 허용하면 사용자 확인을 재사용해 비용이 중복되므로
  Draft당 Job unique를 사용한다.
- 다른 idempotency key라도 기존 Job을 무조건 반환하면 client 오류를 숨기므로 이미
  소비된 Draft는 409와 기존 resource 위치를 소유 session에만 제공한다.

eventId와 jobId는 별도 UUID이며 event envelope의 aggregateId가 jobId를 가리킨다.
응답은 transaction commit 뒤에만 전송하고 relay 성공 여부를 기다리지 않는다.

## 문제 해결 기록

1. PP-002 202 schema와 PP-010 Draft 상태를 recommendation command로 연결한다.
2. lock 순서를 idempotency record 조회, Draft lock, Job·outbox 저장으로 일관되게
   설계해 deadlock 가능성을 줄인다.
3. 정상·같은 key 재시도·다른 payload·두 key 경쟁·만료 Draft를 통합 테스트한다.
4. outbox insert 또는 Job insert 실패를 주입해 전체 rollback을 확인한다.
5. 응답 Location, UUID와 202를 OpenAPI example 및 실제 HTTP로 대조한다.
6. Redis가 중지된 상태에서도 수락이 보존되고 후속 relay가 가능함을 검증한다.

## 구현 결과와 검증 증거

현재 status는 planned이며 추천 생성 endpoint, transaction과 장애 주입 결과는 없다.
완료 증거에는 202·Location 계약 테스트, 동시 재시도에서 Job·outbox 각 한 건,
rollback·Redis 중지 시나리오, idempotency 충돌과 ./gradlew check 결과가 필요하다.
DB row 존재만으로 Worker 처리 완료를 주장하지 않는다.

## AI 사용과 사람의 검증

AI는 transaction sequence, concurrency test, canonical hash와 오류 mapping 초안을
지원할 수 있다. 사람은 lock·unique constraint, commit 경계, 202 응답, 로그 redaction과
다른 session 격리를 검토한다. transaction 안에서 외부 호출하거나 200을 성공으로
허용하고 중복 Job을 나중에 정리하는 제안은 거절한다.

## 남은 위험과 학습

높은 동시성에서 Draft row와 idempotency unique index 경합이 지연을 만들 수 있다.
실측 전에는 처리량을 주장하지 않으며 PP-034 결과로 lock 대기와 transaction 시간을
분석한다. client가 24시간 뒤 같은 key를 재사용하는 의미와 Job 보존 기간이 충돌하면
API version과 재시도 기대를 함께 재검토한다.
