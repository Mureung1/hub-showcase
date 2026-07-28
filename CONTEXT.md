# AY-PLE Context

AY가 사용자 소유 학기 workspace에서 일하고 AY-PLE의 typed UI로 사용자 판단을 받아 계속 행동하는 과정에서 사용하는 공용어를 정의한다. 구현 타입, Codex 프로토콜 용어, UI 배치와 일회성 Spike 용어는 이 사전에 포함하지 않는다.

## 제품과 역할

**AY-PLE**:
학생이 App GUI에서 명시한 작업 맥락을 AY에게 전달하고, AY가 요청한 사용자 판단을 capability-specific UI로 다시 연결하면서 한 학기 Git workspace에서 함께 일하는 local-first 학업 Agent 앱이다.
_Avoid_: Codex wrapper, Runtime Harness, 범용 Agent 플랫폼

**AY**:
학생이 AY-PLE 안에서 작업을 맡기고 대화하는 Agent 역할이다. AY는 ActionInvocation으로 받은 목적과 맥락, InteractionCapability 결과를 해석해 작업 흐름과 실제 학기 자료 작업을 소유하지만 App의 사용자 상호작용은 소유하지 않는다.
_Avoid_: Codex의 별칭, 앱 관리자, 단순 챗봇

## 학기 작업공간과 학업 객체

**SemesterWorkspace**:
학생이 명시적으로 선택해 AY와 함께 사용하는 한 학기 전용 Git working tree다. 하나의 SemesterWorkspace는 하나의 Git repository이자 하나의 학기이며, 실제 학기 자료와 학기 상태를 같은 사용자 소유 작업공간에서 다룬다.
_Avoid_: Codex thread, 여러 학기를 담은 monorepo, Git repository의 하위 폴더, app-owned 복사본, 암묵적인 process working directory

**WorkspaceRegistry**:
AY-PLE이 여러 SemesterWorkspace 사이에서 알고 있는 작업공간과 현재 선택을 보존하는 운영 정보다. 학기 identity나 자료의 정본은 아니다.
_Avoid_: workspace manifest authority, Git repository, 자료 index, app-owned workspace copy

**WorkspaceManifest**:
SemesterWorkspace의 identity, 학년 단계·학기와 안정적인 작업공간 설정을 나타내는 학기-local 정보다. Cross-workspace 운영 정보와 구분한다.
_Avoid_: 별도 manifest sidecar, Course 폴더 트리, appData registry, Skill 설정, Runtime state

**Semester Ready**:
Account 연결, 명시적인 SemesterWorkspace 선택과 기본 준비가 끝나 AY가 그 학기 공간에서 작업할 수 있는 상태다. 앱이 별도 workspace를 생성했다는 뜻은 아니다.
_UI alias_: 학기 공간 준비 완료
_Avoid_: 학기 이해 완료, 학업 action 준비 완료, 자료 분석 완료

**Course**:
SemesterWorkspace 안에서 한 과목을 나타내는 학업 객체다. 정체성과 관계는 workspace-local 학기 정보가 기준이며 관련 폴더와 파일을 연결할 수 있지만 폴더 자체와 같지는 않다.
_Avoid_: 디렉터리, thread, 태그

**EvidenceRef**:
AY가 제안한 값이 어느 학기 자료의 어떤 content version과 위치에 근거하는지 Review에 전달할 수 있는 선택적 field-level 참조다. App은 Review 요청 때 active SemesterWorkspace의 relative path를 on-demand로 bounded read하고 exact content digest와 locator를 검증해 transient preview를 만들 뿐, 모든 file operation을 추적하지 않는다.
_Avoid_: 필수 global file registry, 최신 파일만 가리키는 링크, App-owned source copy·cache, 일부만 검증된 preview, Agent 활동 로그

**SemesterModel**:
SemesterWorkspace가 과목과 학업 사실을 구조화해 보존할 때 사용하는 현재 학기 snapshot이다. Agent 대화 기록이나 App-owned aggregate가 아니다.
_Avoid_: App database, 폴더 구조 전체, 채팅 기록, Agent Memory

**Assignment**:
학생에게 제출·완료할 학업 활동을 요구하는 first-class 학업 객체다. 마감, 제출 방식, 요구사항과 근거 같은 과제 사실을 소유한다.
_Avoid_: 일반 할 일, 캘린더 이벤트, 카드

**Exam**:
시험, 퀴즈, 중간고사, 기말고사 같은 first-class 평가 객체다. 일시, 범위, 장소, 준비 안내와 근거 같은 시험 사실을 소유한다.
_Avoid_: 일반 일정, 학습 메모, 할 일

**ScheduleEvent**:
Assignment나 Exam이 소유하지 않는 수업, 보강, 휴강, 오피스아워 같은 독립 시간 사실이다.
_Avoid_: 과제 마감 복제, 시험 일시 복제, 파생 timeline 행

## 제안과 신뢰

**StatePatch**:
AY가 Review를 위해 학생에게 보여주는 일시적인 구조화 변경 제안이다. 도메인 중립적인 semantic before/after change와 선택적인 EvidenceRef를 담지만 App의 durable entity나 학기 자료를 바꿀 권한은 아니다.
_UI alias_: 변경 제안
_Avoid_: App-owned pending record, Agent 최종 답변, 자동 반영, raw protocol event

**Review**:
학생이 StatePatch와 연결된 학기 자료의 근거를 확인하고 수락·수정 요청·거절한 결과를 같은 AY 작업에 돌려주는 InteractionCapability다.
_Avoid_: 코드 리뷰, 실행 권한 승인, Agent self-review

**UserConfirmation**:
학생이 Review에서 반환한 `accept | revise | reject`와 선택적인 feedback 결과다. 별도 durable App entity가 아니며 AY가 다음 행동을 정하는 입력이다.
_Avoid_: App-owned decision record, command approval, 암묵적 동의

**TrustedState**:
Review 결과를 해석한 AY가 실제 학기 자료에 반영하고 history로 남긴 상태다. 별도 App 데이터 계층이나 저장소 이름이 아니라 정보의 권한 수준을 뜻한다.
_UI alias_: 반영됨
_Avoid_: Agent가 생성한 초안, DraftState 저장소, 검토 대기 목록

## AY와 App의 상호작용

**AY–App Interaction**:
학생이 App GUI에서 명시한 작업 맥락이 AY에게 전달되고, AY가 요청한 사용자 판단이 App의 알맞은 UI를 거쳐 같은 작업으로 돌아오는 양방향 제품 상호작용이다. ActionInvocation과 InteractionCapability를 포괄하지만 하나의 저장 객체나 범용 event stream은 아니다.
_Avoid_: ModelingRun, 채팅 transcript, 범용 event bus, App-owned workflow

**ActionInvocation**:
학생이 목적이 분명한 GUI action을 명시적으로 실행할 때 App이 검증한 현재 맥락을 한 번의 AY 작업으로 전달하는 일회성 요청이다. Preview와 selection 자체는 ActionInvocation이 아니며 durable run이나 App-owned workflow를 만들지 않는다.
_Avoid_: DOM event, 암묵적인 selection 주입, ModelingRun, App-owned 실행 기록

**InteractionCapability**:
AY가 작업 중 목적이 분명한 사용자 상호작용을 요청하면 AY-PLE이 그에 맞는 UI를 보여주고 구조화된 결과를 같은 작업에 돌려주는 제품 기능이다. AY–App Interaction 중 AY가 시작하는 방향이며, App은 사용자 round trip을, AY는 workflow와 결과 적용을 소유한다.
_Avoid_: AY–App Interaction 전체, App-owned workflow, 범용 event bus, arbitrary schema renderer, durable 학업 객체

**CoControl**:
학생의 명시적인 GUI action이 AY 작업을 시작하고 AY의 typed request가 다시 학생 판단을 받아 작업을 이어 가는 양방향 feedback-loop 원칙이다. App은 자신이 제공하는 interaction을, AY는 workflow와 실제 학기 자료 작업을 소유한다.
_Avoid_: 범용 event router, 모든 변경의 즉시 주입, App-owned academic workflow

## 파생 결과와 후속 기능

**MarkdownProjection**:
SemesterModel에서 생성하는 사람이 읽기 좋은 Markdown 표현이다. 원본 학기 상태의 source of truth가 아니다.
_Avoid_: 자유 편집 canonical state, 원본 workspace file, Agent 답변

**WorkspaceHistory**:
SemesterWorkspace의 실제 자료와 SemesterModel snapshot 변경을 비교하고 되돌릴 수 있게 하는 사용자 소유 history다. 별도 interaction event ledger가 아니다.
_Avoid_: Runtime Diagnostic History, Agent session log, app-owned audit ledger
