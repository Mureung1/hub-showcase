# 011 — Prove exact Chat Shell conformance and readiness

## Agent triage

- State: claimed
- Surface: local-ticket
- Next actor: /implement (current session)

## Parent Spec

[Codex-native Chat Shell 첫 수직 흐름](../../specs/2026-07-16-codex-native-chat-shell.md)

## What It Delivers

완성된 Chat Shell tracer가 exact source/runtime, deterministic fake와 repository 전체에서 같은 contract를 지키는지 종합 검증하고 current architecture/docs/backlog를 실제 구현에 맞춘다. Safe disposable provider가 있으면 opt-in live smoke를 실행하고, 없으면 fake/exact-local green과 live blocked를 분리해 기록한다.

## Spec Traceability

- User stories: 1–6
- Implementation contract: Testing Decisions, Compatibility and Migration, 전체 first-slice acceptance

## Slice-Specific Constraints

- Exact native child + official local fake-provider harness는 `deny_all + read_only`, native identity, streaming, terminal, interrupt, same-thread second turn과 close를 검증한다.
- Unexpected schema-valid approval default-accept residual을 숨기지 않되 interactive approval/fork patch를 추가하지 않는다.
- Live smoke는 explicit disposable homes/workspace/provider만 사용하고 ambient auth/workspace를 사용하지 않는다.
- Legacy Runtime Harness/Host 제거, pin unification과 product adapter는 이 ticket에서 하지 않는다.
- Implementation fact는 package README와 implementation map에, task status는 development backlog에 owning-document-first로 반영한다.

## Acceptance Criteria

- [ ] Exact package/generation/provenance verifier와 complete Python/Node/unit/actual-child fake suites가 green이다.
- [ ] Exact local-provider T0가 native thread, AgentMessage, authoritative terminal과 effective `deny_all + read_only`를 증명한다.
- [ ] Exact local-provider interrupt 및 same-thread follow-up과 deterministic process-tree close가 green이다.
- [ ] Root `npm test`, `npm run typecheck`, `npm run build`, Inspector lint와 Chat Shell lint가 green이며 새 workspaces를 실제 포함한다.
- [ ] Docs links, generated/manifest verification, `git diff --check`와 stale donor/theoretical surface searches가 green이다.
- [ ] Source·Standards·Spec final reviews가 각각 0 findings다.
- [ ] Live provider gate는 `green` 또는 환경 근거가 있는 `blocked`로 기록되고 fake/exact-local 결과와 혼동되지 않는다.
- [ ] Parent spec, ADR, package README, implementation map와 backlog가 current implementation·legacy·deferred cutover를 정확히 구분한다.
- [ ] Legacy Host와 `packages/runtime-codex`는 별도 cutover 전까지 unchanged current implementation으로 남는다.

## Verification

- Targeted test or command: all runtime package exact/fake/local conformance commands and Chat Shell E2E
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, Inspector lint, Chat Shell lint, docs/link/diff integrity
- Manual or live smoke: disposable provider가 있을 때만 exact live Chat Shell smoke; 아니면 명시적 blocked report

## Blocked By

- [010-interrupt-and-follow-up.md](010-interrupt-and-follow-up.md) — Interrupt and continue the same native thread

## Starting Points

- Parent spec Testing Decisions
- `docs/adr/0011-reuse-official-codex-python-sdk-for-chat-shell.md`
- `docs/architecture/runtime-harness-implementation-map.md`
- `docs/product/ay-ple-development-backlog.md`
