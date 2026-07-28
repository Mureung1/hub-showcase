# XP UI CSS

## Keywords

- Windows XP shell UI
- absolute positioning
- draggable window
- resizable window
- minimized window
- taskbar order
- active window
- z-index
- transparent interaction window
- sprite overlay
- image-rendering: pixelated

## Why It Matters

XP 데스크톱처럼 보이는 화면은 React state만으로 완성되지 않는다. 창 위치, taskbar 표시, active/minimized 상태, sprite z-index, pixel asset 렌더링 규칙이 함께 맞아야 한다.

## Reference Code Paths

- `src/App.tsx`
- `src/styles.css`
- `public/prototype-static.html`
- `docs/design-system.md`
- `docs/architecture-data-flow.md`

## Parts To Check

- `useWindowManager()`: `openWindows`, `minimizedWindows`, `focusedWindow`, `activeWindow`
- `XpWindow()`: drag, resize, minimize, close handler
- `.xp-window`, `.xp-titlebar`, `.taskbar-items`
- `.interaction-object-window`: 사다리/평지 창의 transparent body
- `.outside-pet-layer`: 창 밖 Lumi sprite overlay와 z-index
- taskbar button click이 창 순서를 바꾸지 않고 focus/minimize만 바꾸는 흐름

## ChatGPT Questions

- 이 프로젝트의 `useWindowManager()`를 기준으로 open, close, minimize, focus state 차이를 설명해줘.
- XP 스타일 창을 absolute positioning으로 만들 때 z-index를 어떻게 관리해야 해?
- interaction object window를 투명하게 만들 때 body background와 titlebar는 왜 따로 봐야 해?
- taskbar 순서와 active window 순서를 분리하면 어떤 장점이 있어?
