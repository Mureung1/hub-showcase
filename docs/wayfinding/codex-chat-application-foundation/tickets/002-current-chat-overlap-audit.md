# 002 — 현재 Chat implementation과 prior-art overlap을 기준선으로 고정한다

## Wayfinder ticket

- Type: research
- State: open
- Blocked by: [Codex Chat application foundation의 완료 envelope를 확정한다](001-foundation-capability-envelope.md)

## Question

확정한 foundation envelope와 비교할 때 current runtime, Server와 Browser는 config, account, workspace, conversation, active turn, transcript, stream, process lifecycle, local security와 실행 entrypoint의 어떤 책임을 custom code로 소유하며, 각 책임에 대응하는 exact official seam·first-party behavior·OSS 또는 platform donor lookup target은 무엇인가? 이번 ticket은 current implementation의 보존·대체를 결정하지 않고 이후 capability research가 판정할 overlap과 evidence candidate만 고정한다.

## Resolution evidence

- Current Module·Interface·state owner·cardinality와 persistence matrix
- 4개 `/api/codex-chat/*` route, process-global 1/1 state와 Browser tab-memory trace
- Exact SDK·native pin, patch·bridge와 first-party behavior reuse의 current provenance boundary
- Runtime supervision, strict decoder, identity reducer와 deterministic E2E를 포함한 custom responsibility별 `keep | replace | delete | research-needed` 후보. 이 ticket에서는 최종 disposition을 내리지 않는다.
- Current limitation과 adopted target을 섞지 않은 cited `assets/current-chat-overlap-audit.md`
- 003–008이 official·first-party·OSS·platform에서 먼저 확인할 bounded exact lookup candidate와 선정 이유
