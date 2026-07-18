# 021 — Verification gate와 spec readiness를 승인한다

## Wayfinder ticket

- Type: grilling
- State: open
- Blocked by: [두 client와 restart 후 resume로 ownership을 검증한다](013-two-client-resume-probe.md), [Stream disconnect와 cold·live transcript recovery 계약을 검증한다](014-stream-recovery-transcript-contract.md), [Browser와 local companion 사이의 authorization을 결정한다](016-browser-companion-authorization.md), [Error, restart와 unknown-outcome recovery를 결정한다](017-error-restart-reconciliation.md), [Chat application의 Module과 Interface seam을 승인한다](018-chat-application-seams.md), [Browser ChatApplication의 state, routing과 hydration을 검증한다](019-browser-chat-state-routing.md), [일반 2-pane Chat UI와 recovery·accessibility contract를 검증한다](020-two-pane-chat-ui-contract.md)

## Question

선택한 Chat application architecture가 implementation-ready spec으로 넘어갈 만큼 falsifiable한지 증명하려면 deterministic Browser E2E, exact local-provider·actual-child, disposable live auth, runtime·Server restart, security와 clean-machine local web entrypoint를 어떤 gate와 failure owner로 검증해야 하는가?

## Resolution evidence

- Module Interface별 unit·integration·Browser·actual-child·live verification matrix
- Two-client, reload, restart, list/read/resume, disconnect와 malformed/stale contract negative controls
- Fake·exact-local·live-provider가 각각 주장할 수 있는 것과 false-green 방지 규칙
- macOS local web one-command entrypoint, clean shutdown과 clean-machine smoke 범위
- Open·claimed ticket 0, remaining fog 0과 `/to-spec` 진행에 대한 사용자 승인
