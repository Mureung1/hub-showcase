# 009 — V3 workspace kernel contraction

## Agent triage

- State: claimed
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

`docs/specs/2026-07-27-user-owned-semester-workspace-lifecycle.md`

## What It Delivers

Target workspace lifecycle과 Interaction cutover 뒤 `@ay-ple/semester-workspace`가 user-owned root v4 identity codec만 소유하도록 좁아진다. Consumer 없는 app-owned v3 admission, setup transaction, exact bundle/context guard와 managed workspace resource를 compatibility alias 없이 제거해 App이 다시 workspace file authority를 소유하지 않게 한다.

## Spec Traceability

- User stories: 6, 8
- Implementation contract: Compatibility and Migration, Module Responsibilities and Seams, Root `workspace-state.json`

## Slice-Specific Constraints

- 이 ticket은 expand–migrate–contract sequence의 final contract 단계다. Registry reopen·prepared-root relaunch·recovery와 sibling Interaction persistence contraction이 green이기 전 시작하지 않는다.
- Survivor package는 root v4 identity envelope의 strict codec·classification과 필요한 shared identity validation만 제공한다.
- V3 admission, setup envelope/journey, workspace bundle materializer/verifier, static/effective context guard와 package-managed `resources/workspace/**`를 제거한다.
- Current-v2 compatibility decoder와 old academic store consumer는 sibling Interaction contraction 이후 consumer가 없다면 함께 제거한다. Removed surface를 alias, deprecated export 또는 hidden fallback으로 남기지 않는다.
- Server, Runtime, scripts와 tests에 removed v3/setup/bundle import·fixture가 남아 있지 않아야 한다.
- Existing hidden current-v2, historical v3와 root malformed/future bytes는 filesystem에서 delete, move 또는 rewrite하지 않는다. Unsupported bytes는 target lifecycle의 explicit incompatible/reselect behavior로 보존한다.
- Root v4 state의 opaque `snapshot`을 academic event schema로 확장하거나 app-owned apply authority를 되살리지 않는다.
- Package README, implementation map과 Runtime isolation docs는 implementation fact를 current survivor에 맞추되 historical completed artifacts를 다시 쓰지 않는다.

## Acceptance Criteria

- [ ] `@ay-ple/semester-workspace` public export가 v4 identity codec과 required shared validators만 남기고 v3/setup/bundle/context API를 노출하지 않는다.
- [ ] V3 admission, setup store/journey, bundle/context source와 their package-managed resource tree가 tracked product graph에서 제거된다.
- [ ] Server·Runtime·scripts·type tests에 removed surface import, compatibility adapter와 executable fixture가 없다.
- [ ] V4 exact codec, opaque snapshot와 malformed/legacy non-rewrite regression이 survivor package suite에서 통과한다.
- [ ] Temporary legacy workspace bytes가 contraction 전후 byte-for-byte 같고 startup/install이 자동 migration 또는 deletion을 수행하지 않는다.
- [ ] Owning package README와 architecture map이 user-owned Git workspace와 current survivor만 설명한다.

## Verification

- Targeted test or command:
  - `npm test -w @ay-ple/semester-workspace`
  - `npm run typecheck -w @ay-ple/semester-workspace`
  - `npm run build -w @ay-ple/semester-workspace`
  - `npm test -w @ay-ple/server`
  - Removed export/import inventory check
- Repository checks:
  - `npm test`
  - `npm run typecheck`
  - `npm run build`
  - `npm run lint -w @ay-ple/chat-shell`
  - `npm run check:docs-links`
- Manual or live smoke:
  - Valid v4 workspace와 preserved current-v2/v3/malformed fixtures를 target startup으로 열어 v4 success와 unsupported-byte non-mutation을 확인한다.

## Blocked By

- `008-registry-reopen-prepared-root-relaunch-recovery.md` — Registry reopen·prepared-root relaunch·recovery
- `../2026-07-27-interaction-capability-semantic-review/009-academic-persistence-runtime-contraction.md` — Academic persistence·Runtime contraction

## Starting Points

- `packages/semester-workspace/src/index.ts`
- `packages/semester-workspace/src/contract.ts`
- `packages/semester-workspace/src/v3-codec.ts`
- `packages/semester-workspace/src/admission.ts`
- `packages/semester-workspace/src/setup-envelope-store.ts`
- `packages/semester-workspace/src/setup-journey.ts`
- `packages/semester-workspace/src/workspace-bundle.ts`
- `packages/semester-workspace/src/workspace-context.ts`
- `packages/semester-workspace/resources/workspace/`
- `packages/semester-workspace/README.md`
- `apps/server/src/semester-workspace-store.ts`
- `apps/server/src/semester-workspace-store-v2-parity.test.ts`
