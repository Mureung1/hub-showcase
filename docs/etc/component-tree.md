# 컴포넌트 트리

`app/page.js`(`Home`)가 `step` 상태 하나로 화면 전환을 관리한다. 라우팅 없이 조건부 렌더링만으로 흐름을 만드는 구조라, 컴포넌트 트리가 곧 화면 흐름과 거의 같다.

```
RootLayout (app/layout.js)
└── Home (app/page.js)  — step: "input" | "review" | "preview" | "focus" | "timer" | "timer-confirm"
                          | "complete" | "reason" | "proposal" | "rest"
    ├── [onboarding]    OnboardingGuide  (app/components/OnboardingGuide.js) — T18, step 상태와
    │                   무관하게 notionReady===false면 다른 화면보다 먼저 렌더링됨
    ├── [input]         BrainDumpInput   (app/components/BrainDumpInput.js)
    ├── [review]        MicrostepReview  (app/components/MicrostepReview.js) — T17, 아직 Notion에
    │                   저장 전인 마이크로스텝 전체 목록(삭제·다시 쪼개기 가능)
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
input → review(다시 쪼개기 가능) → (이대로 시작하기: Notion 저장) → preview → focus ─┬─ (집중 시작) → timer → timer-confirm ─┬─ (다 했어) → complete (또는 다음 스텝의 preview)
                                                                                    │                                       └─ (더 필요해) → timer(연장된 시간으로 재시작)
                                                                                    └─ (나 지금 힘들어) → reason → proposal ─┬─ (수락) → tool별 분기(휴식/스텝 조정/홈/재개)
                                                                                                                              └─ (거절) → proposal(재판단, 시간 부족 시 수렴)
```

`review`는 최초 Brain Dump 확정 직후에만 거친다. 다음 스텝으로 넘어가거나(`advanceToNextStep`) `postpone_task`로 미룬 뒤 다음 스텝을 보여줄 때는 이미 저장된 배치 안에서 도는 것이라 `review`를 다시 거치지 않고 바로 `preview`로 간다.

## 컴포넌트별 props / 콜백

| 컴포넌트 | props | 콜백 → 다음 step |
|---|---|---|
| `BrainDumpInput` | — | `onSubmit(text)` → `review` |
| `MicrostepReview` | `microsteps`, `isReshuffling`, `isSaving`, `error` | `onDelete(index)` → 로컬에서만 제거, `onReshuffle()` → `/api/brain-dump` 재호출 후 `review` 유지, `onConfirm()` → `/api/steps/save` 저장 후 `preview` |
| `TaskPreview` | `task` | `onReady()` → `focus` |
| `OneFocusView` | `task`, `deadlineExtraMinutes`, `onExtendDeadline`(T19: 마감 표시+연장) | `onStart()` → `timer`, `onStruggle()` → `reason` |
| `FocusTimer` | `durationMinutes`, `startedAt`, `caption`(연장 이유, 선택) | `onFinish()` → `timer-confirm` |
| `TimerConfirm` | `isLoading`, `error` | `onYes()` → 완료 처리(`complete`/다음 `preview`), `onNo()` → Agent 연장 판단 후 `timer` |
| `CompleteScreen` | `completedCount` | (없음, 종착 화면) |
| `ReasonChips` | — | `onSelect(chip)` → `proposal` |
| `ProposalCard` | `proposedTool`, `reason`, `isLoading`, `isFinal` | `onAccept()`/`onReject()` → tool별 분기 또는 재판단 |
| `RestSuggestion` | — | `onBackHome()` → `input` |
| `OnboardingGuide` | `isChecking`, `checkMessage` | `onRecheck()` → `/api/notion-health` 재확인, 통과하면 `notionReady=true`가 되어 다음 렌더에서 정상 흐름(주로 `input`)으로 전환 |

## Notion 연동 확인(T18)

`Home`은 마운트 시 한 번 `/api/notion-health`(T01에서 만든 헬스체크 엔드포인트)를 호출해 `notionReady` state를 채운다. `notionReady === false`면 `step`이 무엇이든 상관없이 `OnboardingGuide`를 렌더링해 노션 템플릿 복제 → Integration 연결 → `.env.local` 설정 순서를 안내한다. "확인했어요" 버튼을 누르면 재확인하고, 통과하면 원래 `step`(대개 `input`)으로 넘어간다.

## 새로고침 내구성(T04)

`Home`은 `step`/`currentIndex`/`microsteps`/`stepStartedAt`을 localStorage(`kok-session`)에 저장하고 마운트 시 복원한다. `review`(T17)도 복원 대상이라, 저장 전 검토 화면에서 새로고침해도 그 목록 그대로 돌아온다(단, 다시 쪼개기용 `pendingBrainDumpParams`는 저장되지 않아 새로고침 후엔 삭제만 가능하고 다시 쪼개기는 원래 텍스트를 다시 입력해야 한다). `reason`/`proposal`(힘들어 루프 중)은 재구성에 필요한 정보(이유 칩, 제안 내용)를 저장하지 않으므로 새로고침 시 `focus`로 되돌아간다. `timer-confirm`도 마찬가지로 복원 대상이 아니라 `focus`로 되돌아간다. 서버-클라이언트 하이드레이션 불일치를 피하려고 `useSyncExternalStore`로 마운트 완료 전엔 항상 `input`을 그린다.

## 지금은 mock/미완인 부분 (설계 시 참고)

- 타이머 연장(T15) 도중 새로고침하면 연장된 시간(`timerDurationMinutes`)은 저장되지 않아 원래 예상 시간 기준으로 복원된다. C04/C15 어느 쪽에도 명시된 요구사항은 아니라 지금은 그대로 둔다.
- `review`(T17) 화면에서 새로고침하면 목록 자체는 복원되지만 `pendingBrainDumpParams`는 저장되지 않아 "전부 다시 쪼개기"가 그 시점부턴 동작하지 않는다(삭제·확인은 그대로 됨). C17에 명시된 요구사항은 아니라 지금은 그대로 둔다.
