# SemesterOps Review Workspace Scenario

작성일: 2026-07-08
상태: Draft
관련 문서: [SemesterOps Product Brief](semesterops-product-brief.md), [ADR 0002](../adr/0002-use-first-class-academic-objects-with-derived-operational-views.md)

## 목적

이 문서는 오늘 캠프 산출물인 기획서 보강과 순수 HTML/CSS prototype을 위해, SemesterOps MVP의 첫 사용자 시나리오와 화면 구조를 정리한다. 핵심 방향은 **검토 중심 학업 워크스페이스**다.

SemesterOps의 첫 prototype은 대시보드가 아니라 검토 중심 작업공간이어야 한다. 학생이 이해해야 할 한 문장은 다음과 같다.

> SemesterOps가 과제나 시험 같은 학업 객체를 찾고, 사용자가 한 번 확인하면, 타임라인과 할 일 표면은 그 확정 상태에서 생성된다.

## 대표 시나리오

| 항목 | 내용 |
| --- | --- |
| 과목 | 문제해결글쓰기 |
| 자료 | LMS 공지 또는 복사한 과제 안내 텍스트 |
| 발견한 학업 객체 | 과제: 개요 작성하기 |
| 발견한 마감 | 2026-07-12 23:59 KST |
| 불확실한 정보 | 제출 방식, 상세 요구사항, 주의사항, 평가 반영 여부 |
| Agent 제안 | 과제 생성, 근거 연결, 추천 할 일 제안 |
| 사용자 결정 | 변경 제안을 수락/수정/거절 |
| 승인 후 결과 | 과제가 확정 상태가 되고 타임라인 항목, 추천 할 일/내 할 일 표면, 읽기용 정리 문서가 갱신됨 |

## 사용자 흐름

| 단계 | 사용자 관점 | 앱/Agent 관점 | 화면에서 보여줄 신호 |
| --- | --- | --- | --- |
| 1. SourceSelection | 학생이 처리할 자료를 고른다. | 자료를 ModelingRun 입력으로 준비한다. | 선택된 자료, 실행 상태 |
| 2. AgentModeling | 학생이 자료 해석을 요청한다. | Agent가 과제 후보와 field-level evidence를 만든다. | 검토 대기 변경 제안 |
| 3. Review | 학생이 과제 정보를 확인한다. | ReviewState에 과제, 추천 할 일, 불확실한 정보가 표시된다. | 수락/수정/거절 |
| 4. UserConfirmation | 학생이 추천안을 승인하거나 수정한다. | 변경 제안을 확정 상태에 반영한다. | 확정 badge |
| 5. Timeline/Task View | 학생이 일정과 할 일 표면을 확인한다. | 타임라인 항목과 내 할 일/추천 할 일 view를 canonical state에서 파생한다. | 자동 표시/read-only label |
| 6. MarkdownProjection | 학생이 사람이 읽는 문서를 본다. | `semester-overview.md`, course overview, review queue를 렌더링한다. | 읽기용 정리 문서 label |

## 화면 구조

Prototype은 여러 페이지가 아니라 **하나의 main screen + 두 상태**로 만든다.

| 상태 | 목적 | 표시 |
| --- | --- | --- |
| 검토 대기 | Agent가 찾은 과제를 사용자가 확인하기 전 | 변경 제안, 근거 연결, 타임라인 미리보기, 추천 할 일 |
| 수락 후 | 사용자 확인 이후 반영 결과 확인 | 확정된 과제, 자동 표시된 타임라인 항목, 내 할 일, 갱신된 읽기용 정리 문서 |

### Layout

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ 상단: SemesterOps · 2026 여름학기 · 로컬 워크스페이스 · 실행 상태          │
├───────────────┬──────────────────────────────────────┬────────────────────┤
│ 왼쪽 영역     │ 학업 객체 캔버스                      │ 오른쪽 검토 영역   │
│               │                                      │                    │
│ 과목          │ 검토 대기/확정 과제 카드              │ 검토 목록          │
│ 자료          │ “개요 작성하기”                       │ 변경 제안 카드     │
│ 자료 해석 실행│ 마감은 과제 정보에서 관리됨           │ 근거 연결 미리보기 │
│               │                                      │ 수락/수정/거절     │
├───────────────┴──────────────────────────────────────┴────────────────────┤
│ 하단 운영 영역: 타임라인 항목 · 추천 할 일/내 할 일 · 읽기용 정리 문서     │
└────────────────────────────────────────────────────────────────────────────┘
```

## Panel Contract

| 영역 | 역할 | 핵심 문구 |
| --- | --- | --- |
| 상단 | 앱과 workspace 상태를 보여준다. | `SemesterOps · 2026 여름학기 · 로컬 워크스페이스` |
| 왼쪽 영역 | source-grounded modeling의 출발점을 보여준다. | `선택한 자료 1개`, `변경 제안 1개 준비됨` |
| 학업 객체 캔버스 | 과제가 first-class academic object임을 보여준다. | `개요 작성하기`, `마감은 과제 정보에서 관리돼요` |
| 오른쪽 검토 영역 | Agent proposal을 사용자가 trusted state로 바꾸는 표면이다. | `추천: 과제 만들기`, `수락/수정/거절` |
| 근거 연결 패널 | source highlight를 field path에 연결한다. | `"7월 12일 23:59까지" -> 마감` |
| 타임라인 카드 | 과제 마감에서 파생된 read model을 보여준다. | `과제 마감에서 자동 표시`, `과제에서 수정` |
| 할 일 카드 | 추천 할 일과 내 할 일의 차이를 보여준다. | `과제 마감을 따라감`, `내 할 일로 추가` |
| 정리 문서 카드 | Markdown은 읽는 artifact이지 source of truth가 아님을 보여준다. | `읽기용 정리 문서 · 상태 기준 아님` |
| ChatSidecar | 같은 ReviewState를 두고 Agent와 대화할 수 있음을 보여준다. | `왜 이걸 과제로 분류했나요?` |

## Canonical vs Derived

| UI 요소 | 분류 | 사용자가 수정할 때 |
| --- | --- | --- |
| 과제 | First-class academic object | 과제 field를 바꾸는 변경 제안 생성 |
| 과제 마감 | Canonical academic fact | 과제의 마감 수정 |
| 근거 연결 | Field-level evidence | correction 또는 uncertainty 해소 |
| 타임라인 항목 | Derived read model | source object인 과제 또는 시험으로 이동 |
| 추천 할 일 | Review-time proposal | accept하면 내 할 일 생성, reject하면 queue에서 제거 |
| 내 할 일 | Trusted operational action | task status, planned work time, reminder 수정 |
| 연결된 할 일의 마감 | Referenced academic fact | 직접 수정하지 않고 과제/시험 마감을 따른다 |
| 읽기용 정리 문서 | Artifact | source state를 고친 뒤 재생성 |

## Prototype Copy

기술적인 domain term은 prototype 설명 chip에는 쓸 수 있지만, 학생-facing copy는 더 부드럽게 쓴다.

| 내부 용어 | UI alias | 학생-facing 문구 |
| --- | --- | --- |
| `Assignment` | 과제 | `개요 작성하기 과제` |
| `Exam` | 시험 | `중간고사 시험` |
| `TaskCandidate` | 추천 할 일 | `개요 초안 작성하기` |
| `StudentTask` | 내 할 일 | `내 할 일로 추가` |
| `TimelineEntry` | 타임라인 항목 | `과제 마감에서 자동 표시` |
| `ScheduleEvent` | 별도 일정 | `보강 수업`, `휴강` |
| `StatePatch` | 변경 제안 | `변경 제안 1개 준비됨` |
| `EvidenceRef` | 근거 연결 | `"7월 12일 23:59까지" -> 마감` |
| `Review-first Academic Workspace` | 검토 중심 학업 워크스페이스 | `검토 중심 학업 워크스페이스` |
| `Assignment.dueAt` | 과제 마감 | `마감은 과제 정보에서 관리돼요` |
| `deadlineRef` | 마감 참조 | `과제 마감을 따라감` |
| `MarkdownProjection` | 읽기용 정리 문서 | `읽기용 정리 문서` |

## Prototype Scope

| 포함 | 이유 |
| --- | --- |
| 3-column review workspace | Source, academic object, Review를 한 화면에서 보여준다. |
| 검토 대기/수락 후 toggle | UserConfirmation 이후 propagation을 정적으로 보여준다. |
| 과제 hero card | 오늘 대표 객체를 명확히 한다. |
| 검토 목록 + 변경 제안 card | Agent 제안과 사용자 확인 경계를 보여준다. |
| 근거 연결 field mapping | trust model을 시각적으로 보여준다. |
| 타임라인/할 일/정리 문서 strip | operational view가 canonical state에서 파생됨을 보여준다. |
| 작은 ChatSidecar | CoControl을 암시하되 chatbot으로 보이지 않게 한다. |

| 제외 | 이유 |
| --- | --- |
| 전체 월/주 calendar view | calendar app처럼 보일 위험이 있다. |
| drag-and-drop 마감 수정 | canonical owner를 우회할 수 있어 today scope에 맞지 않는다. |
| 전체 task manager | 추천 할 일 -> 내 할 일만 증명하면 충분하다. |
| 시험 detail screen | 첫 prototype은 과제 flow를 선명하게 보여준다. |
| 별도 일정 생성 UI | "개요 작성하기" 시나리오에는 필요 없다. |
| Markdown editor | 읽기용 정리 문서는 source of truth가 아니다. |
| 전체 ChatSidecar conversation | 오늘은 contextual note와 suggested prompt면 충분하다. |
| WorkspaceHistory UI | 중요한 후속 기능이지만 prototype 핵심이 아니다. |
| LMS login/import flow | 자료 intake와 modeling을 흐린다. |
| 외부 calendar sync | MVP 제외 범위다. |
| 자동 제출 또는 과제 정답 생성 | 제품 방향과 Academic Integrity에 맞지 않는다. |

## Prototype Artifact

예정 위치:

```text
spikes/semesterops-ui-prototype/index.html
```

이 prototype은 throwaway artifact다. 기획서에는 링크와 스크린샷 또는 간단한 설명만 연결하고, 실제 제품 구현의 컴포넌트 구조로 간주하지 않는다.

예시 목업 이미지:

```text
spikes/semesterops-ui-prototype/assets/review-workspace-mockup.png
```

이 이미지는 최종 UI가 아니라 prototype과 기획서를 설명하기 위한 보조 asset이다. 정확한 상호작용과 문구는 HTML/CSS prototype에서 보장한다.

## 남은 질문

| 질문 | 다음 단계 |
| --- | --- |
| Exam detail은 Assignment pattern을 얼마나 공유할 것인가? | Assignment prototype 이후 별도 scenario로 검토 |
| StudentTask를 MVP에서 trusted entity로 저장할 것인가, 아니면 TaskCandidate acceptance만 기록할 것인가? | DB schema PRD에서 결정 |
| TimelineEntry를 SQLite view로 둘지 materialized cache로 둘지 | implementation PRD에서 결정 |
| EvidenceRef locator를 quote 중심으로 시작할지 page/range까지 둘지 | parser/script scope와 함께 결정 |
