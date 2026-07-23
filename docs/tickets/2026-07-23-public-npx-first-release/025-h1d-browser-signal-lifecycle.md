# 025 — H1d — Browser·signal lifecycle을 bounded하게 닫는다

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

[AY-PLE public npx 첫 출시](../../specs/2026-07-23-public-npx-first-release.md)

## What It Delivers

Preflight가 검증한 Chrome/Chromium에서 H1b exact Origin을 shell 없이 열고, Browser는 host lifetime owner가 아닌 foreground AY-PLE의 UI로만 동작한다. Browser open failure, startup/fatal Runtime failure와 `SIGHUP`·`SIGINT`·`SIGTERM`이 하나의 idempotent bounded shutdown으로 합류해 listener, Runtime process tree와 H1c instance lease를 순서대로 닫고 orphan 없이 종료한다.

## Spec Traceability

- User stories: 2, 3, 9, 12, 16
- Implementation contract: Production host와 root — foreground lifecycle, Browser open와 signal shutdown
- Failure behavior: Browser open failure, signals, primary `SIGKILL`, Runtime/startup failure
- Testing decisions: Host lifecycle/preflight/same-origin/static/signal tests와 process graph cleanup

## Slice-Specific Constraints

- `/usr/bin/open -a <verified-canonical-app-path> <exact-origin>`을 argument array로 실행하고 shell interpolation을 쓰지 않는다. Preflight가 검증한 Browser path와 actual open target은 같아야 한다.
- Browser는 verified Runtime artifact와 ready product host 뒤에만 연다. Browser/tab close를 host cancel·shutdown이나 setup discard로 해석하지 않는다.
- Initial open 또는 secondary reopen failure는 fixed localhost URL 추측이나 success를 합성하지 않는다. Secondary failure는 primary를 보존하고 initial failure는 started listener/Runtime/lease를 닫은 뒤 non-zero로 끝난다.
- `SIGINT`, `SIGTERM`, `SIGHUP`, startup exception과 fatal Runtime exit는 같은 shutdown promise에 join한다. Signal handler가 즉시 `process.exit()`하거나 async work를 `exit` event에서 시작하지 않는다.
- Shutdown은 새 HTTP/product admission 차단, listener bounded drain/force-close, Server/Runtime process-group reap·stdio close 확인, matching instance lease removal 순서다.
- 두 번째 signal은 같은 cleanup에 join하고 hard-exit shortcut을 만들지 않는다. `SIGINT=130`, `SIGTERM=143`, `SIGHUP=129` 또는 fatal non-zero status를 보존한다.
- Primary `SIGKILL`은 success receipt를 만들 수 없다. Pipe EOF 뒤 Runtime tree disappearance와 next invocation의 proven-safe reclaim 또는 explicit `recovery_required`만 허용한다.
- Actual release resource/descriptor, packed `.tgz`, OAuth/Ready와 public delivery는 주장하지 않는다. H1 completion은 synthetic/preverified input의 host lifecycle evidence다.
- H owner surface 밖의 Server/Runtime/UI/package manifest·lock를 수정하지 않는다. Fixed handoff, sibling merge·cherry-pick 금지, 최대 3 writer와 C-owned shared delta 규칙을 따른다.

## Acceptance Criteria

- [ ] Verified Chrome/Chromium path가 exact H1b Origin을 shell 없이 열고 unsupported/default Browser fallback이 0건이다.
- [ ] Initial Browser open은 preflight, verified Runtime artifact와 host readiness 뒤에만 발생하며 tab close가 host lifetime을 끝내지 않는다.
- [ ] Initial open failure가 listener, active Runtime/streams와 matching instance lease를 bounded cleanup한 뒤 non-zero로 종료한다.
- [ ] `SIGINT`, `SIGTERM`, `SIGHUP`, startup exception과 fatal Runtime exit가 한 idempotent shutdown graph로 합류한다.
- [ ] Shutdown 중 새 HTTP/product operation이 차단되고 listener drain/force-close, Server close, Runtime process-group disappearance, stdio close와 lease-last ordering이 증명된다.
- [ ] Repeated/second signal이 cleanup을 우회하지 않고 conventional exit status가 actual outer process까지 관찰된다.
- [ ] Representative primary `SIGKILL` 뒤 listener, Python bridge/native process와 ownership state가 false success 없이 사라지거나 explicit recovery-required로 남는다.
- [ ] Normal close, every signal, Browser/open failure와 fatal child path 뒤 orphan process, open port와 held lease가 0건이다.
- [ ] H1a–H1d synthetic/preverified host suite와 root four gates가 independent fixed-SHA review에서 green이다.

## Verification

- Targeted test or command: `ay-ple` Browser adapter tests, actual-child `SIGHUP`/`SIGINT`/`SIGTERM`/second-signal/fatal-child matrix, Browser-open failure와 representative primary `SIGKILL` process-tree test
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run check:docs-links`, `git diff --check`
- Manual or live smoke: Supported local Chrome/Chromium에서 synthetic/preverified host Origin을 실제로 열고 normal close와 one signal path의 Browser-independent host lifetime, exit status, port/process/lease cleanup을 확인한다. OAuth와 public package는 사용하지 않는다.

## Blocked By

- [024-h1c-single-instance-secondary-reopen.md](024-h1c-single-instance-secondary-reopen.md) — H1c — single instance와 secondary reopen을 보장한다

## Starting Points

- H1c singleton/reopen coordinator
- H1b dynamic listener and bounded close interface
- H1a verified Browser selection
- Spine S2/C1 Server shutdown handle
- `packages/codex-chat-runtime/src/testing-process-tree.ts`
- `apps/server/src/testing/product-shutdown.actual.ts`
- `apps/server/src/testing/live-signal.ts`
- `scripts/test-product-entrypoint.mts`

## Delivery Handoff

| Field | Contract |
| --- | --- |
| node | `H1d` — `H1` completion |
| owner | `H` — Public host |
| branch | `codex/public-preview-h1d-browser-lifecycle` |
| worktree | `/Users/swh/Desktop/code/ai-agent-challenge/hub-public-preview-worktrees/h1d-browser-lifecycle` |
| handoffSha | Claim 시 coordinator가 024의 fixed reviewed SHA를 integration branch에 merge하고 H1c 및 integration root gates를 green으로 확인한 뒤 exact integration HEAD를 기록한다. Placeholder·branch name·가짜 SHA를 쓰지 않는다. |
| writablePaths | `apps/ay-ple/src/**` 중 `host-contract.ts` 제외; host adapter/actual-child tests; `docs/tickets/2026-07-23-public-npx-first-release/025-h1d-browser-signal-lifecycle.md`. Package/root manifest·lock와 other owner source는 제외한다. |
| consumedContracts | H1a verified Browser/preflight; H1b exact Origin/listener/Server close; H1c instance ownership; Runtime process-tree supervisor and S1 host lifecycle result |
| predecessorEvidence | 024 fixed reviewed SHA와 integration merge receipt, one-primary/secondary protocol receipt, inherited H1a/H1b gates, root four-gate result |
| requiredChecks | Browser open/failure; signal/second-signal/fatal-child actual matrix; listener/Runtime/process/lease cleanup; representative SIGKILL evidence; host workspace and root four gates; docs links; `git diff --check` |
| reviewOwner | H author가 아닌 independent process/lifecycle reviewer |
| handoffArtifact | Fixed reviewed H1 completion SHA, public host run/close entrypoint path, full H1 lifecycle receipt와 synthetic/preverified host evidence consumed by I0 |
