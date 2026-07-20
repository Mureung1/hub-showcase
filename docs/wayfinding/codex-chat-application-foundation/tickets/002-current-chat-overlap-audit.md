# 002 — 현재 Chat implementation과 prior-art overlap을 기준선으로 고정한다

## Wayfinder ticket

- Type: research
- State: resolved
- Blocked by: [Codex Chat application foundation의 완료 envelope를 확정한다](001-foundation-capability-envelope.md)

## Supersession note

2026-07-18 pivot 이후 current Runtime·Server·Browser baseline과 custom responsibility candidate는 계속 유효하지만, 아래 003–008 broad capability handoff와 기존 009 disposition 순서는 대체됐다. Active route는 [Wayfinder map](../map.md)의 `004 → 005 → 006 → 008 → 009`이며, 002 evidence는 first-vertical overlap의 입력으로만 사용한다.

## Question

확정한 foundation envelope와 비교할 때 current runtime, Server와 Browser는 config, account, workspace, conversation, active turn, transcript, stream, process lifecycle, local security와 실행 entrypoint의 어떤 책임을 custom code로 소유하며, 각 책임에 대응하는 exact official seam·first-party behavior·OSS 또는 platform donor lookup target은 무엇인가? 이번 ticket은 current implementation의 보존·대체를 결정하지 않고 이후 capability research가 판정할 overlap과 evidence candidate만 고정한다.

## Resolution evidence

- Current Module·Interface·state owner·cardinality와 persistence matrix
- 4개 `/api/codex-chat/*` route, process-global 1/1 state와 Browser tab-memory trace
- Exact SDK·native pin, patch·bridge와 first-party behavior reuse의 current provenance boundary
- Runtime supervision, strict decoder, identity reducer와 deterministic E2E를 포함한 custom responsibility별 `keep | replace | delete | research-needed` 후보. 이 ticket에서는 최종 disposition을 내리지 않는다.
- Current limitation과 adopted target을 섞지 않은 cited `assets/current-chat-overlap-audit.md`
- 003–008이 official·first-party·OSS·platform에서 먼저 확인할 bounded exact lookup candidate와 선정 이유

## Answer

[Current Codex Chat overlap audit](../assets/current-chat-overlap-audit.md)에 current Runtime·Server·Browser의 Module·Interface·state owner·cardinality·persistence, 네 `/api/codex-chat/*` route, canonical process-global current conversation/turn `1/1`, Browser tab-memory trace와 exact SDK/native/patch/bridge provenance를 primary code와 tests로 고정했다.

Current custom validation·settlement·deterministic test seam은 `keep`, single-current lease와 transcript reset은 current-code-only `delete`, tracer route·disconnect coupling과 tab-memory ownership은 `replace`, supervision·config/security·bridge/patch·strict decoder/reducer는 `research-needed` 후보로 기록했다. 이는 candidate일 뿐 최종 disposition이 아니며 ADR-required supervised lifecycle·native identity outcome을 제거하지 않는다.

003–008이 먼저 확인할 exact App Server·SDK·first-party source와 OpenCode·Kanna·Open WebUI·Jupyter Server·Apple·WICG donor/platform candidate를 version·commit·license·selection reason과 함께 bounded handoff로 연결했다. 009만 최종 disposition을 결정한다.
