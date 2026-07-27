# 007 — Joint public cutover

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

`docs/specs/2026-07-27-interaction-capability-semantic-review.md`

## What It Delivers

검증된 prepared SemesterWorkspace startup·reopen lifecycle과 InteractionCapability vertical을 AY-PLE의 유일한 public product composition으로 atomic 전환한다. 사용자는 App 실행 전에 준비한 Git workspace에서 일반 AY Chat을 시작하고 inline Semantic Review에 답하며, required Interaction MCP가 준비되지 않으면 registry active pointer가 바뀌거나 workspace가 active처럼 보이지 않는 일관된 Browser experience를 받는다.

## Spec Traceability

- User stories: 1–10
- Implementation contract: `Compatibility and Migration`, `Runtime startup assumption`, `Review round trip`, `Failure Behaviour`

## Slice-Specific Constraints

- Cutover 전 rollback unit은 current source, matching current store와 Runtime graph 전체다. Target Server만 old Browser와 조합하거나 target Browser를 old academic Runtime과 조합하는 half-state를 만들지 않는다.
- Blocker Workspace vertical의 canonical prepared Git root, registry reopen·prepared-root relaunch recovery와 required startup을 ticket 006의 Interaction trace와 한 public composition에서 결합한다.
- First open과 학기 변경은 explicit `--workspace` prepared root를 사용하고, 인자 없는 후속 실행만 registry active pointer를 reopen한다. App 내부 chooser·init·candidate transition을 public path로 복원하지 않는다.
- Shared listener·Broker preparation → exact-root Workspace Runtime → Adapter handshake → exact MCP readiness → registry active pointer commit ordering을 지킨다. Interaction 없는 degraded Workspace Runtime을 정상으로 열지 않는다.
- Public AY Chat은 project-discovered Skill·MCP와 generic Runtime environment를 사용하고 thread-start private MCP override, managed Skill root와 App-owned academic apply를 사용하지 않는다.
- Inline Review endpoint·NDJSON frame과 Browser card는 ticket 005의 target wire만 사용한다. Old patch/revision/replay/continuation semantics를 compatibility alias로 투영하지 않는다.
- Old academic routes·UI·store 구현은 다음 contraction ticket까지 source에 남을 수 있지만 public router와 Browser composition에서는 target과 동시에 활성화하지 않는다.
- Existing v2/v3 workspace bytes를 target v4로 자동 변환·rewrite하거나 삭제하지 않는다. 선택 실패와 Runtime failure는 previous active workspace와 honest recovery state를 보존한다.
- App shutdown, explicit prepared-root relaunch와 Browser disconnect는 Broker intake, pending call, Runtime credential와 operation lease를 bounded ordering으로 정산한다.

## Acceptance Criteria

- [ ] Production entrypoint와 default Browser route가 pre-App prepared Workspace startup·normal AY Chat·inline Semantic Review composition만 연다.
- [ ] Registry active pointer commit은 exact project MCP declaration, authenticated Adapter handshake와 required `propose_state_patch` readiness가 모두 green일 때만 발생한다.
- [ ] Browser에서 proposal → accept/revise/reject → same Turn result → AY-owned actual file mutation behavior가 ticket 006과 동일하게 동작한다.
- [ ] Missing/stale Adapter, ignored project config, wrong roster, Broker offline과 Runtime terminal이 degraded success나 false active state 없이 target recovery로 나타난다.
- [ ] Public Browser가 old Course/material/First Assignment action/retry와 patch/revision Review wire를 target path와 함께 사용하지 않는다.
- [ ] Registry reopen·explicit prepared-root relaunch, Browser disconnect와 App shutdown이 cross-workspace thread, stale credential, pending call과 orphan process를 남기지 않는다.
- [ ] Atomic cutover 전후의 rollback boundary와 current code의 후속 contraction 대상이 implementation map 또는 owning package 문서에 정확히 기록된다.

## Verification

- Targeted test or command: Target Server composition tests와 `npm run test:e2e -w @ay-ple/chat-shell`을 실행한다.
- Repository checks: `npm run validate:node-runtime -w @ay-ple/codex-chat-runtime && npm run lint -w @ay-ple/chat-shell && npm run typecheck && npm run build && npm test && npm run test:e2e && npm run check:docs-links`
- Manual or live smoke: 실제 development entrypoint에서 registry reopen, explicit prepared-root relaunch, Review 세 outcome과 Adapter readiness failure를 desktop Browser로 확인한다.

## Blocked By

- `./006-prepared-temporary-git-workspace-product-trace.md` — Prepared temporary Git workspace product trace
- `../2026-07-27-user-owned-semester-workspace-lifecycle/008-registry-reopen-prepared-root-relaunch-recovery.md` — Registry reopen·prepared-root relaunch·recovery

## Starting Points

- `apps/server/src/server-application.ts`
- `apps/server/src/product-http.ts`
- `apps/server/src/codex-chat.ts`
- `apps/server/src/codex-chat-service.ts`
- `apps/server/src/server-development.ts`
- `apps/server/src/server-application.test.ts`
- `apps/chat-shell/src/App.tsx`
- `apps/chat-shell/src/product-api.ts`
- `apps/chat-shell/src/use-product-chat.ts`
- `apps/chat-shell/src/product-chat-presentation.tsx`
- `apps/chat-shell/e2e/chat-shell.spec.ts`
- `apps/chat-shell/e2e/workspace-recovery.spec.ts`
- `scripts/product-local.mts`
- `docs/architecture/codex-chat-implementation-map.md`
