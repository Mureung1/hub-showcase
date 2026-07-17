# 018 — Legacy local state를 cutover에서 recoverable cleanup한다

## Wayfinder ticket

- Type: grilling
- State: resolved
- Blocked by: [Legacy surface 삭제 범위와 예외를 증명한다](014-runtime-harness-role.md)

## Question

Codex Chat-only cutover에서 ignored legacy `.ay-ple`과 runtime ownership spike state를 어떤 exact root, 실행 순서와 복구 경계로 함께 정리하며, 과거 Chat manual T0가 재사용한 auth/config를 maintained state로 보존하지 않고 새 explicit Chat root에서 재로그인할 책임을 승인하는가?

## Resolution evidence

- Current Codex Chat의 six explicit root 계약과 `.ay-ple` default·fallback 부재
- 과거 manual live T0가 `.ay-ple/runtime-codex/codex-home`의 auth/config를 명시적으로 한 번 재사용한 예외와 현재 shell·repo `.env`·실행 process의 비사용 상태
- `.ay-ple`, `apps/server/.ay-ple`, `spikes/codex-runtime-ownership/runtime`의 metadata-only inventory, root symlink·canonical overlap과 ignored/tracked 판정
- 현재 Chat materialized runtime인 `packages/codex-chat-runtime/.artifacts`와 `.gitignore`를 cleanup에서 제외하는 경계
- Legacy code cutover 뒤 exact roots를 symlink-follow 없이 recoverable Trash/quarantine으로 이동하고 recovery mapping을 보존하는 순서. Trash 비우기·secure erase·token revoke는 별도 승인
- Original path에서 정리되는 auth/config/session/history는 Git/release rollback만으로 복구되지 않으며 필요하면 새 `CODEX_CHAT_CODEX_HOME`에서 재로그인한다는 사용자 승인
- Cleanup 전 full cutover gate와 cleanup 뒤 bundle/path/status residual을 분리하고, recovery destination의 absolute·unique·same-device·non-overlap 조건을 016에서 승인하는 handoff

## Answer

사용자는 2026-07-17에 legacy local state를 auth/config까지 포함해 모두 정리하고 maintained state로 보존하지 않으며, 이후 live provider가 필요하면 새 explicit `CODEX_CHAT_CODEX_HOME`에서 재로그인하는 경계를 승인했다.

Current Codex Chat은 `.ay-ple`을 자동 공유하지 않는다. Server는 여섯 `CODEX_CHAT_*` absolute path가 모두 없으면 `not_configured`, 일부만 있거나 invalid하면 `invalid_configuration`으로 닫히며 legacy default나 ambient fallback을 제공하지 않는다([config keys와 source resolution](../../../../apps/server/src/codex-chat-config.ts#L14-L21), [environment validation](../../../../apps/server/src/codex-chat-config.ts#L109-L165)). 현재 shell과 repository `.env`에는 이 path가 없고 실행 중인 project Server·Chat Shell도 없다. 다만 완료된 manual live T0는 사용자의 당시 승인으로 `.ay-ple/runtime-codex/codex-home`의 auth/config를 `CODEX_CHAT_CODEX_HOME`으로 한 번 명시적으로 재사용했다([manual T0 기록](../../../../packages/codex-chat-runtime/README.md#L144-L146)). 따라서 cleanup은 current Chat code나 bundle을 지우지 않지만 이 재사용 가능한 로그인·config·session·plugin·skill state를 maintained state에서 제외한다.

### Exact cleanup allowlist

| Exact repository-relative root | 2026-07-17 metadata-only baseline | Disposition |
| --- | --- | --- |
| `.ay-ple` | 5,546 files, 148,520 KiB allocated | **CLEANUP.** `runtime-harness` history와 `runtime-codex` auth/config/session/SQLite를 함께 정리한다. |
| `apps/server/.ay-ple` | 2 files, 52 KiB allocated | **CLEANUP.** 과거 cwd-local Harness history다. |
| `spikes/codex-runtime-ownership/runtime` | 89 files, 3,916 KiB allocated | **CLEANUP.** 완료된 ownership spike의 ignored auth/runtime state다. |

세 root는 ordinary directory이고 서로 canonical overlap이 없으며 tracked file도 없다. Legacy `codex-home` 안의 symlink 3개는 current Chat production bundle을 가리키므로 cleanup은 symlink를 따라가지 않고 link object만 함께 이동해야 한다. Broad glob, unresolved environment variable, repository root나 parent directory를 recursive target으로 사용하지 않는다.

다음은 cleanup allowlist가 아니다.

- `packages/codex-chat-runtime/.artifacts`는 5,556 files, 1,378,220 KiB allocated의 current exact SDK/cache/production bundle이다. Chat actual gate를 즉시 실행할 수 있도록 **RETAIN**한다([materialized bundle owner](../../../../packages/codex-chat-runtime/README.md#L44-L65)).
- Root [`.gitignore`](../../../../.gitignore#L1-L8)의 `.ay-ple/` 규칙은 향후 private app/runtime state가 Git에 들어가지 않도록 **RETAIN**한다.
- Operator가 별도로 disclose하지 않은 external/override root는 이번 exact allowlist의 권한에 포함하지 않는다.

### 실행과 복구 경계

1. 016 preflight에서 project process가 멈췄고 active `CODEX_CHAT_*` path가 allowlist 안을 가리키지 않으며 세 exact root가 symlink 아닌 directory이고 canonical parent와 tracked-file 0이 위 baseline과 일치하는지 확인한다. `.ay-ple` top-level에 감사 뒤 생긴 예상 밖 child가 있으면 자동 포함하지 않고 중단한다.
2. Mixed legacy Server가 `.ay-ple/runtime-harness/runs`를 다시 만들지 않도록 code/workspace cutover를 먼저 완료한다([current default creation](../../../../apps/server/src/server.ts#L357-L372)).
3. Legacy state를 움직이기 전에 016의 full survivor/default/browser/actual gate와 code residual을 먼저 green으로 만든다. 필수 prerequisite가 `blocked`이면 cleanup을 실행하지 않는다.
4. Recovery destination이 resolved absolute·unique·non-symlink·same-device·repository 밖이고 source/current `.artifacts`와 겹치지 않으며 collision·자동 purge 위험이 없는지 검증한다. Mapping 보관 위치도 016에서 정한다.
5. 각 exact root를 symlink-follow 없이 검증된 recovery destination으로 이동하고, 생성된 source→recovery mapping을 root별로 기록한다. Move가 실패하면 `rm`, copy-delete나 broad ignored cleanup으로 fallback하지 않고 중단한다. 이 단계는 현재 clone의 local operator action이며 install/start/CI/merge automation에 넣지 않는다.
6. Original root 부재, recovery entry 존재, root [`.gitignore`](../../../../.gitignore#L1-L8), current Chat `.artifacts`와 bundle/path/status cleanup residual을 다시 확인한다.
7. Data rollback은 기록된 recovery entry를 원래 exact root로 복원한다. Git revert·release rollback은 ignored auth/history를 복구하지 않는다. Trash 비우기·quarantine purge, secure erase와 provider token revoke는 이번 승인 범위가 아니며, 나중에 영구 폐기하면 새 isolated Chat roots와 재로그인이 필요하다. Legacy state를 Chat history/product data로 migration하지 않는다.

이 결정은 [014 removal manifest](../assets/014-legacy-removal-manifest.md)의 별도 local-state cleanup 승인 지점을 충족한다. 016은 keep/migrate/remove를 다시 토론하지 않고 local-only recoverable move, overlap guard, verification과 restore mapping의 실행 gate만 승인한다.
