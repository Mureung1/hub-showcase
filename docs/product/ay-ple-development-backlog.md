# AY-PLE 4주 개발 백로그

| 항목 | 내용 |
| --- | --- |
| 작성일 | 2026-07-10 |
| 상태 | 초안 v0.1 |
| 계획 기간 | 2026-07-06 ~ 2026-07-31 |

## 문서 목적

이 문서는 AY-PLE의 4주 개발 방향과 우선순위를 한곳에서 관리하는 살아 있는 백로그다. 현재 제품 기능이 모두 확정되었다고 가정하지 않는다. 2주차 작업은 실행 가능한 수준으로 구체화하고, 3~4주차 작업은 앞선 검증 결과에 따라 바뀔 수 있는 예측으로 관리한다.

이 문서가 답해야 하는 질문은 다음과 같다.

- 지금 가장 먼저 해결해야 할 문제는 무엇인가?
- 다음 주까지 어떤 결과를 완료할 것인가?
- 기능이 아직 불명확할 때 어떤 조사와 결정을 먼저 할 것인가?
- 4주 안에 어떤 사용자 흐름을 실제로 시연할 것인가?

## 제품 목표와 4주 성공 기준

### 제품 목표

학생이 직접 선택한 학업 자료에서 AY가 과제 후보와 원본 근거를 찾고, 학생이 이를 검토한 뒤 확인된 학기 상태로 반영할 수 있게 한다.

### 4주 핵심 데모

4주차에는 최소한 다음 수직 흐름을 한 번에 시연하는 것을 목표로 한다.

1. 학생이 `문제해결글쓰기` 과목의 학업 자료를 넣는다.
2. 정리할 자료를 명시적으로 선택한다.
3. AY가 선택 자료에서 과제 후보와 값별 근거를 만든다.
4. 학생이 원본, 근거, 변경 제안을 함께 확인한다.
5. 학생이 제안을 수락하거나 수정·거절한다.
6. 수락한 결과만 확인된 상태로 저장되고, AY가 반영 결과를 설명한다.

Runtime Inspector는 이 학생용 데모 자체가 아니라, 위 흐름이 안정된 runtime 계약 위에서 실행된다는 것을 검증하는 개발 도구로 유지한다.

## 계획 원칙

### 우선순위

| 우선순위 | 의미 | 판단 기준 |
| --- | --- | --- |
| P0 | 반드시 필요 | 없으면 핵심 수직 흐름을 구현·검증·시연할 수 없다. |
| P1 | 중요 | 핵심 흐름의 신뢰성이나 사용성을 크게 높인다. |
| P2 | 후보 | 핵심 흐름이 완성된 뒤 여유가 있을 때 진행한다. |

같은 우선순위 안에서는 표에서 위에 있는 항목을 먼저 진행한다.

### 계획 확정도

| 구분 | 의미 |
| --- | --- |
| 완료 | 1주차에 구현 또는 문서화되어 현재 기준선에 포함된 작업 |
| 확정 | 다음 주에 완료를 목표로 하는 작업 |
| 예측 | 목표는 유지하되 앞선 결과에 따라 분할하거나 순서를 바꿀 수 있는 작업 |
| 후보 | 필요성은 있지만 4주 범위 포함 여부를 아직 결정하지 않은 작업 |

### 완료의 정의

개발 Task는 다음 조건을 모두 만족할 때 완료로 본다.

- Task에 적힌 사용자 또는 개발자 관점의 완료 조건을 충족한다.
- 변경된 동작을 적절한 자동화 테스트로 검증한다.
- 관련 제품, 아키텍처, package 문서가 현재 코드와 일치한다.
- `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/inspector` 중 변경 범위에 필요한 검증을 통과한다.
- UI 변경은 데스크톱 1440px 이상을 기준으로 핵심 흐름을 직접 확인한다.

## 4주 로드맵

| 주차 | 기간 | 주간 목표 | 주요 결과 | 확정도 |
| --- | --- | --- | --- | --- |
| 1주차 | 07-06 ~ 07-10 | 제품 방향과 runtime 위험을 먼저 검증한다. | Product Brief, Review Workspace prototype, Runtime Harness, Fake/Codex parity, hardening 계획 | 완료 |
| 2주차 | 07-13 ~ 07-17 | Runtime Harness를 제품 기능이 올라갈 수 있는 안정된 기반으로 닫고, 첫 제품 수직 흐름의 결정을 끝낸다. | restart-safe runtime history, bounded/degraded behavior, product handoff 결정 문서 | 확정 |
| 3주차 | 07-20 ~ 07-24 | Fake runtime으로 자료 선택부터 사용자 확인까지 결정적인 제품 수직 흐름을 완성한다. | 최소 workspace 상태, 자료 intake/selection, 변경 제안·근거, Review 수락 흐름 | 예측 |
| 4주차 | 07-27 ~ 07-31 | 실제 Codex 경로와 사용자 결정 흐름을 연결하고 데모를 안정화한다. | Codex-backed golden path, 수정·거절, 대표 자료 지원, 회귀 검증과 발표 시나리오 | 예측 |

## 1주차 완료 기준선

| ID | 완료된 결과 | 근거 |
| --- | --- | --- |
| W1-01 | 제품 문제, 핵심 사용자, MVP 방향을 정리했다. | [AY-PLE Product Brief](ay-ple-product-brief.md) |
| W1-02 | 검토 대기와 반영됨 상태의 화면 구조를 prototype으로 검증했다. | [Review Workspace Scenario](ay-ple-review-workspace-scenario.md) |
| W1-03 | Fake/Codex adapter가 같은 kernel 계약으로 실행·취소·실패를 표현한다. | [Runtime Harness 구현 지도](../architecture/runtime-harness-implementation-map.md) |
| W1-04 | 실제 HTTP/SSE와 browser를 통과하는 결정적 lifecycle 검증을 추가했다. | `npm run test:e2e` |
| W1-05 | 완료된 runtime run이 server 재시작 뒤 복원되는 최소 영속 history를 추가했다. | [Runtime Harness Hardening PRD](../prds/2026-07-10-runtime-harness-hardening.md) |
| W1-06 | 남은 runtime hardening 작업을 독립 실행 가능한 local issue로 나눴다. | [Runtime hardening issues](../issues/2026-07-10-runtime-harness-hardening/) |

## 2주차 확정 백로그

다음 주 목표는 **Runtime Harness hardening을 완료하고, 3주차에 구현할 첫 제품 수직 흐름의 경계를 확정하는 것**이다.

| 순서 | ID | Task | 유형 | 우선순위 | 완료 조건 | 상태 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | W2-01 | 첫 제품 수직 흐름의 구현 경계 결정 | 조사·설계 | P0 | 첫 지원 자료, workspace 저장 경계, product state contract, runtime handoff, 이번 4주 제외 범위를 한 문서에서 결정한다. | 탐색 필요 |
| 2 | W2-02 | Streaming checkpoint와 중단 run 복구 | 개발 | P0 | 실행 중 output/debug evidence가 주기적으로 저장되고, 재시작 때 `running`/`cancelling` run이 근거를 보존한 `failed`로 복구된다. | 준비됨 |
| 3 | W2-03 | Runtime history 상한과 terminal clear | 개발 | P0 | terminal history에 개수·용량 상한이 적용되고, active run을 보존한 채 API와 Inspector에서 terminal history를 비울 수 있다. | 준비됨 |
| 4 | W2-04 | Persistence failure의 fail-closed 동작 | 개발 | P0 | 저장 실패 시 runtime이 degraded가 되고 새 mutation을 거부하며, health/API/Inspector가 원인을 명확히 표시한다. | 준비됨 |
| 5 | W2-05 | Runtime hardening 통합 검증 | 검증 | P0 | test, E2E, typecheck, build, lint가 통과하고 구현 지도와 package 문서가 최종 동작과 일치한다. | W2-02~04 대기 |
| 6 | W2-06 | 3주차 product slice를 작은 실행 Task로 분할 | 계획 | P1 | 각 Task가 독립된 완료 조건을 갖고 0.5~2일 안에 검증 가능한 크기로 나뉜다. | W2-01 대기 |

상세 구현 기준은 기존 local issue를 따른다.

- [W2-02 상세: streaming checkpoints and interrupted recovery](../issues/2026-07-10-runtime-harness-hardening/003-streaming-checkpoints-and-interrupted-run-recovery.md)
- [W2-03 상세: bounded history and terminal clear](../issues/2026-07-10-runtime-harness-hardening/004-bounded-history-and-terminal-clear.md)
- [W2-04 상세: fail-closed persistence and degraded runtime](../issues/2026-07-10-runtime-harness-hardening/005-fail-closed-persistence-and-degraded-runtime.md)

### 다음 주 종료 시 확인할 결과

- Runtime history가 실행 중 checkpoint, server restart, retention, clear, storage failure를 일관된 계약으로 다룬다.
- 제품 코드가 raw Codex protocol 대신 `runtime-core`의 안정 계약만 사용한다는 경계가 유지된다.
- 첫 제품 slice가 어떤 입력을 받고 어떤 상태를 만들며 어디까지 저장하는지 설명할 수 있다.
- 3주차 첫날 바로 구현을 시작할 수 있는 Task 목록이 준비되어 있다.

## 3주차 예측 백로그

3주차 항목은 W2-05 결정에 따라 세부 shape와 저장 기술이 달라질 수 있다. 목표는 실제 Codex 결과의 변동성에 의존하기 전에 Fake runtime으로 핵심 제품 흐름을 결정적으로 완성하는 것이다.

| 순서 | ID | Task | 유형 | 우선순위 | 완료 조건 | 상태 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | W3-01 | 최소 학기 workspace와 Course 기준선 | 개발 | P0 | 사용자가 한 학기 workspace와 `문제해결글쓰기` 과목을 만들고 다시 열 수 있다. | 예측 |
| 2 | W3-02 | RawMaterial intake와 SourceSelection | 개발 | P0 | 원본을 보존해 목록에 표시하고, 처리할 자료를 사용자가 명시적으로 선택할 수 있다. | 예측 |
| 3 | W3-03 | Product modeling contract | 설계·개발 | P0 | 선택 자료가 ModelingRun 입력이 되고, 결과가 schema 검증된 과제 변경 제안과 field-level evidence로 변환된다. | 예측 |
| 4 | W3-04 | Review Workspace의 검토 대기 상태 | UI 개발 | P0 | 원본 미리보기, 근거, 변경 제안을 한 화면에서 확인할 수 있다. | 예측 |
| 5 | W3-05 | 수락 후 확인된 상태 반영 | 개발 | P0 | 사용자 수락 전에는 trusted 상태가 바뀌지 않고, 수락 후 과제명·마감과 확인 기록이 저장된다. | 예측 |
| 6 | W3-06 | Fake product golden-path E2E | 검증 | P0 | 자료 선택부터 수락과 reload 후 상태 확인까지 browser test가 결정적으로 통과한다. | 예측 |

## 4주차 예측 백로그

| 순서 | ID | Task | 유형 | 우선순위 | 완료 조건 | 상태 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | W4-01 | Codex-backed product golden path | 개발 | P0 | 같은 제품 contract를 사용해 실제 Codex run이 대표 자료에서 검토 가능한 과제 제안을 만든다. | 예측 |
| 2 | W4-02 | 변경 제안 수정·거절 | 개발 | P0 | 사용자가 제안을 수정하거나 거절할 수 있고, 선택 결과만 확인된 상태에 반영된다. | 예측 |
| 3 | W4-03 | 대표 입력 자료 범위 확정과 지원 | 개발 | P1 | W2-05에서 고른 대표 자료 형식이 end-to-end 데모에서 원본과 근거를 잃지 않고 처리된다. | 예측 |
| 4 | W4-04 | 실패·재시도·빈 상태 UX | 개선 | P1 | 대표 실패 상황에서 데이터가 잘못 확정되지 않고 사용자가 다음 행동을 이해할 수 있다. | 예측 |
| 5 | W4-05 | 전체 회귀 검증과 데모 fixture | 검증 | P0 | 핵심 Fake E2E와 Codex opt-in 검증을 실행하고 반복 가능한 발표용 자료와 시나리오를 준비한다. | 예측 |
| 6 | W4-06 | 설치·실행·아키텍처 문서 정리 | 문서·배포 | P1 | 새로운 사용자가 README만 보고 로컬 데모를 실행하고 핵심 구조를 이해할 수 있다. | 예측 |

## 기능 후보 백로그

아래 항목은 제품 방향에서 중요하지만 핵심 검토 루프보다 먼저 구현하지 않는다. 3주차 핵심 수직 흐름의 진행 상황을 보고 4주 범위에 승격하거나 이후로 미룬다.

| 순서 | ID | 후보 기능 | 우선순위 | 승격 조건 | 현재 결정 |
| --- | --- | --- | --- | --- | --- |
| 1 | C-01 | PDF text extraction과 page/range 근거 | P1 | TXT 기반 핵심 흐름이 안정되고 PDF가 대표 데모에 반드시 필요할 때 | 후보 |
| 2 | C-02 | Exam first-class modeling | P1 | Assignment contract를 재사용할 수 있고 시험 시나리오가 핵심 가치를 더 분명히 할 때 | 후보 |
| 3 | C-03 | MarkdownProjection | P1 | 확인된 상태가 안정되어 projection이 잘못된 값을 source of truth처럼 보이게 하지 않을 때 | 후보 |
| 4 | C-04 | TimelineEntry read model | P2 | Assignment/Exam canonical owner가 구현된 뒤 파생 view로 추가할 수 있을 때 | 후보 |
| 5 | C-05 | TaskCandidate → StudentTask | P2 | 과제 검토 루프가 완성되고 할 일 기능의 화면 위치를 결정했을 때 | 후보 |
| 6 | C-06 | WorkspaceHistory checkpoint/diff/rollback | P2 | Runtime Diagnostic History와 구분되는 학생용 history 의미를 별도 설계했을 때 | 후보 |
| 7 | C-07 | WorkspaceQuery | P2 | 확인된 상태와 evidence query contract가 준비되고 첫 대표 질문을 정했을 때 | 후보 |
| 8 | C-08 | HWP/HWPX parsing과 OCR | P2 | 핵심 흐름이 안정되고 실제 사용자 자료 검증에서 우선 필요성이 확인될 때 | 후보 |
| 9 | C-09 | `npx ay-ple` 배포 흐름 | P2 | 로컬 개발 실행과 데이터 경로가 안정되어 packaging이 재작업을 만들지 않을 때 | 후보 |

다음 항목은 이번 4주 범위에서 제외한다.

- LMS 로그인 자동화
- 클라우드 계정과 동기화
- 외부 캘린더 자동 업로드
- 과제 정답 생성과 자동 제출
- 모바일·소형 화면 최적화

## 아직 필요한 결정

| 결정 | 목표 시점 | 결정 전 기본 가정 |
| --- | --- | --- |
| 첫 product slice의 입력 형식 | 2주차 | TXT 한 종류로 먼저 수직 흐름을 닫고 PDF는 후보로 둔다. |
| 학기 상태 저장 schema와 repository 경계 | 2주차 | 제품 상태는 runtime history와 분리하고, raw Codex protocol을 저장 계약으로 사용하지 않는다. |
| RawMaterial 원본 위치와 app-managed metadata 위치 | 2주차 | 원본은 자동 수정·삭제하지 않고 workspace-local metadata와 분리한다. |
| StatePatch, EvidenceRef, UserConfirmation의 최소 필드 | 2주차 | Review prototype에서 실제로 사용하는 과제명, 마감, 제출 방식, 근거만 먼저 다룬다. |
| PDF를 4주 핵심 데모에 포함할지 | 3주차 시작 | TXT golden path 완성도를 우선한다. |
| timeline, 할 일, 정리 문서 중 후속 표면 | 3주차 말 | 핵심 검토 루프가 끝나기 전에는 별도 화면을 추가하지 않는다. |

## 운영 방법

### 주간 refinement

| 시점 | 할 일 |
| --- | --- |
| 월요일 | 이번 주 목표를 다시 확인하고 P0 항목의 완료 조건과 의존성을 점검한다. |
| 매일 시작 전 | 진행 중인 구현 Task를 하나로 제한하고, 막힘이나 새 정보만 상태에 반영한다. |
| Task 완료 시 | 테스트와 문서를 갱신하고 다음 순서의 준비된 항목을 시작한다. |
| 금요일 | 데모와 피드백을 기준으로 완료 항목을 닫고, 후보를 승격·유지·제외한 뒤 다음 주를 구체화한다. |

### 새 기능 아이디어 처리

새 아이디어가 생기면 즉시 구현하지 않고 다음 순서로 다룬다.

1. 기능 후보 백로그에 사용자 문제와 기대 결과를 한 줄로 추가한다.
2. 현재 P0 핵심 흐름을 막는지 확인한다.
3. 막지 않는다면 다음 금요일 refinement까지 후보로 유지한다.
4. 핵심 목표에 기여하고 완료 조건을 쓸 수 있을 때만 주차별 백로그로 승격한다.

## 변경 기록

| 날짜 | 버전 | 변경 |
| --- | --- | --- |
| 2026-07-10 | v0.1 | 1주차 기준선, 2주차 확정 Task, 3~4주차 예측, 기능 후보와 운영 규칙을 작성했다. |
