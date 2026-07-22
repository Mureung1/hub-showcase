# AY-PLE Context

AY-PLE가 한 학기 자료를 AY와 함께 정리하고 검토 가능한 학기 상태로 바꾸는 과정에서 사용하는 공용어를 정의한다. 구현 타입, Codex 프로토콜 용어, UI 배치와 일회성 Spike 용어는 이 사전에 포함하지 않는다.

## 제품과 역할

**AY-PLE**:
대학생이 한 학기 자료를 AY와 함께 정리하고, 근거를 검토한 뒤 확인한 내용만 학기 상태로 남기는 local-first 학업 앱이다.
_Avoid_: Codex wrapper, Runtime Harness, 범용 Agent 플랫폼

**AY**:
학생이 AY-PLE 안에서 작업을 맡기고 대화하는 Agent 역할이다. AY는 앱의 신뢰 상태나 실행 엔진 자체를 소유하지 않는다.
_Avoid_: Codex의 별칭, 앱 관리자, 상태 소유자, 챗봇

## 학기 작업공간과 학업 객체

**SemesterWorkspace**:
AY-PLE이 한 학년의 한 학기 자료와 학기 상태를 정규화해 관리하도록 생성하는 사용자 로컬 작업공간이다. 임의의 기존 자료 폴더나 Codex 작업 디렉터리를 SemesterWorkspace로 간주하지 않는다.
_Avoid_: Codex thread, 임의의 기존 폴더, Agent가 구조를 정하는 저장소

**WorkspaceManifest**:
SemesterWorkspace의 학기 정체성, Course 정체성과 관계, 작업공간 형식을 기록하는 app-owned 정보다. 폴더명과 디렉터리 배치는 사람이 읽기 위한 표현이며 정체성의 기준이 아니다.
_Avoid_: Course 폴더 트리, Skill 설정, Runtime state

**ImportSource**:
SemesterWorkspace 밖에 있으며 자료 반입 후보로 검토하는 기존 폴더나 자료 묶음이다. 그 자체는 SemesterWorkspace나 RawMaterial이 아니다.
_Avoid_: 기존 SemesterWorkspace, 자동 스캔 범위, 이미 반입된 RawMaterial

**Semester Ready**:
Codex account 연결과 app-owned SemesterWorkspace의 생성·기본 설정·validation이 끝나 후속 자료 반입을 시작할 수 있는 setup 완료 상태다. Course나 RawMaterial이 존재하거나 AY가 학기 내용을 이해했다는 뜻은 아니다.
_UI alias_: 학기 공간 준비 완료
_Avoid_: 학기 이해 완료, 학업 action 준비 완료, 자료 분석 완료

**Course**:
SemesterWorkspace 안에서 한 과목을 나타내는 학업 객체다. 정체성과 관계는 WorkspaceManifest가 기준이며 관련 폴더와 RawMaterial을 연결할 수 있지만 폴더 자체와 같지는 않다.
_Avoid_: 디렉터리, thread, 태그

**RawMaterial**:
SemesterWorkspace에 반입되어 AY-PLE가 해석할 수 있는 원문 공지, 강의계획서, 수업 문서, 이미지, 녹음 또는 메모다. 내용은 사용자의 명시적 결정 없이 바꾸지 않고, 외부 ImportSource와는 구분한다.
_Avoid_: 정제된 데이터, 요약, 검토 전 ImportSource

**EvidenceRef**:
StatePatch나 SemesterModel의 특정 값이 어느 RawMaterial의 어떤 부분에 근거하는지 가리키는 field-level 참조다.
_Avoid_: 파일 전체 링크, 일반 인용, Agent 활동 로그

**SemesterModel**:
AY-PLE가 과목과 학업 사실을 구조화해 다루는 학기 상태다. Codex 대화 기록이나 Memory가 아니라 앱이 소유하는 정보다.
_Avoid_: 폴더 구조, 채팅 기록, Codex Memory

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
AY 또는 사용자가 SemesterModel에 제안한 구조화 변경 묶음이다. 변경 내용과 EvidenceRef를 함께 가지며 UserConfirmation 전에는 신뢰 상태를 바꾸지 않는다.
_UI alias_: 변경 제안
_Avoid_: Agent 최종 답변, 자동 반영, raw protocol event

**Review**:
학생이 StatePatch와 연결된 RawMaterial 근거를 확인하고 수락·수정·거절하는 제품 상호작용이다.
_Avoid_: 코드 리뷰, 실행 권한 승인, Agent self-review

**UserConfirmation**:
학생이 StatePatch를 수락하거나 거절해 확정한 product decision 기록이다. 수정 요청은 replacement proposal을 위한 feedback이며 UserConfirmation이 아니고, 실행 권한 승인이나 일반 대화 응답과도 구분한다.
_Avoid_: command approval, YES/NO 입력, 암묵적 동의

**TrustedState**:
UserConfirmation을 거쳐 학생이 사용하기로 결정한 SemesterModel의 상태다. 별도 데이터 계층이나 저장소 이름이 아니라 정보의 권한 수준을 뜻한다.
_UI alias_: 반영됨
_Avoid_: Agent가 생성한 초안, DraftState 저장소, 검토 대기 목록

## AY 작업 구성

**SourceSelection**:
학생이 현재 작업의 입력으로 명시한 RawMaterial 참조 집합이다. AY가 볼 수 있는 전체 SemesterWorkspace나 파일 권한 경계를 뜻하지 않는다.
_UI alias_: 선택한 자료
_Avoid_: 자동 수집 범위, sandbox 경계, 영구 source 묶음

**ModelingRecipe**:
반복 가능한 학업 작업의 Skill, prompt template, argument contract와 구조화 출력 계약을 묶은 versioned 작업 정의다.
_Avoid_: 구체적인 실행 입력, UI action, Codex thread, runtime plugin

**ModelingInvocation**:
한 ModelingRecipe를 구체적인 인자, SourceSelection과 현재 SemesterWorkspace 맥락에 적용한 일회성 실행 요청이다. 실행 뒤 장기 기록으로 남는 객체가 아니다.
_Avoid_: ModelingRecipe 정의, ModelingRun receipt, 대화 세션, 학업 객체

**ModelingRun**:
한 ModelingInvocation의 실행 시도와 결과를 연결하는 얇은 기록이다. 대화 세션, 학업 workflow 또는 여러 실행을 조정하는 오케스트레이터가 아니다.
_UI alias_: 독립적으로 노출하지 않음
_Avoid_: AgentModeling 단계, persistent session, background pipeline

**CoControl**:
학생의 GUI·대화 행동과 AY의 작업이 같은 앱 소유 상태를 다루되, 실제 전달 방식과 반영 권한은 각 기능의 의미에 따라 앱이 중재하는 제품 원칙이다.
_Avoid_: 범용 event router, 모든 변경의 즉시 주입, 고정 interaction 목록

## 파생 결과와 후속 기능

**MarkdownProjection**:
SemesterModel에서 생성하는 사람이 읽기 좋은 Markdown 표현이다. 원본 학기 상태의 source of truth가 아니다.
_Avoid_: 자유 편집 canonical state, RawMaterial, Agent 답변

**WorkspaceHistory**:
학생에게 의미 있는 자료 반입, UserConfirmation과 상태 변경을 비교하거나 되돌릴 수 있게 하는 앱 소유 기록이다. 구현 방식은 Git으로 고정하지 않는다.
_Avoid_: Runtime Diagnostic History, Codex session log, 모든 autosave 기록
