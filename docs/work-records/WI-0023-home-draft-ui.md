---
id: WI-0023
title: PP-021 홈·자연어 입력·조건 검토 UI
type: work-record
status: planned
date: 2026-07-13
owners:
  - placepick-team
related:
  - ../roadmap.md
  - ../adr/ADR-0004-service-boundary.md
  - ../adr/ADR-0005-anonymous-session-room-capability.md
  - ../adr/ADR-0008-frontend-same-origin-boundary.md
paths:
  - frontend/src/app/page.tsx
  - frontend/src/app/recommendations/new/**
  - frontend/src/features/recommendation-draft/**
  - frontend/src/tests/recommendation-draft/**
  - frontend/e2e/recommendation-draft.spec.ts
---

# WI-0023 PP-021 홈·자연어 입력·조건 검토 UI

> GitHub Issue: [PP-021 #23](https://github.com/gdh0730/hub/issues/23)

## 문제와 근거

자연어 입력을 곧바로 비동기 추천으로 보내면 AI가 잘못 해석한 위치, 예산이나 제외
조건으로 외부 호출과 추천 작업이 시작된다. 사용자는 어떤 조건이 추출됐는지 확인하거나
수정할 기회를 잃고, 새로고침 시 입력 상태도 복구할 수 없다. 현재는 익명 세션 생성,
자연어 검증, 추출 중 상태, draft field 편집과 확정 동의를 연결한 제품 UI가 없다.

## 목적과 성공 기준

사용자가 자연어 요청을 입력하고 AI가 추출한 조건을 직접 검토·수정·확정한 뒤에만 추천
job을 시작하게 한다. 성공 기준은 다음과 같다.

- 첫 방문에서 익명 세션을 안전하게 생성하고 cookie·CSRF 준비 실패를 사용자에게 설명한다.
- 빈 값, 길이 제한, 비정상 입력을 client와 server 계약에 맞춰 검증하고 중복 제출을 막는다.
- 조건 추출 중 loading, timeout, validation error와 provider fallback 경고를 구분한다.
- `/recommendations/new/{draftId}`에서 위치, 장소 유형, 1인 예산 최소·최대, 선호·제외 조건과
  우선순위를 label이 연결된 control로 수정할 수 있다.
- 새로고침과 직접 URL 접근 시 draft를 다시 조회하고 404·410·다른 세션 오류를 안전하게
  처리한다.
- 명시적 확인 후에만 draft를 저장하고 추천 생성 요청을 한 번 전송하며 202의 `jobId`로
  진행 route에 이동한다.

## 범위, 비범위와 제약

범위는 홈 입력 form, 익명 세션 bootstrap, draft 생성·조회·편집·확정 화면, validation,
loading·error·expired 상태, component test와 Playwright E2E다. 조건 추출 API는 PP-009~
PP-010, 추천 생성은 PP-011, frontend 기반은 PP-020의 계약을 사용한다. 진행·결과 화면은
PP-022, 투표방은 PP-026의 범위다. 사용자가 확인하지 않은 자동 제출, 계정 저장, 위치
자동 수집과 실제 외부 provider 호출을 UI 테스트에 포함하지 않는다.

## 판단 기준과 대안

기준은 사용자 통제, 잘못된 외부 작업 방지, 접근성, 새로고침 복구, 중복 제출 안전성이다.
자연어 입력 즉시 추천을 시작하는 방안은 단계가 짧지만 해석 오류 비용과 신뢰 저하로
제외한다. 모든 조건을 처음부터 구조화 form으로 받는 방안은 정확하지만 자연어 입력의
편의와 AI 가치를 줄여 제외한다. 확인 dialog 하나만 두는 방안은 개별 필드를 수정할 수
없어 제외한다. 고정 결정은 AI 초안을 editable form으로 표시하고 명시적 확정 action을
분리하는 것이다.

## 문제 해결 기록

1. PP-002·PP-010의 request, response, Problem Details와 draft expiry를 UI state machine으로
   변환하고 각 상태에서 가능한 action을 표로 고정한다.
2. 홈 form과 session bootstrap을 구현해 submit 중 button·keyboard 재입력을 막고 오류 후
   사용자가 입력을 잃지 않게 한다.
3. draft field를 의미 있는 fieldset과 label, 설명·오류 연결로 구성하고 예산 범위와 필수
   위치·유형을 client에서 즉시 검증한다.
4. 저장과 추천 시작을 별도 mutation으로 처리하고 idempotency key 재사용, network retry,
   202가 아닌 응답의 안전한 복구를 테스트한다.
5. 새로고침, expired draft, 다른 세션, 좁은 viewport, keyboard-only와 screen reader
   announcement를 component·E2E로 검증한다.

## 구현 결과와 검증 증거

현재 상태는 `planned`이며 화면, component와 브라우저 테스트 결과는 아직 없다. 완료
시에는 다음 증거를 확보한다.

- 입력 validation, 추출 loading·오류, field 수정과 확인 action component test
- 새로고침 draft 복구와 404·410·다른 세션 상태의 Playwright 결과
- 빠른 이중 submit과 network retry에서도 추천 job 생성 요청이 논리적으로 한 번인 E2E
- 360px와 desktop, keyboard-only, focus 이동, label·error 연결과 `aria-live` 검사 결과
- 실제 Naver·LLM request 0건인 mock E2E와 `make check` 성공 로그

## AI 사용과 사람의 검증

AI에는 UI state 조합, form validation과 접근성 test 초안을 위임할 수 있다. 사람은 조건
문구가 사용자가 이해할 수 있는지, 명시적 동의 없이 job이 시작되지 않는지, focus와 오류
복구, 실제 두 viewport에서의 조작을 직접 확인한다. AI가 만든 form 값과 API fixture는
계약 schema에 맞는지 사람이 대조한다.

## 남은 위험과 학습

자연어 조건과 구조화 field 간 표현 차이, 모바일에서 긴 선호 목록 편집, draft 만료 직전
경쟁이 사용자 혼란을 만들 수 있다. 사용성 검토나 E2E에서 잘못된 자동 제출, 입력 손실,
반복 이탈이 관찰되면 단계 수와 저장 시점을 재검토한다. 현재는 UI와 접근성 증거가 없는
계획 상태다.
