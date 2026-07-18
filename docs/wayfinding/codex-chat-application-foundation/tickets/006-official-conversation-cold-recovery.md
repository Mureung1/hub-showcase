# 006 — Conversation catalog와 cold recovery capability를 확인한다

## Wayfinder ticket

- Type: research
- State: open
- Blocked by: [Codex Chat application foundation의 완료 envelope를 확정한다](001-foundation-capability-envelope.md), [현재 Chat capability와 state ownership을 기준선으로 고정한다](002-current-chat-baseline.md)

## Question

Pinned official surface의 `thread/list`, `thread/read`, `thread/resume`, name·archive와 status capability는 persisted thread metadata, turn·item history, pagination과 workspace filtering을 얼마나 보존하며 Browser reload와 Server restart 뒤 transcript 복원·follow-up에 어떤 결손이 남는가?

## Resolution evidence

- Exact signature, generated model, primary test와 on-disk ownership 인용
- New, active, completed, failed, archived와 missing thread의 list/read/resume matrix
- `includeTurns`, pagination, ordering, title/status와 item lossiness
- Native durable identity, process-local handle과 reconstructed transcript의 구분
- Browser read model을 설계하지 않은 `assets/official-conversation-cold-recovery.md`
