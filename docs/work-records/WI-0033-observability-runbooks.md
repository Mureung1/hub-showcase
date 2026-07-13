---
id: WI-0033
title: PP-031 도메인 관측성과 Grafana 및 복구 Runbook
type: work-record
status: planned
date: 2026-07-13
owners:
  - placepick-team
related:
  - ../roadmap.md
  - ../adr/ADR-0006-api-worker-outbox-events.md
  - ../adr/ADR-0007-provider-and-live-boundary.md
paths:
  - backend/src/main/java/com/placepick/observability/**
  - backend/src/main/java/com/placepick/recommendation/**
  - backend/src/main/java/com/placepick/room/**
  - backend/src/test/java/com/placepick/observability/**
  - backend/src/integrationTest/java/com/placepick/observability/**
  - observability/prometheus/**
  - observability/grafana/**
  - docs/runbooks/**
  - docs/contracts.md
---

# WI-0033 PP-031 도메인 관측성과 Grafana 및 복구 Runbook

## 문제와 근거

PP-031은 애플리케이션이 실행 중이라는 infrastructure health를 넘어 추천 job, provider,
Redis delivery, SSE와 투표방의 실제 실패를 발견하고 복구할 수 있게 만든다. HTTP 200과 JVM
metric만으로는 후보 부족, degraded 완료, DLQ 적체, provider quota 소진이나 투표 경합을
구분할 수 없다. 반대로 job ID, room token, 검색어를 metric label로 사용하면 cardinality와
개인정보 문제가 생긴다.

현재 Prometheus와 Grafana starter는 Actuator를 수집하지만 서비스 도메인 metric, alert
의미, dashboard와 운영 Runbook 연결이 없다. 아직 비즈니스 기능이 구현되지 않았으므로
이 기록은 관측 완료 결과가 아니라 PP-031의 측정·진단 기준이다.

## 목적과 성공 기준

목적은 사용자 영향과 내부 원인을 낮은 cardinality의 metric·구조화 log·trace correlation으로
연결하고, 경보를 받은 사람이 같은 절차로 진단·완화·복구·검증하게 하는 것이다.

성공 기준은 다음과 같다.

- 추천 생성·완료·degraded·실패, 단계별 처리 시간, retry·DLQ, provider 호출 결과·quota,
  SSE 연결, 투표 변경·경합·최종 확정을 domain metric으로 제공한다.
- label은 고정된 outcome, stage, provider, error class만 사용하고 job ID, share token,
  session, 검색어, 장소명과 URL을 포함하지 않는다.
- correlation ID와 trace ID로 API, outbox, worker, provider와 room event log를 연결하되
  민감 payload는 기록하지 않는다.
- Grafana dashboard가 사용자 journey, worker·queue, provider, realtime·room, JVM·DB·Redis
  관점을 분리하고 Prometheus datasource로 재현 가능하게 provisioning된다.
- DLQ 발생, 지속 실패, quota 안전선 도달, 처리 정체와 관측 데이터 단절에 대한 alert rule과
  소유자·심각도·Runbook 링크가 존재한다.
- 각 Runbook은 관찰, 안전한 진단 명령, 완화, 복구 확인, escalation과 사후 문서 라우팅을
  포함하고 secret이나 파괴적 기본 명령을 사용하지 않는다.

## 범위, 비범위와 제약

범위는 Micrometer domain metric, correlation context, structured logging redaction, Prometheus
rule, Grafana datasource·dashboard, Redis/DLQ/provider quota/SSE/degraded 처리 Runbook과 테스트다.
PP-034의 부하 실험 결과는 latency·saturation alert threshold를 보정하는 근거로 연결한다.

외부 상용 APM, 24시간 당직 조직 구성, 사용자 행동 분석 dashboard, 검증되지 않은 SLO 수치,
자동 데이터 삭제·재처리 실행 버튼은 포함하지 않는다. local Compose 관측 환경을 기준으로
재현하며 production 배포 시스템이 생기면 별도 adapter가 필요하다.

## 판단 기준과 대안

판단 기준은 사용자 영향 탐지, 원인 분리, 낮은 cardinality, 비밀 보호, 재현 가능한 복구다.

- controller별 HTTP metric만 사용하면 비동기 job의 terminal 결과를 알 수 없어 domain
  transition에서 metric을 기록한다.
- 개별 resource ID label은 검색이 쉽지만 cardinality·노출 위험 때문에 금지하고 traceable
  log의 redacted correlation ID로 개별 요청을 조사한다.
- 모든 이상을 즉시 page하는 방식은 피로를 유발한다. DLQ처럼 즉각 조치가 필요한 신호와
  추세 경고를 severity로 분리한다.
- 실측 전 임의 latency threshold를 확정하지 않는다. 기능 불변식 기반 rule을 먼저 두고
  PP-034 baseline 이후 지연·포화 threshold를 승인한다.

metric은 결과가 확정되는 transaction 경계에서 한 번 기록하고 retry attempt와 logical job을
분리한다. 이 원칙으로 중복 delivery가 성공·실패 수치를 부풀리지 않게 한다.

## 문제 해결 기록

1. 전체 사용자 여정을 API 접수, queue, worker 단계, 결과, room으로 나누고 각 실패 신호를
   정의한다.
2. 질문별 metric 이름·type·고정 label·기록 지점을 inventory로 작성하고 금지 label을 함께
   명시한다.
3. 중복 message와 retry에서 logical count가 한 번만 증가하는 계측 위치를 테스트한다.
4. Prometheus scrape와 rule evaluation을 fixture로 검증하고 Grafana dashboard JSON을
   provisioning한다.
5. 실제 장애를 만들지 않는 mock·Testcontainers 시나리오로 dashboard panel과 alert input을
   발생시킨다.
6. 각 alert에서 Runbook 절차만으로 원인을 분류하고 정상 회복을 확인하는 tabletop 검증을
   수행한다.
7. PP-034 이후 실측 분포와 resource saturation을 근거로 threshold를 갱신한다.

이 순서는 계획이며 현재 서비스 metric, alert firing이나 Runbook 검증 결과는 존재하지 않는다.

## 구현 결과와 검증 증거

PP-031은 아직 구현·검증되지 않았다. 완료 증거는 다음과 같다.

- 정상, degraded, insufficient candidates, provider 실패, retry, DLQ, 최종 확정 시 metric 값이
  정확히 한 번 변하는 단위·통합 테스트
- 중복 stream delivery와 worker 재시작에서도 logical job count가 중복 증가하지 않는 결과
- metric endpoint와 Grafana JSON에서 금지 label·resource ID·자연어·token이 없는 정적 검사
- Prometheus rule unit test와 각 alert의 정상·발화·회복 상태 결과
- Grafana datasource health와 모든 dashboard query가 오류 없이 데이터를 반환하는 smoke
- Redis 중단, DLQ, provider 429, SSE 급증 시 Runbook을 따라 진단·복구한 tabletop 기록
- trace ID가 API에서 worker까지 이어지면서 request/response 원문이 log에 없는 검증
- `make observe`, `make integration`, `make check` 성공 및 PP-034 Experiment 링크

dashboard가 보인다는 사실만으로 관측 완료를 선언하지 않고, 알려진 장애가 정확한 신호와
Runbook으로 연결될 때 status를 변경한다.

## AI 사용과 사람의 검증

AI에는 metric inventory, 금지 label 검사, dashboard query, alert fixture와 Runbook 초안을
위임할 수 있다. AI가 제안한 threshold와 원인 설명은 실제 metric 분포나 장애 재현 근거가
없으면 채택하지 않는다.

사람은 어떤 신호가 사용자 영향을 의미하는지, alert 소유자·severity, metric cardinality,
로그 redaction과 Runbook의 안전성을 검토한다. Grafana에서 panel과 drill-down을 직접 확인하고
문서만으로 장애를 재현·복구할 수 있는지 검증한다.

## 남은 위험과 학습

metric 기록 자체가 실패하거나 scrape가 끊기면 서비스 실패와 관측 실패를 구분하기 어렵다.
관측 데이터 freshness와 scrape health를 별도 감시한다. traffic이 매우 낮으면 비율 기반
alert가 불안정하므로 최소 표본과 시간 창을 PP-034 결과로 조정한다. 새 error code·stage가
추가되면 dashboard와 Runbook이 자동으로 따라오지 않으므로 계약 변경 체크리스트에 포함한다.

핵심 학습 기준은 metric 수가 아니라 한 사용자 실패를 안전한 진단과 검증된 복구 절차까지
연결할 수 있는가이다.
