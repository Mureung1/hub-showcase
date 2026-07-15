---
id: WI-0004
title: PP-002 HTTP 보안 오류 멱등성 API 계약
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
  - docs/contracts.md
  - docs/openapi/placepick-v1.yaml
  - docs/openapi/examples/**
  - backend/src/integrationTest/java/com/placepick/contract/**
---

# WI-0004 PP-002 HTTP 보안 오류 멱등성 API 계약

> GitHub Issue: [PP-002 #4](https://github.com/gdh0730/hub/issues/4)

## 문제와 근거

현재 계약 정본에는 Actuator 두 경로와 추천 생성의 202 원칙만 있으며, 익명 세션,
조건 초안, 추천 조회·SSE, 공유방, 투표, 최종 확정과 제품 이벤트의 wire contract가
없다. 세션 식별자를 요청 본문에서 받거나 room ID를 공개하는 임의 구현은 다른
사용자의 데이터 변경, 중복 추천 작업과 계약 불일치를 만들 수 있다.

## 목적과 성공 기준

목적은 구현 전에 전체 HTTP 표면을 OpenAPI와 오류·보안 정책으로 고정하는 것이다.
다음 결과를 모두 자동 검증할 수 있어야 한다.

- 계획에서 확정한 15개 비즈니스 경로의 method, path, request, response, header,
  cookie, status와 media type이 OpenAPI에 정의된다.
- 추천 생성은 반드시 202, 유효한 UUID jobId와 Location을 반환하며 200 예제가 없다.
- 생성·확정 명령은 Idempotency-Key를 요구하고 동일 key·동일 payload는 같은 결과,
  동일 key·다른 payload는 409를 반환한다.
- 오류는 application/problem+json에 type, title, status, detail, instance,
  errorCode, traceId와 선택적 fieldErrors를 제공한다.
- 400, 401, 403, 404, 409, 410, 429와 외부 의존성 실패의 예제가 서로 구분된다.
- 익명 session cookie, CSRF header, organizer capability와 공개 share token의
  권한 경계가 각 operation에 선언된다.

## 범위, 비범위와 제약

범위는 OpenAPI 3.1 문서, 공통 schema, 정상·오류 example, 멱등성 규칙, pagination이
필요한 응답의 상한, SSE endpoint 설명과 계약 테스트 골격이다. Controller와
application service 구현, 데이터 저장, 브라우저 UI, 외부 제공자 adapter는 포함하지
않는다.

공개 JSON 이름은 camelCase로 고정하고 UUID v4를 외부 ID로 사용한다. 세션과
capability 원문을 request body나 URL query에 넣지 않는다. SSE는
text/event-stream이고 일반 JSON 응답으로 대체하지 않는다.

## 판단 기준과 대안

기준은 명시성, 브라우저 안전성, 재시도 안전성, 기계 검증 가능성, 장기 호환성과
최소 정보 노출이다.

- 사용자 제공 sessionId와 voterId는 구현이 쉽지만 위조 가능하므로 제외한다.
- 모든 실패를 400 또는 500으로 합치는 방안은 client 복구 판단을 막아 의미별 status와
  안정적인 errorCode를 선택한다.
- POST 투표는 중복 처리 의미가 불명확해 제외하고 세션·장소별 리소스를 PUT과 DELETE로
  관리한다.
- custom 오류 envelope 대신 표준 Problem Details 확장을 사용한다.

Idempotency-Key의 유효 범위는 익명 세션과 operation 조합이며 1자부터 128자의
인쇄 가능한 ASCII로 제한한다. key가 없거나 형식이 잘못되면 400, 처리 중 같은
요청은 기존 작업을 반환하고 payload hash가 다르면 409로 고정한다.

## 문제 해결 기록

1. PP-001 여정의 모든 사용자 명령과 조회를 operation 목록으로 변환한다.
2. operation별 인증 주체, 입력 소유권, 정상 status, 재시도와 만료 의미를 표로 만든다.
3. UUID, 시간, enum, 점수와 경고를 재사용 가능한 schema로 정의한다.
4. 각 오류에 client 행동을 연결하고 Problem Details example을 작성한다.
5. OpenAPI parser와 example schema 검증을 실행하고 202·410·429 음성 사례를 추가한다.
6. 계약 정본의 상태를 planned에서 specified로 바꾸되 구현 전에는 implemented로
   표시하지 않는다.

## 구현 결과와 검증 증거

현재 status는 planned이며 OpenAPI 파일과 계약 테스트 결과는 존재하지 않는다.
완료 시 OpenAPI 구문 검증, 모든 example의 schema 검증, operation ID 중복 검사,
추천 생성 200 금지 검사와 npm run docs:check 결과를 증거로 남긴다. 이후 Controller
통합 테스트가 같은 example과 status를 소비할 수 있어야 하며, 문서 검토만으로
런타임 구현 완료를 주장하지 않는다.

## AI 사용과 사람의 검증

AI는 operation 목록화, schema 중복 탐지, 오류 행렬과 example 초안을 지원할 수
있다. 사람은 cookie·CSRF·capability의 보안 의미, 멱등성 충돌 처리, 공개 필드와
호환성 정책을 검토한다. 자동 생성된 OpenAPI가 사용자 여정과 다른 경로나 과도한
개인정보를 노출하면 거절한다.

## 남은 위험과 학습

OpenAPI만으로 cookie 수명, SSE 재연결과 동시 요청의 모든 의미를 표현할 수 없으므로
서술 계약과 통합 테스트가 함께 필요하다. 구현 과정에서 wire shape 변경이 필요하면
호환성 영향, 기존 example과 client 변경을 같은 PR에서 검토하며, status 의미를
편의상 변경하지 않는다.
