---
id: WI-0005
title: PP-003 도메인 상태 점수 보존 정책
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
  - docs/domain/domain-model.md
  - docs/domain/recommendation-policy.md
  - docs/architecture.md
  - docs/contracts.md
---

# WI-0005 PP-003 도메인 상태 점수 보존 정책

## 문제와 근거

참고 문서에는 bigint와 UUID, 작업 상태와 처리 단계, 부분 성공과 실패가 혼용되어
있다. 점수 계산과 동점 처리, 후보 부족 시 완화 순서, 익명 데이터의 보존 기간도
실행 가능한 규칙으로 고정되지 않았다. 이 불명확성을 남기면 Worker 재시도에 따라
순위가 달라지고, UI가 내부 상태를 잘못 해석하며, 필요 이상으로 사용자·외부 데이터를
보관할 수 있다.

## 목적과 성공 기준

목적은 HTTP, DB, Worker와 UI가 공유할 도메인 언어와 결정론적 정책을 확정하는
것이다. 성공 기준은 다음과 같다.

- session, draft, recommendation job, candidate, evidence, room, vote, final result,
  outbox와 product event의 식별자·소유권·불변식이 정의된다.
- 내부 lifecycle과 사용자에게 보이는 processing stage를 분리하고 허용 전이와
  terminal 상태를 상태도로 검증한다.
- 필수 제외 조건은 후보를 탈락시키고, 나머지 점수는 위치 30, 카테고리 25, 예산 20,
  선호 키워드 15, 블로그 근거 10의 합으로 0부터 100까지 계산한다.
- 동점은 필수 조건 일치율, 근거 수, UUID 문자열 오름차순으로 안정적으로 해소한다.
- LLM은 점수와 순위를 바꾸지 않으며 검증된 근거를 설명하는 역할만 가진다.
- 보존·만료와 cascade 삭제 규칙이 데이터별로 명시되고 정리 작업으로 검증 가능하다.

## 범위, 비범위와 제약

범위는 aggregate, value object, 상태 enum, 상태 전이, 점수 공식, 조건 완화,
근거 축소 완료, TTL, 삭제 순서와 시간 기준이다. JPA entity, Flyway SQL, Worker,
외부 검색과 화면 구현은 후속 Task에 둔다.

시간은 UTC instant로 저장하고 외부 ID는 UUID v4를 사용한다. Draft는 생성 후 30분,
익명 session은 생성 후 24시간, 추천 job·결과와 room은 생성 후 7일, 멱등성 record와
처리 완료 outbox는 24시간, DLQ는 7일, 비식별 product event는 30일 보존을 기본으로
고정한다. vote와 final result는 room 삭제 시 함께 제거하고 외부 provider 원문
payload는 영구 저장하지 않는다.

## 판단 기준과 대안

기준은 결정론, 사용자에게 설명 가능한 순위, 개인정보 최소화, 장애 복구, DB 제약으로
보장 가능한 불변식이다.

- lifecycle와 processing stage를 하나의 enum으로 합치면 단순하지만 재시도와 UI
  진행 표시가 결합되므로 분리한다.
- LLM에게 전체 순위를 맡기면 유연하지만 재현성과 근거 추적성이 없어 제외한다.
- 누락된 값을 LLM이나 평균값으로 추정하는 방안은 허위 근거가 되므로 해당 항목을
  0점 처리하고 경고로 노출한다.
- 후보 세 개 미만을 그대로 성공시키는 방안 대신 위치와 장소 유형을 유지하면서
  가장 낮은 우선순위 선호만 한 번 완화하고, 여전히 부족하면 실패한다.

Job lifecycle는 QUEUED, RUNNING, COMPLETED, FAILED로 고정하고 degraded는 별도
boolean과 warning으로 표현한다. processing stage는 QUEUED, SEARCHING_PLACES,
SEARCHING_EVIDENCE, SCORING, GENERATING_REASONS, PERSISTING_RESULTS, COMPLETED,
FAILED를 사용하며 역방향 전이를 금지한다.

## 문제 해결 기록

1. PP-001 명사와 PP-002 wire schema를 aggregate와 value object 후보로 분류한다.
2. 각 aggregate의 생성자, 소유자, 변경 명령과 삭제 조건을 표로 만든다.
3. lifecycle·stage 전이표에서 재시도, 근거 축소 완료와 terminal 처리를 검증한다.
4. 점수 입력의 출처, 정규화, 누락 처리, 탈락 조건과 동점 규칙을 fixture로 명세한다.
5. TTL별 개인정보·복구·비용 영향을 검토하고 정리 순서와 관측 지표를 연결한다.
6. PP-007 스키마와 PP-015 점수 구현이 그대로 소비할 수 있는 정본을 승인한다.

## 구현 결과와 검증 증거

현재 status는 planned이며 상태 전이와 점수 fixture, 데이터 보존 검증은 아직 없다.
완료 증거에는 상태 전이표, 경계값·동점·누락·제외 조건 fixture, TTL 표, cascade
삭제 검토 결과와 npm run docs:check가 포함되어야 한다. 실제 DB 정리와 점수 코드는
PP-007·PP-015에서 별도로 검증하므로 이 문서만으로 구현 성공을 주장하지 않는다.

## AI 사용과 사람의 검증

AI는 도메인 용어 중복, 누락된 전이, 점수 경계 조합과 보존 위험 탐색을 지원할 수
있다. 사람은 가중치가 제품 의도에 맞는지, 어떤 데이터가 필수·선호인지, 보존 기간과
삭제 책임을 승인한다. AI가 외부 데이터가 없는 속성을 추정하거나 임의 가중치를
성과로 해석한 결과는 채택하지 않는다.

## 남은 위험과 학습

점수 가중치는 사용자 선택 품질을 실측하기 전의 명시적 기준이며 추천 정확도
성과가 아니다. 실제 선택·불만족 데이터에서 체계적 편향이 확인되면 Experiment와
ADR 영향 검토 후 변경한다. TTL이 장애 조사에 부족하거나 개인정보 최소화 요구보다
길다는 증거가 생기면 보존 기간과 익명화 수준을 함께 재검토한다.
