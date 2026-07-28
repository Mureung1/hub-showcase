# Manager Runtime Interaction

## Keywords

- managerRuntimeState
- outsidePet
- derived render state
- free roam
- blink transition
- peek from edge
- ladder attachment
- platform collision
- z-index invariant
- attachedObjectId
- interaction rect
- sprite alpha

## Why It Matters

Lumi가 창 안에서만 대사를 말하는 캐릭터를 넘어, 배경 위를 돌아다니고 사다리/평지와 상호작용하려면 행동 state와 렌더링 좌표, object rect, z-index 규칙을 함께 이해해야 한다.

## Reference Code Paths

- `src/App.tsx`
- `src/domain/interactionObjects.ts`
- `src/domain/petLocomotion.ts`
- `src/domain/petBehaviorStateMachine.ts`
- `src/domain/managerBehaviorAdapter.ts`
- `src/components/CanvasSpriteAnimator.tsx`
- `src/styles.css`
- `docs/runtime-flow-report.md`
- `docs/architecture-data-flow.md`

## Parts To Check

- `OutsidePetState`: `phase`, `position`, `direction`, `animation`, `attachedObjectId`
- `ManagerRuntimeState`: manager window, window edge, outside, transition 상태를 묶는 상위 모델
- `triggerOutsidePetFromJournal()`: 기록 노트 실행을 임시 outside transition 조건으로 사용
- `createInteractionObjectsFromWindows()`: 사다리/평지 창을 interaction rect로 변환
- `resolveRenderedOutsidePet()`: climbing 중 사다리 rect에서 렌더 위치를 다시 계산
- `.outside-pet-layer.free_roam.climbing`: 사다리 창보다 위에 렌더되도록 z-index 보정
- `.outside-pet-layer::before`: 배경 비침을 줄이는 sprite 뒤 glow
- 기록 노트를 최소화해도 `openWindows.includes("journal")`이면 Lumi가 계속 roaming하는 규칙

## ChatGPT Questions

- `outsidePet` 원본 state와 `renderedOutsidePet` derived state를 분리한 이유를 설명해줘.
- 사다리 창을 드래그할 때 Lumi가 실시간으로 따라오려면 어떤 데이터 흐름이 필요해?
- z-index invariant가 없으면 climbing animation에서 어떤 문제가 생겨?
- sprite alpha 문제와 React state 문제를 어떻게 구분해서 디버깅할 수 있어?
