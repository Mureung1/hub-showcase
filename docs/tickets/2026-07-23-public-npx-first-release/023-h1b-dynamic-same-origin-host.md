# 023 — H1b — dynamic same-origin host를 기동한다

## Agent triage

- State: completed
- Surface: local-ticket
- Next actor: coordinator integration

## Parent Spec

[AY-PLE public npx 첫 출시](../../specs/2026-07-23-public-npx-first-release.md)

## What It Delivers

H1a가 검증한 startup input으로 `127.0.0.1`의 OS-assigned port 하나를 bind하고, 같은 listener에서 built Chat Shell과 composed product Server를 exact same-origin으로 제공한다. Port probe/rebind race 없이 readiness 전 요청은 503으로 닫히고, ready 뒤에는 product-only API, static assets와 SPA navigation이 서로의 route를 삼키지 않는다.

## Spec Traceability

- User stories: 2, 3, 5, 16
- Implementation contract: Production host와 root — dynamic loopback same-origin listener
- Module responsibilities: `apps/ay-ple` foreground host와 Server application composition
- Failure behavior and testing: listener refusal, static/product Origin guards, no orphan host

## Slice-Specific Constraints

- Bind-first two-phase composition을 사용한다. Bare server를 explicit `127.0.0.1`, port `0`에 한 번 bind하고 actual Origin을 읽은 뒤 C1 application/static delegate를 조립해 atomic하게 교체한다.
- Ready 전 request는 bounded `503`으로 닫힌다. Free port를 probe한 뒤 listener를 닫고 같은 port에 다시 bind하지 않는다.
- Built SPA와 `/api/product/*`는 같은 scheme/host/port에서 제공한다. 별도 Vite dev/preview server나 CORS configuration을 production dependency로 만들지 않는다.
- API가 static fallback에 삼켜지지 않고 removed raw/legacy routes는 `404`다. Hashed assets는 immutable cache, `index.html`은 `no-store`다.
- Exact Host/authority, product mutation Origin와 private product-MCP loopback/token guard는 C1 behavior를 그대로 보존한다.
- Runtime process는 startup requirement에 따라 0개 또는 1개이며 listener/application close는 active Runtime·stream close handle과 합류한다. H1b는 account/setup state를 재구현하지 않는다.
- 이 slice는 single-instance receipt/secondary invocation, Browser open와 process signal policy를 구현하지 않는다.
- H-owned source 밖의 Server composition, UI, descriptor, package manifest/lock를 수정하지 않는다. Shared delta는 C로 반환하고 fixed handoff, sibling merge·cherry-pick 금지와 최대 3 writer 규칙을 따른다.

## Acceptance Criteria

- [x] Host가 explicit `127.0.0.1:0`에 한 번 bind하고 returned actual port로 exact `http://127.0.0.1:<port>` Origin을 만든다.
- [x] Composition 전 request가 `503`으로 fail closed하고 delegate 교체 뒤 같은 listener가 product API와 built SPA를 제공한다.
- [x] Built index, hashed asset와 SPA navigation이 package-relative absolute root에서 동작하며 `/api/*`를 fallback HTML로 바꾸지 않는다.
- [x] Product mutation Origin, unexpected Host/authority와 private MCP token/loopback guard가 current Server contract대로 fail closed한다.
- [x] Removed `/api/codex-chat/*`, raw Runtime protocol와 unsupported legacy route가 계속 `404`다.
- [x] Listener refusal, application composition/static asset failure가 Browser 성공을 합성하지 않고 listener·Runtime·stream을 bounded close한다.
- [x] Caller cwd, hostile `.env`, occupied unrelated port와 fixed `PORT`가 selected Origin이나 asset root authority가 되지 않는다.
- [x] Focused same-origin/static/route tests와 C1 Server shutdown regression이 green이다.

## Verification

- Targeted test or command: `ay-ple` host listener/static tests, C1 Server route/Origin/404/private MCP regression와 temporary-port actual-child test
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run check:docs-links`, `git diff --check`
- Manual or live smoke: Synthetic/preverified Runtime와 package resource fixture로 dynamic local URL을 열어 built SPA와 product status API가 same-origin임을 확인한 뒤 host를 정상 close한다. Browser 자동 open은 아직 하지 않는다.

## Blocked By

- [022-h1a-roots-compatibility-preflight.md](022-h1a-roots-compatibility-preflight.md) — H1a — Public host root와 compatibility preflight를 닫는다

## Claim Evidence

| Evidence | Result |
| --- | --- |
| Exact handoff | `92f8059e21306c7f98c6a83ad6a90ce6c94ab101` — H1a fixed reviewed implementation과 C-owned bind-first listener corrective delta를 non-fast-forward merge한 clean integration HEAD다. |
| Completed predecessor | Ticket 022의 fixed reviewed code `4c3f374ae7ceccd155b7f8b821de7d2fac719920`, evidence tip `4bc286216`과 closure `4582b8d0b`이 모두 exact handoff의 ancestor다. |
| H1a contract | Production `admitApplicationStartup()`은 module-owned package authority, descriptor-driven compatibility, owner-only roots, exact `VerifiedRuntime`과 delayed `createServerAtOrigin(origin)` capability를 제공한다. |
| C listener contract | Fixed reviewed `4e5083c1957583e8ec8abbbad8c9ab37dac34276`의 root-exported `bindServerApplicationListener()`가 bootstrap handler를 exact-once bind하고 actual port, one application attach와 caller-signal cleanup을 기존 Server lifecycle authority로 제공한다. Architecture·Standards·H1b consumer review는 unresolved finding 0건이다. |
| Integration gates | Exact handoff에서 root `npm test`, `npm run typecheck`, `npm run build`, Chat Shell lint, docs links와 `git diff --check`가 green이다. |
| Scope | 이 branch는 `apps/ay-ple/src/**` 중 `host-contract.ts`를 제외한 H-owned host source/tests와 이 ticket만 수정한다. Server/UI/shared contract와 package/root manifest·lock는 수정하지 않는다. |

## Starting Points

- H1a validated startup input and preflight adapter
- `apps/ay-ple/src/host-contract.ts`
- C1 listener-independent Server application factory
- Spine S2 Server close/lifecycle seam
- U1 built Chat Shell output and Vite asset shape
- `apps/server/src/testing/test-server.ts`
- `apps/server/src/testing/product-shutdown.actual.ts`

## Candidate Evidence

이 절은 implementation candidate와 그 뒤의 test-only evidence를 구분한다.

| Evidence | Result |
| --- | --- |
| Candidate | `a61c016dec022028e6182e71108c930b2c6ab05d` — H1a의 exact prepared startup과 C의 bind-first listener를 사용해 dynamic loopback same-origin host를 조립했다. Public root는 `origin`, `port`, bounded `close`만 제공한다. |
| Route matrix | 실제 OS-assigned listener에서 readiness 전 `503`, product API, index, hashed/non-hashed static asset, `HEAD`, SPA navigation, unexpected Host, `/api` namespace, removed/legacy route와 raw traversal·percent encoding·backslash를 검증했다. API-like target은 SPA HTML로 승격되지 않는다. |
| Lifecycle matrix | Listener refusal은 C composition 전 닫히고, composition/static failure와 post-composition cancellation은 C-owned listener/application close authority로 수렴한다. Ambiguous cleanup은 같은 authority가 fresh caller signal을 받는 retry handle을 보존한다. |
| Highest-seam evidence | `251d893983caa403a970fd67fe8af76cd1946d6b` — production dynamic host, 실제 TCP listener와 genuine WeakMap-registered `ServerApplication`으로 ambiguous Runtime close 후 fresh-signal retry, proven close와 exact port refusal을 고정했다. |
| Focused gates | `ay-ple` 105/105와 H1b host tests 13/13, `@ay-ple/server` 252/252, 각 workspace typecheck/build가 green이다. Built `ay-ple` root는 `ApplicationStartupError`, `admitApplicationStartup`, `startDynamicLocalApplicationHost` 세 값만 노출한다. |
| Actual-child correction | Account lifecycle 도입 뒤 stale해진 process-tree fixture에 explicit `accountState`를 요구하는 test-only correction `f06d220d6`을 독립 리뷰 후 integration merge `9a34c8b82`로 먼저 반영했다. Product source, official SDK와 ordered patch stack은 수정하지 않았다. |
| Actual-child receipt | Corrected full tree `13ff137a3`에서 `npm run test:product-shutdown-actual -w @ay-ple/server`가 2/2로 green이다. Product bootstrap이 실제 Python/native process tree close를 요청하고 listener refusal과 child-of-child reap까지 확인한다. |
| Repository gates | Corrected full tree에서 root `npm test`가 exit 0이다. Root typecheck/build, Chat Shell lint, docs links와 `git diff --check`도 green으로 확정한다. |

## Final Review

| Evidence | Result |
| --- | --- |
| Fixed reviewed implementation | `a61c016dec022028e6182e71108c930b2c6ab05d` |
| Tracked lifecycle evidence | `251d893983caa403a970fd67fe8af76cd1946d6b` |
| Independent architecture/security review | Raw request-target 정규화 우회, exact Host, API/static namespace, one-bind readiness와 listener/application cleanup authority를 재검토해 unresolved finding 0건으로 PASS했다. |
| Independent Standards review | Prepared startup authority, public root depth, README의 current/deferred truth와 H/C Module ownership을 검토해 PASS했다. |
| Independent lifecycle re-review | 실제 listener와 genuine C application을 함께 쓰는 ambiguous cleanup retry test가 caller signal, proven close와 port refusal을 모두 고정함을 확인해 PASS했다. Test-only Server factory import는 production dependency/export를 넓히지 않는다. |
| Disposition | H1b code blocker와 verification gap 0건으로 완료한다. Single-instance, Browser open와 signal policy는 계획대로 H1c/H1d가 소유한다. |

## Delivery Handoff

| Field | Contract |
| --- | --- |
| node | `H1b` — H1 dynamic origin |
| owner | `H` — Public host |
| branch | `codex/public-preview-h1b-same-origin` |
| worktree | `/Users/swh/Desktop/code/ai-agent-challenge/hub-public-preview-worktrees/h1b-same-origin` |
| handoffSha | `92f8059e21306c7f98c6a83ad6a90ce6c94ab101` |
| writablePaths | `apps/ay-ple/src/**` 중 `host-contract.ts` 제외; host adapter tests; `docs/tickets/2026-07-23-public-npx-first-release/023-h1b-dynamic-same-origin-host.md`. Package/root manifest·lock와 C1 Server source는 제외한다. |
| consumedContracts | H1a validated startup inputs; S1 host contract; C1 application/close factory; U1 built assets and product Origin contract |
| predecessorEvidence | 022 fixed reviewed SHA와 integration merge receipt, preflight/root fail-closed matrix, inherited D1/U1/C1 receipts, root four-gate receipt |
| requiredChecks | Bind-first/readiness tests; same-origin static/API/SPA/Origin/404 matrix; listener/composition failure cleanup; host workspace test/typecheck/build; root four gates; docs links; `git diff --check` |
| reviewOwner | H author가 아닌 independent HTTP host/Server lifecycle reviewer |
| handoffArtifact | Fixed reviewed H1b SHA, dynamic-origin host interface path, same-origin route/static matrix와 bounded listener-close receipt consumed by H1c |
