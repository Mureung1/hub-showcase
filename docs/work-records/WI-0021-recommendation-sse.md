---
id: WI-0021
title: PP-019 추천 진행 상태 SSE
type: work-record
status: planned
date: 2026-07-13
owners:
  - placepick-team
related:
  - ../roadmap.md
  - ../adr/ADR-0005-anonymous-session-room-capability.md
  - ../adr/ADR-0006-api-worker-outbox-events.md
paths:
  - backend/src/main/java/com/placepick/recommendation/adapter/in/web/sse/**
  - backend/src/main/java/com/placepick/recommendation/application/event/**
  - backend/src/test/java/com/placepick/recommendation/event/**
  - backend/src/integrationTest/java/com/placepick/recommendation/adapter/in/web/sse/**
  - docs/contracts.md
---

# WI-0021 PP-019 추천 진행 상태 SSE

> GitHub Issue: [PP-019 #21](https://github.com/gdh0730/hub/issues/21)

## 문제와 근거

비동기 추천은 수 초 이상 걸릴 수 있어 클라이언트가 진행과 terminal 상태를 알아야 한다.
Redis Pub/Sub만 그대로 SSE에 연결하면 구독 전 이벤트, 네트워크 단절 중 이벤트와 서버
재시작 시 상태를 잃는다. 반대로 DB polling만 사용하면 지연과 불필요한 부하가 발생한다.
현재는 최초 snapshot, event ID, heartbeat, `Last-Event-ID`, 재연결과 연결 자원 해제에
대한 계약이 없어 새로고침과 중복 이벤트를 안전하게 처리할 수 없다.

## 목적과 성공 기준

`GET /api/v1/recommendations/{jobId}/events`에서 소유 세션에게 진행 이벤트를 전달하되 DB
snapshot을 정본으로 사용하여 연결 손실 뒤에도 최종 상태를 복구한다. 성공 기준은 다음과
같다.

- 연결 직후 현재 snapshot을 먼저 보내고 이후 증가하는 event ID의 progress 이벤트를
  전달한다.
- 유휴 연결에는 주기적 heartbeat를 보내 proxy timeout을 방지한다.
- `Last-Event-ID`가 없거나 오래됐어도 최신 DB snapshot으로 수렴하고 이벤트 누락 때문에
  결과가 달라지지 않는다.
- completed 또는 failed terminal 이벤트 전송 후 연결을 정상 종료한다.
- 다른 세션·없는·만료 job에 PP-018과 일관된 권한·404·410 정책을 적용한다.
- client disconnect, timeout과 server shutdown 후 listener, scheduler와 emitter가 남지
  않는다.

## 범위, 비범위와 제약

범위는 SSE endpoint, event envelope, snapshot-first 흐름, Redis의 일시 fan-out adapter,
heartbeat, reconnect, terminal close와 resource cleanup 테스트다. 영구 상태와 replay
정본은 PP-017·PP-018의 DB snapshot이며 Redis Pub/Sub를 영속 event log로 취급하지 않는다.
브라우저 UI 연결은 PP-022, 방 투표 SSE는 PP-025의 별도 resource 계약이다. SSE payload에
provider 원문, 세션 token과 내부 worker 오류를 포함하지 않는다.

## 판단 기준과 대안

기준은 복구 가능성, 단방향 진행 알림의 단순성, 동일 snapshot 모델 재사용, 메모리
안전성과 운영 관측성이다. WebSocket은 양방향 기능이 필요 없고 인프라 복잡도가 커서
제외한다. Redis Pub/Sub 단독 replay는 유실 복구가 없어 제외한다. 모든 진행 이벤트를
별도 영구 log로 보존하는 방안은 현재 사용자 가치에 비해 저장·정리 부담이 커서 제외한다.
고정 결정은 DB snapshot-first와 Redis의 transient fan-out을 조합하고, 재연결은 최신
snapshot으로 수렴시키는 것이다.

## 문제 해결 기록

1. PP-018 snapshot과 공유할 상태 payload, SSE event type, event ID, retry hint와 heartbeat
   형식을 계약에 고정한다.
2. 연결 시 세션 소유권과 resource 상태를 확인하고 emitter 등록 전에 DB snapshot을
   읽는 순서를 구현한다.
3. application 상태 변경을 fan-out event로 변환하고 완료·실패 경쟁에서도 terminal
   이벤트가 한 번만 보이도록 연결별 직렬화를 적용한다.
4. 연결 중단, 느린 client, heartbeat, Redis 단절, `Last-Event-ID`, server shutdown을
   통합 테스트하고 모든 callback에서 cleanup이 실행되는지 확인한다.
5. active connection, disconnect, delivery failure를 낮은 cardinality metric으로 노출할
   경계를 만들고 계약·Runbook Task에 전달한다.

## 구현 결과와 검증 증거

현재 상태는 `planned`이며 SSE endpoint, fan-out 구현과 연결 수 측정은 아직 없다. 완료
시 다음 증거를 확보한다.

- 첫 이벤트가 snapshot이고 event ID가 증가하며 heartbeat가 계약 형식인 HTTP 통합 테스트
- `Last-Event-ID` 누락·과거 값·중복 이벤트에서 최신 상태로 수렴하는 재연결 테스트
- completed·failed terminal close와 다른 세션·404·410 권한 테스트
- 반복 연결·즉시 해제, 느린 client와 shutdown 후 active emitter 수가 기준값으로 돌아오는
  자원 정리 테스트
- Redis fan-out 중단 중에도 PP-018 snapshot으로 terminal 결과를 복구하는 장애 테스트와
  `make check` 결과

## AI 사용과 사람의 검증

AI에는 SSE event 순서의 race scenario, 재연결과 resource cleanup test 초안을 위임할 수
있다. 사람은 브라우저 EventSource 제약, cookie 기반 권한, proxy buffering·timeout,
emitter lifecycle과 metric cardinality를 직접 검토한다. 단위 테스트만으로 메모리 누수가
없다고 결론 내리지 않고 반복 통합 실행의 active resource 결과를 확인한다.

## 남은 위험과 학습

다중 API instance에서 fan-out 순서가 달라지거나 proxy가 buffering해 지연될 수 있으며,
느린 client가 connection 자원을 오래 점유할 수 있다. 운영 topology 변경, 재연결 폭증,
event 순서 회귀나 자원 미회수가 관찰되면 영속 event log 또는 backpressure 정책을
재검토한다. 현재는 구현 전이므로 실시간 지연이나 동시 연결 수에 대한 성과 증거가 없다.
