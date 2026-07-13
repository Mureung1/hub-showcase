---
id: WI-0017
title: PP-015 결정론적 점수·Top 3·조건 완화
type: work-record
status: planned
date: 2026-07-13
owners:
  - placepick-team
related:
  - ../roadmap.md
  - ../adr/ADR-0004-service-boundary.md
paths:
  - backend/src/main/java/com/placepick/recommendation/domain/scoring/**
  - backend/src/main/java/com/placepick/recommendation/application/scoring/**
  - backend/src/test/java/com/placepick/recommendation/scoring/**
  - backend/src/evalTest/resources/evals/recommendation-scoring.jsonl
  - docs/contracts.md
---

# WI-0017 PP-015 결정론적 점수·Top 3·조건 완화

## 문제와 근거

추천 순위를 LLM이나 검색 결과 순서에 맡기면 동일 조건이 실행 시점이나 공급자 응답
순서에 따라 달라지고, 왜 특정 후보가 선택됐는지 설명하거나 회귀를 검증하기 어렵다.
또한 후보가 3개보다 적을 때 모든 조건을 임의로 풀면 사용자의 핵심 위치·장소 유형을
위반할 수 있다. 현재는 필수·선호·제외 조건을 구분한 점수 요소, 0~100 정규화, 동점
규칙과 한 번만 허용하는 조건 완화 정책이 코드와 fixture로 고정되어 있지 않다.

## 목적과 성공 기준

외부 사실과 사용자 선호만으로 재현 가능한 점수를 계산하고 정확히 세 후보를 선택한다.
다음 기준을 모두 만족해야 한다.

- 위치와 장소 유형은 필수 조건으로 유지하고 제외 조건 위반 후보는 순위에서 제거한다.
- 카테고리 일치, 1인 예산 범위, 선호 키워드와 허용된 블로그 근거를 명시적 요소로
  계산하며 총점은 0~100 범위를 벗어나지 않는다.
- 동점은 필수 조건 일치율, 근거 수, 안정적인 `placeId` 순으로 해소한다.
- 최초 후보가 3개 미만이면 가장 낮은 우선순위의 선호 조건 하나만 한 번 완화한다.
- 완화 후에도 3개 미만이면 부분 성공 대신 `INSUFFICIENT_CANDIDATES`로 종료한다.
- 같은 입력 집합은 입력 순서와 관계없이 같은 점수·순위·완화 결정을 만든다.

## 범위, 비범위와 제약

범위는 조건 우선순위, 점수 component, normalization, 제외 filter, stable sort, Top 3와
controlled relaxation 정책 및 Eval fixture다. 검색 query 확장은 application port를 통해
요청하지만 실제 Naver 호출은 PP-013이 담당한다. LLM은 점수나 순위를 수정하지 않으며
PP-016에서 확정된 결과를 설명만 한다. 측정 전 임의의 추천 정확도 목표를 성과로
고정하지 않고, 초깃값은 정책 가중치로 명시해 변경 시 fixture와 ADR 검토를 요구한다.

## 판단 기준과 대안

기준은 결정성, 사용자 필수 조건 보존, 설명 가능성, 경계값 테스트 가능성, 결과 부족의
명확한 실패다. 검색 공급자 순위를 그대로 쓰는 방안은 단순하지만 사용자 조건과 점수
근거를 제어할 수 없어 제외한다. LLM reranking은 유연하지만 비결정성, 비용과 환각으로
제외한다. 여러 조건을 반복 완화하는 방안은 결과 수를 늘리지만 원래 의도를 훼손하므로
제외한다. 고정 결정은 명시적 weighted score와 단 한 번의 최저 우선순위 선호 완화이며,
위치·장소 유형·제외 조건은 완화 대상이 아니다.

## 문제 해결 기록

1. PP-003에서 확정한 조건 모델과 PP-014의 candidate·evidence를 점수 입력 표로 만들고
   각 값의 누락·경계 의미를 결정한다.
2. 필수 filter와 개별 score component를 순수 함수로 구현해 범위와 반올림 정책을
   component 단위로 테스트한다.
3. 안정적 tie-break와 Top 3 선정을 구현하고 입력 순서를 섞은 반복 테스트로 결정성을
   검증한다.
4. 선호 우선순위가 명시된 경우와 동률인 경우의 완화 선택 규칙을 구현하고 재검색은 한
   번만 일어나는지 검증한다.
5. 정상, 경계 예산, 제외 충돌, 동점, 0~2개 후보, 완화 성공·실패 fixture를 Eval에
   추가하고 계약 문서의 실패 의미를 동기화한다.

## 구현 결과와 검증 증거

현재 상태는 `planned`이며 점수 코드, 가중치 fixture와 측정 결과는 아직 없다. 완료
시에는 다음 증거를 확보해야 한다.

- 각 score component의 최소·최대·누락·경계값 단위 테스트
- 총점 0~100 invariant와 입력 permutation 결정성 property test
- 동점 순서와 제외 조건이 고정됨을 보여 주는 표 기반 테스트
- 재검색 호출이 최대 한 번이며 필수 조건을 유지하는 integration test
- 3개 미만일 때 `INSUFFICIENT_CANDIDATES`가 발생하고 부분 결과가 노출되지 않는 계약
  테스트 및 `make check` 결과

## AI 사용과 사람의 검증

AI에는 경계 fixture, 가중치 합 검산, permutation·property test 초안을 위임할 수 있다.
사람은 각 점수 요소가 제품 의도에 부합하는지, 필수 조건과 선호 조건이 뒤바뀌지
않는지, 실제 데이터에서 특정 유형을 부당하게 배제하지 않는지 검토한다. AI가 제안한
가중치는 근거 없는 최적값으로 취급하지 않고 명시적 정책 초깃값으로만 채택한다.

## 남은 위험과 학습

정적 가중치가 실제 사용자 만족과 일치한다는 증거는 아직 없고 블로그 근거 수가 인기
장소에 편향될 수 있다. PP-034의 측정과 사용자 피드백에서 순위 실패가 반복되거나 입력
분포가 변하면 가중치와 근거 cap을 Experiment로 재검토한다. 재검토 전까지 결과를
‘최적’이라고 표현하지 않으며 현재는 구현·검증 전 계획이다.
