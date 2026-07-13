# 005 — Connection·App Server ingress architecture pattern을 지도화한다

## Wayfinder ticket

- Type: research
- State: open
- Blocked by: tickets/003-pin-upstream-source-provenance.md

## Question

Pinned `openai/codex`의 `app-server-client`와 App Server에서 process·connection bootstrap, single ingress, request/response demultiplexing, notification drain, bounded buffering, transport terminal과 shutdown을 어떤 module과 task가 소유하며, AY-PLE이 채택할 pattern·제품 adapter에서 달라질 지점·따라 하면 안 되는 구현 편의를 어떻게 구분할 것인가?

기존 research의 결론을 복사하지 말고 pinned checkout의 source와 tests에서 재검증해 architecture evidence asset으로 남긴다.

## Answer

Ticket을 resolve할 때 작성한다.
