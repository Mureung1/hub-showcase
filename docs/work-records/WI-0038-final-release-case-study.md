---
id: WI-0038
title: PP-036 최종 릴리스 검증과 포트폴리오 Case Study
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
  - ../adr/ADR-0008-frontend-same-origin-boundary.md
paths:
  - README.md
  - docs/README.md
  - docs/roadmap.md
  - docs/contracts.md
  - docs/architecture.md
  - docs/adr/**
  - docs/troubleshooting/**
  - docs/experiments/**
  - docs/runbooks/**
  - docs/case-studies/**
  - .github/**
---

# WI-0038 PP-036 최종 릴리스 검증과 포트폴리오 Case Study

> GitHub Issue: [PP-036 #38](https://github.com/gdh0730/hub/issues/38)

## 문제와 근거

PP-036은 기능별 완료 선언을 실제 서비스 journey, 자동 검증, 운영 절차와 문서 증거에 대조해
완성형 MVP의 release 여부를 결정한다. 코드가 존재해도 계약 상태가 `planned`로 남거나 Issue,
Work Record, ADR과 검증 artifact가 끊기면 제3자가 문제 해결 과정과 결과를 재현할 수 없다.
반대로 검증되지 않은 성능·정확도나 live 성공을 Case Study에 쓰면 포트폴리오의 신뢰를
훼손한다.

현재 완료된 것은 Java 17 개발 환경이며 PP-001~PP-035 서비스 Task는 구현·검증 전이다.
따라서 이 Work Record는 최종 release와 Case Study가 완료됐다는 문서가 아니라 모든 증거를
대조하는 마지막 gate의 기준이다.

## 목적과 성공 기준

목적은 사용자 여정과 안전 불변식이 clean clone에서 재현되고, 모든 주요 결정·실패·측정이
근거 링크와 함께 설명되는 경우에만 release와 포트폴리오 Case Study를 검증 상태로 전환하는
것이다.

성공 기준은 다음과 같다.

- PP-001~PP-035 Issue의 성공 기준, 연결 Work Record, ADR·Troubleshooting·Experiment·Runbook과
  CI 증거를 traceability matrix로 대조하고 누락이 0건이다.
- MVP 범위의 API·event·LLM 계약은 구현·자동 검증이 끝난 항목만 `implemented`이며 코드와
  OpenAPI·DB·UI 상태가 일치한다.
- clean clone에서 Java 17 환경 설정, mock full E2E, 관측성, 부하 baseline과 production
  packaging smoke를 표준 명령으로 재현한다.
- 제한된 Approval Gate 기반 배포 Live 검증과 secret·비용·redaction 정책이 승인된 증거를
  확인한다.
- README가 현재 구현과 제외 범위, 실행법, 아키텍처, 검증 명령, 알려진 위험과 문서 index를
  실제 상태대로 안내한다.
- Case Study가 문제, 기준, 대안, 결정, 비직관적 장애, 측정 전후 결과, 사람 검증과 한계를
  원본 증거 링크로 설명한다.
- 공개하는 성능·정확도·성공 수치는 연결된 Experiment·CI·live artifact에서 재현 가능하며
  측정 환경과 한계를 함께 표시한다.

## 범위, 비범위와 제약

범위는 release checklist, 계약 상태 감사, Issue·WI·ADR 추적성, clean clone acceptance,
security·live·performance 증거 검토, README·문서 index, 최종 Case Study, release note와 GitHub
수동 squash merge 준비다.

새 기능, 유료 cloud 배포, 관리자 UI, 회원·결제, 검증되지 않은 수치 보정, 실패한 test 예외
승인은 포함하지 않는다. PP-001에서 제외한 항목은 미완성으로 계산하지 않되 README와 Case
Study에 명확히 구분한다.

## 판단 기준과 대안

판단 기준은 재현성, 추적성, 계약 일치, 사용자 가치, 안전성, 증거의 정직성과 제3자 이해
가능성이다.

- Issue를 모두 닫았다는 사실만으로 release하지 않고 각 성공 기준의 실제 evidence를 확인한다.
- README에 결과를 복사해 정본을 늘리지 않고 계약·ADR·Experiment·Runbook으로 연결한다.
- 하나의 장문 개발 일지 대신 Work Record 중심의 문제 해결과 전문 문서 링크로 검토 경로를
  제공한다.
- 실패나 한계를 제거해 서사를 단순화하지 않고 원인, 수정, 재검증과 남은 위험을 Case Study의
  핵심 증거로 사용한다.

release gate 중 하나라도 미충족이면 해당 PP Issue를 다시 열거나 상태를 유지하고 원인·복구
조건을 기록한다. 문서 표현만 바꿔 실패를 통과시키지 않는다.

## 문제 해결 기록

1. PP-001~PP-035의 Issue 본문과 Work Record 성공 기준을 기계 판독 가능한 checklist로
   모은다.
2. API, event, schema, route, migration과 테스트 traceability를 코드·문서 양쪽에서 대조한다.
3. clean clone의 표준 환경에서 setup, mock full E2E, observe, load baseline과 packaging smoke를
   실행한다.
4. CI report, Playwright trace, Eval, security review, 배포 Live와 Experiment 증거의 commit·
   환경·날짜를 확인한다.
5. 실패·trade-off·수정 전후와 남은 위험을 Case Study 초안에 연결하고 과장 표현을 제거한다.
6. 독립적인 사람 검토자가 README만으로 실행하고 증거 링크를 따라 결론을 확인한다.
7. 모든 gate 통과 후에만 문서 상태, Issue, release note와 Case Study를 완료 상태로 전환한다.

현재 위 감사를 실행하지 않았고 서비스 release와 Case Study 검증을 완료하지 않았다.

## 구현 결과와 검증 증거

PP-036은 아직 구현·검증되지 않았다. 완료 판단에 필요한 증거는 다음과 같다.

- PP-001~PP-035의 Issue, WI, ADR·TS·EXP·RUN, code path와 test artifact를 연결한 누락 없는
  traceability report
- `planned`, `specified`, `implemented`, `deprecated` 상태와 실제 route·test 존재 여부를
  비교하고 의도적 불일치를 실패시키는 문서 검사
- Docker Desktop만 준비된 clean clone에서 README 절차를 따라 전체 mock 사용자 journey와
  관측·부하·packaging을 재현한 실행 기록
- Java 17 builder/runtime·CI, 외부 mock 차단, security·privacy lifecycle와 배포 Live
  redaction을 재확인한 결과
- 공개 수치마다 Experiment ID, commit, 환경, 반복 횟수, 원본 summary와 해석 한계가 연결된
  검증표
- 기존 사용자 파일과 참고 원문을 의도치 않게 변경하지 않았다는 diff·hash 검사
- 독립 검토자가 발견한 문서·실행 불일치를 수정하고 전체 gate를 다시 통과한 기록
- 한국어 PR의 필수 CI 성공과 수동 squash merge 전 최종 checklist

위 증거가 하나라도 없으면 status와 Case Study를 검증 상태로 변경하지 않는다.

## AI 사용과 사람의 검증

AI에는 문서·코드·Issue traceability 비교, 누락 탐지, Case Study 구조화, 검증 명령 실행과
과장 표현 검사를 위임할 수 있다. AI가 요약한 성공은 원본 test·measurement·live artifact와
일치할 때만 채택하고 숨은 추론이나 전체 prompt를 포트폴리오에 포함하지 않는다.

사람은 사용자 journey, 보안·약관·비용, 성능 해석, 제외 범위와 각 증거 링크를 최종 승인한다.
clean clone을 직접 재현하고 GitHub CI·Environment 상태와 diff를 검토한 뒤 수동 squash merge와
release 결정을 수행한다.

## 남은 위험과 학습

release 시점의 성공은 provider drift, dependency 취약점과 traffic 변화 이후에도 자동으로
유효하지 않다. 공식 API·dependency 변경, live drift, 성능 회귀와 security incident를 재검토
조건으로 문서화하고 새 Work Record로 후속한다. private 저장소의 artifact는 포트폴리오 공개
시 직접 접근할 수 없으므로 비밀·약관을 지키는 검증 요약과 재현 명령을 별도로 제공해야 한다.

핵심 학습 기준은 완성된 기능 목록이 아니라 문제 정의부터 결정, 실패, 측정, 검증과 한계를
제3자가 같은 근거로 따라가 동일한 결론에 도달할 수 있는가이다.
