# SemesterOps Product Brief

작성일: 2026-07-07
상태: Draft

## 한 줄 요약

**SemesterOps는 학생이 한 학기 자료를 정리하지 않고 넣으면, 로컬 Codex agent runtime이 자료를 해석하고 사용자와 대화하며 과목·공지·자료·일정·task 후보로 모델링해주는 local-first academic agent app이다.**

SemesterOps의 핵심은 캘린더 앱이나 AI 채팅창이 아니라, 더러운 학기 RawMaterial을 사용자 컴퓨터 안에서 SemesterModel로 바꾸는 AgentLedProcessing 경험이다. 사용자는 GUI와 ChatSidecar를 함께 쓰며 자료를 넣고, 처리할 source를 선택하고, Agent가 만든 StatePatch를 확인·수정·승인한다. 앱은 사용자의 UserConfirmation을 trusted state의 기준으로 삼고, MarkdownProjection과 WorkspaceQuery를 통해 정리된 학기 상태를 보여준다.

## 배경

대학생의 학기 관리는 일정 등록 문제만이 아니다. 실제 학기 자료는 LMS 공지, 강의계획서, PDF, PPTX, HWP/HWPX, 이미지, 메모, 과제 안내, 시험 범위, 보강 안내처럼 포맷과 품질이 제각각인 자료로 흩어진다.

학생이 실제로 겪는 문제는 다음과 같다.

| 자료 유형 | 예시 | 사용자가 겪는 문제 |
| --- | --- | --- |
| 확정 과목 정보 | 과목명, 교수명, 학점, 수업 시간 | 학기 초에 한 번 정리해도 이후 자료와 연결되지 않는다. |
| LMS 공지 | 휴강, 보강, 과제, 시험 안내 | 과목과 일정, task로 옮기지 않으면 묻힌다. |
| 강의계획서 | 평가 방식, 주차별 계획, 시험 일정 | 중요한 운영 정보가 긴 문서 안에 숨어 있다. |
| 수업 자료 | PDF, PPTX, HWP/HWPX, 이미지 | 저장은 했지만 과목·주차·시험 범위와 연결되지 않는다. |
| 개인 메모 | 시험 범위, 교수님 강조점, 제출 조건 | 원본 자료와 함께 해석되지 않으면 다시 찾기 어렵다. |

SemesterOps는 사용자가 처음부터 파일을 깔끔하게 분류한다고 가정하지 않는다. 먼저 RawMaterial을 보존하고, 사용자가 고른 SourceSelection에 대해 Agent가 built-in Skills, local scripts, 파일 접근, 대화, 필요 시 UserDecisionRequest를 사용해 처리 전략을 선택한다.

## 문제 정의

**학기 관리는 흩어진 RawMaterial을 사용자가 신뢰할 수 있는 SemesterModel로 바꾸는 문제다.**

현재 학생은 자료를 저장한 뒤, 필요한 정보를 직접 해석하고, 캘린더·메모·할 일 앱에 다시 옮긴다. 이 과정은 반복적이고, 포맷별 예외가 많고, 누락이 잘 생긴다.

SemesterOps가 해결해야 할 문제는 다음과 같다.

| 문제 | 현재 행동 | SemesterOps의 역할 |
| --- | --- | --- |
| 자료가 너무 더럽고 다양함 | 파일을 저장한 뒤 사람이 다시 읽고 분류한다. | Agent가 runtime에서 적절한 Skill/script를 선택해 해석한다. |
| 앱이 처리 방식을 미리 다 알 수 없음 | 지원 안 되는 포맷이나 특이한 공지는 수동 처리한다. | AgentLedProcessing으로 사용자 요구와 자료 맥락에 맞게 처리한다. |
| AI 결과를 믿기 어려움 | AI 답변을 복사해 직접 정리한다. | StatePatch, evidence, RecommendedChoice, ReviewState로 검토 가능하게 만든다. |
| GUI와 AI가 분리됨 | 앱에서는 상태를 보고, 채팅에서는 별도 맥락으로 질문한다. | CoControl과 LiveStateSync로 GUI 조작과 Agent 대화가 같은 상태를 다룬다. |
| 정리 결과가 상태로 남지 않음 | 대화 결과가 실제 학기 운영 상태와 분리된다. | UserConfirmation 이후 TrustedState와 MarkdownProjection으로 남긴다. |

## 제품 테제

**SemesterOps는 한 학기 자료를 먹고, 학생과 대화하며, 앱이 다룰 수 있는 학기 상태를 만들어내는 로컬 에이전트 하네스다.**

앱은 파일 타입별 처리 로직을 모두 하드코딩하지 않는다. 대신 RawMaterial 보존, state contract, built-in Skills, local scripts, Review UX, UserConfirmation 경계를 제공한다. Agent는 이 경계 안에서 자료를 읽고, 필요한 도구를 실행하고, 사용자에게 묻고, DraftState와 ReviewState를 만든다.

## MVP 약속

> 학생이 한 학기 자료를 넣고 처리할 source를 명시적으로 선택하면, SemesterOps는 Agent와 함께 이를 과목·자료·공지·일정·task 후보로 모델링하고, 사용자가 확인한 trusted state와 읽기 좋은 MarkdownProjection으로 남긴다.

MVP는 과제 해결이나 자동 제출을 목표로 하지 않는다. 목표는 학기 자료를 앱이 이해할 수 있는 상태로 바꾸고, 사용자가 그 상태를 신뢰할 수 있게 만드는 것이다.

## 핵심 루프

| 단계 | 사용자 행동 | 앱/Agent 행동 | 결과 |
| --- | --- | --- | --- |
| Init | 이번 학기에 들을 확정 과목을 입력한다. | 학기 workspace와 초기 SemesterModel을 만든다. | 빈 학기 모델과 과목 기준선 |
| MaterialIntake | LMS 공지, PDF, PPTX, HWP/HWPX, 이미지, 메모를 넣는다. | 원본 RawMaterial을 보존하고 SourceList에 표시한다. | RawState와 source manifest |
| SourceSelection | 처리할 source를 GUI나 ChatSidecar에서 선택한다. | 선택된 RawMaterial 묶음을 ModelingRun 입력으로 준비한다. | 명시적 처리 대상 |
| ModelingRun | 버튼이나 대화로 AgentModeling을 시작한다. | Agent가 Skills/scripts/files를 사용해 처리 전략을 선택한다. | DraftState, ReviewState, StatePatch |
| UserDecisionRequest | Agent가 혼자 확정하기 어려운 질문에 답한다. | GUI를 통해 사용자 판단을 받고 작업을 이어간다. | 추가 UserCorrection |
| Review | 추천안을 확인하고 승인·수정·거절한다. | StatePatch를 검증하고 UserConfirmation을 기록한다. | TrustedState |
| MarkdownProjection | 정리된 결과를 읽는다. | built-in heading template으로 Markdown을 렌더링한다. | 사람이 읽는 FinalArtifact |
| WorkspaceQuery | 정리된 상태에 질문한다. | TrustedState와 RawMaterial 근거를 함께 사용한다. | 학기 상태 기반 답변 |

## 정보 모델

MVP 산출물은 직접적인 DB schema의 출발점이다. 다만 이 문서는 최종 schema가 아니라 도메인 정보 모델을 정의한다.

| 개체 | 의미 | 상태 계층 |
| --- | --- | --- |
| `Course` | Init에서 확정한 이번 학기 과목 | TrustedState |
| `RawMaterial` | 원본 파일, 공지, 메모, 이미지 | RawState |
| `Material` | 해석된 수업 자료 | DraftState 또는 TrustedState |
| `Notice` | 공지나 안내사항 | DraftState 또는 TrustedState |
| `ScheduleItem` | 수업, 시험, 마감, 보강 등 시간 정보 | DraftState 또는 TrustedState |
| `TaskCandidate` | 과제, 준비물, 복습 등 할 일 후보 | ReviewState |
| `Uncertainty` | Agent가 확신하지 못한 지점 | ReviewState |
| `StatePatch` | 사용자 확인 단위의 구조화 변경 제안 | ReviewState |
| `UserDecisionRequest` | Agent가 GUI로 요청하는 live 사용자 판단 | ReviewState |
| `MarkdownProjection` | SemesterModel에서 렌더링된 사람이 읽는 문서 | ArtifactState |

## 상태 계층

| 계층 | 역할 | 권한 |
| --- | --- | --- |
| RawState | 원본 RawMaterial과 provenance 보존 | 앱이 저장하고 사용자가 소유 |
| DraftState | AgentModeling의 초기 해석 | Agent가 제안하고 앱이 검증 |
| ReviewState | 확인·정정·거절이 필요한 후보 | 사용자와 Agent가 함께 다룸 |
| TrustedState | UserConfirmation을 거친 신뢰 상태 | 사용자가 결정권을 가짐 |
| ArtifactState | MarkdownProjection 등 생성 산출물 기록 | 앱이 생성하고 사용자가 확인 |

TrustedState의 SSOT는 Agent가 아니라 UserConfirmation이다. Agent는 TrustedState를 입력으로 받아 작업하고, 변경은 StatePatch로 제안한다.

## StatePatch

StatePatch는 사용자가 이해 가능한 변화 묶음이다. 선택 피로를 줄이기 위해 Agent는 RecommendedChoice를 제공하고, 사용자는 추천안을 승인·수정·거절한다.

| 필드 | 주 생성자 | 설명 |
| --- | --- | --- |
| `id` | App | 추적용 식별자 |
| `sourceIds` | App | 연결된 RawMaterial |
| `createdAt` | App | 생성 시각 |
| `runId` | App | ModelingRun 연결 |
| `patchType` | App 또는 Agent | 변경 유형 |
| `summary` | Agent | 사용자가 이해할 한 줄 설명 |
| `recommendedChoice` | Agent | 추천 기본 선택 |
| `changes` | Agent draft, App validate | 실제 반영될 구조화 변경 |
| `evidence` | Agent draft, App attach/validate | RawMaterial 또는 TrustedState 근거 |
| `alternatives` | Agent | 다른 처리 가능성 |
| `riskLevel` | App + Agent | low, medium, high |
| `requiresConfirmation` | App | trusted 반영 전 확인 필요 여부 |
| `status` | App/User | pending, accepted, edited, rejected |

## Source of Truth 전략

MVP의 source of truth는 SQLite와 원본 RawMaterial이다. Markdown은 사람이 읽는 projection이며 앱의 상태 기준이 아니다.

`sources/`는 사용자가 볼 수 있는 raw store다. 앱은 RawMaterial을 자동으로 이동하거나 삭제하지 않고, `.semesterops/semester.sqlite`에 manifest와 provenance를 기록한다.

| 범주 | 저장 위치 | 역할 |
| --- | --- | --- |
| 원본 자료 | `sources/` | 사용자가 넣은 RawMaterial 원본을 보존한다. |
| 구조화 상태 | `.semesterops/semester.sqlite` | RawState, DraftState, ReviewState, TrustedState, ArtifactState를 저장한다. |
| Agent context | `.semesterops/agent-context/` | Agent turn에 주입할 snapshot, source manifest, recent patch log를 둔다. |
| Agent run 기록 | `.semesterops/runs/*` | ModelingRun의 prompt, logs, script output, evidence를 보존한다. |
| WorkspaceHistory | `.semesterops/history.git` 후보 | UserConfirmation, ModelingRun, Projection 갱신의 의미 있는 checkpoint를 기록한다. |
| built-in Skills | `.semesterops/skills/`, `.agents/skills/semesterops-*` | Agent workflow 매뉴얼을 제공한다. |
| local scripts | `.semesterops/scripts/` 또는 package 내부 scripts | PDF, OCR, HWP/HWPX, projection rendering 같은 deterministic 처리를 담당한다. |
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
  .semesterops/
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

SemesterOps는 Git을 사용자-facing 기능으로 노출하지 않는다. Git은 내부 history layer의 구현 후보이며, 사용자는 기록, 변경 비교, 되돌리기 같은 친숙한 개념으로 경험한다.

| 원칙 | 설명 |
| --- | --- |
| App-managed history | 앱이 checkpoint와 rollback을 소유하고, Agent가 raw Git 명령으로 상태를 확정하지 않는다. |
| Friendly UX | UI에서는 Git, commit, branch보다 변경 기록, 비교, 되돌리기 표현을 쓴다. |
| Meaningful checkpoint | 모든 autosave가 아니라 UserConfirmation, ModelingRun 완료, Projection 갱신 같은 의미 있는 순간을 기록한다. |
| Diffable projection | SQLite 자체 diff에 의존하지 않고 JSON export, MarkdownProjection, StatePatch summary를 함께 보여준다. |
| RawMaterial safety | RawMaterial binary도 local history에 포함해 원본 복구와 provenance를 강화한다. |

MVP에서는 `.semesterops/history.git` 같은 app-managed Git repository를 후보로 둔다. 이 history는 기본적으로 local-only이며 원격 push 대상이 아니다. workspace root에 사용자-facing `.git`을 만들지 않기 때문에 기존 사용자의 Git repository와 충돌할 가능성도 줄인다.

| HistoryCheckpoint trigger | 기록할 내용 |
| --- | --- |
| MaterialIntake | RawMaterial binary, source manifest, provenance |
| UserConfirmation | accepted/edited/rejected StatePatch와 TrustedState 변화 |
| ModelingRun 완료 | run summary, sourceIds, output artifact reference |
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
- Agent가 자유롭게 원본 Markdown state를 작성하지 않는다.
- 앱이 built-in heading template을 제공한다.
- heading 내부 표현은 Agent가 table, bullet, Mermaid, HTML 등으로 선택할 수 있다.
- MVP에서는 custom template를 지원하지 않는다.

## CoControl UX

사용자는 GUI만 쓰거나 채팅만 쓰는 것이 아니다. GUI 조작과 ChatSidecar 대화가 같은 live SemesterModel을 조작해야 한다.

| 표면 | 역할 |
| --- | --- |
| GUI | source 선택, ModelingRun 시작, Review, UserConfirmation, Projection 확인 |
| ChatSidecar | 현재 SourceSelection, ModelingRun, ReviewState, Projection 맥락에서 Agent와 대화 |
| LiveStateSync | GUI 결정은 Agent-visible context로, Agent 작업은 GUI-visible state로 동기화 |
| UserDecisionRequest | Agent가 처리 중 막힌 질문을 GUI로 요청 |

필수 UX capability는 확정하지만, 화면 레이아웃은 아직 확정하지 않는다.

| Capability | 상태 |
| --- | --- |
| ChatSidecar | MVP 필수 |
| SourceList | MVP 필수 |
| SourceSelection | MVP 필수 |
| ModelingRun start control | MVP 필수 |
| Review surface | MVP 필수 |
| MarkdownProjection view | MVP 필수 |
| 최종 화면 배치 | UIPrototypeSpike에서 결정 |

UIPrototypeSpike에서는 NotebookLM의 source-grounded workflow, Obsidian의 local-first workspace 감각, VS Code의 side panel과 co-control 패턴을 참고하되, 일반 대학생에게 과한 개발자 UI를 그대로 가져오지 않는다.

## Agent Runtime 전략

Codex runtime 격리, 설치, 상태 분리의 세부 정책은 [Codex Runtime Isolation Technical Note](../architecture/codex-runtime-isolation.md)를 따른다.

| 레이어 | MVP 방침 |
| --- | --- |
| AgentRuntimeAdapter | Codex app-server를 app-owned runtime으로 실행하고 protocol/transport를 감싼다. |
| Agent workflow | built-in Skills가 처리 전략과 산출물 형식을 안내한다. |
| RawMaterial 접근 | Codex의 workspace file access와 source manifest를 사용한다. |
| Deterministic processing | PDF text extraction, OCR, HWP/HWPX parsing, projection rendering은 local script로 제공한다. |
| Agent context | turn 시작 또는 재개 시 snapshot files를 주입한다. |
| MCP | MVP startpoint는 `app.request_user_decision`만 둔다. |
| GUI sync | server events, DB subscription, hooks로 처리한다. |

MCP는 모든 앱 기능의 기본 추상화가 아니다. 파일 계약, Skills, scripts, hooks, server events로 해결하기 어려운 live app-mediated interaction에만 사용한다.

## Built-in Skills 전략

SemesterOps의 기능 확장은 built-in Skills와 local scripts를 늘리는 방식으로 스케일한다. 앱은 모든 케이스를 하드코딩하지 않고, Agent가 runtime에서 적절한 처리 전략을 선택할 수 있게 한다.

| Skill 후보 | 트리거 | 주요 산출물 |
| --- | --- | --- |
| `semesterops-init` | 새 학기 workspace 생성 | Course 기준선, 초기 SQLite 상태 |
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

## MVP 범위

| 범위 | 항목 | 설명 |
| --- | --- | --- |
| 포함 | `npx semesterops` 기반 로컬 웹앱 시작 | 초기 오픈소스 MVP 배포 방식 |
| 포함 | Init | 확정 과목과 workspace 생성 |
| 포함 | MaterialIntake | RawMaterial 원본 보존과 SourceList 표시 |
| 포함 | SourceSelection | 사용자가 처리할 source를 명시적으로 선택 |
| 포함 | ModelingRun | 선택한 source에 대한 AgentLedProcessing 실행 |
| 포함 | DraftState/ReviewState/TrustedState | 상태 계층 분리 |
| 포함 | StatePatch + RecommendedChoice | 사용자 확인 단위의 추천 변경 묶음 |
| 포함 | UserCorrection/UserConfirmation | 사용자가 정정하고 trusted 여부를 결정 |
| 포함 | WorkspaceHistory | UserConfirmation과 Projection 변경을 app-managed history로 기록 |
| 포함 | MarkdownProjection 3종 | `semester-overview.md`, `courses/*/overview.md`, `review-queue.md` |
| 포함 | ChatSidecar | GUI와 같은 상태를 다루는 대화 표면 |
| 포함 | `app.request_user_decision` MCP startpoint | Agent가 live 사용자 판단을 요청 |
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
| 제외 | 사용자-facing Git workflow | Git은 내부 history layer로만 사용 |

## 보안과 프라이버시

- RawMaterial과 SemesterModel은 사용자 컴퓨터의 workspace에 저장한다.
- 브라우저 UI는 localhost에서 접근한다.
- 브라우저가 직접 파일시스템이나 Codex app-server에 접근하지 않고 local companion 서버가 중재한다.
- Agent가 처리한 결과는 DraftState, ReviewState, StatePatch, run artifact로 남긴다.
- TrustedState는 UserConfirmation을 통해서만 확정된다.
- RawMaterial 원본은 자동 수정하거나 삭제하지 않는다.
- WorkspaceHistory는 앱이 소유하며, Agent가 직접 Git history를 확정하지 않는다.
- 파일 대량 변경, 삭제, 외부 공유, 외부 연동은 별도 confirmation이 필요하다.

## Academic Integrity

SemesterOps는 학습과 운영을 보조하는 도구다.

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
| StatePatch 채택률 | Agent 추천이 실제 UserConfirmation으로 이어지는가 |
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
| Agent 자유도 과잉 | 결과가 흔들리거나 사용자가 불신할 수 있다. | ProcessingGuardrail, schema validator, StatePatch evidence를 둔다. |
| Markdown state 오염 | 자유 Markdown을 source of truth로 쓰면 깨지기 쉽다. | SQLite를 source of truth로 두고 MarkdownProjection은 artifact로 둔다. |
| RawMaterial 자동 정리 위험 | 잘못된 이동/삭제가 신뢰를 깬다. | 원본은 보존하고 정리는 Review 이후 artifact/projection으로만 한다. |
| local history storage 증가 | PDF, PPTX, HWP/HWPX 같은 RawMaterial binary를 포함하면 디바이스 저장공간을 더 사용한다. | MVP에서는 local-only 원본 복구를 우선하고, 이후 storage usage와 retention UX를 제공한다. |
| 기존 Git repo와 충돌 | 사용자가 이미 Git repo 안에서 workspace를 만들 수 있다. | workspace root `.git` 대신 `.semesterops/history.git` 같은 app-managed repo를 후보로 둔다. |
| UI 확정 과속 | early layout decision이 제품을 좁힐 수 있다. | UIPrototypeSpike에서 NotebookLM, Obsidian, VS Code를 비교한다. |
| 로컬 앱 설치 장벽 | npm 기반 시작은 일반 학생에게 부담일 수 있다. | MVP는 one-command, 중장기적으로 macOS desktop app을 검토한다. |

## 열린 질문

| 질문 | 결정이 필요한 이유 |
| --- | --- |
| `.semesterops/semester.sqlite`의 실제 table schema는 어떻게 둘 것인가? | 정보 모델을 구현 가능한 DB schema로 내려야 한다. |
| `sources/`와 `.semesterops/` 사이의 raw file 위치를 최종적으로 어떻게 나눌 것인가? | 사용자가 원본을 직접 볼 수 있는 정도와 앱 관리 안정성의 균형이다. |
| WorkspaceHistory의 storage usage와 retention UX를 어떻게 보여줄 것인가? | RawMaterial binary를 포함하므로 사용자가 로컬 저장공간 사용량을 이해할 수 있어야 한다. |
| `app.request_user_decision`의 UI와 protocol은 어떻게 설계할 것인가? | Agent 중간 질문이 사용자 피로가 아니라 마법 같은 UX로 느껴져야 한다. |
| StatePatch의 RecommendedChoice와 alternatives 표현은 어떤 UX가 좋은가? | 선택 피로를 줄이면서 사용자 통제감을 보장해야 한다. |
| ChatSidecar와 main workspace layout은 어떻게 배치할 것인가? | NotebookLM, Obsidian, VS Code 참고를 거쳐 UIPrototypeSpike에서 결정한다. |
| built-in Skills를 workspace에 projection할지 runtime context에 주입할지 어디까지 노출할 것인가? | 사용자가 로컬 매뉴얼을 볼 수 있는 정도와 runtime 격리 방식의 선택이다. |
| WorkspaceQuery의 첫 대표 use case는 무엇으로 둘 것인가? | core modeling 이후 데모와 사용자 가치를 보여줄 entry point가 필요하다. |
