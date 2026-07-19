# 009 — Exact conformance를 증명하고 product vertical로 cut over한다

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

[First Assignment Product-bound Codex Companion](../../specs/2026-07-19-first-assignment-product-bound-companion.md)

## What It Delivers

First Assignment product vertical이 deterministic Browser seam과 exact Python/native seam에서 같은 contract를 지키는지 종합 증명하고, product path가 완성된 뒤 tracer-only route·full-screen Chat ownership과 fixed permission copy를 제거한다. Current code·package docs·implementation map·backlog를 실제 제품 동작에 맞추고 parent spec을 완료 가능한 상태로 만든다.

## Spec Traceability

- User stories: 1–12
- Implementation contract: Compatibility and Migration; Testing Decisions; Existing and final commands; complete first-vertical acceptance

## Slice-Specific Constraints

- Exact SDK/native pin, official Python SDK reuse, native identity, supervised lifecycle와 bounded process cleanup을 유지한다. First-party host나 second runtime를 다시 열지 않는다.
- Actual-child/local-provider gate는 exact workspace cwd, `SkillInput`+selected source text, `auto_review + workspace_write`, MCP→Plan question→answer→second sampling→authoritative terminal과 cleanup을 검증한다.
- Representative Python/command 사용이 동작하는지 확인하되 Codex permission approval과 AY-PLE `UserConfirmation`을 같은 assertion으로 취급하지 않는다.
- Full Browser gate는 parent spec의 nominal·revision·reject·loss·guard·isolation traces를 real Chromium→Vite→Express→product store/deterministic Runtime에서 검증한다.
- Tracer-only four-route projection, process-fixed single workspace ownership, full-screen Chat shell과 fixed `deny_all + read_only` public copy는 migrated product caller가 모두 새 seam을 사용한 뒤에만 contract한다.
- 삭제 시 compatibility alias, raw event gateway, second engine abstraction과 automatic state migration을 만들지 않는다.
- Workspace-local confirmed state와 history는 product surface rollback이나 cutover에도 삭제하지 않는다.
- Package README와 implementation map은 current implemented behavior, remaining deferred Chat capability와 exact commands를 owning-document-first로 갱신한다. Work order/status는 development backlog에서만 갱신한다.
- Provider credential이 없으면 live trace를 pass나 skip으로 가장하지 않고 exact prerequisite와 `blocked`를 기록한다. Parent spec이 요구하는 live success가 충족되지 않으면 ticket을 완료 처리하지 않는다.
- Final review는 fixed point 대비 repository Standards와 parent Spec 두 축을 모두 수행한다.

## Acceptance Criteria

- [ ] Exact SDK patch, production bundle, bridge와 Node runtime verification이 pin·manifest·provenance drift 없이 green이다.
- [ ] Actual child/local provider가 exact `cwd`, Skill/source input, permission, MCP·Plan activity, question answer와 same-Turn terminal을 증명한다.
- [ ] Normal completion, interrupt, accepted loss, duplicate/late interaction와 process-group cleanup이 exact native seam에서 bounded하게 정산된다.
- [ ] Opt-in live-provider가 representative fixture와 fresh isolated roots에서 complete product action을 성공시키며 수동 중간 복구가 없다.
- [ ] Full Browser E2E가 parent spec의 nine representative traces와 1440×900 desktop accessibility를 통과한다.
- [ ] Current text Chat survivor behavior는 product Chat에 흡수되고 tracer-only route/status·fixed permission copy가 compatibility alias 없이 제거된다.
- [ ] Generic transcript persistence, conversation catalog, unanswered Review hydration, approval center와 mobile scope가 구현에 섞이지 않는다.
- [ ] Root `npm test`, typecheck, build, Chat lint/E2E, docs links, exact runtime and local-provider gates가 모두 green이다.
- [ ] Runtime/package README, Server·Chat Shell README, implementation map과 development backlog가 current implementation과 deferred work를 정확히 구분한다.
- [ ] Source/Standards/Spec review findings가 해결되고 tracked working tree가 clean이다.

## Verification

- Targeted test or command: `npm run validate:exact-sdk -w @ay-ple/codex-chat-runtime`, `npm run validate:production-runtime -w @ay-ple/codex-chat-runtime`, `npm run validate:node-runtime -w @ay-ple/codex-chat-runtime`, `npm run test:codex-chat-actual -w @ay-ple/server`, full Chat Shell Playwright, isolated live-provider trace
- Repository checks: `npm test`, `npm run test:e2e`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run check:docs-links`, `git diff --check`
- Manual or live smoke: fresh materialized SemesterWorkspace에서 complete two-TXT Assignment action, Review accept, confirmed reload와 clean shutdown. Credential 부재는 explicit blocker다.

## Blocked By

- [008-assignment-correction-and-recovery.md](008-assignment-correction-and-recovery.md) — Assignment correction과 recovery를 닫는다

## Starting Points

- Parent spec `Testing Decisions` and `Compatibility and Migration`
- `packages/codex-chat-runtime/package.json`
- `packages/codex-chat-runtime/src/local-provider.actual.test.ts`
- `apps/server/src/testing/codex-chat-shutdown.actual.ts`
- `apps/chat-shell/e2e/chat-shell.spec.ts`
- `docs/architecture/codex-chat-implementation-map.md`
- `docs/product/ay-ple-development-backlog.md`
