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

Lumi가 매니저 창 안에만 있는 캐릭터가 아니라 배경 위를 돌아다니고, 사다리/평지와 상호작용하려면 행동 state, 렌더 좌표, object rect, z-index 규칙을 분리해서 이해해야 한다.

## Reference Code Paths

- `src/App.tsx`
- `src/hooks/useOutsidePetRuntime.ts`
- `src/domain/outsidePetRuntime.ts`
- `src/domain/interactionObjects.ts`
- `src/domain/petBehaviorStateMachine.ts`
- `src/domain/managerBehaviorAdapter.ts`
- `src/components/CanvasSpriteAnimator.tsx`
- `src/styles.css`
- `docs/runtime-flow-report.md`
- `docs/architecture-data-flow.md`

## Parts To Check

- `OutsidePetState`: `phase`, `position`, `direction`, `animation`, `attachedObjectId`, `platformId`
- `ManagerRuntimeState`: manager window, window edge, outside 상태를 묶는 상위 렌더 모델
- `triggerOutsidePetFromJournal()`: 기록 노트 실행을 outside transition의 임시 조건으로 사용
- `createInteractionObjectsFromWindows()`: 사다리/평지 창 위치와 크기를 interaction rect로 변환
- `useOutsidePetRuntime()`: `peek_from_edge` -> `walk_in` -> `free_roam` -> `returning` tick 연결
- `resolveRenderedOutsidePet()`: climbing/platform 중 창 이동이나 resize를 따라가도록 렌더 좌표 재계산
- `resolveOutsidePetLayerZIndex()`: 사다리/평지에 붙었을 때 오브젝트 창보다 위에 보이도록 z-index 보정
- `resolveSupportedPetAnimationState()`: 없는 animation state는 같은 pet/stage의 `idle`로 fallback

## ChatGPT Questions

- `outsidePet` 원본 state와 `renderedOutsidePet` derived state를 분리하는 이유를 이 프로젝트 코드 기준으로 설명해줘.
- 사다리 창을 드래그할 때 Lumi가 실시간으로 따라가려면 어떤 데이터 흐름이 필요한지 설명해줘.
- platform 위 idle과 jump down loop가 끊기면 어떤 state 값을 먼저 확인해야 하는지 알려줘.
- z-index invariant가 없으면 climbing/platform animation에서 어떤 시각 문제가 생기는지 설명해줘.
