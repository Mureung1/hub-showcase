---
id: WI-0036
title: PP-034 k6 부하 실험과 성능 기준선 확정
type: work-record
status: planned
date: 2026-07-13
owners:
  - placepick-team
related:
  - ../roadmap.md
  - ../adr/ADR-0004-service-boundary.md
  - ../adr/ADR-0005-anonymous-session-room-capability.md
  - ../adr/ADR-0006-api-worker-outbox-events.md
  - ../adr/ADR-0007-provider-and-live-boundary.md
paths:
  - k6/**
  - docker-compose.load.yml
  - scripts/load/**
  - observability/**
  - docs/experiments/EXP-*.md
  - docs/contracts.md
---

# WI-0036 PP-034 k6 부하 실험과 성능 기준선 확정

> GitHub Issue: [PP-034 #36](https://github.com/gdh0730/hub/issues/36)

## 문제와 근거

PP-034는 비동기 추천, worker, SSE와 동시 투표가 어떤 자원에서 포화되는지 측정하고 회귀
기준을 증거로 확정한다. 현재 k6 health smoke는 환경 연결만 확인하므로 `202 + jobId`, queue
대기, terminal 완료와 투표 정합성을 측정하지 않는다. 근거 없이 처리량이나 지연 목표를 먼저
정하면 로컬 하드웨어 차이를 성능 약속으로 오해하거나 잘못된 병목을 최적화할 수 있다.

실제 provider를 부하 테스트에 사용하면 비용·quota·약관 위험이 있으므로 모든 부하 실험은
mock mode에서만 실행해야 한다. 이 Work Record는 baseline이나 개선 수치를 아직 확보하지
않았으며 실험 설계와 완료 증거를 정의한다.

## 목적과 성공 기준

목적은 재현 가능한 부하 profile에서 API 접수 지연, queue 대기, worker 처리, SSE fan-out,
투표 경합과 resource 사용을 분리 측정하고 병목 수정 전후를 Experiment로 비교하는 것이다.

성공 기준은 다음과 같다.

- 추천 제출 scenario가 `POST /api/v1/recommendations`의 202, UUID `jobId`, `Location`을
  검증하며 200 응답은 실패 처리한다.
- job acceptance latency와 terminal completion latency를 별도 metric으로 기록하고 queue
  depth·worker stage·DB·Redis·JVM metric과 같은 시간축으로 비교한다.
- steady, ramp, burst, SSE 연결 유지, 같은 방 투표 경합, cache cold/warm 시나리오를 독립
  script와 고정 fixture로 실행한다.
- 투표 부하 뒤 DB의 세션·장소당 한 표와 집계가 일치하고 최종 확정 불변식이 깨지지 않는다.
- 모든 시나리오는 `PLACEPICK_EXTERNAL_MODE=mock`과 허용 host 검사를 선행하고 실제 Naver·
  OpenAI 접근을 0건으로 유지한다.
- 최초 baseline의 환경·commit·profile·결과·변동성을 기록하고 그 뒤에만 CI 회귀 threshold를
  승인한다.
- 병목 가설, 단일 변경, 전후 반복 결과와 해석 한계를 별도 Experiment 문서로 남긴다.

## 범위, 비범위와 제약

범위는 컨테이너형 k6 scenario, seed·cleanup, custom metric, 결과 summary, Prometheus·Grafana
상관 분석, 데이터 정합성 확인, baseline과 수정 전후 Experiment다. PP-031의 metric과 PP-032의
기능 검증이 선행되어야 한다.

실제 provider, 유료 cloud 규모, 장기 soak의 무제한 실행, production 사용자 traffic, 근거 없는
SLA 선언은 포함하지 않는다. 로컬 Dev Container와 고정 Compose 자원을 기준 환경으로 기록하고
다른 하드웨어 결과를 직접 비교하지 않는다.

## 판단 기준과 대안

판단 기준은 재현성, 사용자 journey 대표성, 단계별 병목 분리, 데이터 정합성, 외부 안전이다.

- HTTP acceptance만 측정하면 비동기 worker 병목을 숨기므로 job terminal polling 또는 test
  observer를 통해 완료 시간을 별도로 측정한다.
- 모든 scenario를 한 script에 섞으면 원인을 분리하기 어려워 submission, worker saturation,
  SSE, vote contention, cache를 분리한다.
- 최고 처리량 한 번을 성과로 쓰지 않고 warm-up 후 여러 번 반복한 중앙값과 변동 범위를
  사용한다.
- 자동 threshold를 사전에 임의 설정하지 않고 기능 오류 0과 계약 불변식만 초기 hard gate로
  둔다. 지연·처리량 threshold는 baseline 변동성을 근거로 승인한다.

seed는 매 실행 고유 namespace를 사용하고 cleanup은 해당 namespace만 삭제한다. k6 container는
Compose 네트워크의 `http://dev:8080`을 사용하며 host 문맥은 별도 smoke 외에는 섞지 않는다.

## 문제 해결 기록

1. 사용자 journey를 acceptance, queue, worker, SSE, vote 단계로 분해하고 각 측정값의 시작·끝
   시점을 정의한다.
2. 작은 기능 검증 profile로 202·jobId·terminal·집계 assertion이 실제 실패를 검출하는지
   확인한다.
3. 고정 CPU·memory·worker concurrency·fixture와 warm-up·반복 횟수를 Experiment에 기록한다.
4. scenario별 baseline을 실행하고 애플리케이션·DB·Redis·JVM metric을 같은 시간축으로
   수집한다.
5. 가장 먼저 포화된 resource에 대한 단일 가설을 세우고 한 변경만 적용한다.
6. 동일 profile을 반복해 전후 차이와 변동성을 비교하고 기능·정합성 회귀를 재검증한다.
7. 재현 가능한 결과로만 회귀 threshold와 Runbook 신호를 갱신한다.

현재 k6 business scenario, baseline 실행과 병목 수정은 수행되지 않았다.

## 구현 결과와 검증 증거

PP-034는 아직 구현·측정되지 않았다. 완료 증거는 다음을 포함한다.

- 200 응답, 누락·잘못된 jobId, terminal timeout과 집계 불일치를 의도적으로 주입했을 때
  k6가 실패하는 음성 결과
- 각 scenario의 commit SHA, Compose profile, container image, CPU·memory, data seed, VU·duration,
  반복 횟수와 raw summary hash
- acceptance, queue wait, completion, SSE reconnect, vote conflict와 resource metric의 baseline
  분포 및 실행 간 변동성
- 부하 중 실제 provider host 요청이 없고 mock request count만 증가한 network·WireMock 증거
- 투표·확정 부하 후 DB 제약과 API aggregate가 일치하는 검증 query 결과
- 병목 가설 하나와 단일 변경의 전후 반복 결과, 기능 `make check` 재통과 기록
- baseline으로 승인한 regression threshold와 임의 수치가 아닌 선택 근거
- 연결된 Experiment와 Grafana screenshot 또는 query export

측정 전 예상값이나 한 번의 최고 수치를 README·Case Study 성과로 기재하지 않는다.

## AI 사용과 사람의 검증

AI에는 k6 scenario 구조, custom metric, 음성 assertion, 결과 표 정리와 병목 가설 후보를
위임할 수 있다. AI가 생성한 성능 해석은 metric 상관관계와 반복 실험이 없으면 채택하지
않는다.

사람은 부하가 사용자 행동을 대표하는지, 환경이 동일한지, 외부 호출이 차단됐는지, DB
정합성과 통계 해석을 검증한다. 회귀 threshold와 포트폴리오에 공개할 수치를 직접 승인한다.

## 남은 위험과 학습

로컬 Compose 결과는 production network와 hardware를 대표하지 않는다. 운영 환경이 생기면
같은 시나리오를 안전한 staging 자원에 재보정해야 한다. mock provider 응답 시간이 실제와
다르면 worker 병목 위치가 달라질 수 있으므로 관측된 live latency의 비민감 분포를 fixture
지연 모델에 반영할지 별도 검토한다.

핵심 학습 기준은 높은 숫자가 아니라 bottleneck 가설을 동일 조건의 반복 실험으로 반증·
검증하고 기능 정합성을 유지한 채 개선했는가이다.
