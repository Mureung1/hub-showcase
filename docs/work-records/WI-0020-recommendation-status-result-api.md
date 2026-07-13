---
id: WI-0020
title: PP-018 추천 상태·결과 조회 API
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
  - backend/src/main/java/com/placepick/recommendation/adapter/in/web/query/**
  - backend/src/main/java/com/placepick/recommendation/application/query/**
  - backend/src/test/java/com/placepick/recommendation/query/**
  - backend/src/integrationTest/java/com/placepick/recommendation/adapter/in/web/query/**
  - docs/contracts.md
---

# WI-0020 PP-018 추천 상태·결과 조회 API

> GitHub Issue: [PP-018 #20](https://github.com/gdh0730/hub/issues/20)

## 문제와 근거

202로 수락된 추천 job은 HTTP 연결 밖에서 처리되므로 클라이언트가 새로고침하거나 SSE를
놓쳤을 때 현재 상태를 복구할 조회 계약이 필요하다. 내부 worker lifecycle이나 entity를
그대로 반환하면 구현 세부와 공급자 오류가 외부 계약에 노출되고, 다른 익명 세션이 UUID를
알게 된 경우 결과를 조회할 수 있다. 현재는 processing, completed, degraded, failed를
일관되게 표현하는 snapshot DTO와 소유권·만료·오류 계약이 없다.

## 목적과 성공 기준

`GET /api/v1/recommendations/{jobId}`에서 인증된 익명 세션이 소유한 추천의 안정적인 최신
snapshot을 조회하고 프런트가 polling·새로고침·SSE 복구에 동일한 모델을 사용하게 한다.
다음 기준을 충족해야 한다.

- processing 응답은 공개 stage, progress 의미, 생성·갱신 시각과 self/events link를
  포함하되 내부 stream ID나 stack trace를 노출하지 않는다.
- completed와 degraded 응답은 확정 조건, 순서가 고정된 후보 3개, 점수·근거·이유,
  warnings와 `evidenceLevel`을 계약대로 제공한다.
- failed 응답은 안정적인 `errorCode`, 재시도 가능 여부와 안전한 사용자 메시지만
  제공한다.
- 다른 세션의 job은 존재 여부를 추론할 수 없게 처리하고, 없는 job은 404, 만료된 소유
  resource는 410으로 구분한다.
- repository에서 읽은 일관된 snapshot만 반환하며 외부 provider를 조회 요청 중 다시
  호출하지 않는다.

## 범위, 비범위와 제약

범위는 query application service, 세션 소유권 검사, 상태별 response DTO와 mapper,
cache header, Problem Details, 통합·계약 테스트다. job 생성은 PP-011, worker 상태 기록은
PP-017, 실시간 전달은 PP-019, 방 생성은 PP-023이 담당한다. 조회 API는 작업을 재시작하거나
상태를 수정하지 않으며 provider 원문, 내부 오류와 organizer capability를 반환하지 않는다.

## 판단 기준과 대안

판단 기준은 새로고침 복구, 최소 권한, 내부·외부 상태 분리, backward-compatible schema와
DB 부하 예측 가능성이다. worker entity를 직렬화하는 방안은 빠르지만 내부 필드 누출과
schema 결합 때문에 제외한다. 상태별 endpoint를 분리하는 방안은 모델은 단순하지만
클라이언트가 현재 상태를 모르므로 여러 요청이 필요해 제외한다. 202 응답만 믿고 SSE에만
의존하는 방안은 연결 손실 복구가 불가능해 제외한다. 고정 결정은 하나의 resource
snapshot endpoint와 명시적 tagged 상태 response다.

## 문제 해결 기록

1. PP-002 계약과 PP-017 전이표를 대조해 외부 status·stage·progress·terminal payload
   mapping을 고정한다.
2. 세션 소유권과 expiry를 query 전에 검사하고 404·410·권한 은닉 정책을 공통 Problem
   Details와 연결한다.
3. 상태별 mapper가 entity·provider DTO를 노출하지 않도록 response model을 별도 구현하고
   결과 순서와 warnings를 deterministic하게 직렬화한다.
4. processing, completed, degraded, failed, 없는 ID, 다른 세션, 만료 resource를 실제 DB로
   통합 테스트한다.
5. OpenAPI 예제와 `docs/contracts.md`를 response schema 및 cache 정책과 동기화한다.

## 구현 결과와 검증 증거

현재 상태는 `planned`이며 controller, response schema와 HTTP 테스트는 아직 없다. 완료
판정에는 다음 증거가 필요하다.

- 각 상태별 JSON schema와 camelCase serialization 계약 테스트
- 소유 세션의 processing·completed·degraded·failed 조회 통합 테스트
- 다른 세션, 임의 UUID, 만료 job의 정보 노출 없는 404·410 결과
- provider 원문·credential·stack trace·내부 event ID가 응답과 로그에 없다는 표본 검사
- 조회 중 외부 HTTP request가 0건임을 보여 주는 WireMock journal 및 `make check` 결과

## AI 사용과 사람의 검증

AI에는 상태별 DTO·OpenAPI 예제와 누락 필드 contract test 초안을 위임할 수 있다. 사람은
HTTP status 의미, 세션별 정보 은닉, degraded 경고가 UI 의사결정에 충분한지, 내부 오류가
노출되지 않는지 검토한다. AI가 생성한 응답 예제는 실제 mapper 테스트와 일치할 때만
채택한다.

## 남은 위험과 학습

상태 schema가 프런트 구현과 어긋나거나 polling이 집중되어 DB 부하가 커질 수 있다.
PP-022 UI 계약, PP-031 metric, PP-034 부하 결과에서 불일치나 과도한 조회가 확인되면
cache·polling 정책을 재검토한다. 현재는 API가 구현되지 않았으므로 endpoint가 동작한다고
문서나 Issue에서 주장하지 않는다.
