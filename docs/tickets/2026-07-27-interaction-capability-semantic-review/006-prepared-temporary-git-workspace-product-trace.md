# 006 — Prepared temporary Git workspace product trace

## Agent triage

- State: claimed
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

`docs/specs/2026-07-27-interaction-capability-semantic-review.md`

## What It Delivers

App 실행 전 native Bootstrap Skill로 준비한 temporary Git SemesterWorkspace에서 real built Adapter, shared Server listener, Broker, Runtime project context, inline Review와 installed First Assignment Skill을 한 trace로 조합한다. User accept 전에는 actual file이 바뀌지 않고, accept 뒤 AY가 actual file을 변경해 meaningful Git checkpoint를 남기며 revise·reject와 continuity failure는 승인되지 않은 mutation을 만들지 않는다.

## Spec Traceability

- User stories: 1–10
- Implementation contract: `Data and State Flow`, `Testing Decisions`, `AY-owned mutation boundary`, `Failure Behaviour`

## Slice-Specific Constraints

- Highest practical seam은 real pre-App Bootstrap 결과, real built `@ay-ple/interaction-mcp`, real Server Broker, deterministic Runtime/UI Adapter와 actual temporary Git workspace다. Bootstrap 산출물이나 core interaction behavior를 fake success로 건너뛰지 않는다.
- Fixture는 App Product Turn이 아니라 native client로 blocker Workspace ticket의 Bootstrap Skill을 직접 실행해 만든다. 준비된 root의 tracked project MCP declaration, workspace Skill copy와 `AGENTS.md`를 사용하며 App-owned candidate, Bootstrap Runtime, thread-start MCP override와 managed Skill injection을 되살리지 않는다.
- Target product test harness는 준비된 absolute Git root를 deterministic Runtime/Broker에 직접 공급해 exact-root project context와 required tool readiness seam을 연다. Production `--workspace` resolver, registry와 App startup lifecycle은 이 ticket의 범위가 아니다. Trace는 완료된 W-003 coordinator core가 이미 admission한 한 `product_turn` lease 안에서 request → evidence preflight → inline Review → held result → AY-owned file mutation → Git checkpoint ordering을 관찰하며 candidate·startup lease를 만들지 않는다.
- Proposal 전과 pending 중 actual file bytes·Git index는 unchanged여야 한다. `accept`만 AY mutation을 허용하고 `revise`는 fresh call, `reject`와 모든 MCP failure는 no mutation이다.
- Checkpoint는 explicit pathspec으로 meaningful changed file만 stage하고 unrelated dirty·untracked sentinel을 보존한다. App이 Git command, academic apply나 commit success를 합성하지 않는다.
- Evidence는 actual workspace file의 exact digest·quote occurrence를 사용하고 drift·symlink escape·invalid ref가 Browser card와 mutation 전에 실패함을 보인다.
- Adapter loss, Turn interrupt, Browser disconnect와 Runtime terminal은 normal result를 만들지 않고 pending card, held call과 operation lease를 required ordering으로 정산한다.
- 이 ticket은 public composition을 전환하거나 old academic routes·store를 제거하지 않는다.

## Acceptance Criteria

- [ ] Native Bootstrap Skill이 fresh temporary Git SemesterWorkspace를 준비하고, target product test harness가 그 exact root를 직접 공급했을 때 built Adapter handshake와 exact `ay_ple_interaction` tool readiness가 성공한다. Production startup resolver와 registry는 이 proof에 필요하지 않다.
- [ ] Prepared fixture의 Git root, `workspace-state.json`, `AGENTS.md`, project MCP declaration과 installed First Assignment Skill이 실제 Bootstrap output이며 App이 이를 생성·수정하거나 candidate state로 복제하지 않는다.
- [ ] Valid evidence proposal이 inline card 하나를 만들고 pending 동안 actual file과 Git index가 변하지 않는다.
- [ ] Accept가 같은 MCP call의 result로 AY에 돌아간 뒤 actual file만 변경되고 meaningful checkpoint가 생성되며 unrelated dirty·untracked sentinel은 commit되지 않는다.
- [ ] Revise가 old card를 read-only로 남기고 fresh card를 append하며 accept 전 mutation을 만들지 않는다.
- [ ] Reject, invalid evidence, busy, interrupt, disconnect, Adapter/Runtime loss가 normal result·file mutation·Git checkpoint·App academic apply를 만들지 않는다.
- [ ] Trace가 private token·binding, absolute path, native identity와 old Course·Run·patch·confirmation identity를 Browser 또는 logs에 노출하지 않는다.
- [ ] Repeat run이 deterministic하게 terminal 정산되고 process, pending response와 temporary credential을 남기지 않는다.

## Verification

- Targeted test or command: `npm run test:first-assignment-product-actual -w @ay-ple/server`에 대응하는 target trace command와 관련 Browser E2E를 실행한다.
- Repository checks: `npm run validate:node-runtime -w @ay-ple/codex-chat-runtime && npm run lint -w @ay-ple/chat-shell && npm run typecheck && npm run build && npm test && npm run test:e2e`
- Manual or live smoke: Native Bootstrap 직후와 App trace 뒤 temporary repository의 `git status`, `git log --stat`과 Review transcript를 함께 확인해 prepared output, accept checkpoint와 revise/reject no-mutation을 검증한다.

## Blocked By

- `./003-runtime-neutral-project-mcp-seam.md` — Runtime-neutral project MCP seam
- `./004-first-assignment-built-in-skill.md` — First Assignment built-in Skill
- `./005-inline-semantic-review-vertical.md` — Inline Semantic Review vertical
- `../2026-07-27-user-owned-semester-workspace-lifecycle/003-product-operation-coordinator-and-lifecycle-contract.md` — Product operation coordinator와 lifecycle contract
- `../2026-07-27-user-owned-semester-workspace-lifecycle/005-semester-workspace-init-skill.md` — Pre-App SemesterWorkspace Bootstrap Skill

## Starting Points

- `apps/server/src/testing/first-assignment-product.actual.ts`
- `apps/server/src/testing/first-assignment-product.live.ts`
- `apps/server/src/testing/test-server.ts`
- `apps/server/src/testing/codex-chat-test-support.ts`
- `packages/codex-chat-runtime/src/exact-product-local-provider-fixture.ts`
- `packages/codex-chat-runtime/scripts/official_local_provider.py`
- `apps/chat-shell/e2e/chat-shell-harness.ts`
- `apps/chat-shell/e2e/chat-shell.spec.ts`
- `apps/chat-shell/e2e/fixtures/first-assignment-semester-workspace/`
- `hub/.agents/skills/semester-workspace-init/SKILL.md`
- `hub/skills/ay-ple-first-assignment/`
