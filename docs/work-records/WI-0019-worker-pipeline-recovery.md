---
id: WI-0019
title: PP-017 추천 Worker 파이프라인·복구
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
  - backend/src/main/java/com/placepick/recommendation/application/worker/**
  - backend/src/main/java/com/placepick/recommendation/adapter/in/stream/**
  - backend/src/main/java/com/placepick/recommendation/adapter/out/stream/**
  - backend/src/test/java/com/placepick/recommendation/worker/**
  - backend/src/integrationTest/java/com/placepick/recommendation/worker/**
  - docs/contracts.md
---

# WI-0019 PP-017 추천 Worker 파이프라인·복구

## 문제와 근거

추천은 장소·블로그 검색, 정규화, 점수화와 설명 생성처럼 실패 특성이 다른 여러 단계를
거친다. 단일 method에서 순차 실행하고 메시지를 먼저 ACK하면 중간 장애 때 job이
유실되고, ACK를 늦추기만 하면 재시작이나 consumer reclaim 시 같은 단계가 중복 수행될
수 있다. 블로그와 LLM의 선택적 실패를 전체 실패와 구분하지 않으면 사용할 수 있는
결과를 버리거나 불완전한 결과를 성공으로 오인한다. 현재는 단계 상태, 재진입 규칙,
DB commit과 ACK 순서, 제한 재시도와 terminal 결과 전이가 구현되지 않았다.

## 목적과 성공 기준

Redis Streams의 at-least-once delivery를 전제로 추천 job을 유실 없이 처리하고 모든
단계와 실패 원인을 DB snapshot으로 복구할 수 있게 한다. 성공 기준은 다음과 같다.

- 내부 lifecycle과 사용자용 processing stage를 분리하고 허용된 상태 전이만 적용한다.
- 동일 job event의 중복 수신과 worker 재시작이 후보·근거·결과를 중복 생성하지 않는다.
- 단계 결과와 다음 상태를 DB에 commit한 뒤에만 stream message를 ACK한다.
- 일시 오류는 횟수와 backoff가 제한된 재시도를 거치고 영구 오류와 poison message는
  안정적인 error code 또는 DLQ로 종료된다.
- Local 검색 실패는 terminal failure, Blog 검색 실패는 `LOCAL_ONLY` degraded completion,
  LLM 실패는 템플릿 fallback completion으로 분류한다.
- worker 중단 뒤 pending claim을 통해 작업이 재개되고 완료·실패 terminal job은 다시
  처리되지 않는다.

## 범위, 비범위와 제약

범위는 worker orchestrator, stage state machine, stream consumer, idempotent 단계 저장,
재시도·DLQ 연결, graceful shutdown과 통합 테스트다. outbox relay와 stream 기본 인프라는
PP-012, 공급자 adapter와 도메인 규칙은 PP-013~PP-016의 결과를 사용한다. API snapshot과
SSE는 PP-018·PP-019가 담당한다. 외부 HTTP 호출은 DB transaction 안에서 수행하지 않고,
worker concurrency나 timeout을 측정 전 성능 목표로 선언하지 않는다.

## 판단 기준과 대안

기준은 유실 방지, 중복 안전성, 단계별 관측 가능성, 선택적 실패 격리, 운영 복구
가능성이다. 메시지를 ACK하고 비즈니스 처리를 시작하는 방식은 빠르지만 crash 유실이
있어 제외한다. 전체 job을 하나의 긴 DB transaction으로 묶는 방식은 외부 호출 동안
lock과 connection을 점유하므로 제외한다. exactly-once를 주장하는 방식은 Redis와 DB
사이의 분산 transaction 없이 보장할 수 없어 제외한다. 고정 결정은 단계별 짧은 DB
transaction, deterministic idempotency key, commit 이후 ACK를 조합한 at-least-once
처리다.

## 문제 해결 기록

1. job lifecycle, processing stage, 단계별 입력·출력과 오류 분류를 전이표로 만들고
   허용되지 않은 전이를 명시적으로 거부한다.
2. event ID와 job ID 기반 처리 이력, 후보·근거 upsert key를 정의해 중복 수신의 효과를
   제거한다.
3. 외부 호출과 DB 갱신을 분리한 orchestrator를 구현하고 각 단계 완료 후 snapshot과
   다음 stage를 transaction으로 저장한다.
4. worker crash, Redis 연결 중단, DB commit 전·후 실패, pending reclaim과 poison message를
   Testcontainers fault 시나리오로 재현한다.
5. graceful shutdown에서 신규 message 수락을 중지하고 진행 중 transaction을 정리한 뒤
   미완료 message가 다음 worker에서 복구되는지 확인한다.

## 구현 결과와 검증 증거

현재 상태는 `planned`이며 worker 코드, 복구 테스트와 처리량 측정은 아직 없다. 완료
시에는 다음 증거를 남긴다.

- 상태 전이와 오류 분류 table test 결과
- 동일 event 반복 delivery에도 candidate·result가 한 번만 반영되는 통합 테스트
- DB commit 전 crash는 재처리되고 commit 후 ACK 실패는 무해한 중복으로 끝나는 장애
  주입 결과
- pending claim, 제한 재시도, poison message DLQ와 terminal 상태 검증
- Local·Blog·LLM 실패별 failed/degraded/fallback 결과와 graceful shutdown 복구 결과
- Testcontainers 기반 `./gradlew integrationTest` 및 `make check` 성공 로그

## AI 사용과 사람의 검증

AI에는 상태 전이 반례, 장애 주입 순서와 중복 delivery test 초안을 위임할 수 있다.
사람은 transaction 경계, ACK 시점, retry 대상과 횟수, DLQ에 비밀·개인정보가 남지 않는지
검토한다. AI가 exactly-once라고 표현하거나 재현하지 않은 복구를 성공으로 분류하면
채택하지 않고 실제 장애 주입 결과로만 판정한다.

## 남은 위험과 학습

consumer group 재조정, 긴 provider 지연과 worker 동시성으로 pending ownership 경합이
발생할 수 있다. 장애 주입에서 중복 side effect나 복구 지연이 관찰되거나 stream 운영
정책이 바뀌면 idempotency와 claim threshold를 재검토한다. 처리량과 복구 시간은
PP-031·PP-034에서 측정하기 전에는 성과로 주장하지 않으며 현재는 계획 상태다.
