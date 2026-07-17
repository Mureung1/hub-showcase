# 004 — Legacy local residue를 영구 삭제하고 Chat-only handoff를 확정한다

## Agent triage

- State: claimed
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

[Codex Chat-only runtime cutover](../../specs/2026-07-17-codex-chat-only-cutover.md)

## What It Delivers

Ticket claim을 commit한 clean tracked worktree에서 exact seven-root read-only safety precheck를 수행한다. 모든 조건이 green일 때만 일곱 legacy residue root를 literal absolute path로 한 번씩 직렬 영구 삭제하고, 각 root와 전체 allowlist의 absence를 확인한다.

Ticket 003의 completed rehearsal은 Chat-only cutover와 deletion shape에 대한 confidence evidence다. 이 ticket은 candidate SHA binding, detached worktree, automation source/hash review, attempt별 evidence나 authorization JSON을 새로 만들거나 재실행하지 않는다. 삭제 뒤 repository PR-ready checks와 canonical dev entrypoint를 검증하고 일반 `/implement` lifecycle로 ticket과 parent spec을 닫는다.

## Spec Traceability

- User stories: 3, 5, 6, 8, 9
- Implementation contract: `Completed rehearsal과 permanent-deletion contract`, `Exact permanent-deletion boundary`, `Data and State Flow > Cutover implementation slicing`의 Slice 4, deletion·post-delete 관련 `Failure Behaviour`, `Compatibility and Migration`, `Testing Decisions > Permanent-deletion verification`

## Slice-Specific Constraints

- `/implement` preflight에서 ticket을 `claimed`로 바꾸고 그 tracked preparation을 commit한 뒤 deletion precheck를 시작한다. Ticket 003은 `completed`로 유지하고 source v8과 기존 evidence를 byte-identical하게 보존한다.
- Permanent deletion authority는 parent spec의 `Exact permanent-deletion boundary`가 소유하는 exact seven-root table과 order에만 적용된다. Precheck에서 그 repository-relative 값들을 한 번만 absolute literal로 resolve하며 override를 받지 않는다.
- Read-only precheck는 tracked worktree가 clean이고 exact allowlist 밖 unexpected untracked change가 없는지, 일곱 root가 ordinary non-symlink directory인지, 각 root 아래 tracked file이 0개인지 확인한다.
- Caller environment를 우선하고 Server 실행 `cwd`의 local `.env`를 fallback으로 적용한 parent spec `Configuration` contract의 effective six `CODEX_CHAT_*` paths가 어느 deletion root와도 양방향 overlap하지 않아야 한다. Canonical root dev entrypoint에서는 `apps/server/.env`가 해당 local file이다. 값이나 credential은 evidence에 출력하지 않는다.
- Server, Chat Shell, Inspector, Runtime Harness와 target을 사용하는 관련 process가 없어야 한다. 조건이 불명확하거나 하나라도 실패하면 어떤 root도 삭제하지 않는다.
- 삭제는 parent spec의 exact table 순서대로 각각 별도의 `/bin/rm -Rfx -- <validated-absolute-root>` argv 호출로 실행한다. Glob, caller-supplied target, unresolved environment variable, `git clean`, parent·sibling fallback을 사용하지 않는다. Root 자체는 non-symlink이고 `-x`는 device boundary를 넘지 않으며 internal symlink는 link object로만 제거한다.
- 각 command 직후 해당 root의 `lstat == ENOENT`를 확인한다. 첫 command 또는 absence 확인 실패에서 즉시 중단하고 permission 우회, scope 확대, copy/move/Trash/quarantine, backup restore와 data rollback을 시도하지 않는다.
- 일곱 root가 모두 absent한 뒤에만 repository PR-ready checks, `npm run test:dev-entrypoint`, docs link와 diff hygiene를 실행한다. 실패하면 legacy root를 복원하거나 deletion을 다시 실행하지 않고 Chat-only failure로 보고한다.
- Success closeout은 deleted roots, no-migration/no-data-rollback과 필요 시 fresh isolated Chat roots에서 재로그인한다는 사실을 `Result`에 기록한다. Live provider OAuth와 remote token revoke는 수행하지 않는다.

## Acceptance Criteria

- [ ] Ticket claim이 commit되고 deletion 직전 tracked worktree가 clean하며 allowlist 밖 unexpected untracked change가 없다.
- [ ] Parent spec이 소유하는 exact seven roots가 ordinary non-symlink directory이고 각 root 아래 tracked file이 0개다.
- [ ] Effective six `CODEX_CHAT_*` paths가 deletion roots와 overlap하지 않고 관련 project·legacy process가 없다.
- [ ] 일곱 literal absolute root가 parent spec의 표 순서대로 각각 한 번만 삭제되고 각 command 직후 absence가 확인된다.
- [ ] 첫 destructive command 또는 postcondition 실패에서 뒤 root를 건드리지 않으며 scope 확대나 data rollback을 수행하지 않는다.
- [ ] Post-delete에 일곱 root가 모두 absent·unrecreated이고 `packages/codex-chat-runtime/.artifacts`와 root `.gitignore`의 `.ay-ple/` protection은 intact다.
- [ ] `npm test`, `npm run typecheck`, `npm run build`, Chat Shell lint, canonical dev entrypoint, docs link와 diff hygiene가 모두 green이다.
- [ ] Result가 deleted roots, no-migration/no-data-rollback과 필요 시 fresh Chat login을 기록한 뒤 Ticket 004와 parent spec을 completed로 닫는다.

## Verification

- Read-only precheck: tracked-clean/untracked scope, literal root `lstat`, root별 `git ls-files`, effective six Chat path overlap, 관련 process absence
- Destructive action: 표 순서의 seven separate literal `/bin/rm -Rfx -- <absolute-root>` invocation과 각 root의 immediate `ENOENT` postcondition
- Post-delete absence: seven-root literal absence, `packages/codex-chat-runtime/.artifacts` 존재, `.gitignore`의 `.ay-ple/` 보호 규칙 유지
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run test:dev-entrypoint`, `npm run check:docs-links`, `git diff --check`

## Blocked By

- [003-rehearse-cutover-candidate.md](003-rehearse-cutover-candidate.md) — Candidate-ready checkpoint에서 deletion gate를 rehearsal한다

## Starting Points

- Parent spec의 `Completed rehearsal과 permanent-deletion contract`
- Ticket 003의 completed Result — confidence-only reference이며 binding, authorization, attempt와 source v8은 실행 입력이 아니다
- `docs/wayfinding/chat-shell-cutover-readiness/assets/014-legacy-removal-manifest.md` — historical removal inventory이며 current deletion contract는 parent spec이 소유한다
- `packages/codex-chat-runtime/.artifacts`
- `.gitignore`
