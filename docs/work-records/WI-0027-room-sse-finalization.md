---
id: WI-0027
title: PP-025 투표방 SSE와 주최자 최종 장소 확정
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
  - backend/src/main/java/com/placepick/room/**
  - backend/src/main/java/com/placepick/infrastructure/messaging/**
  - backend/src/main/resources/db/migration/**
  - backend/src/test/java/com/placepick/room/**
  - backend/src/integrationTest/java/com/placepick/room/**
  - docs/contracts.md
  - docs/runbooks/room-realtime*.md
---

# WI-0027 PP-025 투표방 SSE와 주최자 최종 장소 확정

## 문제와 근거

PP-025는 참여자의 투표 변경을 다른 참여자와 주최자에게 전달하고, 주최자가 하나의
후보를 최종 결과로 확정하는 경계를 담당한다. 단순 조회 반복만 사용하면 갱신 지연과
불필요한 요청이 늘고, Redis 알림만 정본으로 사용하면 재시작이나 연결 단절 때 상태를
잃을 수 있다. 또한 공개 share token과 주최자 권한을 구분하지 않으면 링크를 받은 모든
참여자가 결과를 확정할 수 있다.

현재 저장소에는 투표방 SSE endpoint, 최종 결과 저장 규칙, organizer capability 검증,
재연결 계약이 구현되어 있지 않다. 따라서 이 문서는 구현 완료 기록이 아니라 PP-025가
검증해야 할 문제와 결정 경계를 고정하는 계획 기록이다.

## 목적과 성공 기준

목적은 DB를 투표와 최종 결과의 정본으로 유지하면서, 일시적인 실시간 전달 계층을 통해
방 상태를 지연 없이 갱신하고 주최자만 결과를 한 번 확정하게 만드는 것이다.

성공 기준은 다음과 같다.

- `GET /api/v1/rooms/{shareToken}/events`가 연결 직후 DB snapshot을 보내고 이후 투표
  집계와 최종 확정 event를 SSE로 전달한다.
- 모든 event는 안정적인 ID와 종류, 방 식별자, 발생 시각, 현재 집계를 가지며 heartbeat와
  `Last-Event-ID` 재연결 계약을 지킨다.
- 연결이 끊겼다가 다시 열려도 최신 DB snapshot으로 누락을 보정하고 중복 event가 화면
  집계를 중복 증가시키지 않는다.
- `PUT /api/v1/rooms/{shareToken}/final-result`는 organizer capability를 검증하고 후보를
  원자적으로 확정한다.
- 같은 후보의 재확정은 멱등 성공하고, 이미 확정된 방에서 다른 후보를 지정하면 409와
  안정적인 오류 코드를 반환한다.
- 만료된 방은 SSE 연결과 확정 요청 모두 410이며, terminal event 뒤 서버 자원을 정리한다.

## 범위, 비범위와 제약

범위는 방 event envelope, DB snapshot 조회, Redis Pub/Sub 기반 fan-out, SSE 연결 수명,
organizer capability 검증, final result transaction과 관련 API·통합 테스트다. 투표 생성·
변경·삭제의 도메인 규칙은 PP-024의 결과를 사용하고, 참여자 화면은 PP-026에서 구현한다.

WebSocket 양방향 채널, 채팅, 최종 결과 변경 이력 UI, 다중 주최자 위임은 포함하지 않는다.
Redis는 전달 가속 계층일 뿐 정본이 아니며, 외부 API 호출은 이 흐름에 포함하지 않는다.
DB transaction 안에서 Redis publish를 실행하지 않고 commit 이후 event를 발행한다.

## 판단 기준과 대안

판단 기준은 권한 분리, 재연결 시 정합성, 멱등성, 장애 복구 가능성, 운영 복잡도 순이다.

- 짧은 polling은 구현이 단순하지만 지연과 요청량이 증가해 제외한다.
- WebSocket은 양방향 확장성이 있지만 현재 요구는 서버 단방향 갱신이며 연결·프록시
  운영 부담이 커 제외한다.
- Redis Streams replay만으로 화면을 복원하는 방식은 장기 event 보존과 consumer 관리가
  과도하다. 연결 때 DB snapshot을 정본으로 보내고 Pub/Sub은 일시 fan-out에만 사용한다.
- share token 자체를 주최자 권한으로 쓰는 방식은 공유와 관리 권한이 결합되므로 제외한다.

선택은 snapshot-first SSE, DB 정본, commit 이후 Pub/Sub 알림, 별도 organizer capability다.
event ID는 서버가 단조 증가 가능한 방별 sequence로 만들고 클라이언트는 ID가 이전과 같거나
작은 event를 무시한다. 최종 확정은 DB unique/상태 제약과 조건부 update로 직렬화한다.

## 문제 해결 기록

1. PP-023과 PP-024가 제공할 room, 후보, 투표, capability 경계를 선행 조건으로 식별했다.
2. 공개 링크와 관리 권한이 다른 보안 주체라는 점을 기준으로 endpoint 권한을 분리했다.
3. 연결 단절 중 event 유실을 replay 저장소로 해결할지 snapshot으로 보정할지 비교했다.
4. 최종 상태의 정본이 DB이므로 매 연결의 최신 snapshot이 누락과 중복을 가장 단순하게
   제거한다는 결정을 기록했다.
5. 구현 단계에서는 event envelope와 오류 계약을 먼저 고정하고, repository의 조건부
   확정, publish-after-commit, SSE adapter 순서로 연결한다.
6. 마지막으로 동시 확정, Redis 중단, 재연결, 방 만료와 연결 해제를 통합 테스트한다.

이 기록은 설계 단계의 판단 순서이며 실제 구현 관찰이나 시험 결과를 의미하지 않는다.

## 구현 결과와 검증 증거

PP-025 구현과 검증은 아직 수행되지 않았다. 완료 판단에는 다음 증거가 모두 필요하다.

- organizer capability 없음·변조·다른 방 capability가 각각 403으로 거부되는 계약 테스트
- 같은 후보 동시 확정은 하나의 결과로 수렴하고 다른 후보 경합은 하나만 성공하는 DB
  통합 테스트
- SSE 최초 snapshot, 증가 event ID, heartbeat, 투표 변경, 최종 확정, terminal close를
  순서대로 확인하는 통합 테스트 report
- `Last-Event-ID` 재연결과 중복 event가 집계에 영향을 주지 않는 클라이언트 계약 fixture
- Redis를 중단해도 DB 조회와 최종 확정 정합성이 유지되고, 복구 뒤 새 알림이 전달되는
  장애 시나리오 로그
- 반복 연결·해제 후 emitter와 listener 수가 원래 수준으로 돌아오는 자원 누수 검사
- `make integration`과 `make check`의 성공 결과 및 실제 외부 API가 호출되지 않았다는 증거

증거가 확보되기 전에는 status를 `done`으로 변경하거나 실시간 기능이 완성됐다고 주장하지
않는다.

## AI 사용과 사람의 검증

AI에는 기존 계약 탐색, event 상태표 초안, 동시성·재연결 테스트 후보와 오류 분류를
위임할 수 있다. 생성된 동시성 제어 코드나 SSE 자원 정리 코드는 설명 가능하고 재현되는
테스트를 통과할 때만 채택한다.

사람은 share token과 organizer capability의 권한 경계, 최종 확정 불변식, 409/410 의미,
Redis 장애 시 기대 동작을 검토한다. 브라우저 개발자 도구와 서버 metric으로 실제 연결
해제를 확인하고, 로그에 token·cookie가 남지 않는지도 직접 검증한다.

## 남은 위험과 학습

프록시 buffering이나 idle timeout은 로컬 테스트와 다른 SSE 끊김을 만들 수 있다. 운영
패키징이 확정되면 heartbeat 주기와 proxy 설정을 함께 재검토한다. 다중 인스턴스에서 event
순서를 보장하지 못하면 방별 sequence 생성 위치를 DB로 옮겨야 한다. 방 규모와 연결 수가
SSE 방식의 운영 한계를 넘는다는 측정 결과가 나오면 WebSocket 전환을 새 ADR로 검토한다.

핵심 학습 기준은 실시간 전달 성공과 상태 정합성을 분리하는 것이다. 알림이 유실되어도
DB snapshot과 멱등 API만으로 사용자가 올바른 최종 상태를 회복할 수 있어야 한다.
