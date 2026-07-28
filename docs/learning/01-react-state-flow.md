# React State Flow

## Keywords

- React component
- useState
- useEffect
- derived state
- event handler
- conditional rendering
- localStorage
- derived render state
- minimized window
- managerRuntimeState
- outsidePet
- controlled input
- list rendering
- type union
- interface

## Why It Matters

React state controls the XP desktop screens, open windows, quest status, manager state, journal rendering, and Lumi outside interaction flow.

## Reference Code Paths

- src/App.tsx
- src/main.tsx
- src/layers/storage/questLogRepository.ts
- src/domain/managerBehaviorAdapter.ts
- src/domain/petBehaviorStateMachine.ts
- src/domain/interactionObjects.ts
- docs/runtime-flow-report.md

## Parts To Check

- `AppScreen`: `manager-select`, `wizard`, `manager-created`, `desktop`
- `QuestStatus`: `draft`, `active`, `success`, `failed`, `recovery`
- `WindowId`, `openWindows`, `minimizedWindows`, `focusedWindow`
- `profileKey`, `managerKey`, and quest log storage
- `replaceWorkflowWindows` and window flow changes
- `ManagerRuntimeState` and `OutsidePetState`
- `renderedOutsidePet` as derived state for climbing placement
- why journal minimize keeps Lumi outside but journal close returns Lumi

## ChatGPT Questions

- Explain how this project uses React state to control screen transitions.
- Why are union types useful for `QuestStatus` and `WindowId`?
- What should I watch for when syncing localStorage and React state?
- Explain the difference between stored state and derived render state using `outsidePet` and `renderedOutsidePet`.
