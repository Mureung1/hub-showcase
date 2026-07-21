# 009 — Exact Runtime과 product seam의 conformance를 증명한다

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

[First Assignment Product-bound Codex Companion](../../specs/2026-07-19-first-assignment-product-bound-companion.md)

## What It Delivers

Exact Python SDK/native bundle, Node Runtime와 Server product seam이 deterministic Browser implementation과 같은 First Assignment contract를 지키는지 actual-child·local-provider·opt-in live-provider에서 증명한다. 이 ticket은 production caller나 legacy tracer를 삭제하지 않는다.

## Spec Traceability

- User stories: 3, 4, 5, 6, 7, 8, 10, 12
- Implementation contract: Compatibility and Migration; Testing Decisions — SDK patch, actual child/local provider and live-provider proof

## Slice-Specific Constraints

- Exact SDK/native pin, official Python SDK reuse, native identity, supervised lifecycle와 bounded process cleanup을 유지한다. First-party host나 second Runtime를 다시 열지 않는다.
- Actual-child/local-provider gate는 exact workspace `cwd`, `SkillInput`+selected source text, `auto_review + workspace_write`, private MCP→Plan question→answer→second sampling→authoritative terminal과 cleanup을 검증한다.
- Actual product harness는 process-fixed legacy bootstrap workspace와 active ready `SemesterWorkspace`를 서로 다른 directory로 준비하고, product native `cwd`가 후자와 정확히 일치함을 증명한다. Legacy workspace는 product action의 source·scratch·state authority가 아니다.
- Current `test:codex-chat-actual`은 four-route tracer와 shutdown의 starting evidence일 뿐 final product oracle이 아니다. 009는 managed Recipe·Skill, representative selected fixture, 실제 hosted `propose_state_patch` MCP와 Server product coordinator를 통과하는 별도 product actual command를 추가하거나 기존 command를 product seam으로 명시적으로 전환한다.
- Representative Python/command 사용이 동작하는지 확인하되 Codex permission approval과 AY-PLE `UserConfirmation`을 같은 assertion으로 취급하지 않는다.
- Current unique advertised-default model policy와 pinned first-party client의 `configured → advertised default → first available` 방식 사이 assumption delta를 evidence로 disposition한다. 006의 zero·multiple-default failure는 baseline evidence로 보존하되 final gate는 선택한 `adopt | adapt | retain fail-closed` policy를 검증한다. Product caller가 model/reasoning을 임의 hard-code하지 않는다.
- Normal completion, interrupt, accepted loss, duplicate·late interaction, process loss와 process-group cleanup을 exact native seam에서 bounded하게 정산한다.
- Live trace는 fresh `HOME`·`CODEX_SQLITE_HOME`·temp·appDataRoot·SemesterWorkspace와 사용자가 명시적으로 provision한 isolated `CODEX_HOME`을 사용한다. Ambient `~/.codex`, 다른 개발 home이나 provider 설정으로 fallback하지 않고 credential 내용·token·digest를 log나 evidence에 남기지 않는다.
- Provider credential이 없으면 live trace를 pass나 skip으로 가장하지 않고 exact prerequisite와 `blocked`를 기록한다. Parent spec이 요구하는 live complete action이 충족되지 않으면 ticket을 완료하지 않는다.
- Tracer-only HTTP/API, Browser `useChatShell`, fixed permission copy, process-fixed legacy workspace와 package source는 이번 ticket에서 제거하지 않는다. Cutover는 009a가 소유한다.
- Provider model wording을 acceptance criterion으로 삼지 않고 structured product proposal, evidence, Review round trip, terminal과 durable outcome을 검증한다.

## Acceptance Criteria

- [ ] Exact SDK patch, production bundle, bridge와 Node Runtime verification이 pin·manifest·provenance drift 없이 green이다.
- [ ] Product actual child/local provider가 서로 다른 legacy bootstrap workspace와 active `SemesterWorkspace`를 사용해 후자의 exact `cwd`, managed Skill/source input, permission, hosted MCP·Plan activity, question answer와 same-Turn terminal을 증명한다.
- [ ] 대표 command/Python use가 product permission profile에서 동작하고 AY-PLE confirmation과 구분된다.
- [ ] 006의 advertised-default·zero/multiple evidence와 first-party fallback difference를 비교해 `adopt | adapt | retain fail-closed`를 판정하고, final gate가 선택한 policy를 검증한다.
- [ ] Normal completion, interrupt, accepted loss, duplicate·late interaction와 process-group cleanup을 bounded하게 정산한다.
- [ ] Server product harness가 actual Runtime, managed Recipe, private MCP host와 shared product contract를 통해 complete operation/result semantics를 소비하며 synthetic product event를 final oracle로 사용하지 않는다.
- [ ] Opt-in live-provider가 representative fixture, fresh isolated roots와 명시적으로 provision된 isolated auth를 사용해 complete Assignment action·Review·confirmed outcome을 수동 중간 복구 없이 성공시킨다.
- [ ] Credential 또는 external provider blocker가 있으면 ticket을 completed로 닫지 않고 blocked evidence를 남긴다.

## Verification

- Targeted test or command: `npm run validate:exact-sdk -w @ay-ple/codex-chat-runtime`, `npm run validate:production-runtime -w @ay-ple/codex-chat-runtime`, `npm run validate:node-runtime -w @ay-ple/codex-chat-runtime`, existing `npm run test:codex-chat-actual -w @ay-ple/server` baseline, 009가 소유할 product actual Server command와 isolated live-provider product trace
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run check:docs-links`, `git diff --check`
- Manual or live smoke: fresh materialized SemesterWorkspace에서 complete two-TXT Assignment action, Review answer, confirmed outcome와 clean shutdown. Credential 부재는 explicit blocker다.

## Blocked By

- [008b-workspace-store-recovery.md](008b-workspace-store-recovery.md) — final product operation과 workspace recovery semantics를 먼저 고정한다

## Starting Points

- Parent spec `Testing Decisions` and `Compatibility and Migration`
- `packages/codex-chat-runtime/package.json`
- `packages/codex-chat-runtime/src/local-provider.actual.test.ts`
- `packages/codex-chat-runtime/src/runtime.actual.test.ts`
- `apps/server/src/testing/codex-chat-shutdown.actual.ts`
- `apps/server/src/product-operation-coordinator.ts`
- `apps/server/src/assignment-mcp-host.ts`
- `apps/server/src/assignment-recipe.ts`
- `apps/server/src/assignment-action.test.ts`
- `apps/server/src/assignment-action-faults.test.ts`
- `apps/chat-shell/e2e/chat-shell-harness.ts`
- `apps/chat-shell/e2e/fixtures/first-assignment-semester-workspace/`
- `packages/codex-chat-runtime/upstream/PATCHES.md`
