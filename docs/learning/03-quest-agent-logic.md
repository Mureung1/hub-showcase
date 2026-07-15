# Quest Agent Logic

## Keywords

- rule-based agent
- quest generation
- quest type
- difficulty
- reward EXP
- failure reason
- rebalancing
- recovery quest
- state transition
- MVP contract

## Why It Matters

Before adding AI APIs, this project keeps quest creation and recovery behavior rule-based so the core flow is predictable.

## Reference Code Paths

- src/App.tsx
- src/layers/agent/ruleBasedAgent.ts
- src/data/quests.ts
- src/domain/types.ts
- docs/mvp-functional-spec.md
- docs/user-flow-wireframes.md

## Parts To Check

- How profile data becomes a daily quest draft
- `time`, `quantity`, and `action` quest types
- EXP calculation from amount and difficulty
- Failure reason selection and recovery quest creation
- Completed quests should not return to running state

## ChatGPT Questions

- Explain rule-based agents versus LLM agents using this project.
- How should failure reasons affect the next recovery quest?
- What data structure is useful for time, quantity, and action quests?
