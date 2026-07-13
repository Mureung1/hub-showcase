---
id: WI-0025
title: PP-023 투표방 생성·조회·만료·공유
type: work-record
status: planned
date: 2026-07-13
owners:
  - placepick-team
related:
  - ../roadmap.md
  - ../adr/ADR-0004-service-boundary.md
  - ../adr/ADR-0005-anonymous-session-room-capability.md
paths:
  - backend/src/main/java/com/placepick/room/domain/**
  - backend/src/main/java/com/placepick/room/application/**
  - backend/src/main/java/com/placepick/room/adapter/in/web/**
  - backend/src/test/java/com/placepick/room/**
  - backend/src/integrationTest/java/com/placepick/room/**
  - docs/contracts.md
---

# WI-0025 PP-023 투표방 생성·조회·만료·공유

## 문제와 근거

추천 결과를 여러 사람이 투표하려면 공개 공유 식별자와 주최자 권한을 분리해야 한다.
순차 room ID나 UUID를 그대로 URL에 노출하면 resource 추측과 내부 식별자 결합이 생기며,
share link 하나로 최종 확정 권한까지 얻을 수 있으면 모든 참여자가 주최자 행위를 할 수
있다. 또한 만료가 정의되지 않으면 익명 세션과 투표 데이터가 불필요하게 남는다. 현재는
완료된 추천에서 방을 생성하는 조건, 불투명 share token, organizer capability hash,
조회 snapshot과 404·410 의미가 구현되지 않았다.

## 목적과 성공 기준

완료된 추천 결과로만 투표방을 만들고 누구나 share token으로 후보를 조회하되 주최자
권한은 별도 capability로 보호한다. 성공 기준은 다음과 같다.

- `POST /api/v1/recommendations/{jobId}/rooms`는 job 소유 세션과 completed/degraded terminal
  결과를 검사하고 201로 방을 생성한다.
- 추측하기 어려운 share token은 URL에 사용하고 organizer capability는 별도 HttpOnly,
  SameSite=Lax cookie로 전달하며 서버에는 안전한 hash만 저장한다.
- 동일 idempotency key 재전송은 같은 방을 반환하고 한 추천에 의도치 않은 중복 방을
  만들지 않는다.
- `GET /api/v1/rooms/{shareToken}`은 후보 snapshot, 집계 초기값, 만료 시각과 final 상태만
  제공하고 organizer capability나 내부 ID를 노출하지 않는다.
- 존재하지 않거나 변조된 token은 정보가 새지 않는 404, 만료된 방은 410으로 처리한다.
- 만료 뒤 조회·투표·확정이 모두 차단되도록 domain과 DB 기준 시각을 일관되게 사용한다.

## 범위, 비범위와 제약

범위는 room aggregate, token/capability 생성·hash·검증, create/read application service,
HTTP controller, idempotency, expiry 정책과 통합 테스트다. 투표 변경·삭제는 PP-024, 실시간
집계와 최종 확정은 PP-025, room UI는 PP-026의 범위다. share token을 인증 credential로
간주해 최종 확정 권한을 부여하지 않으며, token·capability 원문을 DB·로그·metric·문서에
남기지 않는다. 운영 `Secure` cookie와 local 개발 호환 조건을 profile별로 검증한다.

## 판단 기준과 대안

기준은 공유 편의, 최소 권한, 추측 저항성, token 유출 영향 제한, 멱등성과 데이터 수명이다.
room ID를 URL에 쓰는 방안은 구현은 쉽지만 내부 식별자 노출로 제외한다. share token
하나로 주최자 권한까지 주는 방안은 전달은 단순하지만 link 유출 시 권한 분리가 없어
제외한다. capability 원문 저장은 조회가 쉽지만 DB 유출 시 즉시 악용되어 제외한다. 고정
결정은 public share token과 organizer-only capability를 분리하고 모두 고엔트로피 값으로
발급하며 capability는 hash 비교하는 것이다.

## 문제 해결 기록

1. PP-002·ADR-0005의 token entropy, cookie, expiry, idempotency와 404·410 정책을 domain
   invariant와 API 예제로 변환한다.
2. 완료 job 소유권과 결과 snapshot을 transaction에서 확인하고 room·candidate reference,
   capability hash를 원자적으로 저장한다.
3. create 응답과 cookie를 조립하되 원문 capability가 한 번의 안전한 응답 경계를 벗어나지
   않도록 logging filter와 mapper를 구성한다.
4. share 조회에 organizer 여부와 무관한 public DTO를 사용하고 만료 기준 시각을 주입 가능한
   clock으로 단위 테스트한다.
5. 중복 요청, 다른 job 소유자, processing·failed job, 변조·없는·만료 token과 로그 비노출을
   PostgreSQL 통합 테스트한다.

## 구현 결과와 검증 증거

현재 상태는 `planned`이며 room 코드, token 검증과 HTTP 테스트 결과는 아직 없다. 완료
시에는 다음 증거를 확보한다.

- token 충돌 저항을 난수 품질 주장으로 대신하지 않고 길이·encoding·unique constraint와
  충돌 재시도 동작으로 검증한 단위·통합 테스트
- completed/degraded 생성 성공과 processing/failed/다른 소유 세션 거부 결과
- 같은 idempotency key의 동일 room 반환 및 다른 payload 충돌 계약 테스트
- public 조회 DTO의 capability·내부 ID 비노출, 404·410과 만료 후 모든 mutation 차단 결과
- DB·application log·Problem Details에 원문 token이 없다는 사람의 표본 검사와
  `make check` 성공 로그

## AI 사용과 사람의 검증

AI에는 capability 위협 사례, expiry 경계와 idempotency test 초안을 위임할 수 있다. 사람은
난수 생성기, hash 비교, cookie 속성, token logging 경로, 404·410 정보 노출과 DB unique
constraint를 직접 검토한다. token 예시는 실제처럼 보이지 않는 명백한 test value만
사용하고 운영 capability를 AI나 fixture에 제공하지 않는다.

## 남은 위험과 학습

공유 URL은 사용자에 의해 재전달될 수 있고 capability cookie는 브라우저 삭제·교체로 잃을
수 있다. 실제 공유 사용에서 만료 기간이 지나치게 짧거나 길다는 근거, token 유출 또는
cookie 호환성 문제가 관찰되면 expiry와 capability recovery 정책을 재검토한다. 현재는
보안성과 생성 성공에 대한 실행 증거가 없는 계획 상태다.
