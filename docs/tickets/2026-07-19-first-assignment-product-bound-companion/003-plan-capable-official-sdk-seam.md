# 003 — Official SDK에 Plan interaction seam을 연다

## Agent triage

- State: claimed
- Surface: local-ticket
- Next actor: /implement (current session)

## Parent Spec

[First Assignment Product-bound Codex Companion](../../specs/2026-07-19-first-assignment-product-bound-companion.md)

## What It Delivers

Exact official Python SDK high-level surface가 native Plan `collaborationMode`와 built-in `request_user_input`을 직접 사용하고, sole reader를 막지 않은 채 typed pending request를 나중에 answer 또는 cancel하여 같은 native `Turn`을 이어갈 수 있게 한다. Rust Core의 Plan behavior나 tool을 다시 구현하지 않고 current ordered patch discipline 안에서 누락된 client seam만 보완한다.

## Spec Traceability

- User stories: 4, 6, 7, 10, 12
- Implementation contract: Plan `request_user_input` adaptation; Compatibility and Migration; Testing Decisions — SDK patch unit/conformance

## Slice-Specific Constraints

- Source authority는 pinned `openai/codex@8c68d4c87dc54d38861f5114e920c3de2efa5876`, native `0.144.4`와 package-owned unpatched SDK snapshot이다.
- Exact Plan collaboration semantics, built-in question schema, same-Turn function output와 continued sampling은 direct reuse한다.
- High-level Turn input에는 Plan `collaborationMode`를 추가하고 exact `item/tool/requestUserInput`만 typed pending request로 surface한다. Generic raw server-request gateway를 만들지 않는다.
- Reader는 synchronous private handler에서 Browser answer를 기다리지 않는다. Request를 bounded pending route로 넘긴 뒤 response·notification을 계속 drain한다.
- Caller는 raw JSON-RPC request ID를 보지 않고 typed request와 later answer/cancel operation만 사용한다.
- Request-before-`turn/start` response race, one-settlement, duplicate·late response, interrupt·close cleanup과 bounded capacity를 patch 내부에서 정산한다.
- 한 Turn의 concurrent pending request overwrite를 허용하지 않는다. Overflow나 second request는 자동 응답 없이 affected Turn interaction failure로 드러낸다.
- `autoResolutionMs`, silent default answer와 MCP elicitation을 product confirmation seam에 추가하지 않는다.
- Ordered patch는 exact preimage, changed source, official tests, public signature tests, Ruff와 manifest/provenance ledger를 함께 갱신한다.
- 기존 patches `0001`–`0005`의 behavior와 official high-level Chat API를 깨뜨리지 않는다.

## Acceptance Criteria

- [ ] Public async high-level API가 Plan `collaborationMode`를 exact native request에 전달한다.
- [ ] Exact `request_user_input` request가 typed pending object로 한 번 전달되고 caller answer가 같은 native Turn의 function output이 된다.
- [ ] Pending answer 동안 unrelated response·notification이 계속 처리돼 sole-reader liveness가 유지된다.
- [ ] Request가 `turn/start` response보다 먼저 도착하는 deterministic fake에서도 acceptance와 pending identity가 손실되지 않는다.
- [ ] First valid answer 또는 cancel만 request를 consume하고 duplicate·late response는 deterministic conflict다.
- [ ] Interrupt, terminal, SDK close와 transport loss가 pending route를 한 번 정산하고 waiter·callback을 남기지 않는다.
- [ ] Per-Turn one pending과 global bounded capacity, overflow와 control reserve가 deterministic tests로 검증된다.
- [ ] Public API signature, official SDK suite, Ruff, ordered patch derivation과 provenance/manifest verification이 green이다.
- [ ] Raw App Server request type이나 private client handler가 package root public API로 새어 나오지 않는다.

## Verification

- Targeted test or command: `npm run validate:exact-sdk -w @ay-ple/codex-chat-runtime`
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run check:docs-links`, `git diff --check`
- Manual or live smoke: 없음. Exact source와 purpose-built actual-child fake가 이 slice의 authority다.

## Blocked By

None — can start immediately.

## Starting Points

- `packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/api.py`
- `packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/client.py`
- `packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/async_client.py`
- `packages/codex-chat-runtime/python/openai-codex/sdk/python/tests/test_public_api_signatures.py`
- `packages/codex-chat-runtime/upstream/PATCHES.md`
- `packages/codex-chat-runtime/scripts/exact_sdk.py`
- `docs/wayfinding/codex-chat-application-foundation/assets/state-patch-review-interaction-donor.md`
