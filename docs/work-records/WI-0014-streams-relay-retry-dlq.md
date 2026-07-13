---
id: WI-0014
title: PP-012 Redis Streams Relay 재시도 DLQ
type: work-record
status: planned
date: 2026-07-13
owners:
  - placepick-team
related:
  - ../roadmap.md
  - ../adr/ADR-0006-api-worker-outbox-events.md
  - ../adr/ADR-0007-provider-and-live-boundary.md
paths:
  - backend/src/main/java/com/placepick/messaging/outbox/**
  - backend/src/main/java/com/placepick/messaging/streams/**
  - backend/src/main/java/com/placepick/runtime/**
  - backend/src/test/java/com/placepick/messaging/**
  - backend/src/integrationTest/java/com/placepick/messaging/**
  - backend/src/main/resources/application*.yml
  - docs/contracts.md
  - docs/runbooks/redis-streams-recovery.md
---

# WI-0014 PP-012 Redis Streams Relay 재시도 DLQ

## 문제와 근거

PP-011이 outbox를 저장해도 relay와 consumer가 중복, crash, pending message와 poison
event를 안전하게 처리하지 못하면 Job은 QUEUED에 멈추거나 같은 외부 작업을 여러 번
실행한다. Redis XADD 성공 직후 DB publish 표시 전에 process가 종료되는 경우와 DB
commit 뒤 ACK 전에 종료되는 경우에는 중복 delivery가 정상적으로 발생하므로
exactly-once 가정으로 숨길 수 없다.

## 목적과 성공 기준

목적은 outbox에서 Redis Streams로 명령을 전달하고 Worker가 at-least-once 의미로
소비하며 제한 재시도와 DLQ를 운영자가 복구할 수 있게 구현하는 것이다.

- relay는 PENDING outbox를 availableAt 순으로 최대 100개 가져오고 짧은 lease와
  SELECT FOR UPDATE SKIP LOCKED로 여러 instance의 중복 선점을 제한한다.
- XADD 성공 뒤 PUBLISHED를 기록하며 그 사이 crash로 생긴 중복은 eventId와
  processed_event unique constraint로 무해하게 처리한다.
- api role은 relay·consumer를 실행하지 않고 worker role은 둘 다, all role은 로컬
  단일 process에서 둘 다 실행한다.
- recommendation-workers-v1 consumer group이 command를 읽고 domain transaction
  commit 뒤에만 ACK한다.
- 미완료 message는 기본 5분 idle 뒤 다른 consumer가 claim할 수 있고 처리 실패는
  5초, 30초, 2분 간격으로 최대 세 번 시도한 뒤 DLQ로 이동한다.
- DLQ는 원본 envelope, 시도 횟수, 비밀이 제거된 오류 분류와 실패 시각을 보존하고
  metric·Runbook으로 수동 재처리 판단을 지원한다.

## 범위, 비범위와 제약

범위는 outbox relay scheduler, lease 회수, Redis Stream producer, consumer group
bootstrap, event parser·version 검사, idempotent consumer guard, pending claim,
retry·DLQ, runtime role 조건과 통합 테스트다. 실제 추천 pipeline side effect는
PP-017, dashboard와 alert는 PP-031에서 연결한다.

Redis가 unavailable이면 outbox를 실패로 소모하지 않고 다음 relay 주기에 재시도한다.
알 수 없는 event type·version, schema 위반과 반복되는 비재시도 오류는 외부 호출
없이 DLQ로 보낸다. 오류 payload에 provider response 전문, token, cookie와 사용자
원문을 넣지 않는다.

## 판단 기준과 대안

기준은 message 유실 방지, 중복 내성, 수평 확장, 장애 가시성, 자동 retry의 비용
상한과 사람의 복구 가능성이다.

- publish DB 표시를 XADD 전에 하면 유실될 수 있어 XADD 뒤 표시를 선택하고 중복을
  수용한다.
- 메시지를 읽자마자 ACK하면 처리 실패를 잃으므로 DB commit 뒤 ACK한다.
- 무한 retry는 poison event와 외부 비용을 누적시켜 세 번 뒤 DLQ를 선택한다.
- 모든 오류를 즉시 DLQ로 보내면 일시 Redis·DB 장애 복구력이 없어 retry 가능 오류를
  taxonomy로 분리한다.

claim idle 5분은 초기 안전 기본값이며 처리 중 heartbeat 또는 측정된 pipeline 시간이
이를 넘으면 살아 있는 consumer의 message를 빼앗지 않도록 조정한다. DLQ 재처리는
원본 eventId를 유지하고 처리 이력을 확인한 뒤 명시적인 운영 명령으로만 수행한다.

## 문제 해결 기록

1. PP-004 sequence를 relay와 consumer state machine으로 세분화한다.
2. XADD 전후와 DB commit·ACK 전후에 process 종료를 주입하는 통합 시나리오를 만든다.
3. 여러 relay instance의 SKIP LOCKED·lease와 여러 consumer의 pending claim을
   Testcontainers Redis·PostgreSQL에서 검증한다.
4. event 중복, 오래된 version, malformed payload와 poison handler를 실행한다.
5. retry 횟수·간격, DLQ payload redaction과 metric 증가를 검증한다.
6. Redis 재시작 후 group·pending 복구와 Runbook의 조회·재처리 절차를 대조한다.

## 구현 결과와 검증 증거

현재 status는 planned이며 relay, consumer, crash injection과 DLQ 증거는 없다. 완료
증거에는 XADD·DB 경계 crash, commit·ACK 경계 crash, 중복 무해성, 두 instance
경쟁, pending claim, 세 번 retry, DLQ redaction, Redis 재시작 통합 테스트와
./gradlew check 결과가 필요하다. 단일 happy path 소비만으로 전달 신뢰성을
완료 처리하지 않는다.

## AI 사용과 사람의 검증

AI는 state machine, failure injection, Redis command와 concurrency test 초안을
지원할 수 있다. 사람은 ACK·transaction 순서, lease·claim 시간, retry 분류,
DLQ 개인정보와 Runbook 실행 가능성을 검토한다. exactly-once를 근거 없이 주장하거나
오류를 무한 재시도하고 자동으로 실제 외부 호출을 반복하는 제안은 거절한다.

## 남은 위험과 학습

Worker 처리 시간이 claim idle보다 길면 정상 작업이 중복될 수 있고, 너무 길면 죽은
consumer 복구가 늦어진다. PP-034의 실제 처리 시간과 PP-031 metric을 근거로
heartbeat·claim 값을 조정한다. Redis 데이터 유실 시 DB outbox와 Job 상태에서
재구성할 수 있어야 하며, 복구가 검증되지 않으면 Redis를 정본으로 간주하지 않는다.
