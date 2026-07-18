# 019 — Browser ChatApplication의 state, routing과 hydration을 검증한다

## Wayfinder ticket

- Type: prototype
- State: open
- Blocked by: [Workspace activation과 chat-readiness state machine을 결정한다](010-workspace-readiness-state-machine.md), [Stream disconnect와 cold·live transcript recovery 계약을 검증한다](014-stream-recovery-transcript-contract.md), [Chat application의 Module과 Interface seam을 승인한다](018-chat-application-seams.md)

## Question

Browser에서 bootstrap, conversation catalog, thread-keyed session, active selection, draft, request controller와 transcript projection을 하나의 깊은 `ChatApplication` Module 뒤에 둘 때 URL·history는 어떤 identity를 소유하고 load·reload·switch·stale route를 어떤 hydration state machine으로 수렴시켜야 하는가?

## Resolution evidence

- URL, Browser-local, Server app-data, native thread와 derived projection의 owner matrix
- 최소 두 route alternative와 absolute path 비노출·back/forward·deep-link verdict
- `view + commands` 후보 Interface, thread별 background stream과 cancellation lifecycle
- Bootstrap → list → read/resume → live attach sequence와 race negative controls
- Current reducer·strict decoder를 보존하는 throwaway `/prototype` evidence
