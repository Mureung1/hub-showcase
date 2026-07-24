# 021 — C1 — Account·Setup 기능을 Server에 직렬 조립한다

## Agent triage

- State: completed
- Surface: local-ticket
- Next actor: coordinator/H1a

## Parent Spec

[AY-PLE public npx 첫 출시](../../specs/2026-07-23-public-npx-first-release.md)

## What It Delivers

Spine S2의 listener-independent application seam에 A-owned account route adapter와 coordinator, B-owned SetupJourney·projection·readiness·workspace action admission Modules을 feature logic 복제 없이 mount한다. C1은 이 B-owned Modules을 소비하는 Server-private command adapter/router를 소유한다. 하나의 product application에서 account→setup→Ready command graph가 S1 Browser contract로 노출되고, Runtime start와 모든 thread/product action은 fixed workspace boundary와 fresh native-context verifier를 우회하지 못한다.

## Spec Traceability

- User stories: 5–13, 16
- Implementation contract: Module Responsibilities and Seams — Server setup adapters와 Server application composition
- Implementation decisions: Donor, refactor와 replacement — `CodexChatService`, `createServerApplication`, `createProductRouter`; Parallel delivery contract — `C1`
- Testing decisions: Server producer/Browser consumer conformance, exact Origin, legacy 404와 root integration gate

## Slice-Specific Constraints

- C1은 integration branch에서 coordinator가 작성하는 serial composition delta다. A1·B2의 account/setup state machine, filesystem algorithm, Ready commit과 Runtime lifecycle을 복제하거나 수정하지 않는다.
- Account와 setup route를 current `product-http.ts`의 monolith에 feature logic으로 계속 쌓지 않는다. A-owned Account route adapter와 B-owned SetupJourney·projection·readiness·action-admission Modules을 소비하는 C-owned private command adapter/router의 public mount와 shared middleware·close wiring만 소유한다. B가 HTTP setup router를 소유한다는 전제는 사용하지 않는다.
- S1 Browser-safe contract와 private Server/Runtime contract를 연결하되 raw path, token, native ID, Runtime identity, receipt phase와 nested error를 새 wire field로 만들지 않는다.
- 모든 workspace Runtime start, thread start/resume, Turn, Skill과 product academic action이 B-owned fixed project boundary·fresh bundle/effective-context `WorkspaceActionAdmission`을 통과해야 한다.
- Existing product-only route, absent-or-exact Origin mutation guard, neutral NDJSON framing, private MCP loopback/token guard, removed raw/legacy endpoint `404`와 bounded close behavior를 보존한다.
- `C1`은 D1, U1 또는 public host를 기다리지 않으며 static serving, Browser open, listener bind와 environment preflight를 구현하지 않는다.
- Shared contract/manifest 변경이 필요하면 C1 feature wiring에 섞지 않고 별도 reviewed serial `contractTipSha` delta로 먼저 닫는다.
- Sibling lane SHA를 cherry-pick하거나 conflict를 coordinator가 즉석 해결하지 않는다. 013·017 fixed SHA가 integration에 merge되고 green인 exact HEAD에서 작업하며 independent fixed-SHA review를 받는다.

## Acceptance Criteria

- [x] S2 application factory가 A-owned account router/coordinator와 B-owned setup router/SetupJourney/action-admission dependency를 명시적으로 받아 mount한다.
- [x] Account start/status/cancel/logout, setup observe/prepare/approve/recover와 Ready projection이 S1 exact Origin and Browser-safe contract로 round-trip한다.
- [x] Router composition에는 account/setup business state, workspace filesystem operation, Ready pointer write와 Runtime transition algorithm이 없다.
- [x] Runtime start와 every thread/resume/Turn/product action path가 B-owned workspace/action admission을 우회할 수 없는 한 composition graph로 연결된다.
- [x] Transition 중 incompatible command와 invalid/stale opaque command가 feature owner의 stable safe failure로 닫히고 shared adapter가 success를 합성하지 않는다.
- [x] Current First Assignment behavior, Origin/Host guard, NDJSON framing, product-MCP token, legacy/raw route `404`와 shutdown ordering이 regression 없이 유지된다.
- [x] Server producer와 Browser fixture roster equality, private-field leak scan과 all focused route/guard tests가 green이다.
- [x] Root four gates와 independent fixed-SHA Server architecture review가 unresolved finding 0개로 끝난다.

## Verification

- Targeted test or command: `npm test -w @ay-ple/server`, A/B router producer-consumer conformance, action-admission bypass negatives, Origin/404/private MCP and shutdown regression
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run check:docs-links`, `git diff --check`
- Manual or live smoke: Deterministic A/B fixture로 listener-independent Server application을 기동해 account→setup→Ready route graph와 clean close를 확인한다. Live OAuth와 public host는 사용하지 않는다.

## Claim Evidence

| Evidence | Result |
| --- | --- |
| Exact handoff | `533c6a6131ea623f44a67ece930667f329d8b27f` — reviewed A1과 B2b closeout을 DAG 순서로 merge한 clean `codex/public-preview-integration` HEAD다. |
| Completed predecessors | Ticket 013과 Ticket 017은 모두 `State: completed`다. A1 fixed review는 app-wide account/Runtime lease와 Account route adapter를, B2b fixed review는 lease-bound Ready transition/attestation, SetupJourney projection/readiness와 action admission을 unresolved finding 0개로 handoff했다. |
| Integration receipt | Coordinator가 exact handoff에서 root `npm test`, `npm run typecheck`, `npm run build`, Chat Shell lint, docs links와 `git diff --check`가 green인 predecessor/integration receipt를 확인했다. |
| Observable result | GET·POST `/api/product/public-preview`가 S1 frozen contract로 account→setup→Ready graph를 round-trip하고, 모든 real product action route가 B-owned `WorkspaceActionAdmission`을 통과하지 않으면 native thread·Turn·Skill을 시작할 수 없다. |
| Highest practical seam | Listener-independent Express application에 deterministic Account Runtime, real SetupJourney/state store와 admission probes를 조합해 exact Origin, reauth→reconnect→explicit resume, action no-bypass와 bounded close를 검증한다. Live OAuth·public Host는 사용하지 않는다. |
| Scope correction | B는 setup HTTP router가 아니라 SetupJourney·projection·readiness·admission Modules을 소유한다. C1이 frozen Browser contract를 변경하지 않고 이 Modules을 소비하는 Server-private command adapter/router를 새 composition seam으로 소유한다. |

## Owner Delta Evidence

| Evidence | Result |
| --- | --- |
| Earlier A/B fixed-review tip | `1dd8a5af34a23c906ce9a3293291245110ec7408` — 첫 C1 fixed review가 소비한 A/B contract tip이다. |
| B owner delta | `9ef107374`는 explicit Ready recovery ID와 attestation-aware reauthentication projection을 B-owned SetupJourney·projection에 추가했다. Logout·reconnect의 fresh ChatGPT 관찰만으로 false Ready를 열지 않고 explicit resume를 요구하는 route/projection tests가 해당 불변조건을 고정한다. |
| A owner delta | `1dd8a5af3`는 active login attempt 중 `refresh`가 Runtime account를 별도로 read하지 않게 해 attempt correlation과 transition lease를 보존한다. Account route adapter의 active-login refresh test가 이 race guard를 고정한다. |
| Technical review verdict | 두 delta의 상태 전이 책임은 각각 A/B owner에 남고 C composition이 복제하지 않는 것으로 fixed review에서 유지 판정했다. 당시 unresolved corrective findings는 C-owned startup cleanup authority·exact Runtime digest binding·setup business-state 복제였으며 owner delta 자체의 rollback 사유는 없었다. |
| Prior corrective B tip | `92dc1c24f53f0f9a4e788438227b6026edc3a77d`는 matching `setupPlanId`의 in-memory confirmation draft만 지우는 `return_to_input`을 B-owned `SetupJourney`에 추가했다. Invalid state·stale ID는 projection과 durable store를 바꾸지 않는다. Independent B review는 이 tip에서 approval durable commit 뒤 response loss와 queued `return_to_input`이 겹치면 false input으로 열리는 P1을 재현했으므로 이 SHA를 최종 contract tip으로 채택하지 않았다. |
| Current `contractTipSha` | `f24ee0850` — draft command claim을 `SetupJourney`의 공용 serial queue 안에서 수행한다. 같은 tick에도 `return_to_input`이 먼저 호출되면 durable write 없이 input으로 돌아가고, matching `approve`가 먼저면 첫 durable read·effect 전에 claim해 response loss·pre-commit read rejection 뒤 false input을 닫는다. Inverse-order regression을 포함한 `@ay-ple/semester-workspace` 166/166이 green이다. |
| C consumption invariant | 실제로 새 opaque parent selection이 발급된 경우에만 C adapter가 matching `setupPlanId`로 `return_to_input`을 호출한다. C는 setup projection을 별도 boolean으로 재작성하지 않는다. Approval attempt 전에는 새 prepare를 위해 draft를 지울 수 있고, attempt가 시작된 뒤에는 B가 setup conflict로 닫아 durable outcome을 다시 조정하게 한다. |
| C startup cleanup delta | `f2e993e1c` — listener bind/address 실패 뒤 cleanup ambiguity를 별도 listener error로 축소하지 않고 root `ServerStartupCleanupError`의 high-level closure로 보존한다. Coordinator·public-preview composition·application close는 concurrent caller가 attempt 하나를 공유하고 proven complete cleanup만 latch한다. Reject·ambiguous attempt 뒤에도 intake와 lease는 닫힌 채 다음 caller signal로 listener→application→Runtime cleanup을 재시도한다. Occupied-port ambiguity→retry convergence, Server 244/244, typecheck, build, exact package-root export 3개, docs links와 `git diff --check`가 green이다. |
| H1 listener contract corrective delta | H1b integration probe에서 actual Origin 전 application composition이 불가능한 반면 기존 public listener가 application 이후에만 bind하는 cycle을 발견했다. C-owned `bindServerApplicationListener()`가 caller bootstrap handler를 한 번 bind해 actual port를 반환하고, exact application 하나를 private lifecycle claim에 attach한 뒤 caller signal 기반 listener→application→Runtime cleanup과 ambiguous retry를 그대로 재사용한다. H는 private claim이나 Server cleanup을 복제하지 않는다. |

## Completion Evidence

| Evidence | Result |
| --- | --- |
| Fixed reviewed candidate | `ad1d4321f` — `f24ee0850`의 양방향 Setup command ordering과 `f2e993e1c`의 retryable startup cleanup authority를 포함한 clean candidate다. |
| Independent review | Server architecture/Standards와 Ticket 021·parent Spec review가 각각 unresolved finding 0개로 PASS했다. B owner review도 `f24ee0850`의 duplicate approve, read failure, response loss와 relaunch 수렴을 finding 없이 확인했다. |
| Focused verification | `@ay-ple/server` 244/244, `@ay-ple/semester-workspace` 166/166, occupied-port cleanup retry와 exact package-root export 검증이 green이다. |
| Repository verification | Exact candidate에서 `npm test`, root typecheck/build, Chat Shell lint, docs links와 `git diff --check`가 green이다. |
| H1 handoff | H1은 root-exported `createServerApplication()`, 일반 `listenToServerApplication()`, bind-first `bindServerApplicationListener()`와 `ServerStartupCleanupError`만 소비한다. Public host preflight, static serving, request delegate 교체와 Browser open은 C1에 포함하지 않는다. |
| H1 listener corrective fixed review | `4e5083c1957583e8ec8abbbad8c9ab37dac34276` — bind-first capability가 exact-once listener, one genuine application attach와 기존 caller-signal cleanup authority만 공개한다. Independent Server architecture, Standards와 H1b consumer review는 unresolved finding 0건으로 PASS했다. Pre-attach incomplete TCP connection의 bounded force-close를 포함한 Server 252/252, typecheck, root build, exact package-root export 4개, docs links와 `git diff --check`가 green이다. |

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
