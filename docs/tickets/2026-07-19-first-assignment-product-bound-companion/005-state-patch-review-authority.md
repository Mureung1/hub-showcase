# 005 — StatePatch Review authority를 완성한다

## Agent triage

- State: claimed
- Surface: local-ticket
- Next actor: /implement (current corrective session)

## Parent Spec

[First Assignment Product-bound Codex Companion](../../specs/2026-07-19-first-assignment-product-bound-companion.md)

## What It Delivers

Native Codex가 narrow custom MCP `propose_state_patch`로 selected TXT 근거가 연결된 Assignment 변경을 제안하고, App이 stable pending `StatePatch`로 검증·저장한 뒤 exact Plan question과 결합해 nominal accept·reject를 `UserConfirmation`과 confirmed `SemesterModel`에 원자적으로 정산하는 deterministic product authority를 완성한다. Revision과 loss/recovery behavior는 ticket 008이 이 authority 위에 추가한다.

## Spec Traceability

- User stories: 5, 6, 8, 11
- Implementation contract: Canonical `propose_state_patch` contract; Durable state and atomic apply; Plan `request_user_input` adaptation; Data and State Flow 6–9

## Slice-Specific Constraints

- `StatePatch`는 `ModelingRun`과 독립이다. Optional opaque origin provenance 외 mandatory FK나 1:1 lifecycle을 두지 않는다.
- Tool은 exactly one `assignment.upsert`와 `title`, `dueAt`, `submissionMethod`, field-level evidence만 허용한다. Generic JSON Patch나 arbitrary app state CRUD를 만들지 않는다.
- Evidence는 active proposal context의 selected material ID, source digest, field와 byte-preserving decoded exact quote를 검증한다. Unselected source, stale digest, quote mismatch와 ambiguous time은 valid patch를 만들지 않는다.
- App-issued proposal context는 workspace, Course, selected material baseline, base revision과 single-use `requestKey`를 묶는다. Browser/model이 key를 임의 발급할 수 없다.
- Same key+canonical payload replay는 same `patchId`와 current status를 반환하고 conflicting payload는 conflict다. Native `toolCallId`는 dedupe authority가 아니다.
- MCP tool은 pending patch만 만들며 confirm, apply, `UserConfirmation` 또는 `SemesterModel` mutation을 수행하지 않는다.
- Product Review는 exact active pending patch 하나와 native `request_user_input`을 bind한다. 일반 Plan clarification과 Codex execution approval은 academic state를 바꾸지 않는다.
- Accept/reject는 product transaction을 native answer보다 먼저 commit한다. Accept만 canonical Assignment와 revision을 바꾸고 reject는 no-apply decision을 남긴다.
- Decision key는 one-settlement boundary다. Nominal same-decision retry는 기존 outcome을 반환하지만 cross-layer duplicate·late response, revision replacement와 continuation loss는 ticket 008이 구현·검증한다.
- Custom MCP hosting은 이 exact tool에 한정하며 raw App Server gateway나 generic workflow framework로 넓히지 않는다. MCP elicitation을 confirmation에 사용하지 않는다.
- `StatePatch`, `UserConfirmation`과 confirmed `SemesterModel`은 001의 existing workspace-local versioned store와 transaction boundary를 evolve한다. 별도 product store·database나 parallel format authority를 만들지 않고 newer `incompatible/readOnly` 상태의 fail-closed 동작을 보존한다.

## Acceptance Criteria

- [x] Valid proposal context와 MCP payload가 stable pending `StatePatch`를 만들고 canonical Assignment values와 field-level evidence를 보존한다.
- [x] Malformed payload, unselected source, stale digest/revision, quote mismatch와 invalid value가 product validation failure가 되며 confirmed state를 바꾸지 않는다.
- [x] Same `requestKey` replay가 같은 patch를 반환하고 conflicting payload가 second patch 없이 거절된다.
- [x] Plan user-input request가 exact active patch 하나와 bind되고 일반 clarification은 product Review로 승격되지 않는다.
- [x] Accept가 `UserConfirmation(accepted)`, Assignment apply, revision increment와 patch `applied`를 한 atomic commit으로 기록한다.
- [x] Reject가 `UserConfirmation(rejected)`와 patch `rejected`를 기록하고 `SemesterModel`을 바꾸지 않는다.
- [x] Nominal same-decision retry가 existing outcome을 반환하고 stale base·conflicting decision이 second confirmation·apply를 만들지 않는다.
- [x] Restart/reopen 뒤 settled confirmation, patch history, apply outcome와 confirmed Assignment를 같은 workspace에서 읽는다.
- [x] Deterministic Runtime/MCP harness가 proposal→question→answer sequence를 검증하며 Browser UI 없이도 product authority를 증명한다.

## Verification

- Targeted test or command: product/domain unit tests, workspace-local transaction/reopen tests, deterministic Runtime+MCP integration tests in `@ay-ple/server`
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run check:docs-links`, `git diff --check`
- Manual or live smoke: 없음. Native provider conformance와 Browser Review는 후속 tickets가 소유한다.

검증 결과:

- `NODE_OPTIONS=--experimental-vm-modules npx tsx --test apps/server/src/state-patch-review.test.ts apps/server/src/semester-workspace.test.ts`가 17개 test를 통과했다. Valid/invalid proposal, exact quote·digest, request/decision idempotency, exact Plan binding, accept/reject atomic state, stale base, Assignment update, v1→v2 migration, v3 read-only와 reopen corruption guard를 포함한다.
- `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run check:docs-links`, `git diff --check`가 모두 exit 0으로 통과했다.
- Manual/live smoke는 수행하지 않았다. Ticket이 명시한 대로 native provider conformance, public action HTTP와 Browser Review는 후속 ticket의 검증 표면이다.
- Fixed point `679b983c76c9d75ecdcab75f656282578d430566` 이후 diff를 Standards와 Spec 두 축으로 병렬 review했다. Spec review의 wrong-interaction nominal retry 1건은 exact interaction·patch·decision triple 검증과 regression test로 수정했고 follow-up review가 통과했다. Standards의 duplicated validation 판단은 shared pure validator로 해소했다. `superseded | interrupted` lifecycle은 parent spec의 명시적 durable contract라 유지했으며, workspace aggregate와 transaction locality를 한 controller에 두는 module 크기 판단은 documented-standard 위반이 아니어서 새 persistence authority를 만들지 않았다.

## Blocked By

- [001-repeatable-semester-workspace-foundation.md](001-repeatable-semester-workspace-foundation.md) — 반복 가능한 SemesterWorkspace 기반을 연다
- [004-product-capable-codex-runtime.md](004-product-capable-codex-runtime.md) — Codex runtime을 product-capable seam으로 확장한다

## Starting Points

- `apps/server/src/codex-chat.ts`
- `apps/server/src/codex-chat-service.ts`
- `apps/server/src/semester-workspace.ts`
- `apps/server/src/semester-workspace.test.ts`
- `apps/server/src/testing/codex-chat-test-support.ts`
- `packages/codex-chat-runtime/src/testing.ts`
- `CONTEXT.md`
- `docs/architecture/codex-native-product-composition.md`

## Result

Existing workspace-local store를 v2 aggregate로 확장해 stable workspace ID, canonical Assignment, `StatePatch`와 `UserConfirmation`을 같은 authority와 reopen 경계에 보존한다. v1 Course·material identity·revision은 additive migration하고, unknown current shape, aggregate relation 손상과 newer v3+ store는 bytes를 덮어쓰지 않고 fail closed한다.

App-issued proposal session은 selected material ID·digest, Course, workspace와 base revision에 exact `propose_state_patch` 하나를 결합한다. Tool은 one `assignment.upsert`, bounded values, explicit known UTC offset과 field-level exact quote를 검증해 pending patch만 만든다. Canonical replay는 settled current status까지 같은 patch를 반환하고 conflicting payload, stale context와 재활성화 전 session은 mutation 없이 거절한다.

Exact same-Turn Plan question만 product Review가 되며 accept/reject transaction은 native answer보다 먼저 commit된다. Accept는 Assignment create/update, revision, accepted confirmation과 applied outcome을 함께 기록하고 reject는 model을 바꾸지 않은 채 rejected confirmation과 no-apply outcome을 기록한다. Nominal retry는 original interaction·patch·decision triple이 같을 때만 기존 outcome을 반환한다. Deterministic product Runtime과 real in-process MCP handler가 Browser 없이 proposal → question → commit → answer → same-Turn terminal과 reopen을 증명한다. Product action admission/HTTP, Browser Review, revision replacement와 loss/recovery는 tickets 006·008에 남는다.

Implementation commits:

- `82c1c91d` — `docs: claim StatePatch review authority`
- `7d15f0bd` — `feat: add pending Assignment patch authority`
- `695eaa66` — `feat: atomically accept Assignment reviews`
- `cfb658d3` — `test: cover rejected Assignment reviews`
- `49420879` — `test: harden StatePatch authority boundaries`
- `1053b065` — `docs: record StatePatch review authority`
- `4d46886e` — `fix: preserve exact Review retry binding`
- `aa53d0ed` — `fix: validate persisted Assignment targets`
