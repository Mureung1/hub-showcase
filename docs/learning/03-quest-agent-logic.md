# Quest Agent Logic

## Keywords

- rule-based agent
- quest generation
- quest type
- difficulty
- reward EXP
- stat budget
- stat delta
- stage unlock
- manager persona
- LLM fallback
- failure reason
- rebalancing
- recovery quest
- state transition
- MVP contract

## Why It Matters

Before adding AI APIs, this project keeps quest creation, recovery, stat growth, reward hints, and persona lines rule-based so the core flow is predictable.

## Reference Code Paths

- src/App.tsx
- src/domain/questLogic.ts
- src/domain/statGrowth.ts
- src/domain/rewardProgression.ts
- src/domain/stageAppearance.ts
- src/domain/managerPersonaPolicy.ts
- src/domain/managerBehaviorIntent.ts
- src/domain/managerBehaviorAdapter.ts
- src/data/questLogs.ts
- docs/mvp-functional-spec.md
- docs/user-flow-wireframes.md
- docs/agent-design.md

## Parts To Check

- How profile data becomes a daily quest draft
- `time`, `quantity`, and `action` quest types
- EXP calculation from amount and difficulty
- Failure reason selection and recovery quest creation
- Completed quests should not return to running state
- `createQuestEventRequest()` metadata: `statDeltas`, `rewardCandidates`, `stageUnlocked`, `soundEvent`
- failed event should not create stat growth
- recovery is re-evaluated by the adjusted quest difficulty instead of receiving a separate fixed reward
- persona line generation is separate from animation behavior

## ChatGPT Questions

- Explain rule-based agents versus LLM agents using this project.
- How should failure reasons affect the next recovery quest?
- What data structure is useful for time, quantity, and action quests?
- How can an LLM suggest quest difficulty and stat allocation while rule fallback keeps the result fair?
