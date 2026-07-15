# React State Flow

## Keywords

- React component
- useState
- useEffect
- derived state
- event handler
- conditional rendering
- localStorage
- controlled input
- list rendering
- type union
- interface

## Why It Matters

React state controls the XP desktop screens, open windows, quest status, manager state, and journal rendering.

## Reference Code Paths

- src/App.tsx
- src/main.tsx
- src/domain/types.ts
- src/layers/storage/localRepositories.ts
- src/layers/storage/questLogRepository.ts

## Parts To Check

- `AppScreen`: `wizard`, `manager-created`, `desktop`
- `QuestStatus`: `draft`, `active`, `success`, `failed`, `recovery`
- `WindowId` and `openWindows`
- `profileKey`, `managerKey`, and quest log storage
- `replaceWorkflowWindows` and window flow changes

## ChatGPT Questions

- Explain how this project uses React state to control screen transitions.
- Why are union types useful for `QuestStatus` and `WindowId`?
- What should I watch for when syncing localStorage and React state?
