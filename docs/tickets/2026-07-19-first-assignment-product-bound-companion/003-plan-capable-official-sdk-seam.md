# 003 — Official SDK에 Plan interaction seam을 연다

## Agent triage

- State: completed
- Surface: local-ticket
- Next actor: None

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

- [x] Public async high-level API가 Plan `collaborationMode`를 exact native request에 전달한다.
- [x] Exact `request_user_input` request가 typed pending object로 한 번 전달되고 caller answer가 같은 native Turn의 function output이 된다.
- [x] Pending answer 동안 unrelated response·notification이 계속 처리돼 sole-reader liveness가 유지된다.
- [x] Request가 `turn/start` response보다 먼저 도착하는 deterministic fake에서도 acceptance와 pending identity가 손실되지 않는다.
- [x] First valid answer 또는 cancel만 request를 consume하고 duplicate·late response는 deterministic conflict다.
- [x] Interrupt, terminal, SDK close와 transport loss가 pending route를 한 번 정산하고 waiter·callback을 남기지 않는다.
- [x] Per-Turn one pending과 global bounded capacity, overflow와 control reserve가 deterministic tests로 검증된다.
- [x] Public API signature, official SDK suite, Ruff, ordered patch derivation과 provenance/manifest verification이 green이다.
- [x] Raw App Server request type이나 private client handler가 package root public API로 새어 나오지 않는다.

## Verification

- Targeted test or command: `npm run validate:exact-sdk -w @ay-ple/codex-chat-runtime`
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run check:docs-links`, `git diff --check`
- Manual or live smoke: 없음. Exact source와 purpose-built actual-child fake가 이 slice의 authority다.

검증 결과:

- Exact SDK derivation 2회, response-last actual-child 3개, Plan actual-child 13개, bounded actual-child 2개, router unit 45개, official SDK suite 158 passed/38 skipped, Ruff 67개 file과 provenance 17개 entry verification이 통과했다.
- Production runtime materialization과 verification이 통과했다. Patched wheel SHA-256은 `2f422ba797889ba031821adf141147131d617074d116269b5093175289c3911f`, bundle roster SHA-256은 `065a0c32469fa5bb30d8f09cb3242a8ba86869a98f1912503b12bb7079c1cd20`이다.
- Repository checks 전체가 통과했다.
- Waiter saturation corrective fixed point `bdb19a62a9c2046d865dac88b5a61c2844fce64a` 이후 diff에 대한 Standards와 Spec 독립 병렬 review 결과 actionable finding은 각각 0건이다.

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

## Result

Ordered patch `0006-plan-user-input-seam.patch`로 official SDK high-level async API에 exact Plan `collaborationMode`와 typed deferred `request_user_input` seam을 추가했다. Bounded pending/control routing, same-Turn answer/cancel, duplicate·late conflict, interrupt·terminal·close·transport cleanup을 actual-child test로 고정하고 generator, public signature test, package documentation, manifests와 production runtime bundle을 함께 갱신했다.

Corrective pass에서는 cancelled async waiter가 받은 exact request를 terminal-safe하게 복원하고, explicit interrupt와 answer/cancel의 pending consume부터 첫 wire write까지 하나의 settlement lock으로 선형화했다. Internal interrupt writer와 user-input response writer의 half-close 실패는 user-input route와 main response router를 sticky transport terminal로 fail closed하며, broken stdin에서도 child terminate/reap cleanup을 계속한다. 세 lifecycle regression은 materialized patched SDK를 실행하는 public async actual-child test로 고정했다.

Waiter saturation corrective에서는 caller cancellation마다 blocking executor worker를 남기지 않고 async client당 하나의 persistent collector reservation만 유지한다. Collector가 받은 pending token은 router condition lock 안에서 terminal settlement와 원자적으로 claim하므로 terminal이 먼저 정산한 stale request는 다음 waiter에 전달되지 않는다. 64회 연속 cancellation 뒤 public operation·`close()`·child reap liveness와 collector-completion-before-terminal race를 actual-child regression으로 고정했으며, 후자는 test-owned executor completion barrier로 timing sleep 없이 검증한다.

Implementation commits:

- `aa6ae415` — `feat: expose plan user input SDK seam`
- `afe8a762` — `fix: settle plan interaction edge races`
- `91f46844` — `fix: bound plan interrupt control`
- `c5ae2cf1` — `fix: harden Plan interaction lifecycle`
- `86e1e1f5` — `fix: preserve Plan waiter collector capacity`
- `9197b469` — `fix: linearize Plan collector delivery`
- `9a3c66c2` — `test: make Plan collector race deterministic`

현재 SDK seam은 완성됐으며 Server·Node·Browser product projection은 후속 ticket `004-product-capable-codex-runtime.md`가 소유한다.
