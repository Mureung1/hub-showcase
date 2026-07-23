# 021 — C1 — Account·Setup 기능을 Server에 직렬 조립한다

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

[AY-PLE public npx 첫 출시](../../specs/2026-07-23-public-npx-first-release.md)

## What It Delivers

Spine S2의 listener-independent application seam에 A-owned account router와 coordinator, B-owned setup router·SetupJourney·workspace action admission을 feature logic 없이 mount한다. 하나의 product application에서 account→setup→Ready command graph가 S1 Browser contract로 노출되고, Runtime start와 모든 thread/product action은 fixed workspace boundary와 fresh native-context verifier를 우회하지 못한다.

## Spec Traceability

- User stories: 5–13, 16
- Implementation contract: Module Responsibilities and Seams — Server setup adapters와 Server application composition
- Implementation decisions: Donor, refactor와 replacement — `CodexChatService`, `createServerApplication`, `createProductRouter`; Parallel delivery contract — `C1`
- Testing decisions: Server producer/Browser consumer conformance, exact Origin, legacy 404와 root integration gate

## Slice-Specific Constraints

- C1은 integration branch에서 coordinator가 작성하는 serial composition delta다. A1·B2의 account/setup state machine, filesystem algorithm, Ready commit과 Runtime lifecycle을 복제하거나 수정하지 않는다.
- Account와 setup route를 current `product-http.ts`의 monolith에 feature logic으로 계속 쌓지 않는다. A/B router의 public mount와 shared middleware·close wiring만 소유한다.
- S1 Browser-safe contract와 private Server/Runtime contract를 연결하되 raw path, token, native ID, Runtime identity, receipt phase와 nested error를 새 wire field로 만들지 않는다.
- 모든 workspace Runtime start, thread start/resume, Turn, Skill과 product academic action이 B-owned fixed project boundary·fresh bundle/effective-context `WorkspaceActionAdmission`을 통과해야 한다.
- Existing product-only route, absent-or-exact Origin mutation guard, neutral NDJSON framing, private MCP loopback/token guard, removed raw/legacy endpoint `404`와 bounded close behavior를 보존한다.
- `C1`은 D1, U1 또는 public host를 기다리지 않으며 static serving, Browser open, listener bind와 environment preflight를 구현하지 않는다.
- Shared contract/manifest 변경이 필요하면 C1 feature wiring에 섞지 않고 별도 reviewed serial `contractTipSha` delta로 먼저 닫는다.
- Sibling lane SHA를 cherry-pick하거나 conflict를 coordinator가 즉석 해결하지 않는다. 013·017 fixed SHA가 integration에 merge되고 green인 exact HEAD에서 작업하며 independent fixed-SHA review를 받는다.

## Acceptance Criteria

- [ ] S2 application factory가 A-owned account router/coordinator와 B-owned setup router/SetupJourney/action-admission dependency를 명시적으로 받아 mount한다.
- [ ] Account start/status/cancel/logout, setup observe/prepare/approve/recover와 Ready projection이 S1 exact Origin and Browser-safe contract로 round-trip한다.
- [ ] Router composition에는 account/setup business state, workspace filesystem operation, Ready pointer write와 Runtime transition algorithm이 없다.
- [ ] Runtime start와 every thread/resume/Turn/product action path가 B-owned workspace/action admission을 우회할 수 없는 한 composition graph로 연결된다.
- [ ] Transition 중 incompatible command와 invalid/stale opaque command가 feature owner의 stable safe failure로 닫히고 shared adapter가 success를 합성하지 않는다.
- [ ] Current First Assignment behavior, Origin/Host guard, NDJSON framing, product-MCP token, legacy/raw route `404`와 shutdown ordering이 regression 없이 유지된다.
- [ ] Server producer와 Browser fixture roster equality, private-field leak scan과 all focused route/guard tests가 green이다.
- [ ] Root four gates와 independent fixed-SHA Server architecture review가 unresolved finding 0개로 끝난다.

## Verification

- Targeted test or command: `npm test -w @ay-ple/server`, A/B router producer-consumer conformance, action-admission bypass negatives, Origin/404/private MCP and shutdown regression
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run check:docs-links`, `git diff --check`
- Manual or live smoke: Deterministic A/B fixture로 listener-independent Server application을 기동해 account→setup→Ready route graph와 clean close를 확인한다. Live OAuth와 public host는 사용하지 않는다.

## Blocked By

- [013-a1-account-runtime-transition-lease.md](013-a1-account-runtime-transition-lease.md) — A1 — Account/Runtime transition lease를 직렬화한다
- [017-b2b-lease-bound-ready-relaunch.md](017-b2b-lease-bound-ready-relaunch.md) — B2b — Ready commit과 relaunch를 transition lease 안에서 닫는다

## Starting Points

- Spine S2가 분리한 Server application/listener/environment composition files
- `apps/server/src/server.ts`
- `apps/server/src/product-http.ts`
- A1 `apps/server/src/account-runtime/**`와 account route adapter
- B2 `apps/server/src/setup/**`, `apps/server/src/workspace-admission/**`
- `apps/server/src/testing/test-server.ts`
- `apps/server/src/testing/product-shutdown.actual.ts`
- S1 Product Account/Setup/Ready fixtures

## Delivery Handoff

| Field | Contract |
| --- | --- |
| node | `C1` |
| owner | `C` — Contract/integrator |
| branch | `codex/public-preview-integration` |
| worktree | `/Users/swh/Desktop/code/ai-agent-challenge/hub-public-preview-worktrees/integration` |
| handoffSha | Claim 시 coordinator가 013과 017의 fixed reviewed SHA를 integration branch에 DAG 순서로 merge하고 predecessor 및 integration root gates를 green으로 확인한 뒤 그 exact integration HEAD를 기록한다. Placeholder·branch name·가짜 SHA를 쓰지 않는다. |
| writablePaths | `apps/server/src/server.ts`; `apps/server/src/product-http.ts`; Spine S2가 handoff한 C-owned Server application/composition files와 exact colocated tests; 필요한 reviewed serial C contract delta; `docs/tickets/2026-07-23-public-npx-first-release/021-c1-serial-server-feature-composition.md`. A/B feature implementation paths와 root/workspace manifest·lockfile은 별도 delta 없이는 제외한다. |
| consumedContracts | S2 listener-independent application/close seam; A1 coordinator/account router; B2 SetupJourney/setup router/action admission; S1 Browser-safe fixtures and Origin contract |
| predecessorEvidence | 013·017 fixed reviewed SHAs와 integration merge receipts, A1 transition race matrix, B2 Ready/relaunch and projection conformance, latest applicable `contractTipSha`, root four-gate receipt |
| requiredChecks | Server route/guard conformance; action-admission bypass negatives; Origin/404/private MCP/shutdown regression; producer-consumer fixture equality/leak scan; root four gates; docs links; `git diff --check` |
| reviewOwner | C author가 아닌 independent Server architecture reviewer와 A/B consumer reviewer |
| handoffArtifact | Fixed reviewed C1 composition SHA, host-consumable composed Server application factory path, route/admission graph digest와 green close receipt consumed by H1 |
