# 020 — 일반 2-pane Chat UI와 recovery·accessibility contract를 검증한다

## Wayfinder ticket

- Type: prototype
- State: open
- Blocked by: [Codex Chat application foundation의 완료 envelope를 확정한다](001-foundation-capability-envelope.md), [첫 Chat foundation의 sandbox와 approval policy를 결정한다](015-sandbox-approval-policy.md), [Error, restart와 unknown-outcome recovery를 결정한다](017-error-restart-reconciliation.md), [Browser ChatApplication의 state, routing과 hydration을 검증한다](019-browser-chat-state-routing.md)

## Question

현재 sidebar와 conversation workspace를 일반 Chat foundation으로 유지하면서 account·workspace, conversation list·new·switch·rename·archive, running state, transcript·composer와 recovery action을 1440px~1920px에서 이해 가능하고 접근 가능하게 배치하려면 어떤 UI state와 interaction contract가 필요한가?

## Resolution evidence

- 1440×900와 1920×1080 throwaway prototype 및 사용자 verdict
- Bootstrap, catalog, active conversation, composer의 loading·empty·error·not-found matrix
- Navigation role, focus, keyboard, streaming announcement, scroll anchoring과 reduced-motion contract
- Running conversation 전환, stale·archived route와 retry interaction trace
- 3-pane·자료/IDE pane와 production React implementation의 명시적 제외
