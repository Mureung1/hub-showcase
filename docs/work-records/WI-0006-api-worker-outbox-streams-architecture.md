---
id: WI-0006
title: PP-004 API Worker Outbox Redis Streams 구조
type: work-record
status: planned
date: 2026-07-13
owners:
  - placepick-team
related:
  - ../roadmap.md
  - ../adr/ADR-0006-api-worker-outbox-events.md
paths:
  - docs/architecture.md
  - docs/contracts.md
  - docs/events/recommendation-events.md
  - docs/runbooks/README.md
---

# WI-0006 PP-004 API Worker Outbox Redis Streams 구조

> GitHub Issue: [PP-004 #6](https://github.com/gdh0730/hub/issues/6)

## 문제와 근거

추천은 HTTP 응답 시간 안에 Naver와 LLM 호출을 마치지 않고 Job을 수락한 뒤 처리해야
한다. DB에 Job을 저장한 뒤 Redis에 직접 publish하면 두 작업 사이의 장애로 요청이
영구 유실될 수 있고, Redis 메시지를 먼저 ACK하면 DB commit 실패 뒤에도 완료된
것처럼 보일 수 있다. 현재 계약은 event payload, version, consumer group, 재시도와
DLQ 의미를 확정하지 않았다.

## 목적과 성공 기준

목적은 단일 Java artifact를 API와 Worker 역할로 안전하게 실행하고, PostgreSQL과
Redis 사이에서 at-least-once 처리를 보장하는 구조를 확정하는 것이다.

- runtime role은 api, worker, all 세 값이며 로컬은 all, 운영 Compose는 api와 worker를
  별도 process로 실행한다.
- Job과 outbox event는 하나의 PostgreSQL transaction에서 저장된다.
- relay는 미발행 outbox를 Redis Stream에 전달하고 성공 기록 전후의 중복을 eventId로
  무해하게 처리한다.
- Worker는 consumer group으로 읽고 도메인 결과를 DB에 commit한 뒤에만 ACK한다.
- pending claim, process 재시작, 중복 delivery, 세 번의 처리 실패와 DLQ 이동을
  재현 가능한 시나리오로 정의한다.
- API와 room SSE는 DB snapshot을 정본으로 사용하고 Redis Pub/Sub은 현재 연결의
  저지연 알림에만 사용한다.

## 범위, 비범위와 제약

범위는 process role, outbox state, relay lease, Stream·consumer group·DLQ 이름,
event envelope, ACK 순서, retry 분류, idempotent consumer와 SSE fan-out 경계다.
Flyway와 실제 relay·consumer 코드는 PP-007·PP-012, 추천 pipeline은 PP-017,
SSE endpoint는 PP-019·PP-025에서 구현한다.

XA transaction이나 Redis를 장기 정본으로 사용하지 않는다. DB transaction 안에서
외부 HTTP를 호출하지 않으며 Pub/Sub 메시지 유실은 다음 DB snapshot으로 복구한다.
낮은 cardinality metric만 사용하고 event payload에 cookie, capability, provider key,
사용자 원문을 불필요하게 넣지 않는다.

## 판단 기준과 대안

기준은 유실 방지, 중복 내성, 운영 단순성, 수평 확장, 장애 관측성과 Java 17
단일 artifact 유지다.

- DB 저장 후 직접 Redis publish는 dual-write 간격이 있어 제외한다.
- XA는 Redis와의 현실적인 지원·운영 비용이 맞지 않아 제외한다.
- DB polling만으로 Worker를 구동하면 정합성은 단순하지만 지연과 확장 제어가
  불리해 transactional outbox와 Redis Streams를 선택한다.
- Pub/Sub만으로 작업을 전달하면 내구성이 없으므로 작업 명령은 Streams, 연결된
  client 알림만 Pub/Sub을 사용한다.

Stream은 placepick.recommendation.commands.v1, consumer group은
recommendation-workers-v1, DLQ는 placepick.recommendation.dlq.v1로 고정한다.
envelope는 eventId, eventType, eventVersion, aggregateId, occurredAt, traceId,
payload를 가진다. eventVersion은 1부터 시작하고 incompatible 변경은 새 version으로
병행한다.

## 문제 해결 기록

1. 추천 수락부터 Worker 완료까지 DB·Redis 경계와 장애 지점을 sequence로 그린다.
2. 각 장애 지점에서 정본, 재시도 주체, 중복 식별자와 관측 신호를 정의한다.
3. outbox lease, publish 표시와 stale lease 회수 규칙을 명세한다.
4. consumer의 DB commit·ACK 순서, pending claim과 최대 세 번 처리 후 DLQ를 정한다.
5. snapshot version과 Pub/Sub 알림이 SSE 재연결에서 일관된지 대조한다.
6. PP-007·PP-012·PP-017이 공유하는 event schema와 운영 Runbook 요구를 승인한다.

## 구현 결과와 검증 증거

현재 status는 planned이며 event schema, 장애 sequence와 실행 검증 결과는 확보되지
않았다. 완료 시 아키텍처 diagram, event example schema, 장애별 기대 결과 표,
중복·재시작·pending·DLQ 통합 테스트 설계와 npm run docs:check 결과를 남긴다.
실제 at-least-once 동작은 PP-012 통합 테스트 전에는 검증 완료로 표시하지 않는다.

## AI 사용과 사람의 검증

AI는 장애 지점 열거, event envelope 비교, 재시도 상태 조합과 sequence 초안을
지원할 수 있다. 사람은 transaction 경계, ACK 시점, 최대 시도 횟수, payload 최소화,
운영 복구 가능성을 검토한다. happy path만 설명하고 publish·commit 사이 유실이나
중복을 다루지 않은 제안은 거절한다.

## 남은 위험과 학습

at-least-once는 중복 자체를 제거하지 않으므로 모든 downstream side effect가
idempotent해야 한다. Worker가 처리 시간보다 짧은 claim timeout을 쓰면 살아 있는
작업을 중복 실행할 수 있다. 실제 처리 시간 분포와 DLQ 원인이 측정되면 lease,
batch 크기와 retry 간격을 Experiment로 재검토한다.
