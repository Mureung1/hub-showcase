# React 전환 설계 (tasks.html 기준)

> `prototype/tasks.html`(바닐라 JS, DOM 직접 조작)을 `client/`(React)로 옮기기 위한 설계.
> 코드 전환 전 구조만 먼저 정리한 문서. 아직 구현은 안 됨.

## 컴포넌트 트리

```
App
├── Header (제목 + 아바타 이니셜 + "우리 팀 · 팀원 N명")
├── UserSelect (나는 [드롭다운] 입니다)
├── ProgressCard
│   ├── ProgressBlock (팀 전체 진행도)
│   └── ProgressBlock (내 진행도)
├── TaskList
│   └── TaskItem × N
│       ├── Checkbox
│       ├── TaskInfo (제목 + 담당자 + DueDateEditable + Dday)
│       ├── StatusBadge
│       └── DeleteButton
├── AddTaskForm (토글형: 버튼 ↔ 폼)
├── ActivityLog
│   └── LogList (토글형)
│       └── LogItem × N
└── Toast
```

## 각 컴포넌트의 props / 역할

| 컴포넌트 | props | 비고 |
|---|---|---|
| `App` | 없음 (최상위) | 모든 전역 상태 보유, 데이터 로딩 |
| `Header` | `teamMemberCount`, `currentMemberName` | 아바타 이니셜은 여기서 `slice(0,1)` |
| `UserSelect` | `members`, `currentMemberId`, `onChange` | select 변경 시 `App`의 `currentMemberId` 갱신 |
| `ProgressCard` | `tasks`, `currentMemberId` | 내부에서 team/mine 두 `ProgressBlock` 렌더 |
| `ProgressBlock` | `label`, `percent`, `caption`, `variant`("team"\|"mine") | 지금 `calcStats()` 로직 그대로 재사용 가능한 순수 함수로 분리 |
| `TaskList` | `tasks`, `members`, `currentMemberId`, `pendingTaskIds`, `onStatusChange`, `onDelete`, `onDueDateChange` | 빈 배열이면 `TaskEmpty` |
| `TaskItem` | `task`, `assigneeName`, `isMine`, `canChange`, `isPending`, `onToggleStatus`, `onCycleStatus`, `onDelete`, `onDueDateChange` | 지금 `data-*` 속성으로 흘리던 상태를 전부 props로 |
| `DueDateEditable` | `dueDate`, `canChange`, `onSave` | 지금 `startEditDueDate`에서 DOM을 `<input>`으로 바꿔치기하던 걸 **내부 로컬 state**(`isEditing`)로 전환 |
| `AddTaskForm` | `members`, `onSubmit`, `error` | 열림/닫힘은 내부 state 또는 부모에서 제어 |
| `ActivityLog` | `logs`, `isOpen`, `onToggle` | |
| `LogItem` | `log` | `formatLogTime` 등은 유틸 함수로 분리해 그대로 재사용 |
| `Toast` | `message` | `App`에서 setTimeout으로 자동 클리어 |

## State는 어디서 관리되나

**`App`에서 소유 (전역 성격)**
- `members`, `tasks`, `logs` — 서버에서 fetch한 원본 데이터
- `currentMemberId` — `UserSelect`, `TaskList`, `ProgressCard` 모두가 필요하므로 최상위
- `pendingTaskIds` — 지금은 `Set`, React에서는 `Set` 그대로 써도 되지만 매 변경마다 `new Set(prev)`로 복사해서 setState 해야 리렌더가 감지됨
- `toastMessage` — 전역 알림이라 최상위

**컴포넌트 로컬로 내려도 되는 것**
- `AddTaskForm`의 열림/닫힘, 입력값 3개(title, assigneeId, dueDate), 에러 메시지 — 폼이 열려있을 때만 존재하는 임시 상태라 지금처럼 `hidden` 토글로 부모까지 끌어올릴 필요 없음
- `DueDateEditable`의 "지금 편집 중인지" — 지금은 전역이 아니라 DOM 요소를 그 자리에서 바꿔치기하는 식이었는데, React에서는 `TaskItem` 안의 로컬 state로 자연스럽게 표현됨 (이게 지금 코드의 가장 지저분한 DOM 직접조작 부분이라 가장 큰 이득을 봄)
- `ActivityLog`의 펼침/접힘 — `logListEl.hidden` 토글이었던 것

## 바닐라 JS → React 전환의 큰 그림

1. **`renderTasks()`/`renderLogs()`처럼 "전체를 지우고 다시 그리는" 함수는 사라진다.** `tasks` state가 바뀌면 React가 알아서 `TaskList`를 재계산 — `taskListEl.innerHTML = ""` 같은 코드는 통째로 삭제 대상.
2. **`data-task-id`, `dataset.status` 같은 DOM에 상태를 숨겨두는 패턴이 사라진다.** 지금은 클릭 이벤트에서 `e.target.closest(".task-item")`으로 DOM을 거슬러 올라가 `dataset.taskId`를 읽는데, React에서는 `TaskItem`이 애초에 `task.id`를 클로저로 갖고 있으니 `onClick={() => onDelete(task.id)}` 식으로 바로 연결.
3. **이벤트 위임(`taskListEl.addEventListener`)이 개별 컴포넌트의 `onClick` prop으로 바뀐다.** 지금처럼 클릭 대상이 체크박스인지 뱃지인지 삭제버튼인지 매번 `closest()`로 판별할 필요 없이, 각 버튼에 각자의 핸들러를 직접 붙임.
4. **`pendingTaskIds`로 "이 태스크만 잠금" 처리하던 로직은 그대로 개념은 유지하되, class 토글(`.pending`) 대신 `isPending` prop → 조건부 className/disabled로 표현.**
5. **폼 열기/닫기(`addTaskForm.hidden = false` 등 DOM 속성 직접 조작)는 `isOpen` state + 조건부 렌더(`{isOpen && <AddTaskForm/>}`)로.**
6. **`fetch` 호출들(`loadMembers`, `loadTasks`, `loadLogs`, `changeStatus`, `archiveTask`, `addTask`)은 `client/src/api/` 아래 순수 함수로 분리**하고, `App`은 그 함수를 호출해 받은 결과로 `setState`만 하면 됨. `axios`를 쓰기로 했으니 `fetch` → `axios.get/post/patch/delete`로 교체.
7. **순수 유틸 함수들(`formatDue`, `getDaysUntilDue`, `formatDday`, `formatLogTime`, `calcStats`, `getTodayDateString`, `memberName`)은 DOM을 전혀 안 건드리므로 거의 그대로 `client/src/utils/`로 옮기기만 하면 됨.** 컴포넌트 전환에서 가장 리스크가 적은 부분.
8. **`localStorage`(currentMemberId 기억, 알림 중복 방지) — `safeGetStoredMemberId`/`safeSetStoredMemberId`도 그대로 유틸로 이전 가능.** `App`의 `useState` 초기값 계산 시 한 번만 읽으면 됨.
9. **브라우저 알림(`checkDueSoonNotifications`, `notifyDueSoonTasks`)은 `useEffect(() => {...}, [tasks])`로.** tasks가 로드/갱신된 후 실행되도록.
10. **초기 로딩 시퀀스(`init()`의 `loadMembers → loadTasks → loadLogs`)는 `useEffect(() => { ... }, [])`로 App 마운트 시 1회 실행.**

가장 손이 많이 가는 지점은 `DueDateEditable`(DOM 요소를 직접 바꿔치기하던 부분)과 이벤트 위임 → 개별 핸들러 전환이고, 나머지(유틸 함수, API 호출, 진행도 계산)는 로직 변경 없이 위치만 옮기면 되는 수준입니다.
