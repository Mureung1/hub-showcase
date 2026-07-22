# 컴포넌트 트리

`app/page.js`(`Home`)가 `step` 상태 하나로 화면 전환을 관리한다. 라우팅 없이 조건부 렌더링만으로 흐름을 만드는 구조라, 컴포넌트 트리가 곧 화면 흐름과 거의 같다.

```
RootLayout (app/layout.js)
└── Home (app/page.js)  — step: "input" | "preview" | "focus" | "timer" | "complete" | "rest"
    ├── [input]    BrainDumpInput   (app/components/BrainDumpInput.js)
    ├── [preview]  TaskPreview      (app/components/TaskPreview.js)
    ├── [focus]    OneFocusView     (app/components/OneFocusView.js)
    ├── [timer]    FocusTimer       (app/components/FocusTimer.js)
    ├── [complete] CompleteScreen   (app/components/CompleteScreen.js)
    └── [rest]     RestSuggestion   (app/components/RestSuggestion.js)
```

`step`마다 그 화면 하나만 렌더링되고 형제 컴포넌트는 마운트되지 않는다 (동시에 여러 개가 화면에 있는 구조가 아님).

## 화면 전환 흐름

```
input → preview → focus ─┬─ (집중 시작) → timer → complete
                          └─ (나 지금 힘들어) → rest → (홈으로) → input
```

## 컴포넌트별 props / 콜백

| 컴포넌트 | props | 콜백 → 다음 step |
|---|---|---|
| `BrainDumpInput` | — | `onSubmit(text)` → `preview` |
| `TaskPreview` | `task` | `onReady()` → `focus` |
| `OneFocusView` | `task` | `onStart()` → `timer`, `onStruggle()` → `rest` |
| `FocusTimer` | `durationMinutes`(기본 25) | `onFinish()` → `complete` |
| `CompleteScreen` | `task` | (없음, 종착 화면) |
| `RestSuggestion` | — | `onBackHome()` → `input` |

## 지금은 mock인 부분 (설계 시 참고)

- `task`는 `Home`에 하드코딩된 문자열 하나(`"책상 위 물건 세 개만 제 자리에"`)로, Brain Dump 텍스트 제출과 무관하게 항상 동일한 값이 흐른다. Feat-2(Brain Dump Agent 분할)가 붙으면 이 자리가 실제 `generateObject` 결과로 교체된다.
- `FocusTimer`는 "시작한 시각"(`startedAt`)만 상태로 갖고 매 tick마다 남은 시간을 재계산한다 — 새로고침 내구성을 위한 설계지만, `startedAt`이 컴포넌트 로컬 state라 실제 새로고침 시엔 초기화된다(휘발). 지속시키려면 URL 쿼리나 localStorage 등 컴포넌트 바깥 저장소가 필요.
- `OneFocusView`의 `onStruggle`은 지금 무조건 `rest` 화면(고정 문구)으로 보낸다. Feat-4(Agent 루프)가 붙으면 이 분기가 규칙이 아니라 Agent의 tool 선택 결과로 바뀔 자리다.
