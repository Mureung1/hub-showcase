# 003 — Candidate-ready checkpoint에서 deletion gate를 rehearsal한다

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

[Codex Chat-only runtime cutover](../../specs/2026-07-17-codex-chat-only-cutover.md)

## What It Delivers

Tracked Chat-only range를 `candidate_ready_sha`로 고정하고, reviewed residual checker와 permanent-delete operator를 candidate-specific Git-directory artifact로 준비한다. Detached clean worktree와 original canonical clone의 올바른 mode에서 full pre-delete matrix를 all-green으로 rehearsal해 code, environment, artifact와 deletion-shape 문제를 destructive session 전에 드러낸다.

이 checkpoint는 permanent deletion authority가 아니다. Operator source와 exact invocation은 review·hash 고정하지만 실행하지 않으며, 일곱 local legacy residue root와 그 data는 그대로 유지한다.

## Spec Traceability

- User stories: 2, 3, 4, 5, 6, 8
- Implementation contract: `Module Responsibilities and Seams`의 `Cutover gate artifact`, `Candidate verification과 permanent-deletion contract`, `Data and State Flow > Cutover implementation slicing`의 Slice 3, pre-delete 관련 `Failure Behaviour`, `Testing Decisions`

## Slice-Specific Constraints

- Read-only preflight scan과 owner attestation은 candidate 이전 evidence로 고정한다. Candidate 이후 docs-link와 residual result는 별도 corroborating evidence이며 preflight state를 다시 쓰지 않는다.
- Reviewed automation source, serialization, invocation, hashes와 results는 current clone의 Git directory 아래 candidate-specific artifact가 소유한다. Final product tree, npm scripts, install/start/CI/merge hook에 checker, operator나 legacy allowlist를 남기지 않는다.
- Historical `/tmp` draft와 016 snapshot의 exact event/schema/source shape는 implementation input이 아니다. Spec의 authorization·behavior invariant를 만족하는 가장 작은 reviewable one-shot program을 작성하고 과거 대형 draft를 그대로 복원하지 않는다.
- Residual checker와 operator는 spec의 exact seven-root allowlist, expected top-level child set, ordinary-root/canonical-parent/tracked-zero/non-follow/device/process/open-handle/Chat-overlap guard와 serial fail-stop behavior를 구현·review한다.
- 이 ticket에서는 permanent-delete mode와 destructive command를 절대 실행하지 않는다. Target contents와 symlink target을 열람하거나 recovery copy를 만들지 않는다.
- 일반 `/implement` lifecycle을 따른다. Tracked product·documentation range가 complete한 clean `HEAD`를 `candidate_ready_sha`로 bind해 full rehearsal을 먼저 끝낸 뒤, 그 SHA와 result를 ticket에 기록하고 normal closeout commit을 만든다.
- Ticket closeout commit은 `candidate_ready_sha`를 deletion authority로 승격하지 않는다. Ticket 004는 자신의 claim commit 뒤 별도 `cutover_candidate_sha`를 bind하고 full matrix를 carry-forward 없이 다시 실행해야 한다.
- Detached candidate는 clean install/default/browser/camp/docs gate를, original canonical clone은 clean build, bundle/native/process/entrypoint/residual gate와 local root guard를 소유한다.
- Missing tool, unsupported platform, bundle/Chromium 부재와 skipped/not-run gate는 green이 아니라 `blocked`다. Live provider OAuth와 `validate:exact-sdk`는 required gate가 아니다.
- Actual 세 gate 뒤 production bundle verifier를 다시 실행해 ignored bundle mutation이 없음을 확인한다.

## Acceptance Criteria

- [ ] `rollback_base_sha`, committed `candidate_ready_sha`, repository identity, canonical original clone과 detached candidate worktree가 evidence에 연결된다.
- [ ] Preflight evidence가 known/unresolved consumer 0을 기록하고 candidate docs-link/residual 결과가 이를 별도 result로 corroborate한다.
- [ ] Residual checker와 permanent-delete operator의 exact source/invocation/hash가 independent review를 통과하고 Git-directory artifact에 고정된다.
- [ ] `candidate_ready_sha`에서 full pre-delete matrix rehearsal이 red 0, blocked 0, skipped 0으로 완료된 뒤 ticket closeout이 만들어진다.
- [ ] Native identity, FIFO, terminal, interrupt/follow-up, safe failure, Server intake/close와 Python/native process-tree reap이 fixture literal이 아닌 relational observable로 검증된다.
- [ ] Exact seven roots가 ordinary directory와 expected untracked/ignored child shape를 유지하고 rehearsal 전후 inventory가 동일하다.
- [ ] Permanent deletion, copy/move/quarantine와 recovery artifact가 전혀 수행·생성되지 않는다.
- [ ] Final product tree와 root command에 cutover checker/operator/allowlist가 추가되지 않는다.

## Verification

- Targeted test or command: environment prerequisite evidence; detached candidate의 `npm ci`, `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run test:e2e`, `npm run export:camp-demo`, `npm run check:docs-links`; original clone의 clean build, reviewed residual pre-delete mode와 seven-root inventory comparison
- Repository checks: `git diff --check "$rollback_base_sha" "$candidate_ready_sha"`, `npm run verify:production-runtime -w @ay-ple/codex-chat-runtime`, `npm run test:node-actual -w @ay-ple/codex-chat-runtime`, `npm run test:local-provider -w @ay-ple/codex-chat-runtime`, `npm run test:codex-chat-actual -w @ay-ple/server`, `npm run test:dev-entrypoint`, actual gates 뒤 production bundle 재검증
- Manual or live smoke: Reviewed one-shot automation source와 result chain을 별도로 review한다. Permanent-delete mode와 live provider OAuth는 실행하지 않는다.

## Blocked By

- [002-contract-tracked-runtime-graph.md](002-contract-tracked-runtime-graph.md) — Tracked repository를 Codex Chat-only graph로 수축한다

## Starting Points

- Parent spec의 `Candidate verification과 permanent-deletion contract`
- `docs/wayfinding/chat-shell-cutover-readiness/assets/016-cutover-execution-gates.md`
- `packages/codex-chat-runtime/README.md`
- `packages/codex-chat-runtime/src/runtime.actual.test.ts`
- `packages/codex-chat-runtime/src/local-provider.actual.test.ts`
- `apps/server/README.md`
- `apps/server/src/testing/codex-chat-shutdown.actual.ts`
- `apps/chat-shell/README.md`
