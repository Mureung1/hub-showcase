# 003 — Candidate-ready checkpoint에서 deletion gate를 rehearsal한다

## Agent triage

- State: completed
- Surface: local-ticket
- Next actor: none

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

- [x] `rollback_base_sha`, committed `candidate_ready_sha`, repository identity, canonical original clone과 detached candidate worktree가 evidence에 연결된다.
- [x] Preflight evidence가 known/unresolved consumer 0을 기록하고 candidate docs-link/residual 결과가 이를 별도 result로 corroborate한다.
- [x] Residual checker와 permanent-delete operator의 exact source/invocation/hash가 independent review를 통과하고 Git-directory artifact에 고정된다.
- [x] `candidate_ready_sha`에서 full pre-delete matrix rehearsal이 red 0, blocked 0, skipped 0으로 완료된 뒤 ticket closeout이 만들어진다.
- [x] Native identity, FIFO, terminal, interrupt/follow-up, safe failure, Server intake/close와 Python/native process-tree reap이 fixture literal이 아닌 relational observable로 검증된다.
- [x] Exact seven roots가 ordinary directory와 expected untracked/ignored child shape를 유지하고 rehearsal 전후 inventory가 동일하다.
- [x] Permanent deletion, copy/move/quarantine와 recovery artifact가 전혀 수행·생성되지 않는다.
- [x] Final product tree와 root command에 cutover checker/operator/allowlist가 추가되지 않는다.

## Verification

- Candidate binding: `rollback_base_sha`는 `a4c5d7e41ee75bd4d9e5addd3f0a7df765ab9b5d`, review fixed point는 `23d76d3f465235f832e1697b63c3c4b3bddb6b75`, `candidate_ready_sha`는 `5728172372eb8e6f89d9bb36a23306bd6b81203a`다. Closeout descendant에서는 candidate를 다시 bind하지 않았다.
- Preflight: `.git/codex-chat-cutover/preflight/20260717T134840Z-23d76d3f/evidence.json`이 immutable Ticket 001 preflight와 fresh scan의 known `0` / unresolved `0`을 각각 연결했다. SHA-256은 `f8ff7efab8f10aa695dbd387de906f49fb1b0eab3573c5c54431369ae6722faa`다.
- Artifact: `.git/codex-chat-cutover/5728172372eb8e6f89d9bb36a23306bd6b81203a/`의 binding SHA-256은 `fce95e631475a570cb5e8ce67ce4ebddef7055a11ab2db8bb5cbbf5b39454500`이고, reviewed source version은 `v8`이다.

| Source | SHA-256 |
| --- | --- |
| `cutover-guards.mjs` | `d7626a4805fbcca2d590a03198f3a84b2849f43f040e245d36f9c29e9ea51550` |
| `evidence-io.mjs` | `7d1c4d1d2c4ff7aedbaae6127f3c6e4cfdf6725d5cdab0459221c02c54ba7210` |
| `permanent-delete-operator.mjs` | `970004f2ce85cedb3d4831a8fb2a7c3d8435bc032ecc2aaf9ddd65ad87e4ad78` |
| `rehearsal-runner.mjs` | `0e6ac63f680f83fdc6be2324df4128654bbca4d7fd1c0f0c70c6ace1e6efeaf0` |
| `residual-checker.mjs` | `3ce3e4ca514cfee6dbbbdd5abc6bc30fb5ef6ebb50f4d3c6db908ea9abefe811` |

- Independent review: candidate range review hash는 Standards `43a3149c134483f643cb583b7bfbf7b1fb41da9704ad95f357cad67af32baa84`, Spec `726af91909726e3ac4dce332e82db262de75a1b02ebf3d2c232f6f61f1eeb418`다. Source v8 review hash는 Standards `d3c3f4a1a4ce3cb73d5f3532b2aa69edc5eca9ea9b4bfaac9fb50874ae02ae2b`, Spec/safety `f4a1b87e92ad897790effe57bdb5af8fea81128efcca02c66c2cfbd637e8afab`이며 finding은 양쪽 모두 `0`이다.
- Successful attempt: `attempt-004`가 detached candidate에서 `npm ci`, default test, typecheck, build, Chat Shell lint, Chat·camp browser E2E, camp export, docs link와 candidate diff check를 모두 통과했다. Original canonical clone에서는 clean build, production bundle pre/post verifier, Node actual, exact local-provider, Server actual shutdown, canonical dev entrypoint와 full residual pre-delete checker가 모두 green이었다.
- Terminal: summary는 green `24`, red `0`, blocked `0`, skipped `0`이며 SHA-256은 `0822a8c19ef3aadcba5cacb06d28eaa7880f5b9b3ab3ebde25a5008257035ba6`다. Rehearsal 전후 inventory digest는 모두 `a736d8964233201cc47be5c70d401297b35e8d794d07eb34197faf0560173e53`로 동일했다.
- Final review: `/code-review 23d76d3f465235f832e1697b63c3c4b3bddb6b75`의 tracked Standards와 Spec finding은 각각 `0`이었다.
- Safety: `destructive-authorization-attempt-004.json`은 `authorized: false`, `noDataRollbackAcknowledged: false`, `permanentDeleteInvoked: false`를 유지했다. Permanent-delete invocation은 hash와 resolved argv만 기록했으며 실행하지 않았다. Delete, copy, move, Trash, quarantine, recovery artifact 생성과 target file bytes·symlink target 열람은 수행하지 않았다.

## Result

`candidate_ready_sha` `5728172372eb8e6f89d9bb36a23306bd6b81203a`의 full pre-delete rehearsal을 all-green으로 완료했다. 실패한 선행 attempt는 덮어쓰지 않고 evidence로 보존했으며, 성공한 `attempt-004`도 Ticket 004에서 재사용하지 않는다. 이 closeout은 permanent deletion authority가 아니며 Ticket 004는 자신의 claim 뒤 새 `cutover_candidate_sha`, artifact와 full matrix를 처음부터 다시 만들어야 한다.

Implementation commits:

- `945a0738` — `docs: claim cutover candidate rehearsal`
- `18df4807` — `docs: align cutover command guidance`
- `57281723` — `fix: close cutover documentation review gaps`

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
