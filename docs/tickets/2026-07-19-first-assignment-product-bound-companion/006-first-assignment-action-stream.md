# 006 — First Assignment action stream을 연다

## Agent triage

- State: claimed
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

[First Assignment Product-bound Codex Companion](../../specs/2026-07-19-first-assignment-product-bound-companion.md)

## What It Delivers

Local Server가 active `SemesterWorkspace`·`Course`와 exactly two selected TXT에서 versioned Assignment Recipe를 실행하고, durable `ModelingRun`, source snapshot·guard, native Skill Turn, StatePatch proposal·Review와 authoritative terminal을 하나의 browser-safe curated activity stream으로 조정한다. Invalid admission, interruption과 unknown outcome도 product mutation 없이 정직하게 정산한다.

## Spec Traceability

- User stories: 3, 4, 5, 8, 10, 12
- Implementation contract: Account and native start admission; Modeling input and receipt; Protected execution guard; Browser-safe product operations and activity; Data and State Flow; Failure Behaviour

## Slice-Specific Constraints

- 각 action 직전에 Account Readiness, active workspace/Course, exact Recipe version, arguments, exactly two selected source membership·digest와 recovery guard를 검증한다. Failure는 native start 0, no `ModelingRun`이다.
- Active workspace의 native `cwd`는 001의 ready-only `SemesterWorkspaceController.nativeCwd()`에서만 얻는다. `incompatible/readOnly` workspace, Course 부재 또는 002 registry/selection admission 실패는 Runtime 호출 전에 native start 0으로 닫는다.
- Valid admission은 native call 전에 unique action ID, invocation fingerprint와 source baseline을 가진 durable `ModelingRun(starting)`을 commit한다.
- Selected TXT는 appDataRoot의 run-scoped staging에 byte-preserving snapshot한다. Codex에는 exact managed `SKILL.md`를 `SkillInput`으로, staged Markdown paths와 bounded arguments를 `TextInput`으로 전달한다.
- Receipt는 requested Skill/version, source digests, available opaque native correlation, settlement와 validation outcome만 보존한다. Raw protocol, credential과 complete prompt를 저장하지 않는다.
- Native acceptance 뒤 같은 Run을 `running`으로 전환한다. Pre-accept failure, acceptance unknown, terminal failed/interrupted/completed와 process loss를 분리하고 automatic retry하지 않는다.
- Workspace-local scratch, source digest lease와 confirmed revision guard를 start, proposal, Review, terminal과 next open에서 검증한다. 사용자 원본과 confirmed product store를 Codex write target으로 제공하지 않는다.
- Product stream은 preparing·accepted·terminal, Agent message, requested Skill, Plan, MCP, Review, interrupt acknowledgement, safe error와 honest unknown만 projection한다.
- Public operations은 bootstrap snapshot, Assignment action, free-form Chat with optional current material selection, Review response와 interrupt behavior를 제공한다. Exact URL과 transport library는 implementation detail이다.
- Free-form Chat은 같은 active Thread에 text를 보내고 valid selection이면 proposal context를 만들 수 있지만 `ModelingRun`은 만들지 않는다. Active Turn이 있으면 busy다.
- Existing loopback/exact-or-absent Origin guard와 NDJSON backpressure·control reserve를 유지한다. Absolute paths, complete MCP arguments, traceback과 private IDs를 Browser에 노출하지 않는다.
- Current four tracer routes는 final cutover 전까지 compatibility path로 유지하되 product caller는 새 action seam을 사용한다.
- 006은 001에서 시작하고 002·005가 확장한 same workspace-local versioned store와 transaction boundary를 `ModelingRun`, guard journal, scratch/lease와 settlement record로 evolve한다. 별도 run store나 parallel product authority를 만들지 않는다.

## Acceptance Criteria

- [ ] Account not-ready와 invalid workspace·Course·Recipe·selection·digest는 native start 0, no `ModelingRun`과 actionable failure로 끝난다.
- [ ] Valid request가 exactly one durable Run을 먼저 만들고 exact Skill+Text input으로 one native Turn을 시작한다.
- [ ] Acceptance가 same Run의 opaque correlation과 `running` transition에 결합되고 accepted-first stream ordering을 보존한다.
- [ ] Selected source snapshot과 baseline이 recorded digest와 일치하고 unselected control이 input·evidence에 섞이지 않는다.
- [ ] MCP proposal과 bound Plan Review가 curated stream에 나타나며 raw protocol과 absolute path가 전달되지 않는다.
- [ ] Authoritative terminal이 Run을 exactly once 정산하고 interrupt acknowledgement는 terminal을 합성하지 않는다.
- [ ] Pre-accept failure, accepted process loss와 store transition loss가 `not_accepted | acceptance_unknown | unknown` 계약에 맞게 정산된다.
- [ ] Explicit retry가 새 invocation·Run·Turn을 만들고 이전 receipt를 덮어쓰거나 자동 재시도하지 않는다.
- [ ] Terminal·interrupt·unknown 뒤 scratch와 leases가 bounded cleanup되고 cleanup failure는 다음 action을 fresh runtime/recovery path로 제한한다.
- [ ] Free-form Chat with/without material selection의 proposal context와 no-`ModelingRun` 경계가 deterministic Server integration으로 검증된다.

## Verification

- Targeted test or command: `npm run test -w @ay-ple/server`, focused deterministic action-stream and fault-injection tests
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run check:docs-links`, `git diff --check`
- Manual or live smoke: deterministic Runtime을 사용한 complete HTTP activity trace. Real provider는 final conformance ticket이 소유한다.

## Blocked By

- [002-source-centered-three-pane-workbench.md](002-source-centered-three-pane-workbench.md) — 자료 중심 3-pane workbench를 열고 canonical product bootstrap·RawMaterial registry를 제공한다
- [005-state-patch-review-authority.md](005-state-patch-review-authority.md) — StatePatch Review authority를 완성한다
- [005a-pre-release-product-store-baseline-cleanup.md](005a-pre-release-product-store-baseline-cleanup.md) — pre-release product store를 current canonical v2 baseline으로 정리한다

## Starting Points

- `apps/server/src/codex-chat-service.ts`
- `apps/server/src/codex-chat-http.ts`
- `apps/server/src/product-http.ts`
- `apps/server/src/product-development.ts`
- `apps/server/src/server.ts`
- `apps/server/src/semester-workspace.ts`
- `apps/server/src/semester-workspace.test.ts`
- `apps/server/src/state-patch-review.ts`
- `apps/server/src/state-patch-review.test.ts`
- `apps/server/src/codex-chat-writer.test.ts`
- `apps/server/src/codex-chat-disconnect.test.ts`
- `apps/server/src/testing/test-server.ts`
- `packages/codex-chat-runtime/src/testing.ts`
