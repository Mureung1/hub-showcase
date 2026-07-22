# 009a — Product path로 cut over하고 첫 durable baseline을 확정한다

## Agent triage

- State: completed
- Surface: local-ticket
- Next actor: none

## Parent Spec

[First Assignment Product-bound Codex Companion](../../specs/2026-07-19-first-assignment-product-bound-companion.md)

## What It Delivers

Deterministic Browser product vertical과 exact Runtime conformance가 모두 green인 상태에서 canonical local app startup·Browser·Server caller를 product path로 전환한다. 이후 tracer-only Chat route·full-screen ownership과 stale fixed permission copy를 제거하고 current store format을 첫 durable compatibility baseline으로 확정한다.

## Spec Traceability

- User stories: 1–12
- Implementation contract: Complete First Assignment vertical acceptance; Compatibility and Migration; Testing Decisions — Full Browser gate and final commands

## Slice-Specific Constraints

- Full Browser gate는 parent spec의 nominal·revision·reject·loss·guard·isolation traces를 real Chromium→Vite→Express→product store/deterministic Runtime에서 다시 검증한다. 001–008b가 이미 만든 trace를 새 workflow나 중복 harness로 재구현하지 않고 cutover regression oracle로 사용한다.
- Canonical `npm run dev -- --app-data-root ...`는 product composition과 runtime root 계산을 직접 소유한다. `packageRoot`에서 verified Runtime artifact를 찾고 explicit `appDataRoot` 아래 app-managed `HOME`·`CODEX_HOME`·`CODEX_SQLITE_HOME`·temp/runtime state를 계산하므로, caller가 여섯 legacy `CODEX_CHAT_*` path를 조립하지 않아도 된다. Ambient root나 `process.cwd()`로 fallback하지 않는다.
- Product native `cwd`는 active ready `SemesterWorkspace`와 정확히 같다. `CODEX_CHAT_WORKSPACE`는 parent spec이 허용한 `semester-workspace-materializer`의 manual-development selection override로만 유지할 수 있으며, Runtime의 독립 path prerequisite·별도 `cwd` authority·장기 product identity가 아니다.
- Root entrypoint·listener/shutdown actual verification을 legacy `dev:chat-only`/four-route probe가 아니라 canonical product startup과 product operation으로 전환한다. Tracer route·Browser owner 제거 뒤 유효한 internal purpose가 남지 않는 `dev:chat-only` package script와 전용 test·owning docs도 함께 제거하고 alias나 별도 supported product path로 남기지 않는다.
- Product sidebar의 current text Chat survivor behavior는 `/api/product/chat/messages`로 이미 migration돼 있어야 한다. 모든 product caller가 shared product seam을 사용한 뒤에만 `/api/codex-chat/*` status·four routes, Browser legacy Chat owner와 fixed `deny_all + read_only` public copy를 제거한다.
- Internal official SDK supervision, Runtime package와 exact lifecycle은 product implementation에 계속 필요하면 유지한다. 삭제 대상은 tracer-only public surface와 stale ownership이다.
- `CodexChatService` 전체를 legacy로 간주하거나 이름 정리를 위해 분해하지 않는다. Account Readiness, product lease·thread/Turn, interaction·interrupt, Runtime terminal observation·recycle·bounded close를 캡슐화하는 deep product lifecycle Module로 보존한다. Product caller 제거 뒤 실제로 참조되지 않는 tracer-only HTTP Interface·status·no-argument thread/text Turn operation만 삭제한다.
- `codex-chat-http.ts`의 tracer router를 제거하기 전에 product HTTP가 사용하는 NDJSON line writer를 neutral Server-private owner로 이동해 단일 구현으로 보존한다. Shared product actual이 사용하는 `codex-chat-test-support`와 listener refusal·close ordering·process-tree reap evidence도 tracer와 함께 삭제하지 않고 canonical product operation gate로 이전한다.
- Browser에서는 `useChatShell`·legacy API/model/presentation owner를 제거하되 `App.css`의 product-shared selector까지 파일 단위로 삭제하지 않는다. Dead legacy selector만 current rendered product tree와 대조해 정리한다.
- Product caller와 Server composition은 cutover 뒤 tracer-only status·text Turn operation을 호출하지 않고 product-capable input·interaction과 supervised lifecycle만 사용한다. Internal Runtime interface의 text methods나 그 regression test까지 단지 이름 때문에 분리·삭제하지 않으며, 009에서 만든 product actual/local-provider oracle은 caller 전환 뒤에도 그대로 green이어야 한다.
- Compatibility alias, raw event gateway, second engine abstraction과 automatic state migration을 만들지 않는다.
- Workspace-local confirmed state와 history는 rollback이나 cutover에도 삭제하지 않는다. Current canonical v2 store를 첫 durable compatibility baseline으로 기록한다.
- Canonical product Server process를 실제로 종료하고 같은 appDataRoot·SemesterWorkspace로 다시 시작한 뒤 Browser bootstrap이 confirmed Assignment·revision과 settled history를 다시 여는 trace를 추가한다. Existing canonical process-control gate와 settled-only Browser hydration oracle을 조합하며, 별도 store/recovery workflow나 두 번째 Runtime harness를 만들지 않는다. Unanswered prompt와 transient transcript는 복원하지 않는다.
- Cutover 이후 physical schema change는 explicit version bump와 migration 또는 fail-closed rejection을 요구하고 silent reset을 허용하지 않는다. Generic migration framework를 선행 구현하지 않는다.
- 새 cutover/durable-compatibility ADR이 product-only public cutover 결정과 canonical v2의 장기 compatibility policy를 소유한다. 이 ADR은 ADR 0012의 Chat-only public-surface consequence만 명시적으로 supersede하고 official SDK reuse, single maintained Runtime graph, no compatibility alias 원칙은 보존한다. Current endpoint·topology와 exact store behavior는 implementation map과 package README가 계속 소유한다.
- Root README, product-contract·Runtime·Server·Chat Shell package README, Codex-native product composition, Codex Chat implementation map과 Runtime 격리 문서를 current implemented behavior, root/cwd ownership과 remaining deferred Chat capability에 맞춰 owning-document-first로 갱신한다. Parent spec의 pre-implementation `Current implementation` 서술도 final completion outcome과 혼동되지 않게 정렬한다. Work order/status는 development backlog에서만 갱신한다.
- Final review는 fixed point 대비 repository Standards와 parent Spec 두 축을 모두 수행한다.

## Acceptance Criteria

- [x] Existing Full Browser E2E가 parent spec의 아홉 representative trace와 1440×900 desktop accessibility를 cutover 뒤에도 통과하며 같은 behavior를 위한 중복 workflow/harness가 생기지 않는다.
- [x] Canonical product startup이 verified package artifact, explicit appDataRoot와 active ready SemesterWorkspace만으로 product action·Chat을 실행하고 bounded shutdown하며, caller에게 여섯 legacy path env 조립을 요구하지 않는다.
- [x] Product composition과 actual entrypoint tests가 active SemesterWorkspace를 exact native `cwd`로 사용한다. Manual-development `CODEX_CHAT_WORKSPACE` override는 workspace selection input으로만 동작하고 independent Runtime root·`cwd` authority가 아니다.
- [x] Product caller·sidebar가 legacy `/api/codex-chat/*` frame/thread/status와 `useChatShell`을 사용하지 않는다.
- [x] 네 tracer route/status, Browser legacy Chat owner와 stale fixed permission copy가 caller migration 뒤 compatibility alias 없이 제거된다.
- [x] `dev:chat-only` script와 tracer-only entrypoint를 전제한 test·documentation이 제거되고 canonical product command만 supported local entrypoint로 남는다.
- [x] Canonical product Server process stop/start 뒤 Browser bootstrap이 같은 workspace의 confirmed Assignment·revision과 settled history를 다시 열고 transient transcript·unanswered Review는 복원하지 않는다. 이 trace는 existing process-control과 Browser hydration infrastructure를 재사용한다.
- [x] Product lifecycle survivor, shared NDJSON writer와 process/shutdown test support가 tracer-only HTTP/Server caller에서 분리되고 009의 product actual/local-provider conformance가 cutover 뒤에도 green이다. 이를 위해 `CodexChatService`나 Runtime interface를 이름 때문에 분해하지 않는다.
- [x] Current store format과 support policy가 새 cutover/durable-compatibility ADR에 first durable compatibility baseline으로 기록되고 user state를 삭제·silent reset하지 않는다. ADR 0012에서 계속 유효한 official SDK·single Runtime·no-alias 결정은 보존하며 `docs/README.md`의 active ADR index를 갱신한다.
- [x] Generic transcript persistence, conversation catalog, unanswered Review hydration, approval center와 mobile scope를 구현에 섞지 않는다.
- [x] Root `npm test`, `npm run test:e2e`, typecheck, build, Chat lint, docs links와 provider-free exact Runtime/product conformance gate가 모두 green이다. 009의 isolated external live-provider evidence는 보존하며 credentials가 다시 명시적으로 제공되지 않아도 009a를 block하지 않는다.
- [x] Parent spec, root README, docs index, product-contract·Runtime·Server·Chat Shell README, native product composition, implementation map, Runtime isolation과 development backlog가 pre-implementation baseline, current implementation과 deferred work를 정확히 구분한다.
- [x] Source/Standards/Spec review finding을 해결하고 tracked working tree가 clean이다.

## Verification

- Targeted test or command: full Chat Shell Playwright, canonical product entrypoint/process stop-start/shutdown actual gate, `npm run test:first-assignment-product-actual -w @ay-ple/server`
- Provider-free conformance: `npm run validate:exact-sdk -w @ay-ple/codex-chat-runtime`, `npm run validate:production-runtime -w @ay-ple/codex-chat-runtime`, `npm run validate:node-runtime -w @ay-ple/codex-chat-runtime`
- Repository checks: `npm test`, `npm run test:e2e`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run check:docs-links`, `git diff --check`
- Manual smoke: canonical product command을 fresh appDataRoot와 explicitly selected caller-owned development workspace로 열어 Browser activation·readiness와 bounded shutdown을 확인한다. Complete two-TXT action과 same-workspace Server stop/start durability는 provider-free actual/E2E가 필수로 증명한다. External live-provider는 isolated auth가 다시 명시적으로 provision되고 실행이 승인된 경우에만 opt-in으로 재실행하며 mandatory 009a gate가 아니다.

| Gate | Outcome |
| --- | --- |
| Product cutover와 durability | Full Chat Shell Playwright `31`개와 camp E2E `8`개가 통과했다. Canonical entrypoint actual은 같은 appDataRoot·SemesterWorkspace로 두 OS process generation을 기동·종료하고, confirmed Assignment·revision·settled history의 exact reopen과 unanswered Review·transient transcript 비복원을 Browser에서 검증했다. |
| Root와 lifecycle | `packageRoot`·`appDataRoot`·`workspaceRoot` pairwise overlap은 canonical materialization 전에 fail closed한다. Product shutdown actual은 Server listener, Python bridge와 native app-server descendant를 bounded하게 reap한다. |
| Exact product conformance | Exact SDK official suite `162 passed, 38 skipped`, production bundle `23` tests·bridge `20` tests, Node actual `68` tests와 local-provider actual이 통과했다. First Assignment product actual과 product shutdown actual도 각각 통과했다. |
| Repository | `npm test`, `npm run typecheck`, `npm run build`, Chat Shell lint, docs link check와 `git diff --check`가 green이다. |
| Review | Fixed point `177f3a30c8b668d56538f343e067037658323c7f`의 최초 Standards·Spec 병렬 리뷰 findings를 모두 수정했다. Corrective review의 lifecycle findings도 해결한 뒤 fixed point `a29add4f` 기준 최종 독립 Standards·Spec 리뷰가 각각 actionable finding `0`건으로 종료했다. |

## Result

Implementation commits `f67fc166`, `b79f6460`, `6f22b694`, `f2bf9aed`에서 Browser·Server·canonical entrypoint를 product-only public surface로 cut over하고 current v2 store를 첫 durable compatibility baseline으로 기록했다. Corrective commits `a29add4f`, `0034e678`에서 actual OS-process restart trace, 세 root의 pairwise isolation, parent pre-implementation baseline, docs ownership과 failure-path cleanup을 보강했다. Legacy `/api/codex-chat/*`, Browser owner와 `dev:chat-only` alias 없이 exact official SDK 기반 product lifecycle만 남았고, parent spec의 모든 local implementation ticket이 완료됐다.

## Blocked By

- [009-exact-runtime-product-conformance.md](009-exact-runtime-product-conformance.md) — final product seam의 exact/live conformance를 먼저 증명한다

## Starting Points

- Parent spec `Testing Decisions`, `Compatibility and Migration` and complete Browser traces
- `README.md`
- `package.json`
- `scripts/product-development-bootstrap.mts`
- `scripts/semester-workspace-materializer.mts`
- `scripts/test-dev-entrypoint.mts`
- `apps/server/package.json`
- `apps/server/src/server.ts`
- `apps/server/src/product-development.ts`
- `apps/server/src/product-development.test.ts`
- `apps/server/src/codex-chat-config.ts`
- `apps/server/src/codex-chat.ts`
- `apps/server/src/codex-chat-service.ts`
- `apps/server/src/codex-chat-http.ts`
- `apps/server/src/product-http.ts`
- `apps/server/src/product-operation-coordinator.ts`
- `apps/server/src/product-bootstrap.test.ts`
- `apps/server/src/semester-workspace.ts`
- `apps/server/src/semester-workspace-store.ts`
- `apps/server/src/testing/codex-chat-shutdown.actual.ts`
- `apps/server/src/testing/codex-chat-test-support.ts`
- `apps/server/src/testing/first-assignment-product.actual.ts`
- `apps/server/src/testing/first-assignment-product.live.ts`
- `apps/chat-shell/e2e/chat-shell-harness.ts`
- `apps/chat-shell/e2e/chat-shell.spec.ts`
- `apps/chat-shell/src/App.tsx`
- `apps/chat-shell/src/App.css`
- `apps/chat-shell/src/use-chat-shell.ts`
- `apps/chat-shell/src/chat-api.ts`
- `apps/chat-shell/src/chat-model.ts`
- `apps/chat-shell/src/chat-presentation.tsx`
- `apps/chat-shell/src/use-product-chat.ts`
- `apps/chat-shell/src/product-api.ts`
- `packages/product-contract/README.md`
- `packages/codex-chat-runtime/src/runtime-contract.ts`
- `packages/codex-chat-runtime/src/exact-product-local-provider-fixture.ts`
- `packages/codex-chat-runtime/src/testing-process-tree.ts`
- `packages/codex-chat-runtime/src/runtime.actual.test.ts`
- `packages/codex-chat-runtime/src/local-provider.actual.test.ts`
- `packages/codex-chat-runtime/manifests/`
- `packages/codex-chat-runtime/upstream/PATCHES.md`
- `docs/adr/0011-reuse-official-codex-python-sdk-for-chat-shell.md`
- `docs/adr/0012-adopt-codex-chat-only-and-remove-legacy-runtime-surfaces.md`
- `docs/README.md`
- `docs/architecture/codex-native-product-composition.md`
- `docs/architecture/codex-chat-implementation-map.md`
- `docs/architecture/codex-runtime-isolation.md`
- `docs/product/ay-ple-development-backlog.md`
