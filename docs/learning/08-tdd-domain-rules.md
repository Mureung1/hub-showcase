# TDD Domain Rules

## Keywords

- TDD
- RED GREEN REFACTOR
- domain logic
- reward progression
- stat growth
- interaction object
- behavior state machine
- weighted random
- ManagerBehaviorIntent
- ManagerBehaviorAdapter
- LLM boundary
- rule fallback

## Why It Matters

화면 구현 전에 성장, 보상, 상호작용, 매니저 행동 규칙을 테스트로 고정하면 이후 UI, asset, LLM 연결이 바뀌어도 핵심 동작이 흔들리지 않는다.

## Reference Code Paths

- `src/domain/rewardProgression.ts`
- `src/domain/statGrowth.ts`
- `src/domain/stageAppearance.ts`
- `src/domain/interactionObjects.ts`
- `src/domain/petLocomotion.ts`
- `src/domain/petBehaviorStateMachine.ts`
- `src/domain/managerBehaviorIntent.ts`
- `src/domain/managerBehaviorAdapter.ts`
- `src/domain/*.test.ts`

## Current Structure

- `ManagerBehaviorIntent`: LLM이나 rule agent가 줄 수 있는 의도를 안전한 값으로 정규화한다.
- `PetBehaviorStateMachine`: 현재 pet 위치, 주변 object, mood, recent event를 보고 가능한 행동 후보와 weight를 만든다.
- `ManagerBehaviorAdapter`: 정규화된 intent와 state machine을 연결해 최종 behavior와 animation state를 고른다.
- `rewardProgression`, `statGrowth`, `stageAppearance`: Quest Event 결과를 성장, 능력치, 외형 해금 규칙으로 바꾼다.
- `interactionObjects`, `petLocomotion`: 사다리, 평지, 창탈출 같은 상호작용을 rect와 anchor 기반 규칙으로 표현한다.

## Parts To Check

- RED 단계에서 stub이 assertion failure로 실패하는지
- level에 따른 stage 해금과 해금된 stage 선택 규칙
- Quest Event 결과가 stat/reward 후보로 바뀌는 규칙
- ladder/platform/window escape가 rect 기반으로 동작하는 규칙
- behavior state와 animation state를 분리하는 이유
- LLM 응답이 직접 좌표를 제어하지 않고 `ManagerBehaviorIntent`만 전달하는 구조

## ChatGPT Questions

- 이 프로젝트에서 TDD 테스트가 어떤 요구사항을 문서화하는지 설명해줘.
- behavior state와 animation state를 분리하는 이유를 예시로 설명해줘.
- LLM 응답을 state machine에 안전하게 연결하려면 어떤 검증이 필요해?
