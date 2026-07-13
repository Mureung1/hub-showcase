---
id: WI-0018
title: PP-016 근거 기반 추천 이유·fallback
type: work-record
status: planned
date: 2026-07-13
owners:
  - placepick-team
related:
  - ../roadmap.md
  - ../adr/ADR-0004-service-boundary.md
  - ../adr/ADR-0007-provider-and-live-boundary.md
paths:
  - backend/src/main/java/com/placepick/recommendation/application/reason/**
  - backend/src/main/java/com/placepick/recommendation/adapter/out/llm/**
  - backend/src/test/java/com/placepick/recommendation/reason/**
  - backend/src/integrationTest/java/com/placepick/recommendation/adapter/out/llm/**
  - backend/src/evalTest/resources/evals/recommendation-reason.jsonl
  - docs/contracts.md
---

# WI-0018 PP-016 근거 기반 추천 이유·fallback

> GitHub Issue: [PP-016 #18](https://github.com/gdh0730/hub/issues/18)

## 문제와 근거

추천 후보 이름과 검색 근거를 LLM에 그대로 주고 자유문을 받으면 실제 근거에 없는 가격,
분위기, 영업 상태나 접근성을 단정할 수 있다. schema 불일치, refusal, incomplete 응답,
timeout 또는 quota 오류가 추천 전체를 실패시키면 결정론적으로 선정된 후보까지 사용할
수 없게 된다. 현재는 설명 생성 port, strict output schema, 근거 참조 규칙, 금지 표현과
실패 시 사실 기반 템플릿 fallback이 없다.

## 목적과 성공 기준

PP-015가 확정한 순위를 바꾸지 않으면서 각 후보에 검증 가능한 이유·주의점·공유 문구를
붙인다. 성공 기준은 다음과 같다.

- LLM 입력은 사용자 조건과 PP-014의 허용된 최소 근거만 포함하고 지시와 데이터를
  구조적으로 구분한다.
- 출력은 versioned strict JSON Schema를 만족하며 각 주장에 허용된 evidence reference가
  연결된다.
- 근거에 없는 장소, 가격, 도보 시간, 출구, 영업 상태와 확정적 표현을 Eval이 거부한다.
- refusal, malformed, incomplete, timeout, 429와 5xx는 분류되고 제한 처리 뒤 근거 기반
  템플릿 fallback으로 전환된다.
- fallback도 같은 API schema를 반환하고 결과 순서와 점수를 변경하지 않는다.

## 범위, 비범위와 제약

범위는 provider-neutral reason generation port, OpenAI adapter 경계에 전달할 request,
strict response schema, 검증기, 금지 정책, 템플릿 fallback, 단위·계약·Eval fixture다.
실제 OpenAI endpoint 활성화와 credential은 PP-029, 조건 초안 추출은 PP-009, 후보 선정은
PP-015가 담당한다. 전체 prompt나 내부 추론을 문서·로그에 저장하지 않고 사용자 입력을
시스템 지시로 실행하지 않는다. 지도·길찾기 근거가 없으므로 도보 시간과 출구 정보를
생성하지 않는다.

## 판단 기준과 대안

기준은 근거 충실성, schema 결정성, provider 교체 가능성, 실패 격리, 비용 상한과 감사
가능성이다. 자유문 응답은 자연스럽지만 parsing과 사실 검증이 불안정해 제외한다. LLM이
점수와 추천을 모두 결정하는 방안은 PP-015의 결정성을 훼손해 제외한다. LLM 실패 시
job 전체를 실패시키는 방안은 검색·점수 결과의 가용성을 불필요하게 낮춰 제외한다.
고정 결정은 strict schema 결과를 evidence allowlist로 후검증하고 실패하면 검증된 필드만
조합한 템플릿을 쓰는 것이다.

## 문제 해결 기록

1. 후보별 허용 주장과 금지 주장, evidence reference 규칙을 표로 만들고 schema version과
   최대 길이를 계약에 고정한다.
2. port 입력을 immutable model로 정의하고 provider request DTO와 분리한다. 사용자 텍스트,
   검색 근거와 시스템 정책의 경계를 명시한다.
3. 정상 strict 응답 parser와 schema·reference validator를 먼저 구현하고 잘못된 reference,
   추가 필드, 과도한 길이를 단위 테스트한다.
4. refusal, incomplete, malformed, timeout, 429, 5xx를 WireMock으로 재현하고 템플릿
   fallback이 같은 response contract를 만드는지 검증한다.
5. prompt injection, 허구 속성, 과장·단정 표현 fixture를 Eval에 추가하고 전체 prompt가
   test report에 노출되지 않는지 확인한다.

## 구현 결과와 검증 증거

현재 상태는 `planned`이며 schema, prompt 정책, fallback 코드와 Eval 결과는 아직
확보되지 않았다. 완료 시 필요한 증거는 다음과 같다.

- strict schema 정상·추가 필드·누락·잘못된 evidence reference 단위 테스트
- refusal·incomplete·malformed·timeout·429·5xx WireMock 계약 결과
- injection과 근거 없는 장소·속성·수치·확정 표현을 거부하는 Eval 결과
- fallback 결과가 점수·순서를 바꾸지 않고 모든 문장을 허용 근거로 설명할 수 있다는
  표본 검토 기록
- token·응답 길이 상한과 비밀·prompt 비노출 확인, `make check` 성공 로그

## AI 사용과 사람의 검증

AI에는 JSON Schema와 공격·경계 fixture 초안, fallback 문구의 표현 변형을 위임할 수
있다. 사람은 schema가 제품 UI에 충분한지, 모든 문구가 실제 근거에 연결되는지, 금지
표현과 개인정보·비밀 비노출을 직접 검토한다. AI가 생성한 Eval 기대값은 사람이 원본
근거와 대조하며, 모델의 자기평가만으로 통과 판정을 내리지 않는다.

## 남은 위험과 학습

strict schema를 만족해도 의미상 과장될 수 있고 검색 snippet 자체가 부정확할 수 있다.
모델 변경, schema version 변경, staging에서 새로운 환각 유형이나 사용자 오해가
발견되면 Eval과 fallback 정책을 재검토한다. 품질 수치와 비용 절감은 측정 전에는
주장하지 않으며, 현재 문서는 구현 전의 검증 계약이다.
