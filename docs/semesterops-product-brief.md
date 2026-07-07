# SemesterOps Product Brief

작성일: 2026-07-07  
상태: Draft

## 한 줄 요약

**SemesterOps는 사용자의 컴퓨터에 학기 작업환경을 만들고, 웹앱에서 시간표·자료·과제·AI 상호작용을 관리하면 그 결과가 실제 로컬 파일로 남는 local-first academic agent harness다.**

사용자는 웹앱에서 시간표를 조작하고, 강의자료를 업로드하고, 에이전트와 대화한다. 내부에서는 로컬 companion 서버가 사용자 컴퓨터의 학기 작업환경과 Codex app-server를 연결한다. 목표는 Codex를 단순히 GUI로 감싸는 것이 아니라, 학기별 자료와 장기기억을 사용자의 디바이스에 보존하면서 AI가 실제 workspace를 읽고, 일정과 자료를 연결하고, 다음 행동을 제안하는 개인 학업 운영 창구를 만드는 것이다.

## 배경

대학생의 학기 관리는 캘린더 앱 하나로 해결되지 않는다. 실제 자료는 강의계획서 PDF, LMS 공지, 과제 안내, 주차별 강의자료, 시험범위 메모, 요약 노트, 발표자료, 제출 마감 정보처럼 흩어진다.

실제 대학생의 한 학기 자료 묶음에는 다음이 함께 존재한다.

| 자료 유형 | 예시 | 사용자가 겪는 문제 |
| --- | --- | --- |
| 학기 메타데이터 | 시간표, 과목명, 학점, 교수명, 강의실 | 여러 앱과 파일에 흩어져 최신 상태를 알기 어렵다. |
| 일정 메모 | 시험일, 과제 마감, 보강, 출석 예외 | 캘린더에 직접 옮기지 않으면 놓치기 쉽다. |
| 과목별 자료 | 강의계획서, 주차별 PDF/PPT, 시험 대비 자료 | 자료는 있지만 시험 범위나 task와 연결되지 않는다. |
| 과제 자료 | 과제 안내, 제출 양식, 참고 자료, 마감 공지 | 마감과 준비물이 자료 속에 묻혀 있다. |
| 학습 산출물 | 요약 노트, 예상문제, 발표자료, 제출 준비 메모 | 결과물이 쌓이지만 다음 행동으로 이어지지 않는다. |

SemesterOps는 사용자가 이런 구조를 직접 설계하고 유지한다고 가정하지 않는다. 앱이 먼저 로컬 학기 작업환경을 스캐폴딩하고, 사용자는 웹앱을 통해 자료를 넣고, 확인하고, 에이전트에게 일을 맡긴다. 문제는 학기 자료가 시간이 갈수록 흩어지고, 중요한 일정과 자료 상태를 사용자가 계속 수동으로 추적해야 한다는 점이다.

## 문제 정의

**학기 관리는 일정 등록 문제가 아니라, 흩어진 학업 자료를 계속 운영 가능한 상태로 유지하는 문제다.**

학생이 실제로 겪는 고통은 다음에 가깝다.

| 문제 | 현재 사용자의 행동 | SemesterOps가 해결해야 할 것 |
| --- | --- | --- |
| 일정 최신성 불명확 | 강의계획서, 공지, 노트를 직접 비교한다. | 일정 후보와 충돌을 찾아 사용자에게 확인받는다. |
| 자료와 일정의 단절 | 자료를 저장만 하고 시험/과제와 따로 관리한다. | 자료를 과목, 주차, 시험 범위, task와 연결한다. |
| 위험 이벤트 누락 | 과제 마감, 시험, 출석 필요일을 수동으로 기억한다. | 이번 주 위험 일정과 준비물을 자동으로 브리핑한다. |
| AI 결과가 상태로 남지 않음 | AI 답변을 따로 복사해 일정/노트에 반영한다. | 승인된 AI 결과를 task, calendar, note로 반영한다. |

SemesterOps는 이 문제를 **학기 workspace 운영 문제**로 정의한다.

## 제품 테제

**SemesterOps는 사용자의 컴퓨터에 학기 작업환경을 만들고 그 위에 GUI와 AI 에이전트를 얹는 앱이다.**

SemesterOps의 핵심은 파일 관리 자체가 아니라 agentic operation이다. 사용자가 GUI에서 시간표를 수정하면 로컬 파일이 바뀌고, 사용자가 강의자료를 업로드하면 학기 작업환경에 저장되며, AI가 일정이나 과제 위험을 발견하면 승인 후 task, calendar, note, course index가 갱신된다.

제품의 중심은 클라우드 DB가 아니라 사용자 컴퓨터에 만들어지는 학기 작업환경이다.

## 핵심 원칙

| 원칙 | 의미 | 제품에서의 표현 |
| --- | --- | --- |
| 학기 자료는 사용자 컴퓨터에 남는다 | 앱의 핵심 상태는 사용자 컴퓨터에 남아야 한다. | 앱을 지워도 학기 자료, 일정, 노트, task, 작업 이력은 의미 있게 보존된다. |
| 웹앱 조작은 실제 작업환경을 바꾼다 | UI 조작은 임시 상태가 아니라 실제 파일 변경으로 이어진다. | 시간표 편집, 자료 업로드, task 완료, 일정 수정은 workspace 파일을 갱신한다. |
| AI 상호작용은 학기 상태로 남는다 | AI 답변은 채팅창에만 남지 않는다. | 승인된 study plan, task, calendar event, course note, 준비물 체크리스트가 실제 파일로 반영된다. |
| 사용자가 가진 에이전트 런타임을 쓴다 | SemesterOps는 모델 접근을 판매하지 않는다. | MVP는 사용자의 로컬 Codex 환경과 ChatGPT/Codex subscription을 사용한다. |
| 장기적으로 런타임 중립성을 확보한다 | 특정 agent runtime에 제품 전체를 묶지 않는다. | MVP는 Codex app-server에 집중하되, Claude Code와 오픈소스 런타임 어댑터 경계를 둔다. |
| 기본 업무 흐름은 Skill로 제공한다 | 하드코딩된 프롬프트 대신 agent가 읽는 매뉴얼을 제공한다. | built-in Skills가 학업 운영 workflow, 승인 지점, 산출물 형식을 안내한다. |
| 학업 윤리를 제품 원칙으로 둔다 | 과제 정답 대행이 아니라 학업 운영을 보조한다. | 일정 운영, 자료 정리, 마감 관리, 시험 준비 계획 생성에 집중한다. |

## 제품 포지셔닝

> SemesterOps는 사용자의 컴퓨터에 학기 작업환경을 만들고, 시간표·자료·과제·시험 준비를 AI와 함께 운영하는 로컬 우선 학업 에이전트 앱이다.

## 대상 사용자

| 사용자군 | 겪는 문제 | 기대하는 경험 |
| --- | --- | --- |
| 학기 일정관리에 어려움을 겪는 대학생 | 여러 과목의 수업, 과제, 시험, 보강, 출석 정보를 한눈에 관리하기 어렵다. | 캘린더에 직접 옮기지 않아도 이번 주 해야 할 일이 정리된다. |
| 강의자료와 과제 파일이 계속 쌓이는 학생 | PDF, PPT, 과제 안내, 마감 정보, 시험 범위 메모가 과목별로 쌓인다. | 자료를 업로드하면 과목, 주차, 과제, 시험과 연결된다. |
| AI를 학업 관리에 쓰고 싶지만 정리가 어려운 학생 | AI 답변을 실제 일정이나 계획으로 옮기는 과정이 번거롭다. | AI와 대화한 결과가 task, calendar, study plan으로 남는다. |

## 사용자 경험

### MVP 앱 시작

```bash
npx semesterops
```

시작하면:

- 로컬 companion 서버가 뜬다.
- 브라우저에서 `http://localhost:<port>` GUI가 열린다.
- 선택한 위치에 학기 작업환경이 생성되거나 기존 상태를 읽는다.
- Codex app-server adapter가 사용자의 로컬 Codex 환경을 통해 준비된다.

MVP는 npm 기반 로컬 웹앱으로 배포한다. 중장기적으로는 설치형 데스크톱 앱으로 제공하며, 첫 지원 대상은 macOS로 잡는다. 데스크톱 앱에서도 원칙은 같다. 사용자의 학기 자료와 장기기억은 사용자 컴퓨터에 남고, 앱은 그 위에 GUI와 agent harness를 제공한다.

### 기본 화면

| 화면 | 보여주는 정보 | 사용자가 하는 일 |
| --- | --- | --- |
| 학기 대시보드 | 이번 주 수업, 과제, 시험, 위험 일정 | 오늘/이번 주 우선순위를 확인한다. |
| 시간표 | 수업 시간, 강의실, 보강/휴강 후보 | 수업 시간을 GUI로 편집한다. |
| 과목별 홈 | 자료, 과제, 시험 범위, 최근 AI 작업 | 과목 자료를 업로드하고 상태를 확인한다. |
| Task board | 과제, 복습, 마감 준비, 확인 필요 항목 | task 완료/보류/승인을 처리한다. |
| Calendar view | 수업, 시험, 마감, AI가 제안한 공부 블록 | 일정과 공부 계획을 조정한다. |
| Agent timeline | AI가 읽은 자료, 생성한 일정/task 후보, 승인 요청 | 에이전트 작업을 추적하고 승인한다. |

## Workspace 모델

사용자에게는 "학기 작업환경"으로 보이지만, 내부적으로는 다음과 같은 로컬 파일 구조를 만든다.

```text
semester-folder/
  semester-overview.md
  notes.md
  courses/
    course-001/
      overview.md
      syllabus.pdf
      materials/
      deadlines/
      exams/
    course-002/
      overview.md
      materials/
  .semesterops/
    semester.json
    course-index.json
    tasks.json
    calendar.ics
    memory.sqlite
    events.jsonl
    skills/
    runs/
      run_<id>/
        prompt.md
        events.jsonl
        outputs/
  .agents/
    skills/
      semesterops-*/
```

사용자가 직접 이 구조를 만들 필요는 없다. 앱이 새 학기 작업환경을 스캐폴딩하고, 사용자가 웹앱에서 자료를 업로드하면 적절한 위치에 저장한다. 이미 가지고 있는 자료 폴더가 있으면 가져오기 흐름으로 연결하되, 기존 파일을 강제로 재배치하지 않는다. 정리 작업은 사용자 승인 후 수행한다.

## Source of Truth 전략

SemesterOps는 Markdown만 파싱해서 모든 상태를 관리하지 않는다. 사람이 읽는 파일과 앱이 안정적으로 조작하는 파일을 나눈다.

| 정보 범주 | 저장 위치 | 주 사용자 | 역할 |
| --- | --- | --- | --- |
| 사람이 읽는 학기 문서 | `semester-overview.md`, `notes.md`, 과목별 Markdown 문서 | 학생 | 학기 상태를 사람이 읽기 좋은 형태로 보여준다. |
| 구조화된 학기 상태 | `.semesterops/semester.json` | 앱, 에이전트 | 학기, 과목, 시간표, 기본 설정의 기준 데이터다. |
| 자료 색인 | `.semesterops/course-index.json` | 앱, 에이전트 | 업로드 자료와 과목/주차/자료 유형 연결을 저장한다. |
| Task 상태 | `.semesterops/tasks.json` | 앱, 에이전트 | 과제, 복습, 시험 준비, 확인 필요 항목을 관리한다. |
| 캘린더 연동 | `.semesterops/calendar.ics` | 캘린더 앱, 학생 | 수업, 시험, 마감, 공부 블록을 외부 캘린더로 내보낸다. |
| 장기기억 | `.semesterops/memory.sqlite` 또는 `memory.md` | 에이전트 | 사용자 선호, 반복 실수, 과목별 운영 규칙을 저장한다. |
| 작업 이력 | `.semesterops/events.jsonl`, `.semesterops/runs/*` | 앱, 에이전트, 학생 | AI 작업, 승인, 생성된 계획, 변경 이력을 남긴다. |

Markdown은 사람이 읽고 변경 내역을 확인할 수 있는 문서다. JSON/SQLite는 앱이 안정적으로 업데이트하는 운영 상태다.

## 배포 전략

MVP는 빠른 제품 확인을 위해 npm 기반 로컬 웹앱으로 시작한다.

```bash
npx semesterops
```

| 단계 | 배포 형태 | 사용자 경험 | 목적 |
| --- | --- | --- | --- |
| MVP | npm 기반 로컬 웹앱 | 시작 명령 후 브라우저에서 새 학기 작업환경을 만들고 자료를 업로드한다. | 초기 오픈소스 배포와 빠른 반복 개발 |
| 중장기 | macOS 데스크톱 앱 | 앱을 열어 학기 작업환경을 만들고, 자료를 드래그앤드롭하고, AI 에이전트와 상호작용한다. | 일반 대학생도 터미널 없이 사용할 수 있는 제품 경험 |
| 이후 | Windows 등 추가 플랫폼 | 동일한 local-first 경험을 다른 OS로 확장한다. | 사용자 기반 확장 |

## Runtime 전략

Codex runtime 격리, 설치, 상태 분리의 세부 정책은 [Codex Runtime Isolation Technical Note](./codex-runtime-isolation-note.md)를 따른다.

| 단계 | Runtime | 인증/구독 | SemesterOps 역할 | 비고 |
| --- | --- | --- | --- | --- |
| MVP | Codex app-server | 사용자의 로컬 Codex 환경과 ChatGPT/Codex subscription | `codex app-server`를 stdio transport로 실행하고 local companion 서버가 bridge 역할을 한다. | 폴더 기반 workspace, 승인 흐름, 파일 반영, 장기 작업 이력과 잘 맞는다. |
| Later | Claude Code adapter | 사용자의 Anthropic Claude Code subscription 또는 로컬 Claude Code 환경 | 같은 workspace와 UI 위에서 Claude Code runtime을 선택 가능하게 한다. | Codex 전용 제품으로 잠기지 않기 위한 확장 경로다. |
| Future | Open-source local runtime | Ollama, LM Studio, vLLM 등 사용자 환경 | experimental runtime으로 연결한다. | 에이전트 작업 품질과 로컬 도구 연동 품질 차이를 명확히 표시한다. |

브라우저 UI는 runtime에 직접 연결하지 않는다. app-server 이벤트와 각 runtime의 이벤트는 SemesterOps의 제품 이벤트로 정규화한다.

## Runtime Adapter 초안

```ts
interface AgentRuntime {
  initialize(workspace: SemesterWorkspace): Promise<void>
  startThread(options: StartThreadOptions): Promise<ThreadRef>
  startTurn(threadId: string, input: AgentInput): AsyncIterable<AgentEvent>
  steerTurn(threadId: string, input: AgentInput): Promise<void>
  interruptTurn(threadId: string): Promise<void>
}
```

SemesterOps 내부 제품 이벤트:

| 이벤트 | 의미 |
| --- | --- |
| `agent.started` | 에이전트 작업이 시작됐다. |
| `agent.message.delta` | 에이전트 응답이 스트리밍되고 있다. |
| `file.changed` | 로컬 학기 작업환경의 파일 변경이 발생했다. |
| `approval.requested` | 사용자 승인 필요한 행동이 감지됐다. |
| `material.uploaded` | 사용자가 과목 자료를 업로드했다. |
| `schedule.updated` | 시간표나 일정 후보가 갱신됐다. |
| `task.extracted` | 자료나 대화에서 task 후보가 추출됐다. |
| `calendar.updated` | 일정 또는 캘린더 파일이 갱신됐다. |
| `plan.created` | study packet, 준비물 체크리스트, 주간 브리핑 같은 학기 운영 문서가 생성됐다. |
| `agent.completed` | 에이전트 작업이 완료됐다. |
| `agent.failed` | 에이전트 작업이 실패했다. |

## Built-in Skills 전략

SemesterOps는 기본 workflow를 built-in Skills로 제공한다. 이 Skills는 "에이전트가 학기 workspace에서 어떻게 행동해야 하는지"를 알려주는 매뉴얼이다. 앱 서버가 모든 절차를 코드로 강제하지 않고, Codex가 상황에 맞게 Skill을 읽고 workspace를 탐색하도록 한다.

역할 분리는 다음과 같다.

| 구성 요소 | 책임 |
| --- | --- |
| Built-in Skills | 학기 운영 workflow, 읽을 파일, 산출물 형식, 승인 지점을 설명한다. |
| Local companion | 파일 읽기/쓰기, 업로드 저장, 구조화 상태 갱신, Codex app-server bridge, 변경 미리보기/승인 UX를 제공한다. |
| Codex runtime | Skill을 읽고 자료를 탐색하며 일정/task 후보, 학습 계획, 변경 제안을 생성한다. |
| GUI | 사용자가 결과, 변경 미리보기, 승인 요청, task/calendar 변화를 이해하고 조작하는 화면이다. |

### Skill 배포 방식

npm 패키지는 SemesterOps 기본 Skill들을 함께 포함한다.

초기 시작 시:

| 단계 | 동작 | 목적 |
| --- | --- | --- |
| 1 | 패키지 내부의 built-in Skill들을 `.semesterops/skills/`에 버전과 함께 기록한다. | 앱이 제공하는 기본 매뉴얼을 로컬에 남긴다. |
| 2 | Codex adapter는 Codex가 발견할 수 있도록 `.agents/skills/semesterops-*`에 Skill projection을 만든다. | Codex가 학기 운영 매뉴얼을 읽을 수 있게 한다. |
| 3 | projection은 package-managed 영역임을 명시하고, 사용자 작성 Skill을 덮어쓰지 않는다. | 앱 기본 Skill과 사용자 커스텀 Skill을 분리한다. |
| 4 | 사용자나 과목별 커스텀 Skill은 별도 이름으로 추가할 수 있다. | 고급 사용자와 과목별 예외를 수용한다. |

이 방식은 built-in manual을 로컬 workspace에 남기므로, 사용자가 원하면 Skill 내용과 변경 내역을 확인할 수 있다.

### MVP built-in Skills 후보

| Skill | 트리거 | 주요 산출물 | 승인 지점 |
| --- | --- | --- | --- |
| `semesterops-onboarding` | 새 학기 작업환경 생성 또는 기존 자료 가져오기 | `semester.json`, `course-index.json`, `tasks.json` 초안 | 과목명, 시간표, 주요 일정 확정 |
| `course-material-indexer` | PDF/PPTX/Markdown/이미지 파일 업로드 | 자료 분류, 주차 후보, 과제/시험 범위 후보 | 자료 분류와 연결 task 반영 |
| `schedule-reconciler` | 일정 후보 추출 또는 일정 충돌 감지 | 시간표/시험/마감/출석 충돌 리포트 | 충돌 해결안 반영 |
| `weekly-risk-brief` | 주간 브리핑 요청 | 이번 주 위험 일정, 준비물, 우선순위 | task 우선순위와 일정 반영 |
| `study-packet-builder` | 특정 시험/과목의 시험 대비 요청 | `study-plan.md`, `review-checklist.md`, 부족 자료 목록 | 학습 계획과 공부 블록 반영 |
| `memory-curator` | 반복 선호/실수/규칙 감지 | 장기기억 후보 | memory 저장 |
| `workspace-maintainer` | 자료 정리 요청 또는 중복/혼란 감지 | 정리 계획, 파일 이동/이름 변경 후보 | 파일 이동, 이름 변경, 중복 제거 |

### Skill 품질 원칙

| 원칙 | 설명 |
| --- | --- |
| 단일 workflow 집중 | Skill은 한 가지 학업 운영 workflow에 집중한다. |
| 입력/산출물 명시 | 어떤 파일을 먼저 읽을지, 어떤 산출물을 만들지 명시한다. |
| 승인 지점 명시 | 파일 변경, 일정 반영, 메모리 저장 등 사용자 확인이 필요한 행동을 구분한다. |
| helper script는 상태 정리용 | deterministic하게 처리할 수 있는 파싱, 변환, 스키마 확인을 담당한다. |
| evidence 보존 | Skill 결과는 `.semesterops/runs/`에 근거와 함께 남긴다. |

## 핵심 사용자 플로우

| 플로우 | 사용자 입력 | 앱/에이전트 행동 | 로컬 상태 변화 | 승인 지점 |
| --- | --- | --- | --- | --- |
| 새 학기 작업환경 만들기 | "새 학기 만들기", 시간표, 강의계획서, 공지, 기존 자료 | 과목 후보, 일정 후보, 과제 후보를 추출한다. | `.semesterops/semester.json`, `course-index.json`, `tasks.json` 초안 생성 | 과목명, 학점, 시간표, 주요 일정 확정 |
| 시간표 GUI 편집 | 웹앱에서 수업 시간 수정 | 시간표 변경을 구조화 상태와 캘린더에 반영한다. | `semester.json`, `calendar.ics`, `events.jsonl` 갱신 | 요약 문서 갱신 여부 |
| 강의자료 업로드 | 과목 홈에 PDF/PPTX/이미지/문서 파일 업로드 | 파일을 저장하고 과목, 주차, 자료 종류, task 후보를 추출한다. | 과목 폴더, `course-index.json`, 필요 시 `tasks.json` 갱신 | 자료 분류와 task 반영 |
| 이번 주 위험 일정 브리핑 | "이번 주 뭐가 위험해?" 요청 | 시험, 과제, 출석 필요일, 준비물, 자료 누락을 정리한다. | 주간 계획, task 우선순위 후보 생성 | task/calendar 반영 |
| 시험 대비 study packet 생성 | 과목 또는 시험 선택 | 시험 범위, 강의자료, 요약, 예상문제, 학습 앱 상태를 확인한다. | `study-plan.md`, `study-tasks.md`, `.semesterops/runs/*` 생성 | 공부 블록과 계획 반영 |

## MVP 범위

| 범위 | 항목 | 설명 |
| --- | --- | --- |
| 포함 | MVP 한정 `npx semesterops`로 로컬 웹앱 시작 | 초기 오픈소스 확인용 시작 방식 |
| 포함 | 새 학기 작업환경 생성 | 사용자가 직접 폴더 구조를 만들지 않아도 시작 가능 |
| 포함 | 기존 자료 폴더 가져오기 | 이미 가진 자료를 새 작업환경과 연결 |
| 포함 | 과목/시간표/기본 task 구조화 | 학기 운영의 기본 상태 생성 |
| 포함 | GUI 기반 시간표 편집과 로컬 파일 반영 | 웹앱 조작이 실제 작업환경에 반영됨 |
| 포함 | 과목별 파일 업로드와 로컬 저장 | 자료 업로드를 과목 폴더와 색인에 반영 |
| 포함 | `.semesterops/` 상태 파일 생성 | 구조화 상태, 캘린더, 작업 이력 저장 |
| 포함 | built-in SemesterOps Skills 설치 또는 projection | 에이전트가 읽을 학업 운영 매뉴얼 제공 |
| 포함 | Codex app-server adapter | MVP agent runtime |
| 포함 | agent event timeline | AI 작업 흐름과 승인 요청 표시 |
| 포함 | AI 기반 일정/task 추출 초안 | 사용자가 승인하기 전 후보로 제시 |
| 포함 | 사용자 승인 후 task/calendar/note 반영 | AI 제안이 실제 학기 상태로 남음 |
| 포함 | 주간 위험 브리핑 | 이번 주 우선순위와 누락 위험 정리 |
| 포함 | 한 과목에 대한 study packet 생성 | MVP wow moment 후보 |
| 제외 | 클라우드 계정/동기화 | local-first MVP 범위 밖 |
| 제외 | 멀티 사용자 협업 | 개인 학기 관리에 집중 |
| 제외 | LMS 로그인 자동화 | 보안/정책 리스크 때문에 제외 |
| 제외 | 외부 캘린더 자동 업로드 | MVP는 `calendar.ics` 생성까지만 |
| 제외 | 코딩/실습 과제 해결 또는 실행 검수 | 한 학기 일정관리 MVP 이후 확장 후보 |
| 제외 | 과제 정답 대행 | 학업 윤리상 제외 |
| 제외 | 자동 제출 | 사용자 최종 확인을 유지 |
| 제외 | 모든 대학/학과 포맷의 완전 자동 인식 | 초기에는 가져오기/수정 가능한 초안 제공 |

## MVP 이후 확장 후보

| 후보 | 현재 범위에서 제외하는 이유 | 다시 검토할 조건 |
| --- | --- | --- |
| 코딩/실습 과제 실행 검수 | 특정 전공과 과목에 강하게 의존하며, MVP의 한 학기 일정관리 메시지를 흐릴 수 있다. | 일정관리 MVP가 안정되고, 과제 유형별 안전 정책과 승인 UX가 정리된 뒤 검토한다. |
| 과제 제출 패키지 점검 | 파일명, 누락 파일, 제출 조건 확인은 유용하지만 자동 제출/정답 생성으로 오해될 수 있다. | 학업 윤리 정책과 학교별 제출 규칙을 명확히 분리할 수 있을 때 검토한다. |
| 전공별 특화 Skill | 과목별 차이가 커서 초기 제품 복잡도가 높아진다. | 일반 학기 운영 Skill이 충분히 쓰인 뒤 선택형 확장으로 제공한다. |

## 보안과 프라이버시

- 기본 상태와 장기기억은 사용자 디바이스의 학기 작업환경에 저장한다.
- 브라우저 UI는 localhost에서만 접근한다.
- 브라우저가 직접 파일시스템이나 Codex app-server에 접근하지 않고, local companion 서버가 중재한다.
- 외부로 나가는 행동, 파일 대량 수정, 삭제, 외부 공유나 연동은 승인 지점으로 분리한다.
- AI가 변경한 파일은 변경 미리보기로 확인 가능해야 한다.

## Academic Integrity

SemesterOps는 학습과 운영을 보조하는 도구다.

| 구분 | 행동 | 정책 |
| --- | --- | --- |
| 허용 | 강의자료 정리 | 자료를 과목/주차/task와 연결한다. |
| 허용 | 일정과 마감 추출 | 사용자가 확인한 뒤 calendar/task에 반영한다. |
| 허용 | 시험 범위 기반 학습 계획 | study packet과 공부 블록을 만든다. |
| 허용 | 과제 마감 준비 정리 | 준비물, 마감일, 참고 자료를 task로 정리한다. |
| 허용 | 자료 누락 확인 | 시험이나 과제 준비에 필요한 자료가 빠졌는지 알려준다. |
| MVP 이후 검토 | 코딩/실습 과제 실행 검수 | 일정관리 MVP 이후 별도 안전 정책과 함께 검토한다. |
| 제한 | 과제 정답 생성 | 제품 목적 밖으로 둔다. |
| 제한 | 시험 답안 대행 | 학업 윤리상 금지한다. |
| 제한 | 자동 제출 | 사용자가 최종 제출을 직접 수행한다. |
| 제한 | 학교 정책을 우회하는 자동화 | LMS/학교 시스템 우회 자동화는 지원하지 않는다. |

## 성공 지표

초기 오픈소스 MVP 기준:

| 지표 | 의미 |
| --- | --- |
| 첫 시작 후 학기 작업환경 생성 성공률 | 사용자가 막히지 않고 첫 workspace를 만들 수 있는가 |
| 과목/시간표 초안 정확도 | 사용자가 수동 수정 없이 쓸 수 있는 초기 구조를 만들었는가 |
| 업로드 자료 연결 비율 | 자료가 올바른 과목/주차/task로 연결되는가 |
| 주간 브리핑 task 채택률 | 브리핑이 실제 행동으로 이어지는가 |
| AI 제안의 파일 반영률 | AI 상호작용이 실제 학기 상태 변화로 이어지는가 |
| workspace 재방문 빈도 | 한 학기 동안 계속 쓰이는가 |

## 리스크

| 리스크 | 왜 문제인가 | 대응 |
| --- | --- | --- |
| 단순 캘린더 앱처럼 보일 위험 | 일정 UI만 보이면 Codex runtime의 이유가 약해진다. | workspace operation, 자료 상태, AI 작업 이력, 파일 반영을 전면에 둔다. |
| Codex GUI wrapper로 보일 위험 | Codex를 단순히 웹으로 보여주는 앱처럼 보일 수 있다. | app-server event를 학기 도메인 이벤트와 파일 상태 변화로 정규화한다. |
| Markdown 파싱 취약성 | 사람이 읽는 문서를 앱 상태로만 쓰면 안정성이 떨어진다. | 구조화 상태는 JSON/SQLite에 저장하고, Markdown은 사람이 읽는 projection으로 둔다. |
| 런타임 추상화 과설계 | 여러 runtime을 처음부터 추상화하면 MVP가 느려진다. | MVP는 Codex adapter만 깊게 구현하고, adapter interface는 최소화한다. |
| Skill drift | built-in Skill과 사용자 커스텀 Skill이 섞이면 예측 가능성이 낮아진다. | built-in Skills에 버전과 changelog를 두고, package-managed projection과 사용자 커스텀 Skill을 분리한다. |
| 학업 윤리 리스크 | 정답 대행 도구로 오해받을 수 있다. | 일정 운영, 자료 정리, 마감 관리, 시험 준비 계획에 집중한다. |
| 로컬 앱 설치 장벽 | npm 기반 시작은 일반 학생에게 부담이 될 수 있다. | MVP는 npm one-command로 시작하되, 중장기적으로 macOS 데스크톱 앱에서 터미널 없이 시작하게 한다. |

## 열린 질문

| 질문 | 결정이 필요한 이유 |
| --- | --- |
| `.semesterops/`의 최소 상태 파일은 어디까지 필요한가? | 초기 구현 범위와 마이그레이션 부담을 결정한다. |
| 기존 자료 폴더를 어느 정도까지 자동 재구성해야 하는가? | 사용자의 기존 파일을 존중하면서도 앱 경험을 깔끔하게 만들어야 한다. |
| Markdown projection을 자동 갱신할 때 사용자 변경 미리보기를 항상 요구할 것인가? | 자동화 편의성과 사용자의 파일 통제감 사이의 균형이다. |
| Codex app-server approval 이벤트를 SemesterOps 승인 UX와 어떻게 맞출 것인가? | 에이전트 승인과 앱 승인 경험이 중복되거나 충돌할 수 있다. |
| 주간 위험 브리핑과 시험 대비 study packet 사이에서 MVP의 첫 wow moment를 어디에 둘 것인가? | 데모와 초기 사용자 가치를 어디에 집중할지 결정한다. |
| 오픈소스 프로젝트명은 `SemesterOps`로 확정할 것인가? | 문서, 패키지명, 브랜딩의 기준이 된다. |
| built-in Skills를 `.agents/skills/`에 projection할지, Codex 작업용 임시 workspace에만 주입할지 결정해야 하는가? | 사용자가 볼 수 있는 로컬 매뉴얼과 runtime 격리 방식의 선택이다. |
