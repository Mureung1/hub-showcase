---
id: ADR-0012
title: 동기 추천 Core와 Split Live 검증 경계
type: adr
status: accepted
date: 2026-07-15
owners:
  - placepick-team
related:
  - ../roadmap.md
  - ../contracts.md
  - ../work-records/WI-0041-recommendation-core-split-live-workflow.md
  - ../runbooks/RUN-0003-recommendation-workflow-split-live-probe.md
  - ADR-0009-mock-local-live-gateway-boundary.md
  - ADR-0011-elice-chat-completions-provider-boundary.md
---

# ADR-0012 동기 추천 Core와 Split Live 검증 경계

## 맥락과 문제

Naver Local·Blog와 Elice Chat·Embedding의 개별 Local Live는 실제 인증과 schema를
통과했다. 그러나 제품에는 조건 추출, 사용자 확인, 검색, 후보 정규화·점수화와 근거
문장을 하나의 application 흐름으로 연결하는 core가 없다. 이 상태에서 provider canary를
서비스 통합 성공이라고 표현할 수 없다.

추천 규칙을 비동기 Job·DB·Redis와 동시에 구현하면 순수한 후보 선택 실패와 전달·복구
실패를 구분하기 어렵다. 한편 실제 Naver 응답을 Elice에 보내는 전체 Live는 Naver의
검색 결과 가공·저장·제3자 전달 범위와 Elice의 요청·응답 보관·학습·하위 처리자 정책이
확정되지 않아 실행할 수 없다.

## 판단 기준과 검토 대안

기준은 사용자 확인권, 결정적 추천, domain과 provider 독립성, 근거 추적성, 호출 상한,
비밀·데이터 최소화, 후속 Worker 재사용과 각 검증 증거의 해석 가능성이다.

- provider canary만 유지하면 인증 drift는 찾지만 제품 규칙과 schema 연결을 검증하지
  못한다.
- 처음부터 Worker에 구현하면 최종 구조와 가깝지만 queue·transaction과 추천 정책의
  실패 원인이 결합된다.
- 실제 provider를 즉시 연결하면 가장 실제에 가깝지만 현재 약관·데이터 정책 gate를
  통과하지 못한다.
- 동기 core를 먼저 만들고 Mock 전체 연결과 Split Live를 분리하면 구조가 하나 더
  생기지만 application 규칙과 실제 provider 호환성을 독립적으로 검증할 수 있다.

## 결정

PP-009·PP-014~PP-016의 핵심 추천 로직을 이후 PP-017 Worker가 그대로 호출할 수 있는
동기식 application use case로 구현한다. domain은 외부 DTO, HTTP, JPA와 Spring bean
세부 구현에 의존하지 않는다.

```text
ConditionExtractionPort
  -> 사용자 확인·수정 경계
    -> RecommendationCoreUseCase(ConfirmedRecommendationCondition)
      -> PlaceSearchPort / BlogSearchPort
      -> 정규화·hard filter·dedup·0~80 점수·Top 3
      -> GroundedReasonGenerationPort
      -> 서버 검증·주의점·공유 문구 조합
```

추출 결과는 자동 추천으로 이어지지 않는다. 사용자 확인을 나타내는 확정 조건만 core가
받고 원본 `requestText`는 검색·점수·이유 생성에 전달하지 않는다. 필드·검색·점수·LLM
schema의 상세 계약은 `docs/contracts.md`를 정본으로 한다.

검증을 세 축으로 고정한다.

| 축 | 데이터와 호출 | 증명 범위 | 현재 정책 |
| --- | --- | --- | --- |
| Mock linked | 합성 조건·Naver·LLM fixture를 실제 core로 연결 | 전체 application 규칙·fallback·호출 상한 | 필수 자동 검증 |
| Split Live | Elice 합성 추출, Naver Local·Blog, Elice 합성 이유를 각각 호출 | 실제 provider의 제품형 schema 호환성 | 로컬 수동 4회만 허용 |
| Linked Live | 실제 Naver 결과를 Elice 이유 생성에 전달 | 실제 provider 간 전체 데이터 흐름 | 정책 승인 전 차단 |

Split Live는 Naver 결과를 Elice에 전달하지 않는다. 이유 생성은 versioned synthetic
candidate·evidence fixture만 사용하고 그 요청의 hash를 launcher와 Loopback Gateway에서
고정한다. Embedding은 호출하지 않는다. 출력에는 `mode=split`, `linked=false`를 포함한다.

원본 provider 자격은 Git에서 제외한 `.env.live.local`을 직접 parsing하는 로컬 전용
TypeScript Loopback Gateway 하위 프로세스에만 전달한다. Java에는 127.0.0.1 임시 URL과
일회성 256-bit token만 전달한다. Gateway는 고정 method·route·fixture·호출 예산만
허용하고 redirect·retry와 임의 URL·query·header·body를 거부한다. standard `make check`,
일반 앱과 CI는 이 파일을 읽지 않는다.

## 결과와 트레이드오프

추천 core를 DB·queue와 분리해 결정론적 단위·통합·Eval을 먼저 만들 수 있고, Worker는
같은 use case를 orchestration 안에서 재사용할 수 있다. Mock 전체 연결과 실제 provider
호환성도 서로 다른 실패로 설명할 수 있다. 사용자 확인 경계와 LLM의 설명 전용 역할이
코드 구조에 드러난다.

대신 Split Live는 실제 Naver→Elice 연결을 증명하지 않는다. 로컬 Gateway와 별도 source
set을 유지해야 하며, 실제 Linked Live에는 약관·표시·개인정보·비용 검토와 새로운 승인
절차가 필요하다. 동기 core 성공도 Job·Outbox·Streams·SSE 복구를 증명하지 않는다.

## 검증과 재검토 조건

Mock linked는 정상, 선호 완화, 후보 부족, Blog degraded, LLM batch fallback, 호출 상한,
provider credential 교차 전달 금지와 외부 network 0건을 자동 검증한다. Split Live는
[RUN-0003](../runbooks/RUN-0003-recommendation-workflow-split-live-probe.md)의 검토 SHA와
안전장치로 네 논리 호출의 2xx·schema만 확인한다.

Naver가 결과 결합·재순위·일시 처리·제3자 전달을 허용하는 범위와 표시 의무를 서면으로
확정하고, Elice의 보관 기간·학습 사용·하위 처리자·처리 지역·삭제 절차를 사람이 승인한
뒤에만 Linked Live를 새 Task·Work Record와 별도 명령으로 제안한다. 정책이 허용하지
않거나 provider가 strict schema를 지원하지 않으면 데이터 공급자 또는 LLM provider를
재선정한다. 가격 구조화 근거가 생기거나 점수 품질 측정이 나오면 0~80 정책도 별도
Experiment와 ADR 변경으로 재검토한다.
