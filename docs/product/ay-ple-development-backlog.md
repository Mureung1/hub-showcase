# AY-PLE 4주 개발 백로그

| 항목 | 내용 |
| --- | --- |
| 작성일 | 2026-07-10 |
| 상태 | 초안 v0.4 |
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
3. AY가 선택 자료를 읽는 중 학생이 “두 번째 자료는 다른 분반이니 제외해줘”라고 정정하고, 앱이 이를 진행 중 작업에 `turn/steer`로 전달한다.
4. AY가 모호한 과제 날짜를 UserDecisionRequest로 묻고 학생의 답변 뒤 같은 ModelingRun을 이어간다.
5. AY가 과제 후보와 값별 근거를 만든다.
6. 학생이 원본, 근거, 변경 제안을 함께 확인한다.
7. 학생이 제안을 수락하거나 수정·거절한다.
8. 수락한 결과만 확인된 상태로 저장되고, AY가 반영 결과를 설명한다.

Runtime Inspector는 이 학생용 데모 자체가 아니라, 위 흐름이 안정된 runtime 계약 위에서 실행된다는 것을 검증하는 개발 도구로 유지한다.

실제 중단 완료와 실행 권한 요청의 종료는 핵심 흐름을 끊지 않도록 별도의 제어·실패 시나리오로 시연한다. `turn/interrupt`는 진행 중 작업을 멈추지만 이미 생성된 DraftState를 되돌리거나 Codex 세션을 삭제하지 않아야 한다.

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
| 1주차 | 07-06 ~ 07-10 | 제품 방향과 runtime 위험을 먼저 검증한다. | Product Brief, Review Workspace prototype, Runtime Harness, Fake/Codex parity, Runtime Diagnostic History hardening 완료 | 완료 |
| 2주차 | 07-13 ~ 07-17 | Codex App Server를 4주 주력 실행 엔진으로 삼고 CoControl에 필요한 상호작용을 증명한다. | 이어지는 세션, 세부 활동, 진행 중 정정, 실제 중단 완료, 요청 유형 분리, Codex 이벤트 관측 | 확정 |
| 3주차 | 07-20 ~ 07-24 | 처음부터 Codex를 사용하는 자료 선택→모델링→검토 제품 수직 흐름을 완성한다. | 최소 작업공간 상태, 자료 반입·선택, 진행 중 정정·질문, 변경 제안·근거, Review 수락 | 예측 |
| 4주차 | 07-27 ~ 07-31 | 대표 자료와 실패·재연결 상황에서 CoControl UX를 다듬고 반복 가능한 데모를 완성한다. | 수정·거절, 재연결, 충돌·실패 UX, 대표 테스트 자료, 회귀 검증과 발표 시나리오 | 예측 |

작업 지속과 재개의 4주 범위는 다음과 같이 고정한다.

- 2주차의 이어지는 작업 맥락은 같은 로컬 중계 서버와 App Server 자식 프로세스 안에서 동일 Codex `thread`로 여러 `turn`과 제어 요청을 이어가는 것을 뜻한다.
- 4주차의 재연결·재개는 브라우저 SSE 재연결과 로컬 중계 서버 또는 App Server 자식 프로세스 재시작 뒤 저장된 AY 작업 맥락과 Codex `thread`의 대응 관계로 작업을 다시 여는 것을 뜻한다.

## 1주차 완료 기준선

| ID | 완료된 결과 | 근거 |
| --- | --- | --- |
| W1-01 | 제품 문제, 핵심 사용자, MVP 방향을 정리했다. | [AY-PLE Product Brief](ay-ple-product-brief.md) |
| W1-02 | 검토 대기와 반영됨 상태의 화면 구조를 prototype으로 검증했다. | [Review Workspace Scenario](ay-ple-review-workspace-scenario.md) |
| W1-03 | Fake/Codex adapter가 같은 kernel 계약으로 실행·취소·실패를 표현한다. | [Runtime Harness 구현 지도](../architecture/runtime-harness-implementation-map.md) |
| W1-04 | 실제 HTTP/SSE와 browser를 통과하는 결정적 lifecycle 검증을 추가했다. | `npm run test:e2e` |
| W1-05 | Runtime Diagnostic History에 100ms checkpoint, interrupted-run recovery, count/byte retention과 terminal clear를 구현했다. | [Runtime Harness Hardening PRD](../prds/2026-07-10-runtime-harness-hardening.md) |
| W1-06 | Runtime persistence 실패를 fail-closed로 처리하고 degraded HTTP/UI와 함께 local issues 001–005를 구현·검증했다. | [Runtime hardening issues](../issues/2026-07-10-runtime-harness-hardening/) |

## 2주차 확정 백로그

다음 주 목표는 **Codex App Server의 상세한 상호작용을 학생·앱·AY의 CoControl로 연결하는 첫 수직 흐름을 증명하는 것**이다. 결정 근거는 [ADR 0005](../adr/0005-use-codex-app-server-as-first-class-mvp-runtime.md)에 둔다.

| 순서 | ID | Task | 유형 | 우선순위 | 완료 조건 | 상태 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | W2-01 | Codex 우선 제품 연결 결정 반영 | 문서·설계 | P0 | Product Brief, ADR, 구현 지도, 4주 제외 범위가 Codex 직접 통합 우선 방향으로 일치한다. | 완료 |
| 2 | W2-02 | Codex 프로세스와 이어지는 `thread` 생명주기 | 개발 | P0 | 같은 로컬 중계 서버와 App Server 자식 프로세스 안에서 프로세스와 `thread`를 실행마다 닫지 않고 여러 `turn`과 제어 요청에 재사용한다. AY 작업 맥락과 Codex `thread`의 대응 관계를 유지하고, 프로세스 재시작 뒤 재개는 W4 범위로 남긴다. | 준비됨 |
| 3 | W2-03 | Codex 이벤트와 App Server 요청 왕복 경로 | 개발 | P0 | `notification`과 서버 `request`를 `response`와 구분해 전달하고 `thread`/`turn`/`item`/`request` 식별자를 보존한다. 형식이 지정된 응답, 취소, 알 수 없는 요청의 안전한 거절, 명시적인 `sandbox`·`approval` 정책을 계약 테스트로 고정한다. 제품 상태나 감사 기록에는 Codex 원본 내용을 기본적으로 저장하지 않는다. | W2-02 대기 |
| 4 | W2-04 | AY 진행 활동 표시 | 개발 | P0 | 메시지, 계획, 도구·파일 활동, 대기 상태, 종료 결과를 텍스트 중심 실행 생명주기와 별도로 Inspector에서 관측한다. | W2-03 대기 |
| 5 | W2-05 | 진행 중 정정과 실제 중단 완료 확인 | 개발 | P0 | 진행 중 작업의 예상 식별자를 확인해 `turn/steer`를 전달하고, `turn/interrupt`는 실제 `interrupted` 완료 이벤트를 관측한 뒤 UI가 안정 상태로 돌아간다. | W2-03 대기 |
| 6 | W2-06 | 실행 권한과 Codex 사용자 입력 요청 왕복 | 개발·UX | P0 | 실행 권한 요청과 Codex가 요구하는 짧은 입력을 서로 다른 `request` 형식과 안내 문구로 표시하고 정확한 `request`에 응답한다. 중단·연결 해제 시 미처리 요청은 안전하게 거절하며, UserDecisionRequest의 MCP 경로는 W3에서 연결한다. | W2-03 대기 |
| 7 | W2-07 | CoControl 반복 검증 | 검증 | P0 | Inspector에서 SourceSelection 형태의 앱 상태 변경→`turn/steer`→Codex 사용자 입력 응답→`turn/interrupt` 시나리오를 실행한다. 이때 학생·앱·AY 중 누가 어떤 행동을 일으켰는지 반복 가능한 테스트와 실제 Codex 스모크 테스트로 확인한다. | W2-04~06 대기 |
| 8 | W2-08 | 3주차 제품 수직 흐름을 작은 실행 작업으로 분할 | 계획 | P1 | 각 작업이 Codex 경로를 기본으로 사용하고 `FakeRuntimeAdapter`는 전송 계층 테스트 대역으로만 쓰며 0.5~2일 크기의 완료 조건을 갖는다. | W2-07 대기 |

Runtime Harness 안정화 이슈 001~005는 2026-07-11에 모두 완료했다. 이후 4주 P0는 ADR 0005의 Codex CoControl 제품 연결이며, 추가 범용 hardening은 제품 수직 흐름이나 데모 안정성을 직접 막는 문제가 확인될 때만 승격한다.

### 다음 주 종료 시 확인할 결과

- 같은 프로세스에서 이어지는 Codex 세션, 상세한 작업 활동, `turn/steer`, `turn/interrupt`, App Server 요청 왕복이 실제 경로에서 동작한다.
- 제품 코드는 생성된 Codex 타입을 직접 사용하지 않으면서도 Codex 상호작용을 여섯 가지 이벤트의 `RuntimeRunEvent`로 평탄화하지 않는다.
- 첫 제품 수직 흐름이 학생·앱·AY의 상호작용을 어떤 정책으로 연결하고 어떤 결과만 SemesterModel에 저장하는지 설명할 수 있다.
- 3주차 첫날 바로 구현을 시작할 수 있는 Task 목록이 준비되어 있다.

## 3주차 예측 백로그

3주차 항목은 W2-06 결과에 따라 세부 형태와 저장 기술이 달라질 수 있다. 목표는 실제 Codex 경로를 첫 제품 수직 흐름의 기본 경로로 사용하되, 결정적인 테스트용 App Server로 상호작용 계약을 반복 검증하는 것이다.

| 순서 | ID | Task | 유형 | 우선순위 | 완료 조건 | 상태 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | W3-01 | 최소 학기 작업공간과 Course 기준선 | 개발 | P0 | 사용자가 한 학기 작업공간과 `문제해결글쓰기` 과목을 만들고 다시 열 수 있다. | 예측 |
| 2 | W3-02 | RawMaterial 반입과 SourceSelection | 개발 | P0 | 원본을 보존해 목록에 표시하고, 처리할 자료를 사용자가 명시적으로 선택할 수 있다. | 예측 |
| 3 | W3-03 | Codex를 사용한 ModelingRun과 진행 활동 | 개발 | P0 | 선택 자료를 이어지는 Codex 세션에서 처리하고, AY의 진행 활동을 화면에 보여준다. 결과는 스키마로 검증한 과제 변경 제안과 필드별 근거로 변환한다. | 예측 |
| 4 | W3-04 | 진행 중 정정과 UserDecisionRequest | 개발·UX | P0 | 학생의 자료 제외 정정을 `turn/steer`로 반영하고, AY의 학업 판단 질문은 `app.request_user_decision` MCP 도구를 통해 GUI에서 응답한 뒤 같은 작업을 계속한다. Codex가 실행 중 요구하는 짧은 입력과 섞지 않는다. | 예측 |
| 5 | W3-05 | Review Workspace와 확인된 상태 반영 | 개발·UI | P0 | 원본, 근거, 변경 제안을 한 화면에서 확인하고 수락 전에는 TrustedState가 바뀌지 않으며 수락 후 과제명·마감과 확인 기록이 저장된다. | 예측 |
| 6 | W3-06 | 제품 핵심 흐름 E2E와 실제 Codex 검증 | 검증 | P0 | 자료 선택부터 CoControl, 수락, 브라우저 새로고침 뒤 상태 확인까지 결정적인 브라우저 테스트가 통과하고 같은 의미의 흐름을 선택 실행 Codex 검증이 확인한다. | 예측 |

W3-01 또는 W3-03에서 저장소 내부 데모 경로를 넘어 사용자가 선택한 실제 학기 작업공간을 받기 시작하면, C-09 전체 패키징과 무관하게 [ADR 0006](../adr/0006-separate-package-app-data-and-semester-workspace-roots.md)의 경로 배치 부분만 해당 주차로 승격한다. 그 전까지는 현재 `.ay-ple/runtime-*` 개발 기본값을 유지한다.

## 4주차 예측 백로그

| 순서 | ID | Task | 유형 | 우선순위 | 완료 조건 | 상태 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | W4-01 | 변경 제안 수정·거절과 충돌 처리 | 개발 | P0 | 사용자가 제안을 수정하거나 거절할 수 있고, 같은 객체의 새 제안이 기존 UserConfirmation을 덮어쓰지 않으며 선택 결과만 TrustedState에 반영된다. | 예측 |
| 2 | W4-02 | 재연결·재개와 실패 UX | 개발·개선 | P0 | 브라우저 SSE와 로컬 중계 서버 또는 App Server 자식 프로세스 재시작 뒤 저장된 AY 작업 맥락과 Codex `thread`의 대응 관계로 작업을 다시 연다. 오래된 `turn/steer`, 중단 실패, 미처리 `request` 상황에서도 사용자가 다음 행동을 이해한다. | 예측 |
| 3 | W4-03 | 대표 입력 자료 범위 확정과 지원 | 개발 | P1 | 선정한 대표 자료 형식이 전체 데모 경로에서 원본과 필드별 근거를 잃지 않고 처리된다. | 예측 |
| 4 | W4-04 | AY 진행 활동과 실행 권한 UX 정리 | 개선 | P1 | 일반 학생이 도구와 실행 환경의 세부사항에 압도되지 않으면서 AY가 무엇을 하는지와 왜 승인이 필요한지 이해한다. | 예측 |
| 5 | W4-05 | 전체 회귀 검증과 데모 테스트 자료 | 검증 | P0 | 결정적인 테스트용 App Server E2E와 선택 실행 Codex 검증을 실행하고 반복 가능한 발표용 자료와 시나리오를 준비한다. | 예측 |
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
| 9 | C-09 | 제품 진입점과 `npx ay-ple` 배포 흐름 | P2 | 실제 사용자 학기 작업공간 또는 패키징을 구현할 때 패키지·앱 데이터·작업공간 루트를 분리하는 경로 배치 모듈까지 함께 만들 수 있을 때 | 후보 · [ADR 0006](../adr/0006-separate-package-app-data-and-semester-workspace-roots.md) |
| 10 | C-10 | 제품용 진단 근거 allowlist와 redaction | P1 | Runtime Diagnostic History의 prompt 또는 raw/debug evidence를 제품 session이나 감사 기록에 재사용하기 전 | 후보 · 제품 재사용 gate |

다음 항목은 이번 4주 범위에서 제외한다.

- ACP 어댑터 도입 또는 `codex-acp` 포크
- Claude Code, OpenCode, Pi 등 다중 엔진 동작 일치
- 범용 실행 엔진 기능 분류와 엔진 선택 UI
- Open WebUI나 ACP UI를 제품 외곽 UI로 채택하는 작업
- LMS 로그인 자동화
- 클라우드 계정과 동기화
- 외부 캘린더 자동 업로드
- 과제 정답 생성과 자동 제출
- 모바일·소형 화면 최적화

## 아직 필요한 결정

| 결정 | 목표 시점 | 결정 전 기본 가정 |
| --- | --- | --- |
| 첫 제품 수직 흐름의 입력 형식 | 2주차 | TXT 한 종류로 먼저 수직 흐름을 닫고 PDF는 후보로 둔다. |
| 학기 상태 저장 schema와 repository 경계 | 2주차 | 제품 상태는 runtime history와 분리하고, raw Codex protocol을 저장 계약으로 사용하지 않는다. |
| RawMaterial 원본 위치와 app-managed metadata 위치 | 2주차 | 원본은 자동 수정·삭제하지 않고 workspace-local metadata와 분리한다. |
| StatePatch, EvidenceRef, UserConfirmation의 최소 필드 | 2주차 | Review prototype에서 실제로 사용하는 과제명, 마감, 제출 방식, 근거만 먼저 다룬다. |
| 이어지는 AY 작업 맥락과 ModelingRun의 저장 관계 | 2주차 | Codex `thread`는 실행 맥락으로 사용하되 SemesterModel이나 WorkspaceHistory의 SSOT로 취급하지 않는다. |
| 앱의 자료 선택·상태 변경을 즉시 전달하거나 대기시키고, 새 `turn`으로 시작할 조건 | 2주차 | 학생의 명시적 의도와 진행 중 작업의 식별자를 확인하지 못하면 자동으로 `turn/steer`하지 않는다. |
| 운영체제별 `appDataRoot` 기본 위치, 작업공간 선택 방식과 기존 제품 데이터 이전 UX | C-09 또는 실제 학기 작업공간 활성화 착수 전 | 현재 저장소 내부 `.ay-ple/runtime-*`는 개발 기본값으로 유지한다. 제품에서는 [ADR 0006](../adr/0006-separate-package-app-data-and-semester-workspace-roots.md)의 세 루트를 경로 배치 모듈이 분리하고 환경 변수는 재정의 수단으로만 사용한다. |
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
| 2026-07-11 | v0.4 | Runtime Harness issues 001–005 완료를 기준선에 반영하고, developer-only 진단 기록을 제품에서 재사용하기 전 allowlist와 redaction을 P1 보안 gate로 추가했다. |
| 2026-07-10 | v0.3 | 현재 저장소 내부 `.ay-ple/runtime-*`를 유효한 개발 기본값으로 유지하고, 제품 진입점에서 패키지·앱 데이터·학기 작업공간 루트를 분리하는 후속 과제를 C-09와 미결정 표에 연결했다. |
| 2026-07-10 | v0.2 | Codex App Server를 4주 주력 실행 엔진으로 확정하고 W2를 필수 상호작용 검증, W3를 Codex 제품 수직 흐름, W4를 CoControl 안정화 중심으로 재배치했다. ACP·다중 엔진 중립화와 비차단 Runtime Harness 안정화는 캠프 이후로 미뤘다. |
| 2026-07-10 | v0.1 | 1주차 기준선, 2주차 확정 Task, 3~4주차 예측, 기능 후보와 운영 규칙을 작성했다. |
