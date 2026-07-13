---
id: WI-0026
title: PP-024 투표 변경·삭제·동시성 정합성
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
  - backend/src/main/java/com/placepick/room/domain/vote/**
  - backend/src/main/java/com/placepick/room/application/vote/**
  - backend/src/main/java/com/placepick/room/adapter/in/web/vote/**
  - backend/src/test/java/com/placepick/room/vote/**
  - backend/src/integrationTest/java/com/placepick/room/vote/**
  - docs/contracts.md
---

# WI-0026 PP-024 투표 변경·삭제·동시성 정합성

## 문제와 근거

익명 참여자가 같은 후보에 요청을 재전송하거나 LIKE에서 DISLIKE로 바꾸고 삭제할 수
있어야 하지만 단순 insert와 count 증감만 사용하면 중복 집계와 lost update가 발생한다.
여러 API instance에서 Redis counter를 정본으로 사용하면 DB와 불일치한 집계를 복구하기
어렵고, client가 전달한 voter ID를 신뢰하면 다른 사용자의 표를 변경할 수 있다. 현재는
서버 익명 세션을 기준으로 한 한 표 제약, resource 지향 PUT/DELETE, 동시성 정책과 집계
재계산 기준이 없다.

## 목적과 성공 기준

각 익명 세션이 방의 각 후보에 대해 최대 하나의 LIKE 또는 DISLIKE를 가지며 같은 API로
안전하게 변경·삭제하고 동시 요청 뒤에도 DB와 집계가 일치하게 한다. 성공 기준은 다음과
같다.

- `PUT /api/v1/rooms/{shareToken}/votes/{placeId}`는 body의 LIKE/DISLIKE를 create 또는
  replace하고 동일 값 재전송은 집계를 바꾸지 않는 멱등 성공이다.
- `DELETE`는 현재 세션의 표만 제거하며 없는 표 삭제도 정의된 멱등 결과를 반환한다.
- voter identity는 server-issued 익명 세션에서만 얻고 client-provided session/voter ID를
  받거나 신뢰하지 않는다.
- DB unique constraint가 room·place·session당 한 표를 최종 보장하고 concurrent PUT/DELETE
  후 aggregate가 vote row에서 재계산 가능한 값과 같다.
- 없는 후보, 다른 room 후보, 만료·확정된 방, 변조 token과 다른 세션 접근을 안정적인
  Problem Details로 처리한다.
- Redis를 사용한 집계 cache가 불일치하거나 유실돼도 DB 정본으로 복원할 수 있다.

## 범위, 비범위와 제약

범위는 vote value와 invariant, PUT/DELETE application service, controller, DB concurrency,
aggregate query/update, optional Redis cache 무효화와 통합 테스트다. room 생성·만료는
PP-023, SSE fan-out과 최종 확정 경쟁은 PP-025, 참여자 UI는 PP-026이 담당한다. 투표자는
계정으로 식별하지 않고, IP나 fingerprint를 영구 voter ID로 저장하지 않는다. Redis
counter는 성능 최적화일 뿐 정합성 정본이 아니다.

## 판단 기준과 대안

기준은 멱등성, 권한 격리, 동시 요청의 최종 정합성, 재계산 가능성, 개인정보 최소화다.
POST append 방식은 같은 사용자의 변경과 재전송을 구분하기 어려워 제외한다. application
메모리 lock은 다중 instance에서 작동하지 않아 제외한다. Redis atomic counter만 정본으로
쓰는 방식은 DB vote와 분리 장애가 있어 제외한다. 고정 결정은 resource PUT/DELETE, DB
unique constraint와 짧은 transaction으로 표를 저장하고 집계를 DB에서 검증·재구성하는
것이다.

## 문제 해결 기록

1. PP-002와 ADR-0005에서 vote enum, 권한, 멱등 응답, 방 상태별 404·409·410 의미를 API
   및 domain 전이표로 확정한다.
2. session·room·place unique key와 후보 소속 검사를 transaction 안에서 적용하고 create,
   same-value, replace, delete 결과를 명시적으로 구분한다.
3. optimistic retry 또는 DB upsert 중 PostgreSQL에서 예측 가능한 방안을 선택하고 duplicate
   key·serialization 경합을 제한 횟수로 처리한다.
4. 집계는 vote row의 group count를 기준으로 계산하고 Redis cache가 있다면 commit 후
   invalidation과 cache miss 재구성을 구현한다.
5. barrier를 사용한 concurrent PUT/DELETE 통합 테스트와 만료·확정 경쟁, 다른 세션·후보
   오류, 반복 요청을 검증한다.

## 구현 결과와 검증 증거

현재 상태는 `planned`이며 vote API, DB 경합 테스트와 집계 측정 결과는 아직 없다. 완료
판정에는 다음 증거가 필요하다.

- LIKE create·same-value·LIKE→DISLIKE replace·DELETE·반복 DELETE의 계약 테스트
- 다른 세션의 표를 변경·삭제할 수 없고 client voter ID가 수용되지 않는 보안 테스트
- 여러 thread의 PUT/DELETE barrier 통합 테스트 후 unique row 수와 LIKE/DISLIKE 집계가
  DB 재계산 결과와 같은 증거
- 만료·확정과 투표가 경쟁할 때 허용된 한 가지 결과로 수렴하는 transaction 테스트
- Redis cache flush·오염 후 DB에서 정확히 복원되는 결과, 로그의 세션 원문 비노출과
  `make check` 성공 로그

## AI 사용과 사람의 검증

AI에는 상태 전이 조합, concurrency interleaving과 barrier test 초안을 위임할 수 있다.
사람은 PostgreSQL constraint·transaction isolation, retry 상한, session 권한, 집계 cache의
정본 오용 여부를 직접 검토한다. 단일 thread 테스트나 Redis counter 일치만으로 동시성
완료를 판정하지 않고 실제 DB 경합 실행 결과를 확인한다.

## 남은 위험과 학습

높은 동시성에서 hot room row 경합과 재시도 폭증이 생길 수 있고 API instance 간 cache
무효화 지연이 일시적 표시 차이를 만들 수 있다. PP-034 부하 실험에서 latency·충돌률이
증가하거나 집계 불일치가 한 번이라도 재현되면 locking·aggregate 전략을 재검토한다.
현재는 동시성 안전성과 처리량에 대한 실행 증거가 없는 계획 상태다.
