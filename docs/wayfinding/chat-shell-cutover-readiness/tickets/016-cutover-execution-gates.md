# 016 — Legacy deletion 실행 gate와 spec readiness를 승인한다

> 완료·역사 ticket이다. 이 ticket의 세-root 실행 snapshot은 `/to-spec` live-tree 재검증으로 supersede됐으며, exact seven-root/current-build/journal contract는 [Codex Chat-only runtime cutover spec](../../../specs/2026-07-17-codex-chat-only-cutover.md)이 소유한다.

## Wayfinder ticket

- Type: grilling
- State: resolved
- Blocked by: [Legacy surface 삭제 범위와 예외를 증명한다](014-runtime-harness-role.md), [Legacy local state를 cutover에서 영구 삭제한다](018-legacy-local-state-cleanup.md)

## Question

승인한 removal manifest, consumer·data preflight, strict verification gate, permanent local deletion, 실행 순서와 code-only rollback이 구현자가 추가 architecture 판단 없이 implementation-ready spec으로 옮길 만큼 완결되었는가?

## Resolution evidence

- 삭제 대상과 historical allowlist의 폐쇄 목록, executable exception 0개와 external consumer 발견 시 offboarding block 규칙
- Camp detach → mixed code/workspace deletion → root graph·lock → active docs → full verification → permanent local deletion → post-delete verification의 atomic order
- Clean candidate `npm ci`, local, merge와 release checkpoint별 exact command, prerequisite·failure owner와 `blocked`를 skip/green으로 바꾸지 않는 strict 판정
- `/api/runtime/*`, Inspector, legacy workspace package·pin·generated schema와 active current-doc reference가 남지 않았음을 확인하는 residual oracle
- Code rollback을 위한 immutable `rollback_base_sha`, `cutover_candidate_sha`와 gate log, ignored local data에는 rollback이 없다는 경계
- 세 literal root의 pinned current-clone identity, lstat·canonical parent·tracked-file 0·expected child·symmetric Chat-path disjointness, no-process/open-handle와 descendant symlink 6개를 포함한 non-follow guard
- Argument를 받지 않는 reviewed one-shot operator, macOS `/bin/rm -Rfx -- <validated absolute root>`, root별 ENOENT 확인과 첫 실패 즉시 hard-stop하는 exact permanent-deletion primitive
- Git directory에 source/hash를 고정하는 one-shot residual checker, exit 0/1/2 semantics와 post-delete `test:dev-entrypoint` 재실행. Legacy banned list와 cleanup utility는 final product tree에 남기지 않는 경계
- `.ay-ple`, `apps/server/.ay-ple`, ownership spike runtime의 permanent deletion과 current Chat `.artifacts`·root `.gitignore` retention
- Cleanup을 install/start/CI/merge automation에 넣지 않고 current-clone operator가 full gate green 뒤 한 번 실행하는 적용 경계
- 삭제 후 exact root 부재, recovery copy 부재, production bundle·configured/unconfigured status와 code/data residual을 다시 확인하는 oracle
- 추가 architecture 판단 없이 `/to-spec`이 tracer-bullet deletion slice와 acceptance gate를 작성할 수 있다는 사용자 승인

## Answer

사용자는 2026-07-17에 strict full gate와 세 exact legacy local-state root의 **영구 삭제**를 승인했다. Recoverable quarantine, restore mapping과 data rollback은 만들지 않는다. 검토의 질문은 legacy를 보존할 이유를 찾는 것이 아니라 Codex Chat contract를 보존한 채 안전하게 삭제할 수 있는지를 증명하는 것이었고, 현재 repository·bounded sibling·process·configuration audit에서는 external consumer나 active Chat overlap을 찾지 못했다.

사용자에게 external consumer를 아는지 묻는 방식은 실행 증거가 아니다. 후속 implementation은 repository·process·configuration preflight를 스스로 다시 수행하고, consumer가 발견될 때만 owner와 offboarding date를 기록해 destructive phase를 block한다. 발견 사실도 dormant legacy keep의 자동 근거가 되지 않는다.

[016 cutover 실행 gate](../assets/016-cutover-execution-gates.md)는 다음 결정을 고정한다.

1. Code/workspace/docs cutover candidate를 먼저 clean commit으로 만들고 detached worktree의 `npm ci`부터 full default/browser/camp/residual gate를 실행하며, current clone의 actual gate log를 같은 immutable SHA에 연결한다.
2. Required prerequisite가 없거나 command가 실패하면 `blocked`/`red`이며 local deletion을 실행하지 않는다. Live provider OAuth만 필수 gate가 아니다.
3. Full gate가 green이면 current clone/HEAD를 다시 고정하고 세 literal exact root만 reviewed one-shot primitive로 symlink-follow 없이 직렬 영구 삭제한다. 예상 밖 child, symmetric active Chat overlap, process/open handle, external consumer 또는 root 하나의 command/postcondition 실패가 있으면 다음 root를 건드리지 않고 fail closed한다.
4. 삭제한 ignored auth/config/session/history에는 rollback이 없다. Permanent는 recovery copy나 지원되는 data rollback이 없다는 뜻이지 secure erase를 뜻하지 않는다. Code만 Git revert/redeploy할 수 있고, 이후 live provider에는 fresh isolated Chat roots와 재로그인이 필요하다.
5. Current Chat `.artifacts`, root `.gitignore`, exact allowlist 밖 external root와 명시된 point-in-time historical docs/static artifact는 유지한다. Active architecture와 agent navigation은 Chat-only여야 한다.

따라서 모든 in-scope fog가 해소되었고 map은 `ready-for-spec`으로 전환할 수 있다. Wayfinder 규칙상 이 ticket은 production code나 local state를 직접 삭제하지 않으며, 다음 실행은 정확히 `/to-spec docs/wayfinding/chat-shell-cutover-readiness/map.md`다.
