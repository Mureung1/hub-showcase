# Codex Chat-only runtime을 채택하고 legacy 실행 표면을 제거한다

분류: 활성

성숙도: 채택

관련 결정: [ADR 0011 — Official Codex Python SDK를 Chat Shell runtime baseline으로 재사용한다](0011-reuse-official-codex-python-sdk-for-chat-shell.md)

## 맥락

Official Python SDK 기반 Codex Chat 경로는 native thread·turn·item identity, AgentMessage stream, interrupt, same-thread follow-up과 bounded process-tree cleanup을 실제 Server와 Browser 경계까지 구현했다. 반면 Runtime Harness와 `HeadlessCodexClientHost`는 현재 Chat conversation을 관찰하거나 대체하지 못했고, production caller와 유지 책임도 없었다.

두 경로를 함께 두면 삭제된 제품 방향이 여전히 선택 가능한 architecture처럼 보인다. 네 legacy workspace, `/api/runtime/*`, Runtime Diagnostic History, generated `0.144.0` protocol inventory와 별도 root command는 current Chat에 rollback capability를 제공하지 않으면서 source·install·navigation graph를 넓혔다.

## 결정

- Maintained runtime graph는 `@ay-ple/codex-chat-runtime`, Chat-only `@ay-ple/server`, `@ay-ple/chat-shell` 세 workspace로 한정한다. 새 generic engine abstraction이나 두 번째 runtime compatibility layer를 만들지 않는다.
- Executable legacy exception은 0개다. `apps/inspector`, `packages/runtime-core`, `packages/runtime-fake`, `packages/runtime-codex`, executable runtime-ownership spike, legacy Server composition·route·store, generated method inventory와 이를 시작하는 root command를 tracked graph에서 제거한다.
- `npm run dev`는 exact Chat Origin을 설정한 Server와 Chat Shell만 시작한다. Current HTTP contract는 `/api/codex-chat/*` 네 route이며 `/api/health`와 `/api/runtime/*`를 Chat alias로 바꾸지 않는다.
- 이 변경은 deprecation period가 없는 hard cutover다. 삭제한 package alias, compatibility export, redirect, executable archive와 dual-run을 남기지 않는다. Historical ADR·spec·ticket·Wayfinder와 static evidence는 당시 기록으로만 보존한다.
- Runtime Diagnostic History, legacy Codex auth·config·session·SQLite와 ownership spike state를 Chat transcript, native conversation, `ModelingRun`, `SemesterModel` 또는 `WorkspaceHistory`로 migration하지 않는다.
- Permanent local cleanup은 tracked cutover와 분리한다. 승인된 일곱 repository-relative root만 clean candidate의 full pre-delete gate와 reviewed non-follow operator를 통과한 뒤 삭제한다. 이 ADR을 도입하는 tracked cutover에서는 해당 영구 삭제를 실행하지 않으며 recovery copy도 만들지 않는다.
- 승인된 exact root는 `apps/inspector`, `packages/runtime-core`, `packages/runtime-fake`, `packages/runtime-codex`, `.ay-ple`, `apps/server/.ay-ple`, `spikes/codex-runtime-ownership`이다. Tracked owner 제거 뒤 남은 ignored·untracked child까지 이 literal boundary 안에서만 다루며 root를 새 path로 추측하지 않는다.
- `packages/codex-chat-runtime/.artifacts`와 root `.gitignore`의 `.ay-ple/` 보호 규칙은 cleanup 대상이 아니다. Exact allowlist 밖 root, symlink target, parent·sibling directory로 범위를 넓히지 않는다.
- Permanent deletion 전에는 tracked cutover range를 pre-cutover base와 비교하거나 되돌릴 수 있다. 삭제 뒤 code regression은 기록된 known-good Chat-only release나 별도 Chat-only incident change로 복구하며 pre-cutover mixed graph를 recovery target으로 삼지 않는다. 삭제한 local data에는 지원되는 rollback이 없고, provider access가 필요하면 fresh isolated Chat root에서 재로그인한다.
- Official source commit `8c68d4c87dc54d38861f5114e920c3de2efa5876`, native runtime `0.144.4`, ordered patch stack, manifest와 verified bundle은 이 architecture contraction에서 변경하지 않는다.

## 검토한 선택지

| 선택지 | 판정 | 이유 |
| --- | --- | --- |
| Legacy graph를 deprecated 상태로 유지 | 거절 | Current consumer·대체 불가능한 job·owner가 없고 존재 자체가 유지되는 architecture로 오해된다. |
| Chat 앞에 generic runtime abstraction을 새로 둔다 | 거절 | 실제 두 번째 engine 없이 current deep seam인 `CodexChatRuntime`을 넓히면 제품 요구보다 추상화가 앞선다. |
| `/api/health` 또는 `/api/runtime/*`를 Chat alias로 유지 | 거절 | Runtime persistence와 Chat status는 의미가 다르고 호환해야 할 current caller가 없다. |
| Legacy local state를 Chat state로 migration | 거절 | 진단 run, native session·auth와 제품 receipt는 서로 다른 수명과 의미를 가진다. |
| Tracked cutover와 local data 삭제를 한 자동 동작으로 결합 | 거절 | Code correctness와 exact local deletion guard를 독립적으로 검증할 수 없고 install·start가 destructive해진다. |

## 결과

- Current source·build·install·navigation topology는 [Codex Chat 구현 지도](../architecture/codex-chat-implementation-map.md)가 소유한다.
- Runtime Harness를 먼저 검증한 [ADR 0003](0003-build-runtime-harness-before-product-layer.md), Runtime Diagnostic History의 [ADR 0004](0004-split-runtime-history-semantics-from-workspace-storage.md)와 Headless Host의 [ADR 0008](0008-separate-headless-codex-client-host-from-product-ui.md)은 완료·역사 기록이다. 이 문서들의 당시 결정을 current executable fallback으로 해석하지 않는다.
- Tracked legacy owner가 제거된 뒤에도 ignored·untracked local residue는 물리적으로 남아 있을 수 있다. 그 inventory, rehearsal과 영구 삭제 완료 여부는 별도 candidate gate가 증명하며 이 ADR이나 tracked graph 완료만으로 추론하지 않는다.
- Current Chat의 status, browser-safe contract, native identity·stream·terminal·interrupt, local `.env`·`PORT` startup과 process lifecycle은 compatibility alias가 아니라 보존해야 할 survivor contract다.
