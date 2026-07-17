# 004 — Legacy local residue를 영구 삭제하고 Chat-only handoff를 확정한다

## Agent triage

- State: completed
- Surface: local-ticket
- Next actor: none

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
- 삭제는 parent spec의 exact table 순서대로 각각 별도의 `/bin/rm -Rx -- <validated-absolute-root>` argv 호출로 실행한다. Glob, caller-supplied target, unresolved environment variable, `git clean`, parent·sibling fallback을 사용하지 않는다. Root 자체는 non-symlink이고 `-x`는 device boundary를 넘지 않으며 internal symlink는 link object로만 제거한다.
- 각 command 직후 해당 root의 `lstat == ENOENT`를 확인한다. 첫 command 또는 absence 확인 실패에서 즉시 중단하고 permission 우회, scope 확대, copy/move/Trash/quarantine, backup restore와 data rollback을 시도하지 않는다.
- 일곱 root가 모두 absent한 뒤에만 repository PR-ready checks, `npm run test:dev-entrypoint`, docs link와 diff hygiene를 실행한다. 실패하면 legacy root를 복원하거나 deletion을 다시 실행하지 않고 Chat-only failure로 보고한다.
- Success closeout은 deleted roots, no-migration/no-data-rollback과 필요 시 fresh isolated Chat roots에서 재로그인한다는 사실을 `Result`에 기록한다. Live provider OAuth와 remote token revoke는 수행하지 않는다.

## Acceptance Criteria

- [x] Ticket claim이 commit되고 deletion 직전 tracked worktree가 clean하며 allowlist 밖 unexpected untracked change가 없다.
- [x] Parent spec이 소유하는 exact seven roots가 ordinary non-symlink directory이고 각 root 아래 tracked file이 0개다.
- [x] Effective six `CODEX_CHAT_*` paths가 deletion roots와 overlap하지 않고 관련 project·legacy process가 없다.
- [x] 일곱 literal absolute root가 parent spec의 표 순서대로 각각 한 번만 삭제되고 각 command 직후 absence가 확인된다.
- [x] 첫 destructive command 또는 postcondition 실패에서 뒤 root를 건드리지 않으며 scope 확대나 data rollback을 수행하지 않는다.
- [x] Post-delete에 일곱 root가 모두 absent·unrecreated이고 `packages/codex-chat-runtime/.artifacts`와 root `.gitignore`의 `.ay-ple/` protection은 intact다.
- [x] `npm test`, `npm run typecheck`, `npm run build`, Chat Shell lint, canonical dev entrypoint, docs link와 diff hygiene가 모두 green이다.
- [x] Result가 deleted roots, no-migration/no-data-rollback과 필요 시 fresh Chat login을 기록한 뒤 Ticket 004와 parent spec을 completed로 닫는다.

## Verification

- Read-only precheck: tracked-clean/untracked scope, literal root `lstat`, root별 `git ls-files`, effective six Chat path overlap, 관련 process absence
- Destructive action: 표 순서의 seven separate literal `/bin/rm -Rx -- <absolute-root>` invocation과 각 root의 immediate `ENOENT` postcondition
- Post-delete absence: seven-root literal absence, `packages/codex-chat-runtime/.artifacts` 존재, `.gitignore`의 `.ay-ple/` 보호 규칙 유지
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run test:dev-entrypoint`, `npm run check:docs-links`, `git diff --check`
- 2026-07-18 attempt: claim·preparation commit 뒤 `b331c942dca84d7eb8131a1f4b132746020e5e76`에서 read-only precheck가 tracked clean, allowlist 밖 untracked `0`, ordinary non-symlink root `7`, root별 tracked file `0`, effective Chat path·overlap `0`, 관련 process·open handle·listener `0`으로 green이었다. 첫 `/bin/rm -Rfx -- /Users/swh/Desktop/code/ai-agent-challenge/hub/apps/inspector` 호출은 local execution policy가 `rm -f` 형태를 process 생성 전에 거부했다. 삭제된 root는 `0`, untouched root는 `7`이며 후속 delete command, workaround, post-delete verification과 data rollback은 실행하지 않았다.
- 2026-07-18 resumed attempt: `3ac4816137cdb3cc5968a9cd4a2148d31ac16a7e`의 clean tracked state에서 fresh precheck를 다시 실행했다. Nonignored untracked entry `93`개는 모두 exact allowlist 내부였고, ordinary non-symlink root `7`, root별 tracked file `0`, effective Chat path는 six-all-unset, overlap·관련 process·root open handle/cwd user·project port listener는 모두 `0`이었다. Runtime artifact와 두 ignore protection도 intact였다.
- Deletion: parent spec 순서대로 seven separate literal `/bin/rm -Rx -- <absolute-root>`를 각각 한 번 실행했고 모두 exit `0`이었다. 각 호출 직후 별도 `lstat`가 해당 root의 `ENOENT`를 확인했으며 retry, 범위 확대, migration과 data rollback은 없었다.
- Post-delete: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run test:dev-entrypoint`, `npm run check:docs-links`와 fixed-point `git diff --check`가 모두 green이었다. 각 gate 뒤 seven-root absence, `packages/codex-chat-runtime/.artifacts`, root `.ay-ple/`와 package `.artifacts/` ignore protection을 다시 확인했다.
- Code review: fixed point `e6e2b1c7dfde9ace04fbbc178ffc2ed112274401`에서 Standards와 Spec을 병렬 검토했다. Standards의 owner closeout·중복 서술 finding을 해소한 뒤 두 축의 follow-up review가 모두 finding 없이 끝났다.

## Blocked By

- [003-rehearse-cutover-candidate.md](003-rehearse-cutover-candidate.md) — Candidate-ready checkpoint에서 deletion gate를 rehearsal한다

## Starting Points

- Parent spec의 `Completed rehearsal과 permanent-deletion contract`
- Ticket 003의 completed Result — confidence-only reference이며 binding, authorization, attempt와 source v8은 실행 입력이 아니다
- `docs/wayfinding/chat-shell-cutover-readiness/assets/014-legacy-removal-manifest.md` — historical removal inventory이며 current deletion contract는 parent spec이 소유한다
- `packages/codex-chat-runtime/.artifacts`
- `.gitignore`

## Result

Current canonical clone에서 다음 approved legacy residue root를 모두 영구 삭제했고 마지막 확인에서도 `ENOENT`였다.

| 순서 | Deleted root |
| --- | --- |
| 1 | `apps/inspector` |
| 2 | `packages/runtime-core` |
| 3 | `packages/runtime-fake` |
| 4 | `packages/runtime-codex` |
| 5 | `.ay-ple` |
| 6 | `apps/server/.ay-ple` |
| 7 | `spikes/codex-runtime-ownership` |

- 삭제한 auth·config·session·history를 current Chat path로 migration하지 않았고 지원되는 data rollback도 없다.
- Remote OAuth나 token은 revoke하지 않았다. Live provider가 다시 필요하면 fresh isolated Chat roots를 준비하고 재로그인해야 한다.
- 다른 clone, external·override root, broad user home과 backup은 검사·삭제 범위에 포함하지 않았다.
- Implementation commits: claim `07c52768`, precheck contract preparation `b331c942`, first blocked-attempt record `c210b87d`, supported deletion primitive `3ac48161`, current handoff propagation `2ec58e4d`.
