# AY-PLE Review Workspace Scenario

작성일: 2026-07-08
상태: Draft
관련 문서: [AY-PLE Product Brief](ay-ple-product-brief.md), [ADR 0002](../adr/0002-use-first-class-academic-objects-with-derived-operational-views.md)

## 목적

이 문서는 오늘 캠프 산출물인 기획서 보강과 순수 HTML/CSS prototype을 위해, AY-PLE MVP의 첫 사용자 시나리오와 화면 구조를 정리한다. 핵심 방향은 **검토 중심 학업 워크스페이스**다.

AY-PLE의 첫 prototype은 대시보드가 아니라 검토 중심 작업공간이어야 한다. 학생이 이해해야 할 한 문장은 다음과 같다.

> AY-PLE가 선택한 원본 자료에서 과제 같은 학업 객체 후보를 찾고, 사용자가 확인하면 그 과제 정보가 학기 상태에 반영된다.

## 대표 시나리오

| 항목 | 내용 |
| --- | --- |
| 과목 | 문제해결글쓰기 |
| 자료 | LMS 공지 또는 복사한 과제 안내 텍스트 |
| 발견한 학업 객체 | 과제: 개요 작성하기 |
| 발견한 마감 | 2026-07-12 23:59 KST |
| 불확실한 정보 | 제출 방식, 상세 요구사항, 주의사항, 평가 반영 여부 |
| AY 제안 | 과제 생성, 마감 저장, 근거 연결 |
| 사용자 결정 | 변경 제안을 수락/수정/거절 |
| 승인 후 결과 | 과제가 반영되고 AY가 저장된 과제명과 마감을 사용자에게 알려줌 |

## 사용자 흐름

| 단계 | 사용자 관점 | 앱/AY 관점 | 화면에서 보여줄 신호 |
| --- | --- | --- | --- |
| 1. SourceSelection | 학생이 처리할 자료를 고른다. | 자료를 ModelingRun 입력으로 준비한다. | 선택된 자료, 실행 상태 |
| 2. AgentModeling | 학생이 자료 해석을 요청한다. | AY가 과제 후보와 field-level evidence를 만든다. | 검토 대기 변경 제안 |
| 3. Review | 학생이 과제 정보를 확인한다. | 검토 대기 상태에 과제 생성 변경 제안과 불확실한 정보가 표시된다. | 수락/수정/거절 |
| 4. UserConfirmation | 학생이 변경 제안을 수락하거나 수정한다. | 과제 생성 변경 제안을 확정 상태에 반영한다. | `반영됨` badge |
| 5. Agent Briefing | 학생이 반영 결과를 확인한다. | AY가 저장된 과제명, 마감, 근거를 사용자 말로 알려준다. | `반영됨`, 저장된 과제/마감 |

## 화면 구조

Prototype은 **하나의 선택 자료 검토 화면 + 두 상태 + 선택 자료 탭**으로 만든다.

| 상태 | 목적 | 표시 |
| --- | --- | --- |
| 검토 대기 | AY가 선택한 자료에서 찾은 과제 후보를 사용자가 확인하기 전 | 원본 자료 preview, 과제 생성 변경 제안, 근거 연결, 수락/수정/거절 |
| 반영됨 | 사용자 수락 이후 AY가 반영 결과를 알려주는 상태 | `개요 작성하기` 과제 반영, 마감 저장, 근거 유지 |

| 탭 | 목적 | 표시 |
| --- | --- | --- |
| 선택 자료 탭 | 사용자가 선택한 원본 자료를 같은 화면 안에서 확인한다. | `lms-outline-notice.txt`, `problem-solving-syllabus.md`, `week03-lecture.mp3`, `outline-rubric.png` |

### Layout

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ header: AY-PLE · 2026 여름학기 · 문제해결글쓰기                       │
├────────────────────────────────────────────────────────────────────────────┤
│ 왼쪽 메뉴    │ 자료 목록        │ 선택 자료 탭 + 원본 미리보기    │ 대화 패널    │
│              │ 과목별 자료      │ txt / md / mp3 / png 미리보기   │ 변경 제안    │
│              │ 선택 상태        │ 자료별 근거                     │ 반영 안내    │
│              │ 정리 실행        │ 원본 자료 중심                  │ 입력창       │
└────────────────────────────────────────────────────────────────────────────┘
```

## Panel Contract

| 영역 | 역할 | 핵심 문구 |
| --- | --- | --- |
| 상단 상태 | 화면과 사용자-facing 상태를 보여준다. 내부 상태명은 노출하지 않는다. | `AY-PLE`, `검토 대기`, `반영됨` |
| 자료 목록 | 과목별 원본 자료를 펼쳐 보고 정리할 자료를 고른다. | `문제해결글쓰기`, `lms-outline-notice.txt`, `4개 선택됨` |
| 선택 자료 탭 | 선택한 원본 자료를 확장자별 미리보기로 전환한다. | `lms-outline-notice.txt`, `problem-solving-syllabus.md`, `week03-lecture.mp3`, `outline-rubric.png` |
| 원본 미리보기 | 원본 자료와 자료별 근거를 확인한다. | `7월 12일 23:59까지`, `마감`, `강의계획서 참조 필요` |
| 대화 패널 | 같은 검토 맥락에서 AY의 변경 제안과 수락 후 안내를 보여준다. | `개요 작성하기 과제를 만들까요?`, `마감은 7월 12일 23:59로 저장했어요.` |

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

학생-facing UI는 단순히 한국어로 번역하는 것이 아니라, 비개발자 대학생에게 친숙한 말로 쓴다. 브랜드명, 파일명, 확장자처럼 고유한 문자열은 유지하되 `source`, `preview`, `workspace`, `agent`, `state` 같은 개발자식 표현은 화면에서 피한다.

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
| `ModelingRun` | 자료 정리 실행 | `선택한 자료 정리하기` |
| `Review-first Academic Workspace` | 검토 중심 학업 워크스페이스 | `검토 중심 학업 워크스페이스` |
| `ReviewState` | 검토 대기 | `검토 대기` |
| `TrustedState` | 반영됨 | `반영됨` |
| `Assignment.dueAt` | 과제 마감 | `마감은 과제 정보에서 관리돼요` |
| `deadlineRef` | 마감 참조 | `과제 마감을 따라감` |
| `MarkdownProjection` | 읽기용 정리 문서 | `읽기용 정리 문서` |

## Prototype Scope

| 포함 | 이유 |
| --- | --- |
| 선택 자료 검토 화면 | 왼쪽 자료 목록, 가운데 원본 미리보기, 오른쪽 대화 패널을 첫 화면 구조로 고정한다. |
| 자료 목록 | 과목 드롭다운, 원본 자료 행, 파일별 체크 상태를 통해 SourceSelection을 명시적으로 보여준다. |
| 선택 자료 탭 | 선택된 원본 자료가 ModelingRun 입력이라는 점을 보여준다. |
| 과제 생성 변경 제안 | AY 제안과 사용자 확인 경계를 ChatSidecar 안에서 보여준다. |
| 반영 결과 브리핑 | 수락 이후 AY가 학생에게 저장된 과제명과 마감을 알려준다. |
| 오른쪽 대화 패널 | 실제 Codex/Claude Code side panel처럼 현재 검토 맥락과 같은 상태를 다룬다. |

| 제외 | 이유 |
| --- | --- |
| 전체 월/주 calendar view | calendar app처럼 보일 위험이 있다. |
| drag-and-drop 마감 수정 | canonical owner를 우회할 수 있어 today scope에 맞지 않는다. |
| 전체 task manager | 오늘 prototype에서는 source-grounded 과제 생성과 수락 브리핑을 먼저 고정한다. |
| 시험 detail screen | 첫 prototype은 과제 flow를 선명하게 보여준다. |
| 별도 일정 생성 UI | "개요 작성하기" 시나리오에는 필요 없다. |
| Markdown editor | 읽기용 정리 문서는 source of truth가 아니다. |
| 긴 전체 ChatSidecar conversation | 오늘은 현재 검토 항목에 묶인 오른쪽 side panel과 suggested prompt면 충분하다. |
| WorkspaceHistory UI | 중요한 후속 기능이지만 prototype 핵심이 아니다. |
| LMS login/import flow | 자료 intake와 modeling을 흐린다. |
| 외부 calendar sync | MVP 제외 범위다. |
| 자동 제출 또는 과제 정답 생성 | 제품 방향과 Academic Integrity에 맞지 않는다. |

## 아직 구체화하지 않은 화면

오늘 prototype은 아래 표면을 무시하지 않는다. 다만 한 화면 안에서 어떤 정보량과 위치로 보여줄지는 별도 UX 설계가 필요하므로, 이번 prototype에서 섣불리 확정하지 않는다.

| 표면 | 현재 결정 | 다음 단계 |
| --- | --- | --- |
| 타임라인 | 과제 마감에서 파생되는 표면으로 남긴다. | 과제 상세 화면 또는 운영 화면에서 보여줄지 결정 |
| 추천 할 일/내 할 일 | 과제에서 파생되거나 사용자가 수락하는 운영 행동으로 남긴다. | 선택 자료 검토 화면 안에 둘지, 별도 할 일 화면으로 둘지 결정 |
| 읽기용 정리 문서 | 상태에서 생성되는 artifact로 남긴다. | 원본 미리보기와 같은 탭에 둘지, 별도 정리 문서 화면으로 둘지 결정 |

## Prototype Artifact

실제 위치:

```text
spikes/ay-ple-ui-prototype/index.html
spikes/ay-ple-ui-prototype/state-accepted.html
spikes/ay-ple-ui-prototype/styles.css
```

[순수 HTML/CSS prototype 열기](../../spikes/ay-ple-ui-prototype/index.html) · [반영됨 상태 열기](../../spikes/ay-ple-ui-prototype/state-accepted.html)

이 prototype은 throwaway artifact다. 기획서에는 링크와 스크린샷 또는 간단한 설명만 연결하고, 실제 제품 구현의 컴포넌트 구조로 간주하지 않는다. Prototype의 질문, 탭별 의도, 피드백 후 판정은 [prototype notes](../../spikes/ay-ple-ui-prototype/NOTES.md)에 둔다.

## 남은 질문

| 질문 | 다음 단계 |
| --- | --- |
| 타임라인, 추천 할 일, 읽기용 정리 문서의 실제 화면 위치를 어떻게 나눌 것인가? | 선택 자료 검토 prototype 이후 별도 UX 설계 |
| Exam detail은 Assignment pattern을 얼마나 공유할 것인가? | Assignment prototype 이후 별도 scenario로 검토 |
| StudentTask를 MVP에서 trusted entity로 저장할 것인가, 아니면 TaskCandidate acceptance만 기록할 것인가? | DB schema PRD에서 결정 |
| TimelineEntry를 SQLite view로 둘지 materialized cache로 둘지 | implementation PRD에서 결정 |
| EvidenceRef locator를 quote 중심으로 시작할지 page/range까지 둘지 | parser/script scope와 함께 결정 |
