# 003 — Upstream source provenance를 장기 검증 가능하게 pin한다

## Wayfinder ticket

- Type: research
- State: open
- Blocked by: tickets/002-audit-host-consumers-and-compatibility.md

## Question

`@openai/codex` 실행 artifact, release tag·commit, dev-only source submodule, generated schema digest와 reviewed source path를 어떻게 연결해야 일상 Node workflow에 Rust checkout dependency를 만들지 않으면서 재현 가능한 architecture evidence와 upgrade review gate를 제공할 수 있는가?

## Answer

Ticket을 resolve할 때 작성한다.
