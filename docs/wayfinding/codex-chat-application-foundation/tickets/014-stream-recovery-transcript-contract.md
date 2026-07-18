# 014 — Stream disconnect와 cold·live transcript recovery 계약을 검증한다

## Wayfinder ticket

- Type: prototype
- State: open
- Blocked by: [Conversation catalog와 cold recovery capability를 확인한다](006-official-conversation-cold-recovery.md), [Live turn rejoin과 pending interaction capability를 확인한다](007-official-live-rejoin-pending-capabilities.md), [Conversation Interface를 세 가지로 설계한다](012-conversation-interface-alternatives.md), [두 client와 restart 후 resume로 ownership을 검증한다](013-two-client-resume-probe.md)

## Question

Accepted turn의 실행 수명을 Browser HTTP connection과 분리할 때 explicit interrupt, late attach, reload와 connection loss는 어떤 snapshot·cursor·replay 또는 re-read 전략으로 cold transcript와 live event에 수렴하며 duplicate·gap·unknown outcome·buffer expiry를 어떻게 드러내야 하는가?

## Resolution evidence

- Acceptance 전후 disconnect, explicit interrupt, reconnect와 terminal sequence
- `thread/read` snapshot과 live event overlap의 ordering·dedupe key·lossiness matrix
- Representative user/agent message와 terminal의 paired cold/live trace
- Bound, expiry, backpressure, terminal authority와 자동 retry 금지 규칙
- Transport library와 production implementation을 제외한 `/prototype` verdict
