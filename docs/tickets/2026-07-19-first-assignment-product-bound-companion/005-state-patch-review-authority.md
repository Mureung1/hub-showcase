# 005 — StatePatch Review authority를 완성한다

## Agent triage

- State: claimed
- Surface: local-ticket
- Next actor: /implement (current session)

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

- [ ] Valid proposal context와 MCP payload가 stable pending `StatePatch`를 만들고 canonical Assignment values와 field-level evidence를 보존한다.
- [ ] Malformed payload, unselected source, stale digest/revision, quote mismatch와 invalid value가 product validation failure가 되며 confirmed state를 바꾸지 않는다.
- [ ] Same `requestKey` replay가 같은 patch를 반환하고 conflicting payload가 second patch 없이 거절된다.
- [ ] Plan user-input request가 exact active patch 하나와 bind되고 일반 clarification은 product Review로 승격되지 않는다.
- [ ] Accept가 `UserConfirmation(accepted)`, Assignment apply, revision increment와 patch `applied`를 한 atomic commit으로 기록한다.
- [ ] Reject가 `UserConfirmation(rejected)`와 patch `rejected`를 기록하고 `SemesterModel`을 바꾸지 않는다.
- [ ] Nominal same-decision retry가 existing outcome을 반환하고 stale base·conflicting decision이 second confirmation·apply를 만들지 않는다.
- [ ] Restart/reopen 뒤 settled confirmation, patch history, apply outcome와 confirmed Assignment를 같은 workspace에서 읽는다.
- [ ] Deterministic Runtime/MCP harness가 proposal→question→answer sequence를 검증하며 Browser UI 없이도 product authority를 증명한다.

## Verification

- Targeted test or command: product/domain unit tests, workspace-local transaction/reopen tests, deterministic Runtime+MCP integration tests in `@ay-ple/server`
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run check:docs-links`, `git diff --check`
- Manual or live smoke: 없음. Native provider conformance와 Browser Review는 후속 tickets가 소유한다.

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
