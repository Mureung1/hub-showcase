# 002 — Codex Chat-only cutover contract와 non-goal을 고정한다

## Wayfinder ticket

- Type: grilling
- State: resolved
- Blocked by: [현재 runtime capability와 ownership을 한 장에 고정한다](001-current-runtime-capability-ownership.md), [Codex Chat-only와 legacy deletion-default를 확정한다](017-codex-chat-only-deletion-default.md)

## Question

Codex Chat을 유일한 maintained product runtime으로 삼고 legacy surface를 삭제할 때, 이번 cutover가 반드시 보존할 current observable contract와 default developer entrypoint는 무엇이며 어떤 known product gap을 이번 deletion과 분리된 non-goal로 명시할 것인가?

## Resolution evidence

- Status, thread start, same-thread follow-up, native identity/FIFO, interrupt, safe terminal/failure, explicit roots, exact bundle과 bounded process cleanup 중 삭제 뒤 반드시 보존할 observable contract
- 현재 Server의 process-global thread 1개·active turn 1개와 browser-memory transcript를 이번 삭제에서 재설계하지 않는 known limitation으로 명시하고, legacy 제거가 existing behavior를 회귀시키지 않는다는 보존 경계
- 현재 `npm run dev`가 Inspector를 시작하는 사실을 반영한 Chat-only default developer entrypoint와 diagnostic surface의 기대 결과
- Multi-client/list/read/resume, activity family, pending interaction, account/config와 두 번째 engine을 이번 deletion spec의 blocker로 삼지 않고 별도 product effort로 넘긴다는 non-goal
- External consumer, Inspector 사용량과 on-disk record 확인은 유지 논거가 아니라 삭제 preflight라는 경계
- Legacy 제거로 current contract가 회귀하거나 Chat-only build·start·test가 깨진다는 구체 evidence가 후속 감사에서 발견될 때만 원인 하나의 bounded remediation ticket을 추가한다는 graph rule

## Answer

이번 cutover는 **Codex Chat의 current public observable behavior를 보존하되 내부 구현을 동결하지 않는 behavior-preserving deletion**으로 정의한다. 이 계약은 legacy 제거의 acceptance baseline이지 미래 기능을 막는 영구적인 extension ceiling이 아니다.

### 보존할 current observable contract

| 경계 | 보존할 invariant |
| --- | --- |
| Status와 policy | Browser-safe closed status union (`unavailable`·`configured`·`starting`·`ready`·`failed`), verified bundle evidence, safe reason·failure code와 현재의 고정 `deny_all`·`read_only` policy metadata를 보존한다. 이 metadata를 아직 구현하지 않은 pending-interaction 제품 계약으로 확대 해석하지 않는다. |
| Configuration과 runtime loading | Six roots를 explicit absolute path로만 받는다. `runtimeRoot`는 full exact bundle 검증, workspace는 readable·executable·non-symlink 검증, 네 controlled home은 readable·writable·executable·non-symlink 및 상호 distinct 검증을 거친다. Sanitized child environment와 no ambient/legacy fallback을 보존하며 pin upgrade는 이 deletion effort에 포함하지 않는다. |
| HTTP와 browser safety | 현재 네 Chat route의 status·thread start·turn stream·interrupt behavior, loopback/Origin guard, bounded input validation, safe HTTP failure envelope를 보존한다. 새 thread는 native `threadId`를 돌려주고 turn은 acceptance-first NDJSON이며 interrupt의 빈 `202`는 acknowledgement일 뿐 terminal completion이 아니다. |
| Identity와 ordering | Native `threadId`·`turnId`·`itemId`를 remap하지 않고, accepted turn stream 내부 allowlisted event의 FIFO, matching identity, `AgentMessage` item reconciliation과 same-thread sequential follow-up을 보존한다. Cross-thread global total order는 계약하지 않는다. |
| Terminal과 failure | `turn.completed`의 `completed`·`interrupted`·`failed`, nonterminal `turn.error`, terminal `runtime.failed`, pre-acceptance safe JSON failure와 post-acceptance exactly-once safe terminal settlement을 구분한다. Stream terminal이 authoritative하다. |
| Lifecycle과 cleanup | Backpressure와 drain이 유한하고 pending operation이 settle되며, close가 idempotent하고 Server shutdown이 runtime close를 기다리며, child process tree가 bounded escalation 뒤 사라진다는 outcome을 보존한다. |
| Browser capability | Safe status disclosure, new conversation, send·stream·interrupt, native identity와 safe terminal/failure 표시를 보존한다. 정확한 UI 문구·layout은 계약으로 동결하지 않는다. |

다음은 public contract로 동결하지 않는다.

- Node↔Python private frame, `bridgeRequestId`, 내부 class·map·queue 구조, patch 구현 방식과 package-private timeout·capacity 숫자. 다만 native identity·FIFO·finite bounds·process reap이라는 outcome은 보존한다.
- `DeterministicCodexChatRuntime`의 canned ID·prompt·call-log fixture. Test double은 public `CodexChatRuntime` conformance를 검증하는 수단이지 제품 동작이 아니다.
- Runtime Harness·legacy Host API, Harness run history, Inspector UI와 legacy `/api/health`. `/api/health`는 현재 Harness persistence health이며 Chat health contract가 아니다.
- 현재 Node/Python 파일 배치나 함수·변수명. 004는 위 observable contract 안에서 살아남는 Module과 Seam을 자유롭게 감사할 수 있다.

### 이번 deletion에서 재설계하지 않는 known limitation

- Server process 전체가 모든 tab/client에 current native thread 1개와 active turn 1개를 공유한다. 이 1/1 cardinality는 영구 target으로 승인하지 않지만 deletion이 더 나쁘게 만들거나 우발적으로 의미를 바꾸지 않는다.
- Selected thread와 transcript는 browser React memory에만 있고 reload 때 사라진다. Persistence·list/read/resume/reconnect를 이번 cutover에 끌어들이지 않는다.
- 현재 exact local runtime은 macOS arm64 local-web 개발 경로다. Cross-platform·packaged Desktop distribution을 deletion blocker로 삼지 않는다.
- Process-wide fatal 뒤 automatic restart·resume를 새로 만들지 않는다. 현재 safe failed settlement와 명시적 재시작 경계만 보존한다.
- `deny_all`·`read_only` status metadata는 현재 expected policy를 보존하지만 client-side fail-closed approval 보증은 아니다. Official low-level SDK에는 unexpected schema-valid approval이 default `accept`에 도달할 수 있는 [알려진 residual](../../../adr/0011-reuse-official-codex-python-sdk-for-chat-shell.md)이 있다. 이번 deletion은 이를 악화시키지 않되 pending-interaction policy 구현으로 확대하지 않는다.

### Default developer entrypoint와 diagnostic surface

- Root `npm run dev`를 **Server + Chat Shell**의 canonical Chat-only 개발 진입점으로 바꾼다. 삭제 뒤 이 명령은 legacy package·kernel·persistence store·Inspector process 없이 시작해야 한다.
- Runtime 설정이 없거나 불완전해도 Server와 Shell은 시작하고, status API와 UI가 mutation을 열지 않은 채 safe `unavailable`과 구체 reason을 보여준다. 현재 root pair처럼 Origin만 주어지고 six roots가 없으면 `invalid_configuration`, Chat 설정이 전혀 없으면 `not_configured`인 closed semantics를 유지한다.
- Exact bundle과 six explicit roots가 검증되면 status가 `configured → starting → ready`로 전이할 수 있다. 이는 auth health 신호가 아니다. 실제 provider conversation에는 `CODEX_CHAT_CODEX_HOME` 안에 명시적으로 선택된 auth/provider state가 별도로 필요하며 ambient auth로 fallback하지 않는다. Fake runtime이나 legacy fallback으로 성공처럼 보이게 하지 않는다.
- 별도의 Inspector 대체 diagnostic UI, Chat raw-run history나 debug endpoint를 만들지 않는다. `/api/codex-chat/status`, Chat Shell의 safe status·native identity·failure disclosure와 automated conformance gates를 current diagnostic surface로 삼는다.
- 기존 `dev:chat-shell`을 alias로 남길지 제거할지와 Inspector workspace에 결합된 camp-demo tooling의 relocation은 014 removal manifest의 script·tooling cleanup detail이다. 이는 Inspector의 유지 예외가 아니다.

### 별도 product effort로 넘기는 non-goal

- Multi-client isolation, multi-thread sidebar, persistence, list/read/resume와 reconnect journal
- Activity family의 live/cold read model
- Pending approval·user input, account/login/config, model·tool control
- 두 번째 engine과 이를 위한 generic runtime abstraction
- AY-PLE 학업 product adapter와 domain mapping
- Inspector parity를 위한 raw log·durable diagnostic history
- Exact pin upgrade, cross-platform runtime, packaged Desktop distribution

External consumer, 실제 Inspector 사용과 on-disk Harness record 확인은 유지 논거가 아니라 014·016의 deletion preflight다. Runtime start/install/CI가 record를 자동 삭제하거나 product conversation history로 migration하지 않는다. 이후 사용자는 [018](018-legacy-local-state-cleanup.md)에서 full cutover gate가 green인 뒤 세 exact local root를 explicit local operator action으로 영구 삭제하도록 별도 승인했다.

### 후속 graph와 verification 경계

- 004가 위 current contract의 legacy-deletion-caused regression 또는 Chat-only build·start·test failure를 구체 evidence로 증명할 때만 원인 하나에 한정한 bounded remediation ticket을 추가한다. 일반 maintainability debt나 미래 feature gap은 trigger가 아니다.
- Root `npm test`만으로 exact native conformance와 process-tree cleanup이 증명되지 않는다. 016은 root test·typecheck·build와 Chat Shell lint·E2E에 더해 `test:node-actual`, `test:local-provider`, Server `test:codex-chat-actual`을 risk-based deletion gate에 명시해야 한다. Actual gate 전에는 ignored macOS-arm64 production bundle의 materialization과 `verify:production-runtime` preflight를 요구하고, bundle·credential 같은 명시적 prerequisite가 없으면 green으로 간주하지 않고 `blocked` evidence로 기록한다.
