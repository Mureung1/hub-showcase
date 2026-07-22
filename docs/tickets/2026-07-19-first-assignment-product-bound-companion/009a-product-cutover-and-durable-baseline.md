# 009a — Product path로 cut over하고 첫 durable baseline을 확정한다

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

[First Assignment Product-bound Codex Companion](../../specs/2026-07-19-first-assignment-product-bound-companion.md)

## What It Delivers

Deterministic Browser product vertical과 exact Runtime conformance가 모두 green인 상태에서 canonical local app startup·Browser·Server caller를 product path로 전환한다. 이후 tracer-only Chat route·full-screen ownership과 stale fixed permission copy를 제거하고 current store format을 첫 durable compatibility baseline으로 확정한다.

## Spec Traceability

- User stories: 1–12
- Implementation contract: Complete First Assignment vertical acceptance; Compatibility and Migration; Testing Decisions — Full Browser gate and final commands

## Slice-Specific Constraints

- Full Browser gate는 parent spec의 nominal·revision·reject·loss·guard·isolation traces를 real Chromium→Vite→Express→product store/deterministic Runtime에서 다시 검증한다. 001–008b가 이미 만든 trace를 새 workflow나 중복 harness로 재구현하지 않고 cutover regression oracle로 사용한다.
- Canonical `npm run dev -- --app-data-root ...`는 product composition을 직접 소유한다. Product native `cwd`는 active ready `SemesterWorkspace`에서 오며 independent process-fixed `CODEX_CHAT_WORKSPACE`를 product prerequisite로 요구하지 않는다.
- Root entrypoint·listener/shutdown actual verification을 legacy `dev:chat-only`/four-route probe가 아니라 canonical product startup과 product operation으로 전환한다. Tracer route·Browser owner 제거 뒤 유효한 internal purpose가 남지 않는 `dev:chat-only` package script와 전용 test·owning docs도 함께 제거하고 alias나 별도 supported product path로 남기지 않는다.
- Product sidebar의 current text Chat survivor behavior는 `/api/product/chat/messages`로 이미 migration돼 있어야 한다. 모든 product caller가 shared product seam을 사용한 뒤에만 `/api/codex-chat/*` status·four routes, Browser legacy Chat owner와 fixed `deny_all + read_only` public copy를 제거한다.
- Internal official SDK supervision, Runtime package와 exact lifecycle은 product implementation에 계속 필요하면 유지한다. 삭제 대상은 tracer-only public surface와 stale ownership이다.
- `CodexChatService` 전체를 legacy로 간주해 삭제하지 않는다. Account Readiness, product thread/Turn, interaction·interrupt, Runtime terminal observation·recycle·bounded close처럼 product operation이 사용하는 survivor를 보존하고, tracer-only status·no-argument thread/text Turn method와 public contract만 제거하거나 더 좁은 product lifecycle owner로 정리한다.
- Product caller와 Server composition은 cutover 뒤 tracer-only status·text Turn operation을 호출하지 않고 product-capable input·interaction과 supervised lifecycle만 사용한다. Internal Runtime interface의 text methods나 그 regression test까지 단지 이름 때문에 분리·삭제하지 않으며, 009에서 만든 product actual/local-provider oracle은 caller 전환 뒤에도 그대로 green이어야 한다.
- Compatibility alias, raw event gateway, second engine abstraction과 automatic state migration을 만들지 않는다.
- Workspace-local confirmed state와 history는 rollback이나 cutover에도 삭제하지 않는다. Current canonical v2 store를 첫 durable compatibility baseline으로 기록한다.
- Canonical product Server process를 실제로 종료하고 같은 appDataRoot·SemesterWorkspace로 다시 시작한 뒤 Browser bootstrap이 confirmed Assignment·revision과 settled history를 다시 여는 trace를 추가한다. Unanswered prompt와 transient transcript는 복원하지 않는다.
- Cutover 이후 physical schema change는 explicit version bump와 migration 또는 fail-closed rejection을 요구하고 silent reset을 허용하지 않는다. Generic migration framework를 선행 구현하지 않는다.
- Runtime·Server·Chat Shell package README, Codex Chat implementation map과 Codex Runtime 격리 문서는 current implemented behavior, root/cwd ownership과 remaining deferred Chat capability를 owning-document-first로 갱신한다. Parent spec의 pre-implementation `Current implementation` 서술도 final completion outcome과 혼동되지 않게 정렬한다. Work order/status는 development backlog에서만 갱신한다.
- Final review는 fixed point 대비 repository Standards와 parent Spec 두 축을 모두 수행한다.

## Acceptance Criteria

- [ ] Existing Full Browser E2E가 parent spec의 아홉 representative trace와 1440×900 desktop accessibility를 cutover 뒤에도 통과하며 같은 behavior를 위한 중복 workflow/harness가 생기지 않는다.
- [ ] Canonical product startup이 explicit appDataRoot와 active ready SemesterWorkspace로 product action·Chat을 실행하고 bounded shutdown한다.
- [ ] Product composition과 actual entrypoint tests가 independent process-fixed legacy workspace를 product `cwd` authority로 사용하지 않는다.
- [ ] Product caller·sidebar가 legacy `/api/codex-chat/*` frame/thread/status와 `useChatShell`을 사용하지 않는다.
- [ ] 네 tracer route/status, Browser legacy Chat owner와 stale fixed permission copy가 caller migration 뒤 compatibility alias 없이 제거된다.
- [ ] `dev:chat-only` script와 tracer-only entrypoint를 전제한 test·documentation이 제거되고 canonical product command만 supported local entrypoint로 남는다.
- [ ] Canonical product Server process stop/start 뒤 Browser bootstrap이 같은 workspace의 confirmed Assignment·revision과 settled history를 다시 열고 transient transcript·unanswered Review는 복원하지 않는다.
- [ ] Product lifecycle survivor가 tracer-only HTTP/Server caller에서 분리되고 009의 product actual/local-provider conformance가 cutover 뒤에도 green이다. 이를 위해 불필요한 Runtime interface split을 만들지 않는다.
- [ ] Current store format과 support policy가 owning document에 first durable compatibility baseline으로 기록되고 user state를 삭제·silent reset하지 않는다.
- [ ] Generic transcript persistence, conversation catalog, unanswered Review hydration, approval center와 mobile scope를 구현에 섞지 않는다.
- [ ] Root `npm test`, `npm run test:e2e`, typecheck, build, Chat lint, docs links와 exact conformance gate가 모두 green이다.
- [ ] Parent spec, Runtime/package README, Server·Chat Shell README, implementation map과 development backlog가 pre-implementation baseline, current implementation과 deferred work를 정확히 구분한다.
- [ ] Source/Standards/Spec review finding을 해결하고 tracked working tree가 clean이다.

## Verification

- Targeted test or command: full Chat Shell Playwright, canonical product entrypoint/process/shutdown actual gate
- Repository checks: `npm test`, `npm run test:e2e`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run check:docs-links`, exact Runtime conformance commands from 009, `git diff --check`
- Manual or live smoke: canonical product command으로 fresh materialized SemesterWorkspace의 complete two-TXT action, accept, confirmed reload와 clean shutdown을 확인한다.

## Blocked By

- [009-exact-runtime-product-conformance.md](009-exact-runtime-product-conformance.md) — final product seam의 exact/live conformance를 먼저 증명한다

## Starting Points

- Parent spec `Testing Decisions`, `Compatibility and Migration` and complete Browser traces
- `package.json`
- `scripts/product-development-bootstrap.mts`
- `scripts/test-dev-entrypoint.mts`
- `apps/server/src/server.ts`
- `apps/server/src/codex-chat-config.ts`
- `apps/server/src/codex-chat-service.ts`
- `apps/server/src/codex-chat-http.ts`
- `apps/server/src/testing/first-assignment-product.actual.ts`
- `apps/server/src/testing/first-assignment-product.live.ts`
- `apps/chat-shell/src/App.tsx`
- `apps/chat-shell/src/use-chat-shell.ts`
- `apps/chat-shell/src/chat-api.ts`
- `apps/chat-shell/src/chat-model.ts`
- `apps/chat-shell/src/chat-presentation.tsx`
- `apps/chat-shell/src/use-product-chat.ts`
- `apps/chat-shell/src/product-api.ts`
- `packages/codex-chat-runtime/src/runtime-contract.ts`
- `packages/codex-chat-runtime/src/exact-product-local-provider-fixture.ts`
- `packages/codex-chat-runtime/src/runtime.actual.test.ts`
- `packages/codex-chat-runtime/src/local-provider.actual.test.ts`
- `packages/codex-chat-runtime/manifests/`
- `packages/codex-chat-runtime/upstream/PATCHES.md`
- `docs/architecture/codex-chat-implementation-map.md`
- `docs/architecture/codex-runtime-isolation.md`
- `docs/product/ay-ple-development-backlog.md`
