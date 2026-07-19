# 004 — Codex runtime을 product-capable seam으로 확장한다

## Agent triage

- State: claimed
- Surface: local-ticket
- Next actor: /implement (corrective active session)

## Parent Spec

[First Assignment Product-bound Codex Companion](../../specs/2026-07-19-first-assignment-product-bound-companion.md)

## What It Delivers

Current supervised Python bridge와 Node `CodexChatRuntime`이 기존 text Chat을 유지하면서 Account Readiness, `SkillInput`·`TextInput`, explicit native permission, Plan·MCP activity와 pending user-input answer/cancel을 browser-safe typed contract로 제공한다. Product caller는 raw protocol이나 generated SDK type 없이 first Assignment action에 필요한 native semantics를 사용할 수 있다.

## Spec Traceability

- User stories: 3, 4, 8, 10, 12
- Implementation contract: Account and native start admission; Modeling input and receipt; Protected execution guard; Plan `request_user_input` adaptation; Browser-safe product operations and activity

## Slice-Specific Constraints

- Existing official SDK, exact native identity, acceptance-first ordering, authoritative terminal, deadline·queue·process-group cleanup을 보존한다.
- Runtime public contract는 structured product Turn을 additive하게 확장한다. Existing text-only caller는 final cutover 전까지 green하게 유지한다.
- Product Turn은 exact managed `SkillInput`과 staged source Markdown paths·Recipe arguments를 가진 `TextInput`을 받는다. First vertical을 위해 `MentionInput`이나 `outputSchema`를 중복 추가하지 않는다.
- Product path는 explicit `ApprovalMode.auto_review + Sandbox.workspace_write`를 전달한다. Codex permission과 AY-PLE `UserConfirmation`을 같은 state나 event로 합치지 않는다.
- Official `AsyncCodex.account()` 결과를 browser-safe Account Readiness로 projection한다. In-app OAuth나 account management는 추가하지 않는다.
- Curated event는 requested Skill, Plan delta/completed, MCP call lifecycle, user-input requested/resolved, Agent message, nonterminal error, interrupt acknowledgement와 terminal/unknown만 포함한다.
- Native thread·turn·item identity와 ordering을 보존하되 raw JSON-RPC ID, complete MCP arguments, path, traceback, credential과 hidden reasoning을 노출하지 않는다.
- Pending interaction은 opaque runtime-lifetime ID를 사용하고 answer/cancel은 saturation 중에도 control reserve로 동작한다.
- Bridge private protocol, deterministic fake와 Node supervisor가 같은 semantics를 구현한다. Browser/product contract가 Python bridge frame shape에 의존하지 않는다.
- Runtime close, terminal, interrupt와 process loss는 active stream과 pending interaction을 once-only로 정산하며 자동 retry나 synthetic success terminal을 만들지 않는다.
- Current fixed `deny_all + read_only` tracer behavior의 제거는 final cutover ticket이 소유한다.

## Acceptance Criteria

- [x] Runtime caller가 Account Readiness를 조회하고 not-ready를 native thread/turn start 없이 구분할 수 있다.
- [x] Structured Turn이 exact `SkillInput` 한 개와 bounded `TextInput`을 upstream request에 전달하고 native acceptance를 반환한다.
- [x] Product Turn의 effective permission이 `auto_review + workspace_write`이며 current text tracer regression과 분리된다.
- [x] Requested Skill, Plan, MCP, user-input, Agent message와 terminal activity가 typed allowlist로 native identity·ordering을 유지한다.
- [x] Pending user-input을 opaque interaction ID로 answer/cancel해 같은 Turn continuation을 관찰한다.
- [x] Duplicate·late answer, overflow, interrupt, terminal, child crash와 close가 interaction·stream·operation을 한 번 정산한다.
- [x] Deterministic runtime fake가 structured input, curated events, pending interaction과 operation call log를 재현한다.
- [x] Existing text turn, interrupt, same-thread follow-up와 process-group cleanup tests가 계속 green이다.
- [x] Browser-safe contract에서 raw protocol, generated model, secret과 absolute source path가 검색·type surface 모두에 나타나지 않는다.

## Verification

- Targeted test or command: `npm run test:bridge-unit -w @ay-ple/codex-chat-runtime`, `npm run test:node-unit -w @ay-ple/codex-chat-runtime`, `npm run test:node-actual -w @ay-ple/codex-chat-runtime`
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run check:docs-links`, `git diff --check`
- Manual or live smoke: provider-free actual-child round trip만 수행한다. Full local-provider product trace는 final conformance ticket이 소유한다.

검증 결과:

- Bridge protocol unit 6개, Node unit 59개, provider-free Node actual-child 63개와 Python bridge actual-child 19개가 통과했다.
- Product pending interaction의 delayed native resolution, resolved-before-continuation·terminal ordering, answer/cancel·invalid retry·duplicate·late·interrupt·in-flight close·stream overflow·App Server loss와 process reap 회귀가 통과했다. Exact Plan actual-child 16개는 in-flight terminal·interrupt·SDK close·transport loss와 approval·post-cleanup acknowledgement global route usage 0도 함께 고정한다.
- Production runtime을 두 번 clean materialize하고 patched wheel SHA-256 `d5d5ed3b9824932ea5ad4e3aed099d1fe2264b5ee8e96560e2264bbc348db325`, bundle roster SHA-256 `b464b035e3507d9959e2c2929d410b2b5487bc234725d2599d8467b40a7866a4`로 verification을 통과했다.
- `npm test`, `npm run typecheck`, `npm run build`, Chat Shell lint, documentation link check와 `git diff --check`가 통과했다.
- Fixed point `d1c046ff9716342d167f1049b074fc596c731633` 이후 diff에 대한 Standards와 Spec 독립 병렬 review의 actionable finding을 모두 반영했다.

## Blocked By

- [003-plan-capable-official-sdk-seam.md](003-plan-capable-official-sdk-seam.md) — Official SDK에 Plan interaction seam을 연다

## Starting Points

- `packages/codex-chat-runtime/src/contract.ts`
- `packages/codex-chat-runtime/src/bridge-protocol.ts`
- `packages/codex-chat-runtime/src/runtime.ts`
- `packages/codex-chat-runtime/src/testing.ts`
- `packages/codex-chat-runtime/python/bridge/ay_ple_codex_bridge/protocol.py`
- `packages/codex-chat-runtime/python/bridge/ay_ple_codex_bridge/runtime.py`
- `packages/codex-chat-runtime/python/bridge/ay_ple_codex_bridge/cli.py`

## Result

기존 text Chat contract를 유지하면서 Node runtime과 private Python bridge에 Account Readiness, exact `SkillInput`·bounded `TextInput`, explicit `auto_review + workspace_write`, Plan·`propose_state_patch` MCP·pending `request_user_input` projection을 additive하게 구현했다. Product caller는 browser-safe `CodexProductCapableRuntime`과 opaque `CodexInteractionId`로 same-Turn answer/cancel continuation을 사용하며 raw JSON-RPC identity, source path, credential, complete MCP payload와 generated SDK model은 public contract에 노출되지 않는다.

Deterministic product runtime과 provider-free actual-child fake가 structured input, native acceptance·ordering, one-settlement, overflow·process loss·close cleanup을 재현한다. First Assignment modeling permission profile은 ADR 0011이 소유하며 기존 text tracer의 `deny_all + read_only` 제거와 Server·Browser product integration은 후속 ticket이 계속 소유한다.

Lifecycle corrective에서는 ordered patch 0006의 opaque answer/cancel을 exact native `serverRequest/resolved` acknowledgement에 결합하고, bridge가 acknowledgement 뒤 one `user_input.resolved`를 같은 Turn continuation·terminal보다 먼저 projection하도록 settlement barrier를 추가했다. Native cleanup이 먼저면 operation error만 반환하고 synthetic resolved/success를 만들지 않는다. Deterministic Runtime의 duplicate·late interaction도 production과 같은 `CodexChatRuntimeError(code='interaction_not_pending', unknownOutcome=false)`를 반환한다.

Conformance correction에서는 SDK가 내부 처리하는 모든 server request ID를 bounded tracker에 보존하고 matching `serverRequest/resolved`를 global route 전에 소비한다. Delayed user-input settlement, default command approval과 terminal cleanup 뒤 늦은 acknowledgement actual-child는 ordering과 global route 사용량 0을 함께 검증한다.

Implementation commits:

- `5a072ed3` — `docs: claim product-capable Codex runtime`
- `1d19c9c3` — `feat: add product-capable Codex runtime`
- `b22a715f` — `fix: harden product interaction settlement`
- `184461b7` — `refactor: name product runtime identities`
- `0d807def` — `refactor: align deterministic runtime identities`
- `73fab9d9` — `fix: bind product settlement to native resolution`
- `e8dac8a4` — `test: admit native settlement notification`
