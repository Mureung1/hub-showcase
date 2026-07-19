# 004 — Codex runtime을 product-capable seam으로 확장한다

## Agent triage

- State: claimed
- Surface: local-ticket
- Next actor: /implement (active session)

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

- [ ] Runtime caller가 Account Readiness를 조회하고 not-ready를 native thread/turn start 없이 구분할 수 있다.
- [ ] Structured Turn이 exact `SkillInput` 한 개와 bounded `TextInput`을 upstream request에 전달하고 native acceptance를 반환한다.
- [ ] Product Turn의 effective permission이 `auto_review + workspace_write`이며 current text tracer regression과 분리된다.
- [ ] Requested Skill, Plan, MCP, user-input, Agent message와 terminal activity가 typed allowlist로 native identity·ordering을 유지한다.
- [ ] Pending user-input을 opaque interaction ID로 answer/cancel해 같은 Turn continuation을 관찰한다.
- [ ] Duplicate·late answer, overflow, interrupt, terminal, child crash와 close가 interaction·stream·operation을 한 번 정산한다.
- [ ] Deterministic runtime fake가 structured input, curated events, pending interaction과 operation call log를 재현한다.
- [ ] Existing text turn, interrupt, same-thread follow-up와 process-group cleanup tests가 계속 green이다.
- [ ] Browser-safe contract에서 raw protocol, generated model, secret과 absolute source path가 검색·type surface 모두에 나타나지 않는다.

## Verification

- Targeted test or command: `npm run test:bridge-unit -w @ay-ple/codex-chat-runtime`, `npm run test:node-unit -w @ay-ple/codex-chat-runtime`, `npm run test:node-actual -w @ay-ple/codex-chat-runtime`
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run check:docs-links`, `git diff --check`
- Manual or live smoke: provider-free actual-child round trip만 수행한다. Full local-provider product trace는 final conformance ticket이 소유한다.

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
