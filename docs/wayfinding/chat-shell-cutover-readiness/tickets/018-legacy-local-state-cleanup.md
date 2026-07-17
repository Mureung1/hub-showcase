# 018 — Legacy local state를 cutover에서 영구 삭제한다

## Wayfinder ticket

- Type: grilling
- State: resolved
- Blocked by: [Legacy surface 삭제 범위와 예외를 증명한다](014-runtime-harness-role.md)

## Question

Codex Chat-only cutover에서 ignored legacy `.ay-ple`과 runtime ownership spike state를 어떤 exact root와 실행 gate로 영구 삭제하며, 과거 Chat manual T0가 재사용한 auth/config를 포함한 data가 복구되지 않고 새 explicit Chat root에서 재로그인해야 한다는 결과를 승인하는가?

## Resolution evidence

- Current Codex Chat의 six explicit root 계약과 `.ay-ple` default·fallback 부재
- 과거 manual live T0가 `.ay-ple/runtime-codex/codex-home`의 auth/config를 명시적으로 한 번 재사용한 예외와 현재 shell·repo `.env`·실행 process의 비사용 상태
- `.ay-ple`, `apps/server/.ay-ple`, `spikes/codex-runtime-ownership/runtime`의 metadata-only inventory, root symlink·canonical overlap과 ignored/tracked 판정
- 현재 Chat materialized runtime인 `packages/codex-chat-runtime/.artifacts`와 `.gitignore`를 permanent cleanup에서 제외하는 경계
- Full cutover gate가 green인 뒤 세 literal exact root만 symlink-follow 없이 영구 삭제하고, broad glob·unresolved environment·repository root·`git clean`을 사용하지 않는 fail-closed 순서
- Local auth/config/session/history에는 data rollback이 없고 Git/release rollback도 이를 복구하지 않으며 필요하면 새 `CODEX_CHAT_CODEX_HOME`에서 재로그인한다는 사용자 승인

## Answer

사용자는 2026-07-17에 recoverable Trash/quarantine 방안을 명시적으로 기각하고 legacy local state를 auth/config까지 포함해 **영구 삭제**하기로 결정했다. 검토 목적은 Codex Chat contract를 보존하면서 legacy architecture를 제거해도 되는지 확인하는 것이었고, full gate가 green이면 data trace를 별도로 유지할 이유가 없다는 판단이다.

Current Codex Chat은 `.ay-ple`을 자동 공유하지 않는다. Server는 여섯 `CODEX_CHAT_*` absolute path가 모두 없으면 `not_configured`, 일부만 있거나 invalid하면 `invalid_configuration`으로 닫히며 legacy default나 ambient fallback을 제공하지 않는다([config keys와 source resolution](../../../../apps/server/src/codex-chat-config.ts#L14-L21), [environment validation](../../../../apps/server/src/codex-chat-config.ts#L109-L165)). 현재 shell과 repository `.env`에는 이 path가 없고 실행 중인 project Server·Chat Shell도 없다. 다만 완료된 manual live T0는 `.ay-ple/runtime-codex/codex-home` auth/config를 `CODEX_CHAT_CODEX_HOME`으로 한 번 명시적으로 재사용했다([manual T0 기록](../../../../packages/codex-chat-runtime/README.md#L144-L146)). 이 login/config/session/plugin/skill state도 permanent cleanup에 포함하며, 이후 live provider에는 새 isolated Chat roots와 재로그인이 필요하다.

### Exact permanent-cleanup allowlist

| Exact repository-relative root | 2026-07-17 metadata-only baseline | Disposition |
| --- | --- | --- |
| `.ay-ple` | 5,546 files, 148,520 KiB allocated | **PERMANENT DELETE.** `runtime-harness` history와 `runtime-codex` auth/config/session/SQLite를 함께 삭제한다. |
| `apps/server/.ay-ple` | 2 files, 52 KiB allocated | **PERMANENT DELETE.** 과거 cwd-local Harness history다. |
| `spikes/codex-runtime-ownership/runtime` | 89 files, 3,916 KiB allocated | **PERMANENT DELETE.** 완료된 ownership spike의 ignored auth/runtime state다. |

세 root는 ordinary directory이고 서로 canonical overlap이 없으며 tracked file도 없다. Root `.ay-ple`과 ownership spike의 두 legacy `codex-home` 아래에는 descendant symlink가 각각 3개, 합계 6개 있다. Permanent cleanup은 모든 descendant symlink를 non-follow inventory하고 link target을 따라가지 않은 채 link object와 containing literal root만 삭제해야 한다. Broad glob, unresolved environment variable, repository root·parent directory나 exact allowlist 밖 path를 recursive target으로 사용하지 않는다.

다음은 permanent-cleanup allowlist가 아니다.

- `packages/codex-chat-runtime/.artifacts`는 current exact SDK/cache/production bundle이므로 **RETAIN**한다([materialized bundle owner](../../../../packages/codex-chat-runtime/README.md#L44-L65)).
- Root [`.gitignore`](../../../../.gitignore#L1-L8)의 `.ay-ple/` 규칙은 향후 private app/runtime state가 Git에 들어가지 않도록 **RETAIN**한다.
- Operator가 별도로 disclose하지 않은 external/override root는 이번 exact allowlist의 권한에 포함하지 않는다.

### 실행과 rollback 경계

1. Project process와 open handle이 없고 active Chat runtime/state root와 allowlist가 양방향으로 disjoint하며 세 exact root가 symlink 아닌 directory이고 canonical parent·tracked-file 0·top-level baseline과 일치하는지 실행 직전에 다시 확인한다. `CODEX_CHAT_WORKSPACE`가 repository ancestor인 경우만 no-process/open-handle 조건 아래 containment를 허용한다. 예상 밖 child나 overlap을 발견하면 삭제하지 않고 block한다.
2. Mixed legacy Server가 `.ay-ple/runtime-harness/runs`를 다시 만들지 않도록 code/workspace cutover를 먼저 완료한다([current default creation](../../../../apps/server/src/server.ts#L357-L372)).
3. Local state를 지우기 전에 016의 full survivor/default/browser/actual gate와 code residual을 모두 green으로 만든다. 필수 prerequisite가 없거나 실패하면 permanent cleanup을 실행하지 않는다.
4. 세 literal exact root만 symlink-follow 없이 직렬 영구 삭제하며 root 하나의 command나 ENOENT postcondition이 실패하면 다음 root를 건드리지 않는다. `git clean -fdX`, glob, unresolved variable, broad parent deletion, copy/move/quarantine fallback을 금지한다. 삭제가 일부 실패하면 scope를 넓히지 않고 exact remaining root와 실패를 보고한다.
5. 세 original root의 부재, root [`.gitignore`](../../../../.gitignore#L1-L8), current Chat `.artifacts`, production bundle과 bundle/path/status residual을 다시 검증한다.
6. Code regression은 pre-deletion commit SHA와 gate log를 기준으로 Git revert한다. 삭제한 ignored data에는 rollback이 없으며 Git history·release·code revert로 복구되지 않는다. 여기서 permanent는 workflow가 recovery copy를 만들지 않고 지원하는 data rollback이 없다는 뜻이며 secure erase나 APFS snapshot·Time Machine·external backup 제거를 주장하지 않는다. Local credential 삭제는 remote OAuth token revoke와 같지 않으며 revoke는 이번 scope가 아니다.

이 결정은 [014 removal manifest](../assets/014-legacy-removal-manifest.md)의 data disposition을 최종 확정했다. [016](016-cutover-execution-gates.md)은 keep/migrate/remove나 recovery destination을 다시 토론하지 않고 permanent cleanup 전후 gate, failure owner와 spec readiness를 승인했으며 map의 다음 actor는 `/to-spec`이다.
