# TDD Domain Rules

## Keywords

- TDD
- RED GREEN REFACTOR
- domain logic
- reward progression
- stat growth
- stat budget
- stage appearance
- interaction object
- pet locomotion
- behavior state machine
- weighted random
- ManagerBehaviorIntent
- ManagerBehaviorAdapter
- LLM boundary
- rule fallback

## Why It Matters

UI나 LLM 연결 전에 성장, 보상, 상호작용, 행동 선택 규칙을 테스트로 고정하면 이후 화면과 asset이 바뀌어도 핵심 동작이 흔들리지 않는다.

## Reference Code Paths

- `src/domain/rewardProgression.ts`
- `src/domain/statGrowth.ts`
- `src/domain/stageAppearance.ts`
- `src/domain/interactionObjects.ts`
- `src/domain/petLocomotion.ts`
- `src/domain/petBehaviorStateMachine.ts`
- `src/domain/managerBehaviorIntent.ts`
- `src/domain/managerBehaviorAdapter.ts`
- `src/domain/soundPolicy.ts`
- `src/domain/*.test.ts`
- `.agents/skills/tdd-test-writing/SKILL.md`
- `docs/tdd-workflow-agent.md`

## Current Structure

- `statGrowth`: quest type, difficulty, event result를 stat delta와 budget으로 바꾼다.
- `stageAppearance`: level에 따라 stage를 해금하고, 미해금 stage 선택을 막는다.
- `rewardProgression`: 완료/복구 결과에서 reward 후보를 만든다.
- `interactionObjects`: ladder/platform/window escape를 rect와 resize axis로 표현한다.
- `petBehaviorStateMachine`: 주변 object, mood, recent event를 보고 행동 후보와 weight를 만든다.
- `ManagerBehaviorIntent`: 나중에 LLM이 줄 수 있는 행동 의도를 제한된 값으로 정규화한다.
- `ManagerBehaviorAdapter`: intent와 state machine 결과를 합쳐 최종 behavior와 animation을 고른다.
- `soundPolicy`: muted 기본값과 sound asset fallback을 관리한다.

## Parts To Check

- RED 단계에서 stub은 존재하지만 assertion이 실패하는지
- easy/normal/hard별 stat budget과 primary stat 비율
- failed event에는 EXP/stat reward가 붙지 않는지
- recovery는 별도 보상안이 아니라 조정된 quest difficulty로 다시 평가하는지
- behavior state와 animation state를 분리하는 이유
- LLM 응답이 직접 좌표나 CSS를 제어하지 않고 intent만 전달하는 구조
- reduced motion일 때 climb/jump가 pose fallback으로 바뀌는지

## ChatGPT Questions

- 이 프로젝트에서 TDD가 UI보다 domain logic에 먼저 적합한 이유를 설명해줘.
- `ManagerBehaviorIntent`가 LLM 안전 경계로 동작하는 방식을 설명해줘.
- stat budget을 difficulty별로 고정하면 LLM 평가의 일관성이 어떻게 좋아져?
- behavior state와 animation state를 분리하면 asset 교체가 왜 쉬워져?
