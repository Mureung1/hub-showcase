# 026 — I0 — Deterministic Setup→Ready integration을 닫는다

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

[AY-PLE public npx 첫 출시](../../specs/2026-07-23-public-npx-first-release.md)

## What It Delivers

실제 Browser→Vite→Express→`@ay-ple/product-contract`→production setup facade→deterministic Runtime seam에서 Account screen부터 Guided Setup, `Semester Ready`, same-version relaunch까지를 검증한다. Durable boundary fault, response loss, duplicate command, discard replay, account/workspace transition race와 hostile native context를 같은 suite에서 닫고, `Spine S2`가 고정한 기존 academic-kernel fail-closed oracle도 회귀로 소비한다.

## Spec Traceability

- User stories: 3–14, 16
- Implementation contract: `Module Responsibilities and Seams`의 Chat Shell product UI, Server setup adapters, `AccountRuntimeCoordinator`, `SemesterWorkspaceAdmission`·`SetupJourney`
- Implementation contract: `Data and State Flow`, `Failure Behaviour`의 setup approval, durable envelope, recovery와 Runtime transition
- Implementation decisions: `Parallel delivery contract`의 `H1 → I0`, I-owned cross-surface fixture/E2E authority
- Testing decisions: `Highest practical seam`의 `setup_deterministic(I0)`, `Targeted and integration tests`, `UI, live와 public acceptance`

## Slice-Specific Constraints

- Production setup facade와 deterministic account/runtime adapter를 사용한다. Browser route나 product source에 test-only 분기를 넣지 않고 adapter·fixture·evidence는 public package에서 제외한다.
- Account screen→OAuth-success projection→setup draft→final approval→Ready→same-version relaunch의 production command graph를 검증한다. Course, 자료, Assignment나 post-Ready action을 Ready 조건으로 합성하지 않는다.
- B-owned fault injector를 그대로 소비해 temp write, file sync, rename, directory sync, readback의 직전·직후와 response loss·duplicate approve·discard replay를 검증한다. Fault semantics를 E2E 편의를 위해 재정의하지 않는다.
- Browser-safe projection에서 raw path, receipt phase, digest, Runtime/native/account private identity가 DOM, URL, Browser storage와 client log에 0건이어야 한다.
- `Spine S2`의 invalid evidence/unselected source, quote mismatch, stale base, duplicate/late Review safe-failure/no-mutation trace를 삭제·완화하거나 fixture 변경으로 숨기지 않는다.
- 구현 branch는 coordinator가 blocker merge 뒤 기록한 immutable `handoffSha`에서만 시작한다. Sibling branch merge/cherry-pick은 금지하며 integration은 coordinator의 reviewed fixed SHA `--no-ff` merge만 허용한다.
- 전체 lane writer는 동시에 최대 3명이고 이 worktree에는 writer 1명만 둔다. Shared contract, root/workspace manifest, lockfile 또는 TypeScript graph 변경이 필요하면 직접 수정하지 않고 C-owned serial delta로 반환한다.
- Review는 fixed candidate SHA에 고정한다. Review 뒤 commit이 바뀌면 기존 승인은 무효이며 새 handoff와 독립 review가 필요하다.
- 외부 GitHub/npm/Pages/OAuth provider write는 0이다. Deterministic adapter만 사용한다.

## Acceptance Criteria

- [ ] Fresh isolated roots에서 Account screen→deterministic connected state→Guided Setup→final approval→`Semester Ready`가 real Chromium과 production facade를 통과한다.
- [ ] Final approval 전 workspace와 durable setup envelope mutation이 0이며, approval 뒤에만 nonexistent child leaf가 exclusive하게 생성된다.
- [ ] Ready snapshot은 admitted v3 workspace, verified built-in bundle, connected account와 workspace Runtime을 뜻하고 Course·자료·학업 action을 포함하지 않는다.
- [ ] Same-version relaunch가 setup wizard를 건너뛰고 같은 Ready workspace를 열며 transient transcript나 pending native prompt를 복원하지 않는다.
- [ ] Durable fault와 response-loss matrix가 old-or-new complete envelope로만 수렴하고 duplicate workspace, partial publish와 false Ready가 0건이다.
- [ ] Duplicate approve, stale/discard replay, account/runtime transition lease race가 single accepted outcome 또는 명시적 recovery로 fail closed한다.
- [ ] Hostile ancestor Git/user context와 injected ambient config가 package-owned instructions·Skills나 controlled roots에 섞이지 않는다.
- [ ] Browser-visible surface와 client storage/log의 private-field leak scan이 0건이다.
- [ ] `Spine S2` consolidated academic-kernel negative trace와 기존 lower-seam tests가 그대로 green이다.
- [ ] Deterministic adapter, fixture와 recorder가 packed/public file roster에 포함되지 않는다.

## Verification

- Targeted: I0 Playwright setup/Ready suite, B-owned setup fault matrix, fixture roster equality와 private-field leak scan
- Regression: `npm run test:e2e`와 `Spine S2` consolidated fail-closed trace
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run check:docs-links`, `git diff --check`
- Packaging check: generated/public package file roster에 deterministic adapter·fixture·evidence recorder가 없음을 검증한다.
- Review evidence는 exact candidate SHA, 명령, tool version, pass/fail 수와 owner-only artifact path를 기록한다.

## Blocked By

- [025-h1d-browser-signal-lifecycle.md](025-h1d-browser-signal-lifecycle.md) — H1d — Browser·signal lifecycle을 bounded하게 닫는다

## Starting Points

- `apps/chat-shell/e2e/chat-shell-harness.ts`
- `apps/chat-shell/e2e/chat-shell.spec.ts`
- `apps/chat-shell/e2e/workspace-recovery.spec.ts`
- `apps/chat-shell/e2e/source-workbench.spec.ts`
- `apps/chat-shell/playwright.config.ts`
- `apps/server/src/testing/codex-chat-test-support.ts`
- `apps/server/src/testing/product-shutdown.actual.ts`
- `scripts/test-product-entrypoint.mts`
- `@ay-ple/product-contract`의 S1 frozen Account/Setup/Ready fixtures
- Predecessor가 만드는 production setup facade, B-owned fault injector와 public host entrypoint — claim 시 exact path를 재확인한다.

## Delivery Handoff

| Field | Contract |
| --- | --- |
| node | `I0` / owner `I` |
| owner | Integration/QA lane writer 1명 |
| branch/worktree | `codex/public-preview-i0-deterministic-setup` / `/Users/swh/Desktop/code/ai-agent-challenge/hub-public-preview-worktrees/i0-deterministic-setup` |
| handoffSha | 025가 integration branch에 merge되고 required gates가 green인 뒤 coordinator가 기록한 immutable full SHA. 이 티켓 문서에서 값을 추측하거나 placeholder SHA를 handoff로 사용하지 않는다. |
| writablePaths | `apps/chat-shell/e2e/**`; `docs/tickets/2026-07-23-public-npx-first-release/026-i0-deterministic-setup-ready-integration.md` |
| consumedContracts | S1 Browser-safe fixtures; S2 negative oracle; B-owned admission/setup envelope/fault injector; A-owned transition lease; H1 public host lifecycle |
| predecessorEvidence | 025 fixed review SHA와 merge receipt; latest C-owned `contractTipSha`; H1 host lifecycle gate; B2/A1/C1 integration receipts |
| requiredChecks | Focused I0 matrix, full E2E, fixture equality, private-field leak and pack-exclusion scans, root four checks, docs links, `git diff --check` |
| reviewOwner | I author가 아닌 독립 cross-surface QA reviewer. Fixed review SHA만 승인한다. |
| handoffArtifact | `i0-deterministic-setup-ready-handoff.json` 또는 동등한 owner-only evidence: input SHA, reviewed SHA, commands/tool versions, trace roster와 artifact digests를 포함한다. |
| delivery topology | Sibling branch merge/cherry-pick 금지; coordinator-only `--no-ff` integration; 전체 active lane writer 최대 3명; shared delta는 C가 직렬 소유한다. |
| external writes | 0. Deterministic local verification만 허용한다. |
