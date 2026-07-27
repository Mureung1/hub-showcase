# 컴포넌트 트리

`app/page.js`(`Home`)가 `step` 상태 하나로 화면 전환을 관리한다. 라우팅 없이 조건부 렌더링만으로 흐름을 만드는 구조라, 컴포넌트 트리가 곧 화면 흐름과 거의 같다.

```
RootLayout (app/layout.js)
└── Home (app/page.js)  — step: "input" | "preview" | "focus" | "timer" | "timer-confirm"
                          | "complete" | "reason" | "proposal" | "rest"
    ├── [input]         BrainDumpInput   (app/components/BrainDumpInput.js)
    ├── [preview]       TaskPreview      (app/components/TaskPreview.js)
    ├── [focus]         OneFocusView     (app/components/OneFocusView.js)
    ├── [timer]         FocusTimer       (app/components/FocusTimer.js)
    ├── [timer-confirm] TimerConfirm     (app/components/TimerConfirm.js)
    ├── [complete]      CompleteScreen   (app/components/CompleteScreen.js)
    ├── [reason]        ReasonChips      (app/components/ReasonChips.js)
    ├── [proposal]      ProposalCard     (app/components/ProposalCard.js)
    └── [rest]          RestSuggestion   (app/components/RestSuggestion.js)
```

`step`마다 그 화면 하나만 렌더링되고 형제 컴포넌트는 마운트되지 않는다 (동시에 여러 개가 화면에 있는 구조가 아님).

## 화면 전환 흐름

```
input → preview → focus ─┬─ (집중 시작) → timer → timer-confirm ─┬─ (다 했어) → complete (또는 다음 스텝의 preview)
                          │                                       └─ (더 필요해) → timer(연장된 시간으로 재시작)
                          └─ (나 지금 힘들어) → reason → proposal ─┬─ (수락) → tool별 분기(휴식/스텝 조정/홈/재개)
                                                                    └─ (거절) → proposal(재판단, 시간 부족 시 수렴)
```

## 컴포넌트별 props / 콜백

| 컴포넌트 | props | 콜백 → 다음 step |
|---|---|---|
| `BrainDumpInput` | — | `onSubmit(text)` → `preview` |
| `TaskPreview` | `task` | `onReady()` → `focus` |
| `OneFocusView` | `task`, `deadlineExtraMinutes`, `onExtendDeadline`(T19: 마감 표시+연장) | `onStart()` → `timer`, `onStruggle()` → `reason` |
| `FocusTimer` | `durationMinutes`, `startedAt`, `caption`(연장 이유, 선택) | `onFinish()` → `timer-confirm` |
| `TimerConfirm` | `isLoading`, `error` | `onYes()` → 완료 처리(`complete`/다음 `preview`), `onNo()` → Agent 연장 판단 후 `timer` |
| `CompleteScreen` | `task` | (없음, 종착 화면) |
| `ReasonChips` | — | `onSelect(chip)` → `proposal` |
| `ProposalCard` | `proposedTool`, `reason`, `isLoading`, `isFinal` | `onAccept()`/`onReject()` → tool별 분기 또는 재판단 |
| `RestSuggestion` | — | `onBackHome()` → `input` |

## 새로고침 내구성(T04)

`Home`은 `step`/`currentIndex`/`microsteps`/`stepStartedAt`을 localStorage(`kok-session`)에 저장하고 마운트 시 복원한다. `reason`/`proposal`(힘들어 루프 중)은 재구성에 필요한 정보(이유 칩, 제안 내용)를 저장하지 않으므로 새로고침 시 `focus`로 되돌아간다. `timer-confirm`도 마찬가지로 복원 대상이 아니라 `focus`로 되돌아간다. 서버-클라이언트 하이드레이션 불일치를 피하려고 `useSyncExternalStore`로 마운트 완료 전엔 항상 `input`을 그린다.

## 지금은 mock/미완인 부분 (설계 시 참고)

- 타이머 연장(T15) 도중 새로고침하면 연장된 시간(`timerDurationMinutes`)은 저장되지 않아 원래 예상 시간 기준으로 복원된다. C04/C15 어느 쪽에도 명시된 요구사항은 아니라 지금은 그대로 둔다.
