# 004 — Legacy local residue를 영구 삭제하고 Chat-only handoff를 확정한다

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

[Codex Chat-only runtime cutover](../../specs/2026-07-17-codex-chat-only-cutover.md)

## What It Delivers

일반 ticket claim을 commit한 clean `HEAD`를 final `cutover_candidate_sha`로 bind하고 Ticket 003에서 review한 automation으로 full pre-delete matrix를 fresh all-green으로 다시 실행한다. 그 exact SHA의 original canonical clone에서 승인된 일곱 legacy residue root만 non-follow serial operator로 영구 삭제하고, fresh post-delete verification과 no-data-rollback handoff를 완료한다.

Successful terminal 뒤에는 candidate-bound evidence와 분리된 metadata-only closeout commit으로 이 ticket과 parent spec만 닫는다. Final repository는 Codex Chat-only product graph와 `handoff_sha`를 갖지만 deletion authority와 result identity는 계속 `cutover_candidate_sha`에 묶인다.

## Spec Traceability

- User stories: 3, 5, 6, 8, 9
- Implementation contract: `Candidate verification과 permanent-deletion contract > Authority와 time ordering`, `Exact permanent-deletion boundary`, `Data and State Flow > Cutover implementation slicing`의 Slice 4, deletion/post-delete/closeout 관련 `Failure Behaviour`, `Compatibility and Migration`, `Testing Decisions`의 post-delete sequence

## Slice-Specific Constraints

- `/implement` preflight의 ticket `claimed` 전이와 deletion 전에 필요한 tracked preparation을 먼저 commit한다. 그 뒤 clean `HEAD`를 `cutover_candidate_sha`로 bind하며 Ticket 003의 `candidate_ready_sha` 또는 gate results를 carry forward하지 않는다.
- Repository standards와 parent spec에 대한 required tracked-range review, Ticket 003 automation의 independent review를 candidate binding 전에 끝내고 findings를 모두 닫는다. Destructive terminal 뒤 일반 code-review를 새로 시작해 candidate bytes를 고치는 순서를 만들지 않는다.
- Candidate binding 뒤 successful post-delete terminal이 durable해질 때까지 `HEAD == cutover_candidate_sha`와 clean tracked worktree를 유지한다. Ticket checkbox, Result와 parent spec을 포함한 tracked edit/commit은 금지한다.
- Final pre-delete matrix는 Ticket 003의 reviewed exact source/hash와 current candidate를 bind해 red 0, blocked 0, skipped 0으로 fresh 실행한다. Review finding이나 tracked fix가 필요하면 candidate를 폐기하고 새 SHA에서 처음부터 반복한다.
- Permanent deletion authorization은 다음 repository-relative root에만 적용된다: `apps/inspector`, `packages/runtime-core`, `packages/runtime-fake`, `packages/runtime-codex`, `.ay-ple`, `apps/server/.ay-ple`, `spikes/codex-runtime-ownership`.
- Operator는 표 순서, expected top-level child set, ordinary-root/canonical-parent/tracked-zero/non-follow/device/process/open-handle/Chat-overlap guard를 모두 통과한 뒤 한 root씩 삭제하고 absence를 확인한다.
- 첫 destructive command 또는 postcondition 실패에서 hard-stop한다. Parent/sibling, broad glob, `git clean`, permission 우회, copy/move/Trash/quarantine, backup restore와 data rollback으로 확장하지 않는다.
- Post-delete verification은 deletion evidence를 수정하지 않는 fresh attempt로 production bundle verifier, canonical dev entrypoint, residual post-delete mode 순서로 실행한다. 각 단계 전후 candidate binding과 seven-root absence를 다시 확인한다.
- Red/blocked post-delete attempt에는 tracked closeout을 만들지 않는다. Environment/artifact 문제만 같은 candidate SHA에서 fresh attempt log로 재시도하고 code defect는 별도 Chat-only incident change로 넘긴다.
- Green terminal 뒤 direct child metadata-only closeout commit 하나만 허용한다. 변경 가능 범위는 이 ticket의 `Agent triage`, acceptance checkbox, `Verification`, `Result`와 parent spec의 `Agent triage`, `Completion`뿐이다. Commit 전에 staged diff를, commit 뒤 cumulative diff와 docs link를 검증한다.
- Closeout staging 또는 commit이 child를 만들기 전에 실패하면 closed allowlist 안에서 재시도할 수 있다. Direct child가 생긴 뒤 allowlist나 docs check가 실패하면 amend나 두 번째 closeout commit을 만들지 않고 handoff를 block해 별도 Chat-only incident로 넘긴다.
- `Result`에는 `cutover_candidate_sha`, successful attempt identity, exact automation hashes/evidence location, deleted/untouched classification과 no-migration/no-data-rollback/reauth acknowledgement를 기록한다. Closeout commit 자신의 SHA를 backfill하거나 amend하지 않는다.
- Closeout 뒤 final report는 별도 `handoff_sha`를 기록한다. Metadata descendant는 deletion/post-delete retry authority가 아니다.

## Acceptance Criteria

- [ ] Ticket claim과 모든 intended tracked preparation이 commit된 clean `HEAD`가 `cutover_candidate_sha`로 bind되고 original canonical clone identity와 일치한다.
- [ ] Required tracked-range review와 reviewed automation findings가 candidate binding 전에 모두 닫힌다.
- [ ] 같은 exact SHA에서 full pre-delete matrix가 fresh red 0, blocked 0, skipped 0으로 완료되고 Ticket 003 automation source/hash review가 재확인된다.
- [ ] Seven-root shape, tracked-zero, symlink/device/process/open-handle와 Chat-root overlap guard가 모두 green일 때만 destructive operator가 시작된다.
- [ ] Reviewed operator가 exact seven roots만 표 순서대로 삭제하고 각 root의 absence, deleted/untouched classification과 first-failure semantics를 durable evidence에 남긴다.
- [ ] Fresh post-delete attempt에서 bundle verifier → `npm run test:dev-entrypoint` → residual post-delete mode가 같은 candidate SHA에서 모두 green이다.
- [ ] Seven roots가 post-delete gate 뒤에도 absent·unrecreated이고 `packages/codex-chat-runtime/.artifacts`, exact bundle과 root `.gitignore`의 `.ay-ple/` protection은 intact다.
- [ ] Handoff evidence가 code recovery와 deleted auth/config/session/history data의 no-rollback을 구분하고 필요 시 fresh isolated Chat roots에서 재로그인함을 명시한다.
- [ ] Green terminal 뒤 단일 direct-child closeout commit은 closed metadata allowlist와 docs check를 통과하고 `cutover_candidate_sha`와 `handoff_sha`를 구분한다.
- [ ] Ticket 004와 parent spec은 successful terminal일 때만 completed로 닫힌다.

## Verification

- Targeted test or command: `rollback_base_sha...cutover_candidate_sha` Standards+Spec review와 automation hash review findings 0 확인, Ticket 003의 reviewed automation으로 environment/preflight와 full pre-delete matrix fresh 실행, exact permanent-delete mode 한 번, production bundle verifier, `npm run test:dev-entrypoint`, residual post-delete mode와 literal seven-root absence check
- Repository checks: Candidate-bound full matrix가 root PR-ready checks와 actual runtime/process gates를 모두 포함한다. Closeout 뒤에는 allowlisted cumulative diff, `git diff --check`와 non-destructive docs-link check만 실행하며 deletion/post-delete operator를 `handoff_sha`에서 다시 bind하지 않는다.
- Manual or live smoke: Exact seven-root permanent deletion과 no-data-rollback acknowledgement가 operator action이다. Live provider OAuth와 remote token revoke는 수행하지 않는다.

## Blocked By

- [003-rehearse-cutover-candidate.md](003-rehearse-cutover-candidate.md) — Candidate-ready checkpoint에서 deletion gate를 rehearsal한다

## Starting Points

- Parent spec의 `Candidate verification과 permanent-deletion contract`
- Ticket 003이 만든 reviewed Git-directory automation과 candidate evidence
- `docs/wayfinding/chat-shell-cutover-readiness/assets/014-legacy-removal-manifest.md`
- `docs/wayfinding/chat-shell-cutover-readiness/assets/016-cutover-execution-gates.md`
- `packages/codex-chat-runtime/.artifacts`
- `.gitignore`
