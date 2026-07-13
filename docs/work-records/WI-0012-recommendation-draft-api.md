---
id: WI-0012
title: PP-010 추천 조건 Draft API
type: work-record
status: planned
date: 2026-07-13
owners:
  - placepick-team
related:
  - ../roadmap.md
  - ../adr/ADR-0004-service-boundary.md
  - ../adr/ADR-0005-anonymous-session-room-capability.md
  - ../adr/ADR-0007-provider-and-live-boundary.md
paths:
  - backend/src/main/java/com/placepick/recommendation/draft/**
  - backend/src/test/java/com/placepick/recommendation/draft/**
  - backend/src/integrationTest/java/com/placepick/recommendation/draft/**
  - docs/contracts.md
  - docs/openapi/placepick-v1.yaml
  - docs/openapi/examples/recommendation-drafts/**
---

# WI-0012 PP-010 추천 조건 Draft API

> GitHub Issue: [PP-010 #12](https://github.com/gdh0730/hub/issues/12)

## 문제와 근거

조건 추출 결과를 곧바로 추천 Job으로 보내면 잘못 해석된 위치, 예산과 제외 조건을
사용자가 바로잡을 수 없다. 브라우저 새로고침에서 초안이 사라지거나 다른 익명
session이 draftId만으로 조회·수정할 수 있으면 사용자 통제권과 데이터 격리가
깨진다. Draft의 만료와 추천 시작 후 재사용 의미도 명시되어야 한다.

## 목적과 성공 기준

목적은 자연어에서 조건 초안을 만들고 같은 익명 session이 조회·전체 교체한 뒤
추천 시작에 한 번만 사용할 수 있는 Draft API를 구현하는 것이다.

- POST /api/v1/recommendation-drafts는 requestText와 Idempotency-Key를 받아 조건
  추출 후 201, draftId, normalized condition, warnings, version과 expiresAt을 반환한다.
- GET /api/v1/recommendation-drafts/{draftId}는 소유 session에만 현재 snapshot을
  반환해 새로고침을 복구한다.
- PUT /api/v1/recommendation-drafts/{draftId}는 전체 normalized condition과 version을
  받아 검증 후 교체하고 증가한 version을 반환한다.
- 생성 후 30분이 지나면 모든 operation이 410 DRAFT_EXPIRED를 반환한다.
- 다른 session은 존재 여부를 드러내지 않도록 404를 받고, 추천 Job에 소비된 Draft의
  수정은 409 DRAFT_ALREADY_CONSUMED를 반환한다.
- 같은 생성 idempotency key와 payload는 같은 Draft를 반환하고 다른 payload는
  409로 거부한다.

## 범위, 비범위와 제약

범위는 Draft application service, Controller 변환, repository 사용, 소유권·만료·
version 검증, condition validation, extraction port 호출과 API 통합 테스트다.
추천 Job 생성, Redis event와 실제 OpenAI adapter는 PP-011·PP-012·PP-029의 책임이다.

requestText는 extraction 호출 후 영구 보존하지 않고 normalized condition과 warning만
Draft TTL 동안 저장한다. location과 placeType이 없거나 수치·길이 불변식을 위반한
Draft는 조회할 수 있어도 추천 시작 가능 상태가 아니며 validation detail을 반환한다.
PUT은 partial patch가 아니라 전체 교체로 stale 필드와 client별 merge 차이를 막는다.

## 판단 기준과 대안

기준은 사용자 확인, 새로고침 복구, session 격리, 동시 편집 안전성, 데이터 최소화와
명확한 만료다.

- client state에만 초안을 두면 단순하지만 새로고침과 기기 오류에 취약해 TTL이 있는
  server Draft를 선택한다.
- PATCH는 전송량이 작지만 누락·삭제 의미가 복잡해 작은 condition object의 PUT 전체
  교체를 선택한다.
- 마지막 쓰기 승리는 구현이 쉽지만 여러 tab에서 변경을 잃을 수 있어 version
  optimistic concurrency와 409를 사용한다.
- 원문 보존은 디버깅에 유리하지만 개인정보와 prompt 노출을 늘려 저장하지 않는다.

Draft 상태는 EDITABLE과 CONSUMED 두 값이며 만료는 expiresAt으로 계산한다. 추천
시작 가능성은 별도 boolean으로 저장하지 않고 현재 condition validation 결과에서
도출해 stale 상태를 방지한다.

## 문제 해결 기록

1. PP-009 schema를 Draft value와 API example에 단일 의미로 적용한다.
2. 생성, 조회, 수정, 만료, 소비와 소유권 규칙을 application command로 분리한다.
3. transaction 안에서 idempotency, Draft 저장과 version 증가를 원자적으로 처리한다.
4. 다른 session, 만료, stale version, consumed와 invalid condition을 음성 테스트한다.
5. extraction timeout·schema 실패를 PP-002 Problem Details로 변환한다.
6. OpenAPI example과 실제 직렬화가 일치하고 외부 API가 Mock으로만 호출되는지
   통합 검증한다.

## 구현 결과와 검증 증거

현재 status는 planned이며 Draft endpoint, persistence와 계약 테스트는 없다. 완료
증거에는 service 단위 테스트, PostgreSQL 통합 테스트, 201·404·409·410 example,
동시 version 충돌, 30분 경계, idempotency와 Mock extraction 결과 및
./gradlew check가 필요하다. 실제 OpenAI 호출 없이 모든 검증을 통과해야 한다.

## AI 사용과 사람의 검증

AI는 상태 전이, validation 조합, Controller·service test와 OpenAPI example 초안을
지원할 수 있다. 사람은 원문 미보존, session 소유권, 30분 TTL, version 충돌과
Problem Details 노출을 검토한다. 다른 사용자의 Draft 존재를 드러내거나 만료된
Draft를 되살리는 구현은 거절한다.

## 남은 위험과 학습

30분 TTL이 실제 조건 검토 시간보다 짧거나 길 수 있으며 실측 전에는 적정성을
주장하지 않는다. 만료 직전 PUT과 추천 생성의 경쟁은 DB 시간과 row lock 기준으로
결정해야 한다. 사용자 이탈·만료 비율이 측정되면 개인정보 최소화와 복구 편익을
함께 비교해 TTL을 재검토한다.
