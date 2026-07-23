# 023 — H1b — dynamic same-origin host를 기동한다

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

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

- [ ] Host가 explicit `127.0.0.1:0`에 한 번 bind하고 returned actual port로 exact `http://127.0.0.1:<port>` Origin을 만든다.
- [ ] Composition 전 request가 `503`으로 fail closed하고 delegate 교체 뒤 같은 listener가 product API와 built SPA를 제공한다.
- [ ] Built index, hashed asset와 SPA navigation이 package-relative absolute root에서 동작하며 `/api/*`를 fallback HTML로 바꾸지 않는다.
- [ ] Product mutation Origin, unexpected Host/authority와 private MCP token/loopback guard가 current Server contract대로 fail closed한다.
- [ ] Removed `/api/codex-chat/*`, raw Runtime protocol와 unsupported legacy route가 계속 `404`다.
- [ ] Listener refusal, application composition/static asset failure가 Browser 성공을 합성하지 않고 listener·Runtime·stream을 bounded close한다.
- [ ] Caller cwd, hostile `.env`, occupied unrelated port와 fixed `PORT`가 selected Origin이나 asset root authority가 되지 않는다.
- [ ] Focused same-origin/static/route tests와 C1 Server shutdown regression이 green이다.

## Verification

- Targeted test or command: `ay-ple` host listener/static tests, C1 Server route/Origin/404/private MCP regression와 temporary-port actual-child test
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run check:docs-links`, `git diff --check`
- Manual or live smoke: Synthetic/preverified Runtime와 package resource fixture로 dynamic local URL을 열어 built SPA와 product status API가 same-origin임을 확인한 뒤 host를 정상 close한다. Browser 자동 open은 아직 하지 않는다.

## Blocked By

- [022-h1a-roots-compatibility-preflight.md](022-h1a-roots-compatibility-preflight.md) — H1a — Public host root와 compatibility preflight를 닫는다

## Starting Points

- H1a validated startup input and preflight adapter
- `apps/ay-ple/src/host-contract.ts`
- C1 listener-independent Server application factory
- Spine S2 Server close/lifecycle seam
- U1 built Chat Shell output and Vite asset shape
- `apps/server/src/testing/test-server.ts`
- `apps/server/src/testing/product-shutdown.actual.ts`

## Delivery Handoff

| Field | Contract |
| --- | --- |
| node | `H1b` — H1 dynamic origin |
| owner | `H` — Public host |
| branch | `codex/public-preview-h1b-same-origin` |
| worktree | `/Users/swh/Desktop/code/ai-agent-challenge/hub-public-preview-worktrees/h1b-same-origin` |
| handoffSha | Claim 시 coordinator가 022의 fixed reviewed SHA를 integration branch에 merge하고 H1a 및 integration root gates를 green으로 확인한 뒤 exact integration HEAD를 기록한다. Placeholder·branch name·가짜 SHA를 쓰지 않는다. |
| writablePaths | `apps/ay-ple/src/**` 중 `host-contract.ts` 제외; host adapter tests; `docs/tickets/2026-07-23-public-npx-first-release/023-h1b-dynamic-same-origin-host.md`. Package/root manifest·lock와 C1 Server source는 제외한다. |
| consumedContracts | H1a validated startup inputs; S1 host contract; C1 application/close factory; U1 built assets and product Origin contract |
| predecessorEvidence | 022 fixed reviewed SHA와 integration merge receipt, preflight/root fail-closed matrix, inherited D1/U1/C1 receipts, root four-gate receipt |
| requiredChecks | Bind-first/readiness tests; same-origin static/API/SPA/Origin/404 matrix; listener/composition failure cleanup; host workspace test/typecheck/build; root four gates; docs links; `git diff --check` |
| reviewOwner | H author가 아닌 independent HTTP host/Server lifecycle reviewer |
| handoffArtifact | Fixed reviewed H1b SHA, dynamic-origin host interface path, same-origin route/static matrix와 bounded listener-close receipt consumed by H1c |
