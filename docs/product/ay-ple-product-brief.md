# AY-PLE Product Brief

작성일: 2026-07-07
최종 업데이트: 2026-07-10
상태: 제출 준비

## 한 줄 요약

**AY-PLE(에이플)는 대학생이 LMS 공지, 강의계획서, 수업 파일을 그대로 넣으면 AY(에이)가 자료 속 과제·시험·공지 후보를 찾아주고, 학생이 근거를 확인한 뒤 수락하면 한 학기 상태로 정리해주는 local-first 학업 정리 앱이다.**

AY-PLE의 핵심은 캘린더 앱이나 AI 채팅창이 아니라, 흩어진 학기 자료를 사용자가 믿고 쓸 수 있는 학기 상태로 바꾸는 검토 경험이다. 학생은 자료를 넣고, 정리할 자료를 고르고, AY가 찾은 후보를 원본 근거와 함께 확인한 뒤 수락·수정·거절한다. 앱은 사용자가 확인한 내용만 학기 상태로 반영하고, 이후 일정·할 일·읽기용 정리 문서로 보여준다.

내부 설계에서는 `RawMaterial`, `SourceSelection`, `StatePatch`, `TrustedState` 같은 용어를 사용하지만, 학생에게 보이는 UI는 `자료`, `선택한 자료`, `변경 제안`, `반영됨`처럼 비개발자 대학생에게 친숙한 언어를 사용한다.

## 사용자 관점 대표 시나리오

대표 사용자는 모든 대학생이다. 기술에 익숙하지 않은 학생도 LMS 공지와 강의계획서를 그대로 넣고, AY가 찾은 학업 정보를 눈으로 확인한 뒤 자기 학기 상태에 반영할 수 있어야 한다.

| 순서 | 학생이 하는 일 | AY-PLE가 보여주는 것 | 사용자가 얻는 결과 |
| --- | --- | --- | --- |
| 1 | `문제해결글쓰기` 과목 자료를 넣는다. | 자료 목록에 LMS 공지, 강의계획서, 수업 녹음, 이미지가 과목별로 쌓인다. | 정리 전 원본 자료가 사라지지 않고 보존된다. |
| 2 | 정리할 LMS 공지와 강의계획서 등 선택 자료를 고른다. | 선택한 원본 자료가 같은 검토 화면 안에서 열린다. | AY가 어떤 자료를 기준으로 정리할지 명확해진다. |
| 3 | `선택한 자료 정리하기`를 누른다. | AY가 원본 자료에서 과제 후보와 근거를 찾아 대화 패널에 변경 제안을 띄운다. | 학생은 AI 답변이 아니라 검토 가능한 제안을 받는다. |
| 4 | 원본 미리보기와 하단 근거를 확인한다. | 원본 내용, 추출 미리보기, 값별 근거가 분리되어 보인다. | 학생은 과제명, 마감, 제출 방식, 평가 기준이 어디서 왔는지 확인한다. |
| 5 | 제안을 수락하거나 수정·거절한다. | 수락하면 `반영됨` 상태가 되고 AY가 저장된 과제명과 마감을 브리핑한다. | 확인한 정보만 학기 상태에 들어간다. |
| 6 | 이후 학기 상태를 조회한다. | 일정, 할 일, 읽기용 정리 문서가 같은 확인된 상태에서 파생된다. | 자료를 다시 뒤지지 않고 학기 운영에 쓸 수 있다. |

## 핵심 기능 우선순위

MVP는 기능을 넓히기보다 "원본 자료에서 학업 후보를 찾고, 사용자가 근거를 확인해 반영한다"는 핵심 루프를 탄탄히 만드는 데 집중한다.

| 우선순위 | 기능 | 제품 이유 | MVP 상태 |
| --- | --- | --- | --- |
| 1 | 자료 넣기와 과목별 자료 목록 | 학기 자료가 정리의 출발점이다. | MVP 필수 |
| 2 | 선택한 자료 정리하기 | AY가 모든 자료를 임의로 처리하지 않고 사용자가 고른 자료에서 시작해야 한다. | MVP 필수 |
| 3 | AY 진행 확인·정정·중단 | 학생이 처리 중인 AY의 활동을 보고 방향을 고치거나 멈출 수 있어야 한다. | MVP 필수 |
| 4 | 원본 미리보기 | 사용자가 AY 제안을 신뢰하려면 원본을 바로 봐야 한다. | MVP 필수 |
| 5 | 근거 있는 변경 제안 | AI 결과가 앱 상태로 들어가기 전 사용자 확인이 필요하다. | MVP 필수 |
| 6 | 수락·수정·거절 | 사용자가 최종 결정권을 가져야 한다. | MVP 필수 |
| 7 | 반영 결과 브리핑 | 상태 변화가 stdout/log가 아니라 사용자가 이해하는 말로 설명되어야 한다. | MVP 필수 |

타임라인, 추천 할 일, 읽기용 정리 문서의 전체 화면 배치는 후속 설계로 남긴다. 이들을 무시하지 않고, 검토된 학기 상태에서 파생되는 후속 표면으로 명시한다.

## 배경

대학생의 학기 관리는 일정 등록 문제만이 아니다. 실제 학기 자료는 LMS 공지, 강의계획서, PDF, PPTX, HWP/HWPX, 이미지, 메모, 과제 안내, 시험 범위, 보강 안내처럼 포맷과 품질이 제각각인 자료로 흩어진다.

학생이 실제로 겪는 문제는 다음과 같다.

| 자료 유형 | 예시 | 사용자가 겪는 문제 |
| --- | --- | --- |
| 확정 과목 정보 | 과목명, 교수명, 학점, 수업 시간 | 학기 초에 한 번 정리해도 이후 자료와 연결되지 않는다. |
| LMS 공지 | 휴강, 보강, 과제, 시험 안내 | 과목과 일정, 할 일로 옮기지 않으면 묻힌다. |
| 강의계획서 | 평가 방식, 주차별 계획, 시험 일정 | 중요한 운영 정보가 긴 문서 안에 숨어 있다. |
| 수업 자료 | PDF, PPTX, HWP/HWPX, 이미지 | 저장은 했지만 과목·주차·시험 범위와 연결되지 않는다. |
| 개인 메모 | 시험 범위, 교수님 강조점, 제출 조건 | 원본 자료와 함께 해석되지 않으면 다시 찾기 어렵다. |

AY-PLE는 사용자가 처음부터 파일을 깔끔하게 분류한다고 가정하지 않는다. 먼저 RawMaterial을 보존하고, 사용자가 고른 SourceSelection에 대해 AY가 built-in Skills, local scripts, 파일 접근, 대화, 필요 시 UserDecisionRequest를 사용해 처리 전략을 선택한다.

## 문제 정의

**학기 관리는 흩어진 RawMaterial을 사용자가 신뢰할 수 있는 SemesterModel로 바꾸는 문제다.**

현재 학생은 자료를 저장한 뒤, 필요한 정보를 직접 해석하고, 캘린더·메모·할 일 앱에 다시 옮긴다. 이 과정은 반복적이고, 포맷별 예외가 많고, 누락이 잘 생긴다.

AY-PLE가 해결해야 할 문제는 다음과 같다.

| 문제 | 현재 행동 | AY-PLE의 역할 |
| --- | --- | --- |
| 자료가 너무 더럽고 다양함 | 파일을 저장한 뒤 사람이 다시 읽고 분류한다. | AY가 runtime에서 적절한 Skill/script를 선택해 해석한다. |
| 앱이 처리 방식을 미리 다 알 수 없음 | 지원 안 되는 포맷이나 특이한 공지는 수동 처리한다. | AgentLedProcessing으로 사용자 요구와 자료 맥락에 맞게 처리한다. |
| AI 결과를 믿기 어려움 | AI 답변을 복사해 직접 정리한다. | StatePatch, evidence, RecommendedChoice, ReviewState로 검토 가능하게 만든다. |
| GUI와 AI가 분리됨 | 앱에서는 상태를 보고, 채팅에서는 별도 맥락으로 질문한다. | CoControl과 LiveStateSync로 GUI 조작과 AY 대화가 같은 상태를 다룬다. |
| 정리 결과가 상태로 남지 않음 | 대화 결과가 실제 학기 운영 상태와 분리된다. | UserConfirmation 이후 TrustedState와 MarkdownProjection으로 남긴다. |

## 제품 테제

**AY-PLE는 한 학기 자료를 먹고, 학생과 대화하며, 앱이 다룰 수 있는 학기 상태를 만들어내는 로컬 에이전트 하네스다.**

앱은 파일 타입별 처리 로직을 모두 하드코딩하지 않는다. 대신 RawMaterial 보존, state contract, built-in Skills, local scripts, Review UX, UserConfirmation 경계를 제공한다. AY는 이 경계 안에서 자료를 읽고, 필요한 도구를 실행하고, 사용자에게 묻고, Assignment, Exam, TaskCandidate, Uncertainty 같은 DraftState와 ReviewState를 만든다.

AY-PLE의 핵심 상호작용은 사용자, 앱, AY가 같은 진행 중 상태를 두고 함께 움직이는 CoControl이다. 사용자의 의도와 앱 상태 변경은 정책을 거쳐 AY의 작업을 시작·정정·중단하고, AY의 작업 활동은 제품 의미로 번역되어 GUI와 ChatSidecar에 나타난다. 이 과정에서 전송 이벤트나 AY 출력이 곧바로 SemesterModel의 신뢰 상태가 되지는 않는다.

4주 캠프 범위에서는 Codex App Server를 유일한 우선 지원 에이전트 실행 엔진으로 사용한다. Codex의 이어지는 세션, 세부 활동 관측, `turn/steer`, `turn/interrupt`, 권한 요청, Codex 사용자 입력 요청을 먼저 증명한다. 이때 Codex가 요청하는 짧은 운영 입력과 AY-PLE가 학업 판단을 묻는 UserDecisionRequest는 구분하며, 후자는 `app.request_user_decision` MCP 도구를 사용한다. ACP 기반 다중 엔진 중립화는 실제 두 번째 제품 실행 엔진이 필요해질 때 추출한다. Built-in Skills, MCP, 파일, 스크립트는 이식성을 지향하는 공통 작업 표면으로 유지하지만, 실행 엔진별 탐색, 설정, 인증, `elicitation` 연결은 아직 검증되지 않았다. 자세한 결정은 [ADR 0005](../adr/0005-use-codex-app-server-as-first-class-mvp-runtime.md)에 둔다.

## 제품 MVP와 4주 캠프 범위의 약속

4주 캠프 범위는 제품 MVP 전체가 아니라 Assignment 하나로 CoControl과 검토 가치를 증명하는 수직 흐름이다.

> 학생이 선택한 과제 안내 자료를 AY가 이어지는 Codex 세션에서 처리하고, 학생의 진행 중 정정과 AY의 질문을 반영해 근거 있는 Assignment 변경 제안을 만들며, 사용자가 확인한 결과만 TrustedState에 남긴다.

제품 MVP의 장기 약속은 더 넓다.

> 학생이 한 학기 자료를 넣고 처리할 자료를 명시적으로 선택하면, AY-PLE는 AY와 함께 이를 Course, Assignment, Exam, Material, Notice, TaskCandidate 같은 학업 상태로 모델링하고, 사용자가 확인한 상태와 읽기 좋은 정리 문서(MarkdownProjection)로 남긴다.

MVP는 과제 해결이나 자동 제출을 목표로 하지 않는다. 목표는 학기 자료를 앱이 이해할 수 있는 상태로 바꾸고, 사용자가 그 상태를 신뢰할 수 있게 만드는 것이다.

## 핵심 루프

| 단계 | 사용자 | 앱 | AY | 결과 |
| --- | --- | --- | --- | --- |
| Init | 이번 학기에 들을 확정 과목을 입력한다. | 학기 작업공간과 초기 SemesterModel을 만든다. | 아직 개입하지 않는다. | 빈 학기 모델과 과목 기준선 |
| MaterialIntake | LMS 공지, PDF, PPTX, HWP/HWPX, 이미지, 메모를 넣는다. | 원본 RawMaterial을 보존하고 SourceList에 표시한다. | 요청 전에는 자료를 임의로 처리하지 않는다. | RawState와 자료 목록 |
| SourceSelection | 처리할 자료를 GUI나 ChatSidecar에서 선택한다. | 선택을 ModelingRun 입력으로 만들고 진행 중 작업에는 정책에 따라 전달한다. | 선택된 자료와 현재 상태를 맥락으로 받는다. | 명시적 처리 대상 |
| ModelingRun | 버튼이나 대화로 AgentModeling을 시작한다. | 이어지는 Codex 세션을 열고 활동과 상태 제안을 중재한다. | Skills, 스크립트, 파일을 사용해 처리 전략을 선택한다. | AY 작업 활동, DraftState, ReviewState, StatePatch |
| 진행 중 정정·중단 | 진행 중 정정이나 중단 의도를 보낸다. | 작업과 상태 버전을 확인해 `turn/steer` 또는 `turn/interrupt`를 전달하고 결과를 표시한다. | 정정을 현재 작업에 반영하거나 중단을 확정한다. | 인과관계가 보존된 CoControl 기록 |
| Codex 사용자 입력 요청 | 실행 엔진이 요청한 짧은 운영 입력에 답한다. | 요청을 임시 상호작용으로 표시하고 응답을 정확한 `request`에 돌려준다. | 받은 입력으로 진행 중 작업을 이어간다. | 제품 결정과 분리된 실행 엔진 상호작용 |
| UserDecisionRequest | AY가 혼자 확정하기 어려운 질문에 답한다. | 진행 중 요청을 GUI에 표시하고 응답을 현재 AY 작업에 돌려준다. | 답변을 받은 뒤 작업을 이어간다. | 계속된 AgentModeling; ReviewState와는 별도 |
| Review | 추천안을 확인하고 승인·수정·거절한다. | StatePatch를 검증하고 UserConfirmation을 기록한다. | 결정 결과를 이후 작업 맥락으로 사용한다. | TrustedState |
| Timeline/Task View | 확정된 학업 상태가 일정과 할 일 표면에 어떻게 반영되는지 본다. | TimelineEntry와 StudentTask를 기준 상태에서 파생한다. | 요청 시 상태를 설명한다. | 읽기 쉬운 운영 표면 |
| MarkdownProjection | 정리된 결과를 읽는다. | built-in heading template으로 Markdown을 렌더링한다. | 문서 내용을 설명하거나 추가 변경을 제안한다. | 사람이 읽는 FinalArtifact |
| WorkspaceQuery | 정리된 상태에 질문한다. | TrustedState와 연결된 RawMaterial을 맥락으로 제공한다. | 근거와 확인된 상태를 함께 사용해 답한다. | 학기 상태 기반 답변 |

## 정보 모델

MVP 산출물은 직접적인 DB schema의 출발점이다. 다만 이 문서는 최종 schema가 아니라 도메인 정보 모델을 정의한다.

| 개체 | 의미 | 상태 계층 |
| --- | --- | --- |
| `Course` | Init에서 확정한 이번 학기 과목 | TrustedState |
| `RawMaterial` | 원본 파일, 공지, 메모, 이미지 | RawState |
| `EvidenceRef` | RawMaterial의 특정 위치나 인용문이 어떤 canonical field를 뒷받침하는지 나타내는 field-level 근거 | RawState 또는 ReviewState |
| `Assignment` | 과목이 요구하는 과제, 제출물, 활동 같은 first-class academic requirement | DraftState 또는 TrustedState |
| `Exam` | 시험, 퀴즈, 중간고사, 기말고사 같은 first-class academic assessment | DraftState 또는 TrustedState |
| `Material` | 해석된 수업 자료 | DraftState 또는 TrustedState |
| `Notice` | 공지나 안내사항 | DraftState 또는 TrustedState |
| `ScheduleEvent` | Assignment나 Exam이 소유하지 않는 독립 시간 사실, 예를 들어 정규 수업, 보강, 휴강, 오피스아워 | DraftState 또는 TrustedState |
| `TimelineEntry` | Assignment, Exam, ScheduleEvent, StudentTask에서 파생되는 일정/timeline read model | ArtifactState에 기록 가능한 derived read model |
| `TaskCandidate` | 학생이 할 수 있는 행동 제안. ReviewState에서 검토되고 승인되면 StudentTask가 된다. | ReviewState |
| `StudentTask` | 사용자가 수락한 실제 운영 task. Assignment나 Exam에 연결되면 deadline을 복제하지 않고 참조한다. | TrustedState |
| `Uncertainty` | AY가 확신하지 못한 지점 | ReviewState |
| `StatePatch` | 사용자 확인 단위의 구조화 변경 제안 | ReviewState |
| `UserDecisionRequest` | AY가 GUI로 요청하는 진행 중 사용자 판단 | 진행 중 상호작용; SemesterModel 밖 |
| `MarkdownProjection` | SemesterModel에서 렌더링된 사람이 읽는 문서 | ArtifactState |

정보 모델의 가장 중요한 규칙은 **하나의 학업 사실은 하나의 owner만 가진다**는 것이다. Assignment deadline은 `Assignment.dueAt`이 소유하고, Exam 시간은 `Exam.startsAt`/`Exam.endsAt`이 소유한다. Timeline이나 task list는 이 값을 복제하지 않고 canonical object를 읽어서 표시한다.

| 사실 | Canonical owner | 표시되는 표면 |
| --- | --- | --- |
| 과제 마감 | `Assignment.dueAt` | Assignment UI, TimelineEntry, linked StudentTask |
| 과제 제출 방식과 요구사항 | `Assignment.submission`, `Assignment.requirements` | Assignment UI, MarkdownProjection |
| 시험 일시 | `Exam.startsAt`, `Exam.endsAt` | Exam UI, TimelineEntry |
| 시험 범위와 준비 안내 | `Exam.scope`, `Exam.prepGuidance` | Exam UI, MarkdownProjection |
| 보강, 휴강, 정규 수업 | `ScheduleEvent` | TimelineEntry, MarkdownProjection |
| 학생의 작업 계획 시간 | `StudentTask.plannedFor` | Task list, TimelineEntry |
| source 근거 | `RawMaterial` + `EvidenceRef` | Review, Evidence panel |

## 상태 계층

| 계층 | 역할 | 권한 |
| --- | --- | --- |
| RawState | 원본 RawMaterial과 provenance 보존 | 앱이 저장하고 사용자가 소유 |
| DraftState | AgentModeling의 초기 해석. Assignment, Exam, Material, Notice, ScheduleEvent 같은 canonical 후보를 포함할 수 있다. | AY가 제안하고 앱이 검증 |
| ReviewState | 확인·정정·거절이 필요한 StatePatch, TaskCandidate, Uncertainty | 사용자와 AY가 함께 다룸 |
| TrustedState | UserConfirmation을 거친 Course, Assignment, Exam, Material, Notice, ScheduleEvent, StudentTask | 사용자가 결정권을 가짐 |
| ArtifactState | MarkdownProjection, TimelineEntry 같은 생성 산출물과 read model 기록 | 앱이 생성하고 사용자가 확인 |

TrustedState의 SSOT는 AY가 아니라 UserConfirmation이다. AY는 TrustedState를 입력으로 받아 작업하고, 변경은 StatePatch로 제안한다.

AY의 작업 활동, 앱 상태 변경, Codex 사용자 입력 요청, UserDecisionRequest, 실행 권한 요청, 아직 처리되지 않은 제어 요청은 진행 중 상호작용에 속한다. 이들은 진행 상황과 인과관계를 설명하지만 DraftState나 ReviewState에 자동 저장되지 않는다. 장기 보존이 필요한 사용자 결정이나 제품 상태 변경만 별도의 감사 기록, StatePatch, UserConfirmation으로 승격한다.

TimelineEntry는 직접 patch하지 않는다. 사용자가 timeline에서 과제 마감 시간을 고치면 실제 변경 대상은 `TimelineEntry.startsAt`이 아니라 해당 `Assignment.dueAt`이다. linked StudentTask도 과제나 시험의 deadline을 복제하지 않고 `deadlineRef`로 따른다.

## StatePatch

StatePatch는 사용자가 이해 가능한 변화 묶음이다. 선택 피로를 줄이기 위해 AY는 RecommendedChoice를 제공하고, 사용자는 추천안을 승인·수정·거절한다.

| 필드 | 주 생성자 | 설명 |
| --- | --- | --- |
| `id` | App | 추적용 식별자 |
| `sourceIds` | App | 연결된 RawMaterial |
| `createdAt` | App | 생성 시각 |
| `runId` | App | ModelingRun 연결 |
| `patchType` | App 또는 AY | 변경 유형 |
| `summary` | Agent | 사용자가 이해할 한 줄 설명 |
| `recommendedChoice` | Agent | 추천 기본 선택 |
| `changes` | AY draft, App validate | 실제 반영될 구조화 변경 |
| `evidence` | AY draft, App attach/validate | RawMaterial 또는 TrustedState 근거 |
| `alternatives` | Agent | 다른 처리 가능성 |
| `riskLevel` | App + AY | low, medium, high |
| `requiresConfirmation` | App | trusted 반영 전 확인 필요 여부 |
| `status` | App/User | pending, accepted, edited, rejected |

StatePatch는 projection이 아니라 canonical entity를 바꾼다. 예를 들어 AY가 "문제해결글쓰기" 과목의 "개요 작성하기" 과제를 찾으면 `Assignment`와 필요한 `TaskCandidate`, `EvidenceRef`, `Uncertainty`를 제안한다. 같은 마감일을 별도 ScheduleEvent나 TaskCandidate deadline으로 중복 생성하는 patch는 validator가 거절하거나 canonical owner를 참조하도록 고친다.

## Source of Truth 전략

MVP의 source of truth는 SQLite와 원본 RawMaterial이다. Markdown은 사람이 읽는 projection이며 앱의 상태 기준이 아니다.

`sources/`는 사용자가 볼 수 있는 raw store다. 앱은 RawMaterial을 자동으로 이동하거나 삭제하지 않고, `.ay-ple/semester.sqlite`에 manifest와 provenance를 기록한다.

| 범주 | 저장 위치 | 역할 |
| --- | --- | --- |
| 원본 자료 | `sources/` | 사용자가 넣은 RawMaterial 원본을 보존한다. |
| 구조화 상태 | `.ay-ple/semester.sqlite` | RawState, DraftState, ReviewState, TrustedState, ArtifactState를 저장한다. |
| Agent context | `.ay-ple/agent-context/` | Agent turn에 주입할 snapshot, source manifest, recent patch log를 둔다. |
| Agent run 기록 | `.ay-ple/runs/*` | ModelingRun의 prompt, logs, script output, evidence를 보존한다. |
| WorkspaceHistory | `.ay-ple/history.git` 후보 | UserConfirmation, ModelingRun, Projection 갱신의 의미 있는 checkpoint를 기록한다. |
| built-in Skills | `.ay-ple/skills/`, `.agents/skills/ay-ple-*` | Agent workflow 매뉴얼을 제공한다. |
| local scripts | `.ay-ple/scripts/` 또는 package 내부 scripts | PDF, OCR, HWP/HWPX, projection rendering 같은 deterministic 처리를 담당한다. |
| MarkdownProjection | `semester-overview.md`, `courses/*/overview.md`, `review-queue.md` | 사람이 읽는 artifact다. |

## Workspace 모델

```text
semester-workspace/
  sources/
    inbox/
  semester-overview.md
  review-queue.md
  courses/
    course-001/
      overview.md
    course-002/
      overview.md
  .ay-ple/
    semester.sqlite
    history.git/
    agent-context/
      semester-snapshot.json
      source-manifest.json
      recent-patches.json
    skills/
    scripts/
    runs/
      run_<id>/
        prompt.md
        events.jsonl
        outputs/
```

사용자가 직접 이 구조를 만들 필요는 없다. 앱이 Init에서 workspace를 만들고, MaterialIntake에서 RawMaterial을 보존하며, Review 이후 Projection과 TrustedState를 갱신한다.

## WorkspaceHistory

AY-PLE는 Git을 사용자에게 보이는 기능으로 노출하지 않는다. Git은 내부 history layer의 구현 후보이며, 사용자는 기록, 변경 비교, 되돌리기 같은 친숙한 개념으로 경험한다.

| 원칙 | 설명 |
| --- | --- |
| App-managed history | 앱이 checkpoint와 rollback을 소유하고, AY가 raw Git 명령으로 상태를 확정하지 않는다. |
| Friendly UX | UI에서는 Git, commit, branch보다 변경 기록, 비교, 되돌리기 표현을 쓴다. |
| Meaningful checkpoint | 모든 autosave가 아니라 UserConfirmation, 의미 있는 ModelingRun 결과, Projection 갱신 같은 순간을 기록한다. |
| Not an event log | 내부 실행 로그, draft, event stream은 Git history가 아니라 SQLite, events log, `.ay-ple/runs/*`에서 관리한다. |
| Diffable projection | SQLite 자체 diff에 의존하지 않고 JSON export, MarkdownProjection, StatePatch summary를 함께 보여준다. |
| RawMaterial safety | RawMaterial binary도 local history에 포함해 원본 복구와 provenance를 강화한다. |

MVP에서는 `.ay-ple/history.git` 같은 app-managed Git repository를 후보로 둔다. 이 history는 기본적으로 local-only이며 원격 push 대상이 아니다. workspace root에 사용자에게 노출되는 `.git`을 만들지 않기 때문에 기존 사용자의 Git repository와 충돌할 가능성도 줄인다.

| HistoryCheckpoint trigger | 기록할 내용 |
| --- | --- |
| MaterialIntake | RawMaterial binary, source manifest, provenance |
| UserConfirmation | accepted/edited/rejected StatePatch와 TrustedState 변화 |
| 사용자에게 의미 있는 ModelingRun 결과 | run summary, sourceIds, output artifact reference |
| MarkdownProjection 갱신 | 이전/이후 projection diff |
| 사용자의 수동 snapshot | 사용자가 되돌아가고 싶은 명시적 시점 |

## MarkdownProjection

MVP의 MarkdownProjection은 세 개만 보장한다.

| Projection | 목적 |
| --- | --- |
| `semester-overview.md` | 학기 전체 요약, 과목 목록, 주요 일정, 확인 필요 항목 |
| `courses/<course>/overview.md` | 과목별 자료, 공지, 일정, task 후보 요약 |
| `review-queue.md` | AgentModeling 결과 중 사용자가 확인해야 하는 항목 |

MarkdownProjection 원칙:

- source of truth가 아니다.
- AY가 자유롭게 원본 Markdown state를 작성하지 않는다.
- 앱이 built-in heading template을 제공한다.
- heading 내부 표현은 AY가 table, bullet, Mermaid, HTML 등으로 선택할 수 있다.
- MVP에서는 custom template를 지원하지 않는다.

## CoControl UX

사용자는 GUI만 쓰거나 채팅만 쓰는 것이 아니다. 사용자, 앱, AY가 같은 실시간 SemesterModel과 이어지는 AY 작업 맥락을 두고 상호작용해야 하며, 누가 어떤 상호작용을 시작했고 무엇이 그 결과를 만들었는지 추적할 수 있어야 한다.

| 주체 | 책임 | 직접 할 수 없는 것 |
| --- | --- | --- |
| 사용자 | 자료 선택, ModelingRun 시작, 진행 중 정정·중단, 실행 권한·Codex 사용자 입력·UserDecisionRequest 응답, Review와 UserConfirmation | 확인 없이 TrustedState를 우회 변경하지 않음 |
| 앱 | 현재 상태 버전과 SourceSelection을 소유하고 앱 상태 변경, 제어 정책, 검증, 저장, 충돌 처리를 중재 | 사용자 의도를 임의로 추론해 진행 중 작업에 자동 주입하지 않음 |
| AY | 작업 진행을 설명하고 도구를 사용하며 StatePatch와 UserDecisionRequest를 제안 | 실행 권한이나 UserConfirmation을 대신 결정하지 않음 |

| 표면 | 역할 |
| --- | --- |
| GUI | 자료 선택, ModelingRun 시작, AY 작업 활동 확인, 진행 중 정정·중단, 실행 권한 응답, Review, UserConfirmation, 생성 결과 확인 |
| ChatSidecar | 현재 SourceSelection, 이어지는 AY 작업 맥락, ModelingRun, ReviewState, MarkdownProjection을 바탕으로 AY와 대화하고 같은 제어 기능을 사용 |
| LiveStateSync | 사용자의 결정과 앱 상태 변경은 AY가 볼 수 있는 맥락으로, AY 작업 활동과 제안은 GUI가 볼 수 있는 상태로 인과관계를 보존해 동기화 |
| Codex 사용자 입력 요청 | 실행 엔진이 요청한 짧은 운영 입력을 임시로 표시 |
| UserDecisionRequest | AY가 처리 중 막힌 질문을 GUI로 요청 |
| 실행 권한 요청 | 명령, 파일, 네트워크, 도구 행동의 안전 승인을 별도로 요청 |

`turn/steer`는 진행 중 작업에 정정·제약·추가 맥락을 전달하며 StatePatch나 UserCorrection을 직접 만들지 않는다. `turn/interrupt`는 진행 중 작업을 멈추지만 이미 생성된 DraftState를 되돌리거나 Codex 세션을 삭제하지 않는다. SourceSelection 같은 앱 상태 변경도 자동으로 `turn/steer`가 되지 않으며, 앱의 제어 정책이 진행 중 `turn`, 상태 버전, 사용자 의도를 확인해 즉시 전달·대기열 추가·새 `turn` 시작 중 하나를 선택한다.

4주 캠프 범위의 대표 상호작용 수직 흐름은 다음과 같다.

1. AY가 두 RawMaterial을 읽는 중 사용자가 “두 번째 자료는 다른 분반 자료이니 제외해줘”라고 정정한다.
2. 앱은 진행 중 작업과 예상 상태를 확인하고 `turn/steer`로 전달한다.
3. AY가 과제 날짜의 모호함을 UserDecisionRequest로 묻고 사용자의 응답 뒤 작업을 이어간다.
4. 실행 권한 요청이 열린 상태에서 사용자가 중단하면 미처리 권한 요청은 안전하게 거절되고 `turn/interrupt`의 완료가 확인된다.
5. 이미 생성된 DraftState는 검토 전 상태로 남을 수 있지만 UserConfirmation 없이 TrustedState로 승격되지 않는다.

필수 UX 기능은 확정한다. 대표 검토 화면의 핵심 구조는 첫 UX 검증으로 방향을 확인했고, 타임라인·추천 할 일·읽기용 정리 문서의 전체 화면 배치는 후속 설계로 남긴다.

| 기능 | 상태 |
| --- | --- |
| ChatSidecar | MVP 필수 |
| SourceList | MVP 필수 |
| SourceSelection | MVP 필수 |
| ModelingRun 시작 제어 | MVP 필수 |
| 이어지는 Codex 세션과 재개 | MVP 필수 |
| 세부 AY 작업 활동 | MVP 필수 |
| 진행 중 정정과 확인된 중단 | MVP 필수 |
| 실행 권한 요청, Codex 사용자 입력 요청, UserDecisionRequest 구분 | 4주 캠프 범위 필수 |
| Review 화면 | MVP 필수 |
| MarkdownProjection 보기 | MVP 필수 |
| 검토 워크스페이스 배치 | 첫 UX 검증으로 방향 확인 |
| 후속 운영 화면 배치 | timeline, task, projection 화면 설계에서 결정 |

UX 방향은 NotebookLM의 source-grounded workflow, Obsidian의 local-first workspace 감각, VS Code의 side panel과 co-control 패턴을 참고하되, 일반 대학생에게 과한 개발자 UI를 그대로 가져오지 않는다.

AY-PLE의 visual direction은 기존 다크 IDE 테마가 아니라 밝은 학업 워크스페이스를 기본값으로 둔다. 구체적인 색상, surface, 컴포넌트 톤은 [AY-PLE Design System Direction](ay-ple-design-system.md)에 둔다.

## 검토 중심 학업 워크스페이스

MVP UX의 중심은 대시보드가 아니라 검토 중심 학업 워크스페이스다. 학생이 즉시 이해해야 할 규칙은 다음과 같다.

> AY-PLE가 선택한 원본 자료에서 학업 객체 후보를 찾고, 사용자가 확인하면 그 과제 정보가 학기 상태에 반영된다.

대표 시나리오는 "문제해결글쓰기" 과목의 "개요 작성하기" 과제다. AY는 선택한 자료에서 과제명과 마감일을 찾고, 과제로 등록할 변경 제안을 만든다. 사용자가 승인하면 AY는 저장된 과제명과 마감을 대화 패널에서 브리핑한다.

검토 화면의 세부 panel contract, prototype 검증 산출물, 화면 단위 제출 매핑은 [AY-PLE Review Workspace Scenario](ay-ple-review-workspace-scenario.md)에 둔다.

## AY 실행 엔진 전략

Codex 실행 환경 격리, 설치, 상태 분리의 세부 정책은 [Codex Runtime Isolation Technical Note](../architecture/codex-runtime-isolation.md)를 따른다. 4주 범위와 향후 이식성 결정은 [ADR 0005](../adr/0005-use-codex-app-server-as-first-class-mvp-runtime.md)를 따른다.

| 레이어 | MVP 방침 |
| --- | --- |
| 우선 지원 실행 엔진 | Codex App Server를 앱이 소유하는 실행 엔진으로 직접 사용하고 App Server가 제공하는 상호작용 의미를 기준으로 삼는다. |
| 제품 상호작용 | 사용자, 앱, AY의 CoControl 정책과 상태 변환을 제품이 소유하며 생성된 Codex 타입을 제품 계약으로 노출하지 않는다. |
| Codex 이벤트 관측 | 알려지지 않은 Codex 이벤트도 실행 중에는 관측할 수 있게 하되 원본 내용은 기본적으로 저장하지 않는다. 장기 진단 기록은 허용 목록, 민감 정보 제거, 크기·기간 제한을 통과한 근거만 허용하고 필요한 이벤트만 AY 작업 활동과 제품 상태로 번역한다. |
| AY 작업 방식 | built-in Skills가 처리 전략과 산출물 형식을 안내한다. |
| RawMaterial 접근 | Codex의 작업공간 파일 접근과 자료 목록을 사용한다. |
| 결정적 처리 | PDF 텍스트 추출, OCR, HWP/HWPX 해석, 문서 렌더링은 로컬 스크립트로 제공한다. |
| AY 작업 맥락 | `turn` 시작 또는 재개 시 상태 스냅샷 파일을 주입한다. |
| MCP | MVP 시작점은 `app.request_user_decision`만 둔다. |
| GUI 동기화 | 서버 이벤트, DB 구독, 후크로 처리한다. |
| 실행 엔진 중립화 | ACP 어댑터, 다중 엔진 동작 일치, 범용 기능 분류는 4주 이후 또는 두 번째 제품 실행 엔진이 확정될 때 검토한다. Skills와 MCP의 실행 엔진별 연결 방식도 그때 이식성을 검증한다. |

MCP는 모든 앱 기능의 기본 추상화가 아니다. 파일 계약, Skills, 스크립트, 후크, 서버 이벤트로 해결하기 어려운 실시간 앱 중재 상호작용에만 사용한다. Skills와 MCP는 이식성을 지향하는 공통 작업 표면으로 유지하되, 아직 여러 실행 엔진 사이의 이식성이 증명됐다고 주장하지 않고 Codex가 직접 제공하는 제어와 이벤트를 캠프 기간에 ACP 공통분모로 축소하지 않는다.

## Built-in Skills 전략

AY-PLE의 기능 확장은 built-in Skills와 local scripts를 늘리는 방식으로 스케일한다. 앱은 모든 케이스를 하드코딩하지 않고, AY가 runtime에서 적절한 처리 전략을 선택할 수 있게 한다.

| Skill 후보 | 트리거 | 주요 산출물 |
| --- | --- | --- |
| `ay-ple-init` | 새 학기 workspace 생성 | Course 기준선, 초기 SQLite 상태 |
| `material-intake` | RawMaterial이 SourceList에 들어옴 | source manifest 확인, 처리 전 점검 |
| `agent-modeling` | SourceSelection으로 ModelingRun 시작 | DraftState, ReviewState, StatePatch |
| `user-correction` | 사용자가 대화나 GUI로 정정 | 수정된 DraftState 또는 StatePatch |
| `projection-rendering` | TrustedState 또는 ReviewState 갱신 | MarkdownProjection |
| `workspace-query` | 사용자가 정리된 상태에 질문 | 근거 기반 답변 또는 추가 StatePatch |

| Script 후보 | 역할 |
| --- | --- |
| PDF text extraction | PDF 텍스트 추출 |
| OCR | 이미지와 스캔본 텍스트 추출 |
| HWP/HWPX parsing | HWP/HWPX 문서 구조와 텍스트 추출 |
| projection renderer | SQLite state를 built-in heading template로 렌더링 |
| schema validator | Agent output과 StatePatch schema 검증 |

## 제품 MVP 범위와 4주 캠프 범위

4주 캠프의 확정 범위는 [4주 개발 백로그](ay-ple-development-backlog.md)가 소유한다. 이 Product Brief의 전체 MVP는 후속 개발까지 포함하는 장기 목표이므로, 아래의 `포함`이 모두 4주 안에 구현된다는 뜻은 아니다.

| 4주 분류 | 항목 |
| --- | --- |
| 확정 | Assignment 하나, TXT 우선 RawMaterial, SourceSelection, Codex로 구현한 필수 상호작용, EvidenceRef, StatePatch, Review, UserConfirmation, TrustedState, ChatSidecar |
| 2주차 실행 엔진 제어 검증 | 진행 중 정정과 Codex 사용자 입력 요청 왕복; 실제 중단 완료는 별도 제어·실패 시나리오로 검증 |
| 후보 | PDF, Exam, TimelineEntry, TaskCandidate→StudentTask, WorkspaceHistory, MarkdownProjection, WorkspaceQuery, HWP/HWPX 해석, OCR, `npx ay-ple` 패키징 |
| 제외 | ACP 어댑터, 다중 엔진 동작 일치, 범용 기능 분류, 실행 엔진 선택 UI |

### 제품 MVP 장기 범위

| 범위 | 항목 | 설명 |
| --- | --- | --- |
| 포함 | `npx ay-ple` 기반 로컬 웹앱 시작 | 초기 오픈소스 MVP 배포 방식 |
| 포함 | Init | 확정 과목과 workspace 생성 |
| 포함 | MaterialIntake | RawMaterial 원본 보존과 SourceList 표시 |
| 포함 | SourceSelection | 사용자가 처리할 source를 명시적으로 선택 |
| 포함 | ModelingRun | 선택한 source에 대한 AgentLedProcessing 실행 |
| 포함 | Assignment/Exam first-class modeling | 과제와 시험을 task나 calendar event로 축소하지 않고 학업 객체로 다룬다. |
| 포함 | DraftState/ReviewState/TrustedState | 상태 계층 분리 |
| 포함 | StatePatch + RecommendedChoice | 사용자 확인 단위의 추천 변경 묶음 |
| 포함 | EvidenceRef | source 근거를 field-level로 연결해 Review에서 확인 가능하게 한다. |
| 포함 | TimelineEntry read model | Assignment, Exam, ScheduleEvent, StudentTask에서 timeline을 파생한다. |
| 포함 | TaskCandidate → StudentTask | 제안된 행동을 사용자가 수락하면 trusted task가 된다. |
| 포함 | UserCorrection/UserConfirmation | 사용자가 정정하고 trusted 여부를 결정 |
| 포함 | WorkspaceHistory | UserConfirmation과 Projection 변경을 app-managed history로 기록 |
| 포함 | MarkdownProjection 3종 | `semester-overview.md`, `courses/*/overview.md`, `review-queue.md` |
| 포함 | ChatSidecar | GUI와 같은 상태를 다루는 대화 표면 |
| 포함 | AY 상호작용 | 이어지는 세션, 세부 작업 활동, 진행 중 정정, 실제 중단 완료 확인, 실행 권한 요청, Codex 사용자 입력 요청, UserDecisionRequest, 작업 재개 |
| 포함 | `app.request_user_decision` MCP startpoint | AY가 live 사용자 판단을 요청 |
| 포함 | built-in Skills와 local scripts | AgentLedProcessing의 가이드와 deterministic 처리 |
| 포함 | Codex app-server adapter | MVP agent runtime |
| 제외 | 과제 정답 대행 | 학업 윤리상 제외 |
| 제외 | 코딩/실습 과제 해결 | MVP 이후 확장 후보 |
| 제외 | LMS 로그인 자동화 | 보안/정책 리스크 때문에 제외 |
| 제외 | 클라우드 계정/동기화 | local-first MVP 범위 밖 |
| 제외 | 자동 제출 | 사용자 최종 확인을 유지 |
| 제외 | 외부 캘린더 자동 업로드 | 필요 시 `calendar.ics` projection 이후 검토 |
| 제외 | 주간 위험 브리핑/study packet 보장 | WorkspaceQuery 위의 후속 use case 후보 |
| 제외 | custom Markdown template | MVP 이후 확장 |
| 제외 | 사용자에게 보이는 Git workflow | Git은 내부 history layer로만 사용 |
| 제외 | ACP 실행 엔진 어댑터와 다중 엔진 동작 일치 | 캠프 이후 실제 두 번째 실행 엔진 요구가 생길 때 검토 |
| 제외 | 범용 에이전트 기능 분류 | Codex 제품 수직 흐름에서 검증한 의미 없이 미리 추상화하지 않음 |

## 보안과 프라이버시

- RawMaterial과 SemesterModel은 사용자 컴퓨터의 workspace에 저장한다.
- 브라우저 UI는 localhost에서 접근한다.
- 브라우저가 직접 파일시스템이나 Codex app-server에 접근하지 않고 local companion 서버가 중재한다.
- AY가 처리한 결과는 DraftState, ReviewState, StatePatch, run artifact로 남긴다.
- TrustedState는 UserConfirmation을 통해서만 확정된다.
- RawMaterial 원본은 자동 수정하거나 삭제하지 않는다.
- WorkspaceHistory는 앱이 소유하며, AY가 직접 Git history를 확정하지 않는다.
- Codex 원본 내용은 기본적으로 저장하지 않는다. 프롬프트, 경로, 도구 인자, 환경 값처럼 비밀 정보를 포함할 수 있는 값은 허용 목록과 민감 정보 제거 없이 Runtime Diagnostic History나 제품 감사 기록에 저장하지 않는다.
- 파일 대량 변경, 삭제, 외부 공유, 외부 연동은 별도 confirmation이 필요하다.

## Academic Integrity

AY-PLE는 학습과 운영을 보조하는 도구다.

| 구분 | 행동 | 정책 |
| --- | --- | --- |
| 허용 | 강의자료 정리 | 자료를 과목, 공지, 일정, task 후보와 연결한다. |
| 허용 | 일정과 마감 후보 추출 | 사용자가 확인한 뒤 TrustedState에 반영한다. |
| 허용 | 자료 근거 기반 질문 | RawMaterial과 TrustedState를 근거로 답한다. |
| 허용 | 과제 마감 준비 정리 | 준비물, 마감일, 참고 자료를 task 후보로 정리한다. |
| MVP 이후 검토 | 시험 대비 study packet | core modeling 이후 WorkspaceQuery 확장으로 검토한다. |
| MVP 이후 검토 | 코딩/실습 과제 실행 검수 | 별도 안전 정책과 함께 검토한다. |
| 제한 | 과제 정답 생성 | 제품 목적 밖으로 둔다. |
| 제한 | 시험 답안 대행 | 학업 윤리상 금지한다. |
| 제한 | 자동 제출 | 사용자가 최종 제출을 직접 수행한다. |
| 제한 | 학교 정책을 우회하는 자동화 | LMS/학교 시스템 우회 자동화는 지원하지 않는다. |

## 성공 지표

초기 오픈소스 MVP 기준:

| 지표 | 의미 |
| --- | --- |
| Init 완료율 | 사용자가 학기 workspace와 Course 기준선을 만들 수 있는가 |
| MaterialIntake 성공률 | 다양한 RawMaterial을 원본 손상 없이 넣을 수 있는가 |
| SourceSelection 이후 ModelingRun 완료율 | 사용자가 명시적으로 선택한 source를 처리할 수 있는가 |
| CoControl 성공률 | 진행 중 정정, UserDecisionRequest 응답, 중단이 의도한 진행 중 작업에 적용되고 UI가 확정 상태로 돌아오는가 |
| StatePatch 채택률 | AY 추천이 실제 UserConfirmation으로 이어지는가 |
| UserCorrection 횟수와 난이도 | 사용자가 정정을 쉽게 할 수 있는가 |
| ReviewState 해소율 | 확인 필요 항목이 trusted 또는 rejected 상태로 이동하는가 |
| MarkdownProjection 유용성 | 사용자가 projection을 읽고 학기 상태를 이해하는가 |
| 재방문 빈도 | 한 학기 동안 계속 쓰이는가 |

## 리스크

| 리스크 | 왜 문제인가 | 대응 |
| --- | --- | --- |
| 단순 파일 분류기로 보일 위험 | Agent runtime의 이유가 약해진다. | AgentLedProcessing, UserCorrection, ReviewState, CoControl을 전면에 둔다. |
| NotebookLM과 겹쳐 보일 위험 | source-grounded chat만으로 보일 수 있다. | SemesterModel, TrustedState, StatePatch, Projection으로 앱 상태화를 강조한다. |
| MCP 과사용 | context bloat와 tool selection noise가 생긴다. | MVP MCP는 `app.request_user_decision` startpoint로 제한한다. |
| Codex 결합이 제품 전체로 샐 위험 | 상위 Codex 프로토콜 변화가 UI와 SemesterModel 변경으로 번질 수 있다. | Codex 통합 내부에 원본 이벤트와 제어를 가두고 제품에는 CoControl과 상태 변환만 노출한다. |
| AY 자유도 과잉 | 결과가 흔들리거나 사용자가 불신할 수 있다. | ProcessingGuardrail, schema validator, StatePatch evidence를 둔다. |
| Markdown state 오염 | 자유 Markdown을 source of truth로 쓰면 깨지기 쉽다. | SQLite를 source of truth로 두고 MarkdownProjection은 artifact로 둔다. |
| 일정과 task 중복 저장 | Assignment 마감, timeline row, task deadline이 서로 다른 값으로 갈라질 수 있다. | academic fact는 하나의 owner만 두고 TimelineEntry와 linked task는 canonical owner를 참조한다. |
| RawMaterial 자동 정리 위험 | 잘못된 이동/삭제가 신뢰를 깬다. | 원본은 보존하고 정리는 Review 이후 artifact/projection으로만 한다. |
| local history storage 증가 | PDF, PPTX, HWP/HWPX 같은 RawMaterial binary를 포함하면 디바이스 저장공간을 더 사용한다. | MVP에서는 local-only 원본 복구를 우선하고, 이후 storage usage와 retention UX를 제공한다. |
| 기존 Git repo와 충돌 | 사용자가 이미 Git repo 안에서 workspace를 만들 수 있다. | workspace root `.git` 대신 `.ay-ple/history.git` 같은 app-managed repo를 후보로 둔다. |
| UI 확정 과속 | early layout decision이 제품을 좁힐 수 있다. | 검토 워크스페이스의 핵심 구조만 먼저 확인하고, timeline/task/projection 배치는 별도 설계로 남긴다. |
| 로컬 앱 설치 장벽 | npm 기반 시작은 일반 학생에게 부담일 수 있다. | MVP는 one-command, 중장기적으로 macOS desktop app을 검토한다. |

## 열린 질문

| 질문 | 결정이 필요한 이유 |
| --- | --- |
| `.ay-ple/semester.sqlite`의 실제 table schema는 어떻게 둘 것인가? | 채택한 canonical object와 derived read model을 구현 가능한 DB schema로 내려야 한다. |
| `sources/`와 `.ay-ple/` 사이의 raw file 위치를 최종적으로 어떻게 나눌 것인가? | 사용자가 원본을 직접 볼 수 있는 정도와 앱 관리 안정성의 균형이다. |
| WorkspaceHistory의 storage usage와 retention UX를 어떻게 보여줄 것인가? | RawMaterial binary를 포함하므로 사용자가 로컬 저장공간 사용량을 이해할 수 있어야 한다. |
| `app.request_user_decision`의 UI와 protocol은 어떻게 설계할 것인가? | AY 중간 질문이 사용자 피로가 아니라 마법 같은 UX로 느껴져야 한다. |
| 이어지는 AY 작업 맥락과 ModelingRun은 어떤 저장 관계를 갖는가? | Codex `thread`를 이어 쓰더라도 실행 맥락과 학업 상태의 SSOT를 분리해야 한다. |
| 앱에서 발생한 자료 선택·상태 변화를 진행 중 작업에 언제 전달하거나 대기시키고, 언제 새 `turn`으로 시작하는가? | 자동 전달이 학생 의도를 왜곡하거나 오래된 상태를 기준으로 AY 작업을 계속하지 않게 해야 한다. |
| StatePatch의 RecommendedChoice와 alternatives 표현은 어떤 UX가 좋은가? | 선택 피로를 줄이면서 사용자 통제감을 보장해야 한다. |
| timeline, 추천 할 일, 읽기용 정리 문서는 어떤 화면에 배치할 것인가? | 대표 검토 화면은 선택 자료 검토와 과제 반영 브리핑에 집중하므로 후속 운영 화면 설계가 필요하다. |
| built-in Skills를 workspace에 projection할지 runtime context에 주입할지 어디까지 노출할 것인가? | 사용자가 로컬 매뉴얼을 볼 수 있는 정도와 runtime 격리 방식의 선택이다. |
| WorkspaceQuery의 첫 대표 use case는 무엇으로 둘 것인가? | core modeling 이후 데모와 사용자 가치를 보여줄 entry point가 필요하다. |
