> 이 문서는 캠프 제출을 위해 작성한 원래 일정과 당시 판단을 보존한다. 현재 작업 순서와 완료 상태는 [AY-PLE 개발 백로그](../product/ay-ple-development-backlog.md)를 따른다.

# AY-PLE 4주 개발 백로그

| 항목 | 내용 |
| --- | --- |
| 작성일 | 2026-07-10 |
| 최종 업데이트 | 2026-07-12 |
| 분류 | 완료·역사 기록 |
| 성숙도 | 초안 |
| 버전 | v0.6 |
| 계획 기간 | 2026-07-06 ~ 2026-07-31 |

## 문서 목적

이 문서는 AY-PLE의 4주 개발 방향과 우선순위를 관리하는 살아 있는 백로그다. 1주차 Runtime Harness는 완료된 기술 기준선으로 두고, 남은 기간에는 일반적인 Codex 사용 위에 학업 자료 선택, 정형화된 작업 실행, 근거가 있는 변경 제안, 학생 검토를 얇게 결합하는 제품 수직 흐름을 우선한다.

이 문서가 답해야 하는 질문은 다음과 같다.

- 지금 가장 먼저 닫아야 할 사용자 흐름은 무엇인가?
- AY-PLE가 직접 소유하는 제품 상태와 Codex에 맡기는 실행 책임은 무엇인가?
- 아직 필요성이 확인되지 않은 App Server capability를 어떻게 보류할 것인가?
- 4주 안에 어떤 흐름을 실제로 시연할 것인가?

## 제품 목표와 4주 성공 기준

### 제품 목표

학생이 한 학기 작업공간에서 직접 고른 학업 자료를 대상으로 정형화된 AY 작업을 실행하고, AY가 만든 근거 있는 변경 제안을 검토한 뒤 확인한 내용만 학기 상태에 반영할 수 있게 한다.

### 4주 핵심 데모

4주차에는 최소한 다음 수직 흐름을 한 번에 시연하는 것을 목표로 한다.

1. 학생이 자신의 `N학년 N학기` 폴더를 AY-PLE의 SemesterWorkspace로 연다.
2. `문제해결글쓰기` Course의 원본 자료를 추가하거나 기존 파일을 고른다.
3. 학생이 “선택한 자료에서 과제 정보를 정리해줘” 같은 제품 작업을 실행한다.
4. 앱이 선택한 `ModelingRecipe` version, arguments, `SourceSelection`과 활성 `SemesterWorkspace` 맥락으로 `ModelingInvocation`을 만들고 Codex 통합이 native 입력으로 번역해 실행한다.
5. AY의 구조화 결과를 검증해 `StatePatch`와 `EvidenceRef`로 표시한다.
6. 학생이 원본, 근거, 변경 제안을 함께 보고 수락·수정·거절한다.
7. `UserConfirmation`을 거친 값만 SemesterModel의 확인된 상태에 반영한다.

`turn/steer`, `turn/interrupt`, server-initiated request, Hook, `additionalContext` 같은 capability는 특정 사용자 상호작용이 실제로 요구할 때 별도 case로 검증한다. 핵심 데모를 성립시키기 위해 모든 capability나 고정된 thread topology를 먼저 구현하지 않는다.

Runtime Inspector는 학생용 제품이 아니라, 위 흐름이 안정된 Codex integration 위에서 실행되는지 확인하는 개발 도구로 유지한다. Runtime Diagnostic History와 Codex 원본 protocol 기록은 제품 감사 기록이나 SemesterModel의 source of truth가 아니다.

## 계획 전제

이 백로그는 결정 내용을 다시 정의하지 않고 구현 순서와 완료 조건만 관리한다. 제품 목표는 [AY-PLE Product Brief](../product/ay-ple-product-brief.md), 도메인 용어는 [CONTEXT.md](../../CONTEXT.md), Codex-first·root 소유권·제품 실행 경계는 [ADR 0005](../adr/0005-use-codex-app-server-as-first-class-mvp-runtime.md)·[ADR 0006](../adr/0006-separate-package-app-data-and-semester-workspace-roots.md)·[ADR 0007](../adr/0007-use-native-codex-composition-for-product-actions.md)를 따른다. Native mapping과 runtime 격리 목표는 각각 [Codex-native 제품 작업 조합](../architecture/codex-native-product-composition.md)과 [Codex Runtime 격리](../architecture/codex-runtime-isolation.md)가 소유한다.

## 계획 원칙

### 우선순위

| 우선순위 | 의미 | 판단 기준 |
| --- | --- | --- |
| P0 | 반드시 필요 | 없으면 Recipe 실행부터 Review 반영까지의 핵심 수직 흐름을 시연할 수 없다. |
| P1 | 중요 | 핵심 흐름의 신뢰성이나 사용성을 크게 높인다. |
| P2 | 후보 | 핵심 흐름이 완성된 뒤 여유가 있을 때 진행한다. |

같은 우선순위 안에서는 표에서 위에 있는 항목을 먼저 진행한다.

### 계획 확정도

| 구분 | 의미 |
| --- | --- |
| 완료 | 구현 또는 문서화되어 현재 기준선에 포함된 작업 |
| 확정 | 다음 주에 완료를 목표로 하는 작업 |
| 예측 | 앞선 검증 결과에 따라 분할하거나 순서를 바꿀 수 있는 작업 |
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
| 1주차 | 07-06 ~ 07-10 | 제품 방향과 runtime 위험을 먼저 검증한다. | Product Brief, Review Workspace prototype, Runtime Harness, Fake/Codex parity, Runtime Diagnostic History hardening | 완료 |
| 2주차 | 07-13 ~ 07-17 | Codex-native 제품 작업의 조합 경계와 최소 실행 계약을 고정한다. | SemesterWorkspace 기준선, ModelingRecipe, ModelingInvocation 번역, ModelingRun receipt, integration 검증 | 확정 |
| 3주차 | 07-20 ~ 07-24 | 자료 선택→Invocation 실행→StatePatch→Review 제품 수직 흐름을 완성한다. | RawMaterial 반입, Assignment Recipe·Invocation, EvidenceRef, Review, UserConfirmation, 확인된 SemesterModel | 예측 |
| 4주차 | 07-27 ~ 07-31 | 대표 자료와 실패 상황에서 수직 흐름을 다듬고 반복 가능한 데모를 완성한다. | 수정·거절, 실패 UX, 필요성이 확인된 상호작용 case, 대표 테스트 자료, 회귀 검증 | 예측 |

## 1주차 완료 기준선

| ID | 완료된 결과 | 근거 |
| --- | --- | --- |
| W1-01 | 제품 문제, 핵심 사용자, MVP 방향을 정리했다. | [AY-PLE Product Brief](../product/ay-ple-product-brief.md) |
| W1-02 | 검토 대기와 반영됨 상태의 화면 구조를 prototype으로 검증했다. | [Review Workspace Scenario](../product/ay-ple-review-workspace-scenario.md) |
| W1-03 | Fake/Codex adapter가 같은 kernel 계약으로 실행·취소·실패를 표현한다. | [Runtime Harness 구현 지도](../architecture/runtime-harness-implementation-map.md) |
| W1-04 | 실제 HTTP/SSE와 browser를 통과하는 결정적 lifecycle 검증을 추가했다. | `npm run test:e2e` |
| W1-05 | Runtime Diagnostic History에 100ms checkpoint, interrupted-run recovery, count/byte retention과 terminal clear를 구현했다. | [Runtime Harness Hardening PRD](../prds/2026-07-10-runtime-harness-hardening.md) |
| W1-06 | Runtime persistence 실패를 fail-closed로 처리하고 degraded HTTP/UI와 함께 local issues 001–005를 구현·검증했다. | [Runtime hardening issues](../issues/2026-07-10-runtime-harness-hardening/) |

## 2주차 확정 백로그

2주차 목표는 범용 이벤트 라우터나 session manager를 만드는 것이 아니라, 하나의 제품 작업이 native Codex 입력으로 어떻게 조합되고 결과가 제품 Review 계약으로 어떻게 돌아오는지 고정하는 것이다.

| 순서 | ID | Task | 유형 | 우선순위 | 완료 조건 | 상태 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | W2-01 | Codex-native 제품 경계 문서 정렬 | 문서·설계 | P0 | 문서가 `ModelingRecipe → ModelingInvocation → ModelingRun`의 같은 의미를 사용하고, 결정·현재 구현·계획을 각 소유 문서로 분리하며 고정 thread topology를 요구하지 않는다. | 완료 |
| 2 | W2-02 | SemesterWorkspace 실행 기준선 | 개발·설계 | P0 | 하나의 layout seam이 명시적으로 주입한 `packageRoot`, `appDataRoot`, `workspaceRoot`를 검증하고, `CODEX_HOME`·`CODEX_SQLITE_HOME` pair와 선택한 workspace `cwd`를 함께 계산한다. 제품 경로에서 `process.cwd()`를 workspace fallback으로 사용하지 않으며 native `AGENTS.md`·Skills discovery와 명시적으로 설정한 built-in Memories의 feature·생성·사용 설정, auth·eligibility를 smoke로 확인한다. OS 기본 경로 resolver와 배포 UX는 C-09, Memory lifecycle은 C-15 범위다. | 준비됨 |
| 3 | W2-03 | ModelingRecipe와 PromptTemplate 최소 계약 | 개발 | P0 | [CONTEXT.md](../../CONTEXT.md)에 정의한 versioned Recipe의 정적 계약을 구현하고 실제 arguments로 결정적인 prompt를 렌더링한다. Recipe는 실행별 입력, Course나 thread를 소유하지 않는다. | 준비됨 |
| 4 | W2-04 | ModelingInvocation 생성과 native input 번역 | 개발 | P0 | Recipe version, 검증된 arguments, SourceSelection과 활성 SemesterWorkspace 맥락으로 일회성 Invocation을 만든다. Codex 통합은 이를 Skill, rendered text, source mentions와 output schema로 번역해 하나의 turn을 시작하고 raw protocol type은 내부에 둔다. 기존 thread를 선택하면 workspace 일치를 검증한다. | W2-02~03 대기 |
| 5 | W2-05 | ModelingRun receipt와 결과 검증 | 개발 | P0 | [ADR 0007](../adr/0007-use-native-codex-composition-for-product-actions.md)의 ModelingRun 기록 계약을 구현하고, 테스트가 실행 시도·retry cardinality와 검증된 결과 연결을 확인한다. 일회성 Invocation과 raw identifier는 영속 저장 계약으로 승격하지 않는다. | W2-04 대기 |
| 6 | W2-06 | 조합 계약 테스트와 실제 Codex smoke | 검증 | P0 | fake transport 계약 테스트가 input 조합과 output validation을 결정적으로 검증하고, 선택 실행 smoke가 pinned Codex App Server에서 같은 shape의 turn을 완료한다. | W2-04~05 대기 |
| 7 | W2-07 | 3주차 수직 흐름 issue 분할 | 계획 | P1 | RawMaterial부터 UserConfirmation까지 각 작업이 0.5~2일 크기이고, Runtime Harness 확장과 제품 상태 구현이 분리되어 있다. | W2-06 대기 |

Runtime Harness 안정화 issues 001~005는 2026-07-11에 모두 완료했다. 추가 범용 hardening은 제품 수직 흐름이나 데모 안정성을 직접 막는 문제가 확인될 때만 P0로 승격한다.

### 2주차 종료 시 확인할 결과

- 하나의 action이 Recipe를 선택하고 입력을 모아 ModelingInvocation을 만들며, Codex 통합이 이를 native 입력으로 번역한다.
- ModelingRun이 한 Invocation 실행 시도의 receipt일 뿐 Codex thread나 학기 workflow를 재정의하지 않는다.
- native `AGENTS.md`, Skills와 검증된 opt-in Memories를 재구현하지 않고 앱이 관리하는 실행 환경에서 사용할 수 있다.
- `turn/steer`, Hook, request response 같은 capability가 기본값이 아니라 case별 후속 선택임을 코드와 문서가 함께 표현한다.
- 3주차 첫날 바로 구현할 수 있는 작은 issue 목록이 준비되어 있다.

## 3주차 예측 백로그

3주차 목표는 Assignment 하나를 대상으로 제품의 가장 짧은 검토 루프를 닫는 것이다. Codex thread의 생성·재사용 방식은 사용자가 시작한 일반적인 작업 흐름을 따르며, Course나 ModelingRun에 고정 cardinality를 부여하지 않는다.

| 순서 | ID | Task | 유형 | 우선순위 | 완료 조건 | 상태 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | W3-01 | SemesterWorkspace와 Course 기준선 | 개발 | P0 | 사용자가 명시적인 local path로 학기 폴더를 선택해 열고 `문제해결글쓰기` Course를 식별한 뒤 같은 path를 다시 열 수 있다. 기존 사용자 파일은 원본 그대로 유지한다. | 예측 |
| 2 | W3-02 | RawMaterial 반입과 SourceSelection | 개발 | P0 | 원본 또는 참조를 보존해 목록과 preview에 표시하고, 학생이 다음 ModelingInvocation에 사용할 자료를 명시적으로 선택할 수 있다. | 예측 |
| 3 | W3-03 | Assignment ModelingInvocation 생성·실행 | 개발 | P0 | Assignment Recipe, arguments, 선택 자료와 활성 workspace로 Invocation을 만들고 실행해 schema로 검증한 Assignment 변경 제안과 필드별 EvidenceRef를 얻는다. | 예측 |
| 4 | W3-04 | StatePatch와 Review Workspace | 개발·UI | P0 | 원본, 근거, 변경 제안을 한 화면에서 확인하고 수락 전에는 SemesterModel의 확인된 값이 바뀌지 않는다. | 예측 |
| 5 | W3-05 | UserConfirmation과 확인된 상태 반영 | 개발 | P0 | 학생의 수락·수정·거절을 기록하고 수락 또는 수정해 확인한 값만 SemesterModel에 반영한다. raw prompt나 protocol payload를 제품 감사 기록에 저장하지 않는다. | 예측 |
| 6 | W3-06 | 핵심 흐름 E2E와 실제 Codex 검증 | 검증 | P0 | 자료 선택부터 Review와 새로고침 뒤 확인된 상태 조회까지 결정적 browser test가 통과하고, 같은 의미의 흐름을 선택 실행 Codex smoke로 확인한다. | 예측 |

W3는 W2-02의 제품 layout seam을 그대로 사용한다. 운영체제 기본 경로 resolver와 migration은 C-09로 남긴다.

## 4주차 예측 백로그

| 순서 | ID | Task | 유형 | 우선순위 | 완료 조건 | 상태 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | W4-01 | 변경 제안 수정·거절과 충돌 처리 | 개발 | P0 | 사용자가 제안을 수정하거나 거절할 수 있고, 같은 객체의 새 제안이 이전 UserConfirmation을 덮어쓰지 않는다. | 예측 |
| 2 | W4-02 | 실행 실패와 재시도 UX | 개발·개선 | P0 | Recipe 렌더링, Codex 실행, output validation, 제품 상태 반영 중 실패 지점을 구분하고 원본과 확인된 상태를 손상하지 않은 채 다음 행동을 안내한다. | 예측 |
| 3 | W4-03 | 대표 입력 자료 범위 확정과 지원 | 개발 | P1 | 선정한 대표 자료 형식이 전체 데모 경로에서 원본과 필드별 근거를 잃지 않고 처리된다. | 예측 |
| 4 | W4-04 | 필요성이 확인된 상호작용 case | 개발·UX | P1 | 핵심 흐름에서 실제로 필요한 경우에만 `turn/steer`, `turn/interrupt` 또는 correlated request response 중 하나를 추가하고, 해당 case의 timing·correlation·fallback을 테스트한다. | 예측 |
| 5 | W4-05 | 전체 회귀 검증과 데모 테스트 자료 | 검증 | P0 | 결정적 E2E와 선택 실행 Codex 검증을 통과하고 반복 가능한 발표용 자료와 시나리오를 준비한다. | 예측 |
| 6 | W4-06 | 설치·실행·아키텍처 문서 정리 | 문서·배포 | P1 | 새로운 사용자가 README만 보고 로컬 데모를 실행하고 핵심 구조를 이해할 수 있다. | 예측 |

## 기능 후보 백로그

아래 항목은 유효한 후속 후보지만 핵심 검토 루프보다 먼저 구현하지 않는다. capability는 protocol maturity가 아니라 실제 사용자 case가 요구하는 timing·correlation·persistence를 기준으로 승격한다.

| ID | 후보 기능 | 우선순위 | 승격 조건 | 현재 결정 |
| --- | --- | --- | --- | --- |
| C-01 | PDF text extraction과 page/range 근거 | P1 | TXT 기반 핵심 흐름이 안정되고 PDF가 대표 데모에 반드시 필요할 때 | 후보 |
| C-02 | Exam ModelingRecipe | P1 | Assignment Recipe의 조합·검토 계약을 재사용할 수 있을 때 | 후보 |
| C-03 | MarkdownProjection | P1 | 확인된 SemesterModel이 안정되어 projection이 SSOT로 오인되지 않을 때 | 후보 |
| C-04 | derived timeline view | P2 | Assignment/Exam canonical owner가 구현된 뒤 필요한 표시 계약을 정할 수 있을 때 | 후보 |
| C-05 | 학생 할 일 표면 | P2 | Assignment 검토 루프가 완성되고 별도 학생 행동 모델이 필요한 실제 use case를 확인했을 때 | 후보 |
| C-06 | WorkspaceHistory checkpoint/diff/rollback | P2 | Runtime Diagnostic History와 구분되는 학생용 history 의미를 별도 설계했을 때 | 후보 |
| C-07 | 학기 상태 질의 Recipe | P2 | 확인된 상태와 evidence query contract가 준비되고 첫 대표 질문을 정했을 때 | 후보 |
| C-08 | HWP/HWPX parsing과 OCR | P2 | 실제 사용자 자료 검증에서 우선 필요성이 확인될 때 | 후보 |
| C-09 | 제품 진입점과 packaged workspace chooser | P2 | `npx ay-ple` 또는 패키징에서 app data 기본값, workspace registry·chooser, override와 migration이 필요할 때 | 후보 · [ADR 0006](../adr/0006-separate-package-app-data-and-semester-workspace-roots.md) |
| C-10 | 제품용 진단 근거 allowlist와 redaction | P1 | Runtime Diagnostic History의 prompt 또는 raw/debug evidence를 제품 기록에 재사용하기 전 | 제품 재사용 gate |
| C-11 | active-turn 정정과 중단 | P1 | 대표 UX에서 새 turn보다 즉시 정정 또는 중단이 필요하고 exact turn correlation을 제공할 수 있을 때 | `turn/steer`·`turn/interrupt` case 후보 |
| C-12 | correlated App Server request UI | P1 | 실행 승인, 짧은 사용자 입력, MCP elicitation 중 대표 case가 선택되고 각 request identity를 보존할 수 있을 때 | case 후보 |
| C-13 | process restart 뒤 thread resume | P2 | 사용자가 실제로 장기 작업을 다시 열어야 하고 제품 receipt와 Codex history의 복구 책임을 구분했을 때 | topology 비고정 후보 |
| C-14 | experimental context delivery | P2 | native mention/text/Skill 조합으로 해결되지 않는 구체적인 case와 trust·retention 정책이 생길 때 | `additionalContext`, dynamic tools, realtime 등 roadmap 후보 |
| C-15 | 학기 rollover와 Memories reset UX | P2 | W2 opt-in smoke 뒤 app-wide runtime-home pair의 여러 학기 수명, consent·reset UX가 필요할 때 | 후속 후보 |

다음 항목은 이번 4주 범위에서 제외한다.

- ACP 어댑터 도입 또는 `codex-acp` 포크
- Claude Code, OpenCode, Pi 등 다중 엔진 동작 일치
- 범용 실행 엔진 기능 분류와 엔진 선택 UI
- 범용 event bus 또는 모든 App 이벤트를 처리하는 router
- Semester/Course/ModelingRun에 고정된 Codex thread topology
- 외부 memory framework 또는 AY-PLE 전용 memory engine
- LMS 로그인 자동화
- 클라우드 계정과 동기화
- 외부 캘린더 자동 업로드
- 과제 정답 생성과 자동 제출
- 모바일·소형 화면 최적화

## 아직 필요한 결정

| 결정 | 목표 시점 | 결정 전 기본 가정 |
| --- | --- | --- |
| 첫 Assignment ModelingRecipe의 argument contract와 output schema | 2주차 | 과제명, 마감, 제출 방식, EvidenceRef에 필요한 최소 필드만 다룬다. |
| 학기 상태 저장 schema와 repository 경계 | 2주차 | 제품 상태는 runtime history와 분리하고 raw Codex protocol을 저장 계약으로 사용하지 않는다. |
| RawMaterial 원본 위치와 app-managed metadata 위치 | 2주차 | 원본은 자동 수정·삭제하지 않고 workspace-local metadata와 분리한다. |
| StatePatch, EvidenceRef, UserConfirmation의 최소 필드 | 2주차 | Review 화면과 Assignment 수직 흐름에서 실제로 읽고 쓰는 필드만 먼저 둔다. |
| 첫 제품 수직 흐름의 입력 형식 | 2주차 | TXT 한 종류로 먼저 수직 흐름을 닫고 PDF는 후보로 둔다. |
| 최소 explicit workspace path 선택·재열기 | 3주차 W3-01 | 사용자가 제공한 local path를 injected layout seam에 전달한다. |
| 첫 case-specific App Server interaction | 3주차 말 | 핵심 흐름에 요구가 없다면 `turn/start` 조합만으로 데모를 완성한다. |

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
| 2026-07-12 | v0.6 | 문서 위계에 따라 결정 설명을 소유 문서로 이동하고, 계획 항목을 `ModelingRecipe → ModelingInvocation → ModelingRun` 경계와 제품 layout seam에 맞췄다. |
| 2026-07-11 | v0.5 | 제품 작업을 native Codex composition으로 재정의하고 ModelingRun을 얇은 실행 receipt로 축소했다. W2를 Recipe·mention·turn 조합 검증, W3를 Review 수직 흐름으로 재편하고 steer/request/resume/experimental API를 case별 후보로 이동했다. |
| 2026-07-11 | v0.4 | Runtime Harness issues 001–005 완료를 기준선에 반영하고, developer-only 진단 기록을 제품에서 재사용하기 전 allowlist와 redaction을 P1 보안 gate로 추가했다. |
| 2026-07-10 | v0.3 | 현재 저장소 내부 `.ay-ple/runtime-*`를 유효한 개발 기본값으로 유지하고, 제품 진입점에서 패키지·앱 데이터·학기 작업공간 루트를 분리하는 후속 과제를 C-09와 미결정 표에 연결했다. |
| 2026-07-10 | v0.2 | Codex App Server를 4주 주력 실행 엔진으로 확정하고 W2를 필수 상호작용 검증, W3를 Codex 제품 수직 흐름, W4를 CoControl 안정화 중심으로 재배치했다. |
| 2026-07-10 | v0.1 | 1주차 기준선, 2주차 확정 Task, 3~4주차 예측, 기능 후보와 운영 규칙을 작성했다. |
