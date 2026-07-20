# 006 — First Assignment action stream을 연다

## Agent triage

- State: completed
- Surface: local-ticket
- Next actor: none

## Parent Spec

[First Assignment Product-bound Codex Companion](../../specs/2026-07-19-first-assignment-product-bound-companion.md)

## What It Delivers

Local Server가 active `SemesterWorkspace`·`Course`와 exactly two selected TXT에서 versioned Assignment Recipe를 실행하고, durable `ModelingRun`, source snapshot·guard, native Skill Turn, StatePatch proposal·Review와 authoritative terminal을 하나의 browser-safe curated activity stream으로 조정한다. Invalid admission, interruption과 unknown outcome도 product mutation 없이 정직하게 정산한다.

## Spec Traceability

- User stories: 3, 4, 5, 8, 10, 12
- Implementation contract: Account and native start admission; Modeling input and receipt; Protected execution guard; Browser-safe product operations and activity; Data and State Flow; Failure Behaviour

## Corrective Scope

- Product bootstrap의 Account Readiness가 shared Runtime을 시작해도 preserved `/api/codex-chat/*` tracer가 cold mount의 `starting`에 고착되지 않고 bounded하게 `configured | ready` mutation state로 수렴한다.
- Product Chat의 일반 Plan clarification은 active native interaction에 결합한 ephemeral answer/cancel operation을 제공한다. Product Review와 분리하고 `StatePatch`, `UserConfirmation`과 confirmed state를 바꾸지 않으며 duplicate·late·wrong-operation response를 fail closed 처리한다.
- Private product thread workspace와 MCP credential input은 Node-only package contract에만 두고 Browser-safe `./contract` type surface에서 제거한다.
- Execution guard는 action 시작 때 등록된 `RawMaterial` identity·digest를 보호하되 unrelated unregistered TXT 생성을 source conflict로 승격하지 않는다.
- Product Turn은 owner가 정해지지 않은 model·reasoning posture를 source constant로 고정하지 않고 exact SDK/first-party default를 따른다.
- Architecture 문서는 오래 유지될 mapping과 current supported/unsupported outcome만 소유하며 ticket 순서와 저수준 journal 절차를 반복하지 않는다.

## Corrective Acceptance Criteria

- [x] Full Chat Shell E2E의 cold mount에서 preserved Chat status가 bounded하게 수렴하고 기존 native AgentMessage tracer가 다시 green이다.
- [x] 일반 Plan clarification을 public opaque interaction ID로 answer와 cancel할 수 있고 same Turn continuation을 관찰하며 academic state를 바꾸지 않는다.
- [x] Duplicate·late·wrong-operation clarification response는 native second response나 product mutation 없이 거절된다.
- [x] Browser-safe `@ay-ple/codex-chat-runtime/contract` export에서 workspace path와 private MCP credential input이 사라진다.
- [x] Registered source drift는 conflict를 유지하지만 unrelated unregistered TXT 생성은 action failure나 recovery-required 상태를 만들지 않는다.
- [x] Product Turn request가 owner 없는 explicit model·reasoning 값을 전달하지 않고 runtime tests가 exact default omission을 검증한다.
- [x] Root gates, full Chat E2E와 Standards/Spec review가 finding 없이 통과한다.

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

- [x] Account not-ready와 invalid workspace·Course·Recipe·selection·digest는 native start 0, no `ModelingRun`과 actionable failure로 끝난다.
- [x] Valid request가 exactly one durable Run을 먼저 만들고 exact Skill+Text input으로 one native Turn을 시작한다.
- [x] Acceptance가 same Run의 opaque correlation과 `running` transition에 결합되고 accepted-first stream ordering을 보존한다.
- [x] Selected source snapshot과 baseline이 recorded digest와 일치하고 unselected control이 input·evidence에 섞이지 않는다.
- [x] MCP proposal과 bound Plan Review가 curated stream에 나타나며 raw protocol과 absolute path가 전달되지 않는다.
- [x] Authoritative terminal이 Run을 exactly once 정산하고 interrupt acknowledgement는 terminal을 합성하지 않는다.
- [x] Pre-accept failure, accepted process loss와 store transition loss가 `not_accepted | acceptance_unknown | unknown` 계약에 맞게 정산된다.
- [x] Explicit retry가 새 invocation·Run·Turn을 만들고 이전 receipt를 덮어쓰거나 자동 재시도하지 않는다.
- [x] Terminal·interrupt·unknown 뒤 scratch와 leases가 bounded cleanup되고 cleanup failure는 다음 action을 fresh runtime/recovery path로 제한한다.
- [x] Free-form Chat with/without material selection의 proposal context와 no-`ModelingRun` 경계가 deterministic Server integration으로 검증된다.

## Verification

- Targeted test or command: `npm run test -w @ay-ple/server`, focused deterministic action-stream and fault-injection tests
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run check:docs-links`, `git diff --check`
- Manual or live smoke: deterministic Runtime을 사용한 complete HTTP activity trace. Real provider는 final conformance ticket이 소유한다.

검증 결과:

- `NODE_OPTIONS=--conditions=development npx tsx --test apps/server/src/assignment-recipe.test.ts apps/server/src/assignment-action.test.ts apps/server/src/assignment-action-faults.test.ts`가 23개 test를 통과했다. Account admission, exact Skill input, curated NDJSON ordering, pre-accept·acceptance-unknown·cleanup fault, pre-commit rollback, managed Recipe parent·leaf symlink와 verify-to-native drift를 포함한다.
- Deterministic Server integration이 Assignment proposal → bound Review → authoritative settlement와 free-form Chat의 selected/unselected proposal context, no-`ModelingRun` 경계를 HTTP activity trace로 검증했다. Real provider smoke는 ticket 009의 final conformance 범위라 수행하지 않았다.
- 최종 구현 tree에서 `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run check:docs-links`, `npm run check:bridge -w @ay-ple/codex-chat-runtime`, `npm run test:bridge -w @ay-ple/codex-chat-runtime`, `git diff --check`가 모두 exit 0으로 통과했다.
- Product store는 별도 authority 없이 exact current `formatVersion: 2`를 유지한다. `modelingRuns`와 `executionGuard`는 required field이고, 두 field가 없는 pre-006 v2와 future v3 fixture는 migration·normalization·rewrite 없이 original bytes를 보존한 `incompatible/readOnly`로 검증했다.
- Fixed point `eafdd61e095e7edd937e2a6da711c983ad2a97fe` 이후 diff를 Standards와 Spec 두 축으로 병렬 review했다. Bootstrap/history projection, lifecycle frame, restart reconciliation, accepted correlation, Review binding과 staging ordering의 findings를 regression test와 함께 수정했다. Follow-up Spec review는 finding 0건으로 통과했다. Standards의 managed Recipe symlink escape와 verify-to-native drift는 canonical containment, component validation, `O_NOFOLLOW`, native start 직전 재검증으로 닫았고 최종 Standards·security follow-up이 각각 clean으로 통과했다.
- Corrective focused Server trace `node --test --import tsx apps/server/src/product-chat-action.test.ts`가 일반 Plan clarification의 answer·cancel, same-Turn continuation, no academic mutation과 authoritative late response의 최초·반복 `409` 및 native one-call invariant를 포함한 5개 test를 통과했다.
- Full Chat Shell E2E `npm run test:e2e -w @ay-ple/chat-shell`가 cold `starting → ready` native AgentMessage tracer와 `starting → failed` mutation closure를 포함한 19개 desktop test를 통과했다.
- Corrective 최종 tree에서 `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run check:docs-links`, `npm run check:bridge -w @ay-ple/codex-chat-runtime`, `npm run verify:production-runtime -w @ay-ple/codex-chat-runtime`, `git diff --check`가 모두 exit 0으로 통과했다. Production Runtime bundle은 roster SHA-256 `78a401152a70f3fb5bd0eb37380daa5170692242c629cdb06ff903c6c72af816`로 재검증했다.
- Browser contract typecheck가 private workspace·MCP input의 `./contract` 유출을 거절하고, Runtime tests가 caller-provided `plan` 부재와 first-party advertised default model·reasoning 선택을 검증한다. Registered material drift는 계속 fail closed하고 unregistered transient TXT는 guard conflict나 recovery-required 상태를 만들지 않는 Server regression을 통과했다.
- Corrective fixed point `05ac5dc0b3b5eb84776172eecaa197b9dad56e97` 이후 diff를 Standards와 Spec 두 축으로 재검토했다. Serial late interaction retry와 public conflict 분류 findings를 regression과 함께 닫았고 최종 follow-up은 두 축 모두 finding 0건이다. Browser clarification UI와 actual/live-provider conformance는 각각 007·009에 남겨 두었으며 008을 포함한 sibling ticket의 state는 변경하지 않았다.

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

## Result

Local Server에 first Assignment product operation coordinator를 추가했다. Account와 workspace admission을 통과한 요청은 selected TXT 두 개를 byte-preserving app-owned snapshot으로 staging하고 same workspace-local transaction에 durable `ModelingRun(starting)`과 execution guard를 기록한 뒤, managed Recipe `SkillInput`과 bounded `TextInput`으로 exactly one native Turn을 시작한다. Native acceptance correlation, `running` 전환, MCP proposal, exact Review, terminal settlement와 explicit retry는 같은 Run receipt와 curated browser stream으로 결합된다.

Workspace product store는 `formatVersion: 2` 단일 authority를 그대로 사용하며 `modelingRuns`와 `executionGuard`를 exact required field로 확장했다. Pre-006 v2를 자동 migration하거나 rewrite하지 않고 current-only `incompatible/readOnly` 정책으로 보존한다. 별도 run store, optional normalization과 v3 writer는 만들지 않았다.

Free-form Chat은 active Thread와 동일한 product operation exclusion·stream seam을 사용하지만 `ModelingRun`을 만들지 않는다. Valid material selection에서만 proposal context를 열고, bootstrap은 Account readiness와 settled Run history만 browser-safe shape로 투영한다. Public frame은 native ID, absolute path, complete MCP arguments와 private failure detail을 제거하고 stable derived activity·interaction IDs와 UTF-8 byte bound를 적용한다.

Scratch, source lease와 execution guard는 terminal·unknown·restart에서 bounded cleanup·reconciliation되며 cleanup deadline은 Runtime recycle과 recovery barrier를 요구한다. Managed Recipe는 appData canonical authority 아래의 regular path components만 허용하고 leaf no-follow 검증과 native start 직전 재검증으로 path drift를 fail closed한다.

Corrective에서는 product bootstrap이 먼저 shared Runtime을 시작한 cold mount에서도 preserved Chat status를 bounded polling하여 authoritative `ready | failed`로 수렴시켰다. 일반 Plan clarification은 active native interaction과 같은 Turn에만 존재하는 ephemeral public mapping으로 answer·cancel하고, Review authority 및 `StatePatch`, `UserConfirmation`, confirmed state와 분리한다. Wrong-operation·duplicate·late response는 binding을 consume한 safe `409 interaction_invalid`로 닫아 native second response와 academic mutation을 막는다.

Browser-safe Runtime contract에서는 private product workspace·MCP credential input을 제거하고 Node-only runtime contract가 이를 소유한다. Product Turn caller는 model·reasoning posture를 전달하지 않으며 Python bridge가 native start 직전에 first-party advertised default를 해석한다. Execution guard는 admission 당시 등록된 `RawMaterial` identity·digest만 보호하므로 registered drift는 conflict를 유지하고 unrelated unregistered TXT는 허용한다. 이 수정에서도 existing workspace-local `formatVersion: 2` 단일 authority와 current-only incompatibility 정책을 유지했으며 migration, optional normalization, v3 writer와 parallel run store를 추가하지 않았다.

Implementation commits:

- `a8f72128` — `docs: claim first Assignment action stream`
- `94eeb57c` — `feat: add first Assignment action stream`
- `45c635a9` — `fix: close action stream review gaps`
- `c4561e46` — `docs: reopen first Assignment action stream corrective`
- `5eecf58c` — `fix: converge preserved chat startup`
- `ffc56cbb` — `fix: guard registered workspace materials only`
- `59b46459` — `fix: resume general plan interactions`
- `a8044cfd` — `fix: restore runtime contract ownership`
- `e6397c6b` — `docs: align product interaction boundaries`
- `794e82b8` — `test: align product bootstrap e2e fixture`
- `91cfc92f` — `fix: consume late product interactions`
- `d2324b4f` — `fix: classify late plan interactions`
