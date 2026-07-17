# 014 — Legacy surface 삭제 범위와 예외를 증명한다

## Wayfinder ticket

- Type: research
- State: resolved
- Blocked by: [Codex Chat target fitness와 legacy deletion blocker를 감사한다](004-current-architecture-maintainability.md)

## Question

Codex Chat을 유일한 maintained execution path로 만들기 위해 Runtime Harness·Inspector와 legacy `HeadlessCodexClientHost` 경로에서 정확히 무엇을 삭제해야 하며, 삭제 예외를 주장하는 항목이 현재 사용자·대체 불가능한 용도·명시적 owner 세 조건을 모두 증명하는가?

## Resolution evidence

- `apps/inspector`, `/api/runtime/*`, `runtime-core`, `runtime-fake`, legacy Codex adapter·`CodexRawClient`·status·capability, Host·layout·transport, `0.144.0` pin과 generated code를 포함한 exact removal manifest
- Server composition/store/parity script, root dev·demo·test·build·typecheck, workspace dependency·lockfile와 README·ADR·architecture·backlog·generated inventory reference cleanup
- Static camp-demo evidence와 live runtime dependency를 분리하고, 코드 품질·test 수·미래 approval·두 번째 engine·legacy rollback 가능성을 예외 증거로 인정하지 않은 결과
- 예외마다 식별 가능한 현재 사용자 또는 consumer, Codex Chat으로 대체할 수 없는 현재 job, 명시적 owner와 maintenance obligation 세 조건을 모두 확인한 closed list
- Repository 밖 consumer와 실제 Inspector 사용 확인, `.ay-ple/runtime-harness/runs`·legacy homes inventory를 disposition 재토론이 아닌 삭제 preflight로 기록한 결과
- On-disk data를 내용 열람·product history migration 없이 metadata-only preflight하고, exact cleanup은 별도 사용자 승인을 요구한다는 당시 경계와 [후속 018 승인](018-legacy-local-state-cleanup.md)
- Codex Chat에 반드시 필요한 invariant만 target contract/test 언어로 다시 증명하고 legacy test/code를 1:1 이관하지 않는 replacement evidence
- Dormant legacy runtime이 아닌 deletion 전 commit/release baseline과 Git revert·release rollback을 사용한 rollback 경계

## Answer

상세 근거와 exact scope는 [Codex Chat-only legacy removal manifest와 예외 감사](../assets/014-legacy-removal-manifest.md)에 고정했다.

- `apps/inspector/**`, `packages/runtime-core/**`, `packages/runtime-fake/**`, `packages/runtime-codex/**`를 workspace 단위로 삭제한다. 2026-07-17 tracked baseline은 각각 18·8·3·630개, 합계 659개이며 `runtime-codex`의 generated protocol 601개, Adapter·RawClient·status·capability·Host·layout·transport·generator·`@openai/codex@0.144.0` closure를 모두 포함한다.
- Server의 legacy-only source/test 8개와 parity·history·Harness route를 삭제하고, mixed `server.ts`, survivor fixture, Chat status test와 Chat Shell E2E option을 Chat-only composition으로 함께 고친다. Root `dev`는 Server + Chat Shell의 유일한 canonical entrypoint로 바꾸고 `dev:chat-shell` alias, Inspector/legacy workspace scripts와 lockfile closure를 제거한다.
- 세 가지 예외 조건을 모두 만족하는 executable legacy 항목은 **0개**다. Static camp demo와 `references/openai-codex`는 각각 발표 artifact와 current Chat source oracle로 유지되지만 legacy runtime 예외는 아니다. Camp의 serve/export/test/typecheck tooling은 Inspector에서 artifact/root owner로 옮긴다.
- Current architecture owner는 `runtime-harness-implementation-map.md`를 survivor-only `codex-chat-implementation-map.md`로 rename·rewrite하고 generated `codex-app-server-method-inventory.md`는 삭제한다. 완료 ADR·spec·ticket과 static screenshot은 역사 evidence로 남기며, future `raw:` capability 후보는 claim 시 당시 current official source/API로 다시 검증한다.
- Legacy test/code를 1:1 이관하지 않는다. 002의 observable invariant를 deterministic, browser, actual-child, exact local-provider와 Server actual gate에서 target vocabulary로 검증하고, deletion-caused regression이 새로 드러날 때만 최소 survivor test를 추가한다.
- Repository 밖 consumer, 실제 Inspector 사용과 ignored legacy roots는 deletion 전 read-only preflight다. 014 시점에는 data cleanup을 승인하지 않았지만, 사용자가 후속 [018](018-legacy-local-state-cleanup.md)에서 `.ay-ple`, `apps/server/.ay-ple`, `spikes/codex-runtime-ownership/runtime`과 legacy auth/config의 영구 삭제를 승인했다. Current Chat `.artifacts`, `.gitignore`와 exact target 밖 external root는 유지하며 legacy state를 Chat/product history로 migration하지 않는다.
- 실행은 baseline/preflight → camp tooling detach → mixed Server/workspace deletion → root graph/lock → decision/docs propagation → full cutover verification → local permanent deletion → post-deletion bundle/path/status verification 순서다. Code rollback은 pre-deletion commit SHA와 gate log를 기준으로 하며 ignored data에는 rollback이 없다.

따라서 keep/migrate/remove 선택은 더 남아 있지 않다. 018이 후속 local-state disposition을 닫았고, [016](016-cutover-execution-gates.md)은 manifest를 바꾸지 않고 local·merge·release별 command, permanent-cleanup guard, prerequisite/failure owner와 positive/residual gate를 승인했다. Map의 다음 actor는 `/to-spec`이다.
