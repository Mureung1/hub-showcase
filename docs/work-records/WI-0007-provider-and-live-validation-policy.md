---
id: WI-0007
title: PP-005 Naver OpenAI 실제 API 검증 정책
type: work-record
status: planned
date: 2026-07-13
owners:
  - placepick-team
related:
  - ../roadmap.md
  - ../adr/ADR-0007-provider-and-live-boundary.md
paths:
  - docs/providers/provider-policy.md
  - docs/contracts.md
  - docs/development-environment.md
  - docs/architecture.md
---

# WI-0007 PP-005 Naver OpenAI 실제 API 검증 정책

## 문제와 근거

현재 환경은 Mock Naver와 Mock LLM만 안전하게 제공하고 실제 provider 계약은 없다.
참고 원문에는 이전 Naver Developer Center header와 일일 quota, 임의 cache 전제가
남아 있으나 신규 Search API는 NAVER API HUB 경로와 인증을 사용해야 한다. LLM을
특정 SDK DTO에 직접 결합하거나 local·CI에서 실제 key를 허용하면 비용, 데이터 유출,
비결정적 테스트와 provider 교체 비용이 생긴다.

## 목적과 성공 기준

목적은 domain이 provider 세부사항에 의존하지 않는 port를 정의하고 실제 호출이
허용되는 유일한 경계와 검증 책임을 확정하는 것이다.

- 장소 검색, 블로그 근거 검색, 조건 추출과 추천 이유 생성을 각각 application port로
  정의하고 Naver·OpenAI DTO가 domain 밖에 머문다.
- Naver live base는 <https://naverapihub.apigw.ntruss.com>이고 인증 header는
  X-NCP-APIGW-API-KEY-ID와 X-NCP-APIGW-API-KEY를 사용한다.
- OpenAI adapter는 Responses API와 strict JSON Schema를 사용하며 기본 model,
  reasoning effort, output 상한, timeout과 저장 금지 정책을 명시한다.
- local, test, load와 일반 CI는 mock만 허용하고 실제 host나 credential이 있으면
  애플리케이션과 검증 스크립트가 시작을 거부한다.
- 실제 호출은 GitHub staging-live Environment의 수동 실행과 준비 완료 후 하루 한 번
  실행되는 제한된 workflow에서만 허용한다.
- Naver 원문 저장·cache·표시 방식은 사람이 공식 약관을 검토하기 전까지 금지하고
  검증에 필요한 최소 파생 필드만 보관한다.

## 범위, 비범위와 제약

범위는 provider port 책임, live host allowlist, 인증 주입 경계, timeout·retry·quota,
OpenAI structured output, Mock/Live profile, staging 검증과 약관 gate다. Naver client,
OpenAI HTTP adapter, GitHub secret 등록과 예약 workflow 구현은 PP-013, PP-029,
PP-033에서 수행한다.

실제 key, 외부 응답 전문, 개인정보와 운영 endpoint를 문서·fixture·로그에 남기지
않는다. live workflow는 고정된 비개인성 입력 한 건만 사용하고 exact 장소명이 아닌
schema, 후보 수, 근거 연결과 금지 필드 불변식을 검증한다.

## 판단 기준과 대안

판단 기준은 테스트 결정론, 비용 상한, 데이터 최소화, provider 교체 가능성, 현재
공식 계약과 장애 격리다.

- 모든 환경에서 실제 API를 호출하는 방식은 현실성은 높지만 비용·quota·비결정성
  때문에 제외한다.
- provider SDK를 domain에 노출하는 방식은 초기 구현이 빠르지만 모델과 DTO 결합이
  커져 port와 전용 adapter를 선택한다.
- Naver 원문을 장기 cache하는 방식은 성능상 유리할 수 있으나 약관 판단 전에는
  허용 근거가 없어 제외한다.
- live 검증을 수동으로만 실행하면 회귀 탐지가 늦고 매 PR마다 실행하면 비용과
  외부 변동이 크므로 하루 한 번과 수동 실행을 결합한다.

OpenAI 기본은 Responses API, gpt-5.6-luna, reasoning effort low, store false,
tool 비활성화와 bounded output이다. 실제 model 식별자는 설정으로 교체할 수 있지만
변경 시 공식 문서 재확인, Eval과 비용 영향 검증이 필요하다. live 한 회는 조건 추출
한 번, Local 검색 최대 세 번, Blog 검색 최대 다섯 번, 추천 이유 생성 한 번을
상한으로 삼는다.

## 문제 해결 기록

1. 실행 시점의 Naver API HUB, OpenAI Responses와 model 공식 문서를 다시 확인한다.
2. application이 필요한 의미와 provider request·response 세부사항을 port와 adapter로
   분리한다.
3. profile별 허용 host, credential 출처, 호출 상한과 fail-closed 조건을 표로 만든다.
4. timeout, 429, 인증 실패, schema 불일치와 provider 장애의 retry 가능 여부를
   분류한다.
5. 약관상 저장·표시·출처 요구를 사람이 검토하고 허용 범위와 확인 일자를 기록한다.
6. PP-013·PP-029·PP-033이 소비할 계약과 live acceptance 기준을 승인한다.

## 구현 결과와 검증 증거

현재 status는 planned이며 실제 provider 호출이나 약관 준수 완료를 증명하는 자료는
없다. 완료 증거에는 공식 문서 확인 일자와 URL, port 계약, profile·host 행렬,
호출 상한, 실패 분류, 사람의 약관 검토 결과와 npm run docs:check가 포함되어야 한다.
실제 credential과 응답 전문은 증거가 아니며 저장하지 않는다.

## AI 사용과 사람의 검증

AI는 공식 문서 차이 비교, provider 오류 분류, schema와 redaction 검토를 지원할 수
있다. 사람은 공식 출처의 현재성, 약관·비용·quota, secret 권한, workflow 활성화와
실제 호출을 승인한다. 검색 결과나 비공식 블로그만으로 header, model 또는 저장
권한을 확정한 제안은 거절한다.

## 남은 위험과 학습

외부 API, model과 약관은 저장소 코드보다 먼저 바뀔 수 있다. 401·403 증가, schema
변경, model 지원 종료, quota 정책 변경이나 약관 개정이 감지되면 live schedule을
먼저 비활성화하고 계약을 재검토한다. 제한된 staging 성공은 운영 가용성이나 추천
품질 전체를 보증하지 않는다.
