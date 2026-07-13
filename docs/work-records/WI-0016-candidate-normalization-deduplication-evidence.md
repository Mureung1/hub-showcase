---
id: WI-0016
title: PP-014 후보 정규화·중복 제거·근거 모델
type: work-record
status: planned
date: 2026-07-13
owners:
  - placepick-team
related:
  - ../roadmap.md
  - ../adr/ADR-0007-provider-and-live-boundary.md
paths:
  - backend/src/main/java/com/placepick/recommendation/domain/candidate/**
  - backend/src/main/java/com/placepick/recommendation/application/candidate/**
  - backend/src/test/java/com/placepick/recommendation/**
  - docs/contracts.md
---

# WI-0016 PP-014 후보 정규화·중복 제거·근거 모델

## 문제와 근거

장소 검색 결과는 같은 장소가 지점명, 공백, HTML 태그, 도로명·지번 주소 차이로 여러
번 나타날 수 있고 블로그 문서는 동일 URL이나 유사 제목을 반복할 수 있다. 이를 그대로
점수화하면 중복 후보가 Top 3를 차지하거나 한 장소의 근거 수가 과대 계산된다. 현재는
공급자 원본과 도메인이 신뢰할 최소 사실을 분리하는 모델, 동일 장소 판단 규칙, 어떤
근거가 어떤 후보를 뒷받침하는지 추적하는 구조가 없다.

## 목적과 성공 기준

외부 검색 항목을 안정적인 후보와 출처가 명확한 근거로 변환하여 후속 점수화와 설명
생성이 같은 사실 집합을 사용하게 한다. 성공 기준은 다음과 같다.

- 이름, 주소, 카테고리, URL, 공급자 식별자를 결정론적으로 정규화한다.
- 강한 공급자 식별자가 같으면 병합하고, 식별자가 없을 때만 보수적인 이름·주소
  composite key를 사용한다.
- 서로 다른 지점이나 주소가 불명확한 장소를 임의로 합치지 않는다.
- 각 근거는 출처 유형, source reference, 수집 시각, 연결된 후보와 허용된 최소 파생
  정보를 보존하되 원문 전체를 저장하지 않는다.
- 입력 순서가 달라도 결과 후보와 병합 결과가 동일한 property 기반 테스트를 통과한다.

## 범위, 비범위와 제약

범위는 정규화 value object, 후보 identity 정책, 중복 제거 service, 최소 evidence 모델,
순서 안정성과 단위 테스트다. Naver HTTP 호출은 PP-013, 선호 조건에 따른 점수는
PP-015, 영속 테이블과 retention은 PP-007·PP-030의 범위다. 자연어 의미가 비슷하다는
이유만으로 서로 다른 장소를 합치는 embedding·LLM dedup은 사용하지 않는다. 약관 검토
전에는 블로그 본문이나 전체 Naver 응답을 영구 저장하지 않는다.

## 판단 기준과 대안

판단 기준은 잘못된 병합 최소화, 결과 재현성, 출처 추적성, 개인정보·약관상 최소 수집,
후속 점수와 설명의 일관성이다. 이름만으로 병합하면 동명 지점을 손실하므로 제외한다.
좌표 거리만으로 병합하면 좌표 누락과 복합 상가의 다른 업소를 혼동하므로 단독 기준으로
사용하지 않는다. LLM 판정은 비결정적이고 근거 감사가 어려워 제외한다. 고정 결정은
공급자 ID를 최우선으로 하고, ID가 없을 때 정규화한 이름과 주소가 모두 일치하는 경우만
병합하는 보수적 계층 규칙이다. 충돌 시에는 별도 후보를 유지한다.

## 문제 해결 기록

1. PP-013의 adapter 출력 필드와 PP-007의 저장 경계를 대조해 도메인이 신뢰할 최소
   candidate·evidence 필드를 확정한다.
2. Unicode 정규화, HTML 제거 후 공백 축약, 카테고리 계층 분리, URL canonicalization,
   주소 비교용 표현을 순수 함수로 구현한다.
3. 동일 공급자 ID, 동일 이름·주소, 동명 다른 주소, 지점 suffix, 누락 필드와 악성 HTML
   사례를 fixture 표로 만든다.
4. 병합 시 필드 우선순위와 evidence union의 중복 기준을 구현하고 입력 순서 무관성을
   property 테스트로 검증한다.
5. 결과 모델을 PP-015와 PP-016이 소비할 수 있는지 계약 예제로 확인하고 불필요한 원문
   필드는 경계에서 제거한다.

## 구현 결과와 검증 증거

현재 상태는 `planned`이며 도메인 모델과 단위 테스트는 아직 구현되지 않았다. 완료
판정에는 다음 증거가 필요하다.

- 정규화 함수별 경계값과 Unicode·HTML·빈 값 단위 테스트
- 동일 장소 병합과 동명 지점 분리 사례를 포함한 parameterized test 결과
- 입력 permutation에도 candidate identity와 evidence 집합이 같은 property test 결과
- 후보에서 모든 표시값의 source를 역추적할 수 있음을 보여 주는 계약 예제
- 원문 payload가 entity와 로그에 포함되지 않았다는 코드 리뷰 기록 및 `make check` 결과

## AI 사용과 사람의 검증

AI에는 중복·주소·문자열 경계 사례 확장과 property test 데이터 생성 초안을 위임할 수
있다. 사람은 한국 주소와 지점명에서 오병합 가능성이 큰 사례, 저장 필드의 약관 적합성,
후속 점수·설명에 필요한 최소성을 검토한다. AI가 의미 기반 병합을 제안하더라도 명시적
규칙과 반례로 설명할 수 없으면 채택하지 않는다.

## 남은 위험과 학습

공급자 ID 안정성, 주소 표기 변화, 이전·폐업 장소, 동일 건물 내 동명 매장은 보수적
규칙만으로 완전히 해결되지 않을 수 있다. staging에서 오병합 또는 중복이 관찰되면 해당
사례를 익명 fixture로 추가하고 identity 계층을 재검토한다. 병합 정확도 수치는 표본과
측정 방법이 마련되기 전에는 기록하지 않으며, 현재는 검증 증거가 없는 계획 상태다.
