# Codex Chat-only runtime cutover

## Agent triage

- State: ready-for-ticketing
- Surface: local-spec
- Next actor: /implement (Ticket 004)

## Problem Statement

Official SDK 기반 Codex Chat Shell은 native thread·turn·item identity, AgentMessage streaming, interrupt, same-thread follow-up과 bounded process-tree cleanup까지 구현·검증됐다. 그러나 repository의 기본 실행과 active architecture에는 그 이전 단계였던 Runtime Harness·Inspector와 legacy `HeadlessCodexClientHost` 경로가 함께 남아 있다.

이 공존은 실제 rollback이나 대체 가능한 제품 capability를 제공하지 않는다. Runtime Harness는 Chat conversation을 관찰하지 못하고, legacy Host는 production caller와 thread·turn 제품 동작이 없다. 그럼에도 네 legacy workspace, `/api/runtime/*`, Runtime Diagnostic History, `@openai/codex@0.144.0` generated protocol, root command와 active 문서가 유지되면서 앞으로의 작업자가 두 경로를 대칭적인 architecture 선택지로 오해하게 만든다. 삭제된 architecture의 local auth·history state도 repository 아래 `.ay-ple` 계열 root에 남아 있다.

프로젝트가 Codex Chat을 유일하게 발전시킬 runtime으로 확정했으므로, 이번 변경은 legacy surface를 deprecated 상태로 보존하는 일이 아니라 hard cutover로 제거해야 한다. 동시에 대규모 삭제가 현재 Chat의 observable behavior, process lifecycle과 검증 근거를 약화시키거나, 고정 fixture와 default unit suite만으로 green을 주장하거나, broad local cleanup으로 승인하지 않은 data를 건드려서는 안 된다.

## Solution

`@ay-ple/codex-chat-runtime`, Chat-only `@ay-ple/server`, `@ay-ple/chat-shell`을 유일한 maintained runtime graph로 남긴다. Runtime Harness·Inspector, `runtime-core`, `runtime-fake`, legacy `runtime-codex`, executable runtime-ownership spike 전체와 Server·root·lockfile의 연결 edge를 하나의 cutover에서 제거한다. Root `npm run dev`는 Server와 Chat Shell만 시작하는 canonical entrypoint가 되고, static camp demo는 Inspector workspace와 분리된 artifact-local tooling으로 유지한다.

삭제는 현재 Chat contract를 동결하는 것이 아니라 observable invariant를 보존하는 behavior-preserving contraction이다. Browser-safe contract, `CodexChatRuntime` Interface, process supervisor, `CodexChatService`, Chat Shell parser·reducer를 유지하고 private Node↔Python frame, class·field 배치와 test fixture literal은 호환성 표면으로 취급하지 않는다.

Active ADR·architecture·product·package 문서는 Chat-only current state로 전파하고, 과거 Runtime Harness의 교훈은 Git history와 완료·역사 문서, Wayfinder evidence와 static camp artifact에만 남긴다. Executable legacy exception은 없다.

Tracked cutover와 Ticket 003의 completed rehearsal evidence는 Chat-only baseline과 deletion shape를 이미 검증했다. Ticket 004는 current clone에서 clean tracked state, seven-root tracked-zero·root non-symlink, effective Chat path non-overlap과 관련 process absence만 read-only로 재확인한 뒤, 사용자가 승인한 일곱 exact local legacy residue root를 literal serial command로 영구 삭제하고 각 root의 absence를 확인한다. 새 candidate binding, detached worktree, gate framework나 authorization artifact는 만들지 않는다. Recovery copy나 product/native history migration은 없으며, 삭제 뒤 code regression은 legacy graph를 되살리지 않는 known-good Chat-only change가 소유한다. 삭제한 auth·config·session·history data에는 rollback이 없고 이후 live provider가 필요하면 새 isolated Chat roots에서 재로그인한다.

## User Stories

1. 유지보수자로서 repository에서 하나의 runtime architecture만 보고 싶다. 그래야 새 기능과 수정이 사용되지 않는 Host·Harness abstraction으로 분산되지 않는다.
2. 개발자로서 `npm run dev` 하나로 Server와 Chat Shell을 시작하고 싶다. 그래야 기본 개발 경로가 실제 제품 경로와 일치한다.
3. Chat 사용자로서 cutover 뒤에도 status, native conversation, streaming, interrupt, terminal과 safe failure 동작이 그대로 유지되길 원한다. 그래야 architecture 정리 때문에 현재 제품 behavior가 회귀하지 않는다.
4. 테스트 유지보수자로서 legacy test 수나 canned identifier를 이관하는 대신 survivor invariant를 각자 가장 강한 seam에서 검증하고 싶다. 그래야 fixture에 맞춘 green과 실제 native/process conformance를 구분할 수 있다.
5. 운영자로서 completed rehearsal을 confidence evidence로 유지하고, deletion 직전 exact root와 current Chat path·process boundary를 다시 확인한 뒤에만 local legacy state를 삭제하고 싶다. 그래야 verifier ceremony를 반복하지 않으면서 실제 삭제 경계는 fail closed한다.
6. 운영자로서 승인한 일곱 local residue root만 symlink target을 따라가지 않고 영구 삭제하고 싶다. 그래야 broad cleanup이 current Chat bundle이나 다른 사용자 data로 확장되지 않는다.
7. 문서 독자로서 active 문서에서는 Codex Chat-only topology만 보고, 과거 결정은 명시적인 역사 기록으로 구분하고 싶다. 그래야 완료된 실험이 현재 architecture owner로 다시 인용되지 않는다.
8. 외부 consumer owner로서 실제 legacy 호출이 발견되면 삭제 예외로 자동 존치되는 대신 offboarding surface와 시점을 명확히 조정하고 싶다. 그래야 hidden dependency를 깨뜨리지 않으면서 cutover 방향은 유지된다.
9. 장애 대응자로서 permanent deletion 뒤 code regression은 기록된 known-good Chat-only SHA로 복구하되, pre-cutover legacy graph나 삭제한 local data가 복원된다고 오해하지 않고 싶다. 그래야 code rollback과 credential/history recovery의 책임이 섞이지 않는다.

## Current State and Constraints

### Cutover 시작 시 기준선

이 spec을 작성할 당시 repository는 두 실행 graph를 한 Server와 root command에 함께 조립하고 있었다.

| 영역 | 현재 상태 |
| --- | --- |
| Codex Chat runtime | `@ay-ple/codex-chat-runtime`이 exact official source commit `8c68d4c87dc54d38861f5114e920c3de2efa5876`, native runtime `0.144.4`, verified macOS arm64 bundle, persistent Python bridge와 hardened Node supervisor를 소유한다. |
| Server Chat surface | `/api/codex-chat/*`가 explicit configuration, closed status, native thread/turn stream, interrupt, disconnect drain과 lifecycle-owned shutdown을 제공한다. |
| Browser surface | `@ay-ple/chat-shell`이 browser-safe `./contract`만 사용해 transient one-thread conversation을 표시한다. |
| Legacy Harness | `apps/inspector`, `packages/runtime-core`, `packages/runtime-fake`, `packages/runtime-codex`와 Server의 `/api/runtime/*`, `/api/health`, persistence·SSE composition이 함께 남아 있다. |
| Legacy Host | `packages/runtime-codex`가 `HeadlessCodexClientHost`, product layout, bidirectional transport와 generated `0.144.0` protocol을 export·self-test하지만 production caller는 없다. |
| Root entrypoint | `npm run dev`는 Server+Inspector, 별도 `npm run dev:chat-shell`은 Server+Chat Shell을 시작한다. Server entrypoint는 caller environment를 우선하고 local `.env`를 fallback으로 읽으며 `PORT` 기본값은 `3000`이다. Camp tooling도 Inspector workspace에 결합돼 있다. |
| Legacy spike | `spikes/codex-runtime-ownership`에는 tracked login/verify runner와 `@openai/codex@0.142.5` lock, ignored `node_modules`·auth·runtime state가 함께 남아 있고 삭제한 runtime root를 다시 만들 수 있다. |
| Local state | `.ay-ple`, `apps/server/.ay-ple`과 executable spike root에 ignored legacy history·auth·runtime state가 있다. Current Chat bundle은 별도 `packages/codex-chat-runtime/.artifacts`가 소유한다. |

당시 file-level 연결은 [014 removal manifest](../wayfinding/chat-shell-cutover-readiness/assets/014-legacy-removal-manifest.md)의 조사 snapshot이다. 이 목록은 구현 시 live tree와 다시 대조해야 하며, 완료 기준은 과거 file count가 아니라 아래 contract와 residual oracle이다.

### 채택한 목표

```text
apps/chat-shell
    -> /api/codex-chat/*
apps/server
    -> @ay-ple/codex-chat-runtime
packages/codex-chat-runtime
    -> verified bundled Python bridge
    -> official openai-codex SDK + exact native 0.144.4
```

Static `artifacts/camp-demo`는 이 runtime graph의 consumer가 아니다. 자체 serve/export/test/typecheck owner를 갖는 presentation artifact로만 남는다.

### 제약과 known limitation

- Cutover는 current exact official source, `0.144.4` runtime pin, patch stack과 production manifest를 업그레이드하지 않는다. 뜻밖의 runtime source·manifest 변경은 scope drift다.
- 현재 Server는 process-global current thread 하나와 active turn 하나를 소유하고, Browser transcript는 tab memory에만 있다. Multi-client isolation, reload 복원과 `thread/read`·`thread/resume`은 이번 삭제에서 재설계하지 않는다.
- 첫 production·verification target은 macOS arm64 desktop이다. Mobile, Windows/Linux와 packaged Desktop distribution은 포함하지 않는다.
- `deny_all + read_only` metadata와 exact-local policy evidence는 유지하지만, 예상 밖의 schema-valid approval request에 대한 새 client-side fail-closed defense를 추가하지 않는다.
- Live provider OAuth 성공은 cutover requirement가 아니다. Provider-free exact native와 actual process confidence는 completed Ticket 003 rehearsal이 제공하며 Ticket 004에서 재실행하지 않는다.
- General debt인 Server impossible-state type, interrupt attempt/ack conflation, component locality와 fixture helper 구조는 cutover가 해당 semantics를 건드리지 않는 한 이번 scope에서 refactor하지 않는다.
- External/override legacy root는 exact deletion allowlist에 자동 포함하지 않는다. 광범위한 home, shell history나 browser history scan도 수행하지 않는다.

## Implementation Contract

### Module Responsibilities and Seams

| Module | Target responsibility | Boundary |
| --- | --- | --- |
| `@ay-ple/codex-chat-runtime` | Exact bundle verification, controlled-environment Python spawn, private correlation, native event projection, bound·deadline·fatal settlement와 process-group reap | Node-only `.`, browser-safe `./contract`, test-only `./testing`의 세 export를 유지한다. Generic engine Interface, raw JSON-RPC export와 AY-PLE domain state를 추가하지 않는다. |
| `@ay-ple/server` | Chat configuration, local `.env`·`PORT` startup behavior, `CodexChatService` lease/lifecycle, loopback·Origin guarded HTTP/NDJSON와 listener/runtime close ordering | Lifecycle을 소유하는 `createServerApplication()`을 유일한 application composition으로 사용한다. Express-only legacy compatibility factory, Kernel/history composition, generic CORS와 legacy routes를 제거한다. |
| `@ay-ple/chat-shell` | Status 조회, thread/turn HTTP client, strict NDJSON parsing, native identity reducer, transcript와 interrupt UI | Production source는 `@ay-ple/codex-chat-runtime/contract`만 사용한다. Node runtime, Python bridge나 private transport를 import하지 않는다. |
| Root developer graph | Canonical Chat dev entrypoint와 survivor/camp command orchestration | `dev`는 Server+Chat Shell만 시작한다. `dev:chat-shell` alias와 executable Inspector 경로는 남기지 않는다. |
| `artifacts/camp-demo` | Static deck/product-flow의 serve, export, unit, typecheck와 browser E2E | Live Server·Inspector·Harness 없이 artifact-local helper와 config로 실행한다. Week 1 screenshot은 역사 evidence이지 executable exception이 아니다. |
| Active documentation | Current Chat topology, runtime isolation, product boundary와 work order | 새 cutover ADR과 survivor-only implementation map이 current owner가 된다. 완료·역사 문서는 current owner로 인용하지 않는다. |

Tracked deletion은 다음 closed component boundary를 따른다.

| Boundary | Disposition |
| --- | --- |
| `apps/inspector/**` | Workspace 전체 삭제. Camp tooling을 먼저 분리한다. |
| `packages/runtime-core/**` | Harness lifecycle, `RuntimeRun*`, persistence seam과 tests 전체 삭제. |
| `packages/runtime-fake/**` | Harness Adapter package 전체 삭제. |
| `packages/runtime-codex/**` | Adapter·RawClient·status·capability·Host·layout·transport·generated protocol·generator·decision overlay·tests와 `@openai/codex@0.144.0` edge 전체 삭제. |
| `spikes/codex-runtime-ownership/**` | Tracked runner·README·report·manifest·lock·gitignore와 ignored `@openai/codex@0.142.5` install/runtime state를 모두 삭제한다. 교훈은 Git history와 `docs/spikes/codex-runtime-ownership/plan.md`의 명시적 history record로만 남긴다. |
| Server mixed cluster | Legacy imports/options/factory, Kernel·store construction, `/api/runtime/*`, `/api/health`, SSE/history helpers, parity/store source·fixtures와 legacy dependencies를 삭제한다. Chat application lifecycle과 Chat tests는 유지한다. |
| Root graph와 lock | Legacy workspace/script/dependency edge를 제거하고 manifest로부터 `package-lock.json`을 재생성한다. Lockfile을 손으로 편집하지 않는다. |
| Generated method inventory | 삭제되는 pin/generator의 current document이므로 삭제하고 redirect나 archive 사본을 만들지 않는다. |

Package만 먼저 지워 Server나 root graph가 compile되지 않는 integration boundary를 만들지 않는다. Camp detach는 Inspector 삭제 전에 independently green이어야 하며, Server mixed cluster·workspace deletion·root graph·lock은 하나의 merge/revert 가능한 cutover range로 다룬다.

### Interfaces and Invariants

#### 보존할 Codex Chat contract

| Contract | Required invariant |
| --- | --- |
| Status | `unavailable | configured | starting | ready | failed` closed union과 모든 variant의 `approvalMode: deny_all`, `sandbox: read_only`를 보존한다. `unavailable` reason은 `not_configured | invalid_configuration | runtime_missing`이다. `configured | starting | ready | failed`는 `sourceCommit`과 `runtimeVersion` evidence를 보존하며, `failed`는 그 공통 evidence 외에 safe stable `failureCode`만 추가한다. |
| Configuration | `CODEX_CHAT_RUNTIME_ROOT`, `CODEX_CHAT_WORKSPACE`, `CODEX_CHAT_RUNTIME_HOME`, `CODEX_CHAT_CODEX_HOME`, `CODEX_CHAT_SQLITE_HOME`, `CODEX_CHAT_TEMP_DIR` 여섯 explicit absolute path를 요구한다. Workspace는 readable/executable non-symlink directory이고, 네 controlled directory는 readable/writable/executable non-symlink이면서 서로 distinct하다. Complete bundle과 sanitized child environment를 검증하며 legacy env, `.ay-ple`, `process.cwd()`, system Python, ambient `PATH`나 credential/provider로 fallback하지 않는다. Server entrypoint는 기존처럼 caller environment를 우선하고 local `.env`를 fallback으로 읽으며 `PORT` 미지정 시 `3000`을 사용한다. |
| Canonical dev status | `npm run dev`가 주입하는 Origin만 있고 여섯 path가 없으면 exact status reason은 `invalid_configuration`이다. 아무 Chat config도 없으면 `not_configured`, fresh valid six-root와 verified runtime이면 spawn 전 `configured`다. |
| HTTP | `GET /api/codex-chat/status`, `POST /api/codex-chat/threads`, `POST /api/codex-chat/threads/:threadId/turns`, `POST /api/codex-chat/threads/:threadId/turns/:turnId/interrupt` 네 route만 Chat contract로 유지한다. Mutation은 loopback과 absent 또는 exact configured local Origin만 허용하고 body·ID·UTF-8 byte bound를 fail closed한다. |
| Conversation | Native `threadId`, `turnId`, `itemId`를 remap하지 않는다. Turn POST는 native acceptance 뒤에만 HTTP NDJSON을 commit하고 `turn.accepted`를 첫 frame으로 보낸다. 같은 turn의 allowlisted event는 official SDK FIFO를 보존하며 cross-thread global order는 정의하지 않는다. |
| AgentMessage | Delta를 exact item scope에 append하고 completed text로 reconcile한다. Raw protocol, stderr, traceback, path, credential, hidden reasoning과 채택하지 않은 item은 browser contract를 넘지 않는다. |
| Terminal | `turn.error`는 nonterminal observation이다. 첫 matching `turn.completed`의 `completed | interrupted | failed` 또는 process-wide `runtime.failed`만 terminal이다. Synthetic successful/interrupted terminal을 만들지 않고, active state는 terminal과 같은 전이에서 한 번 해제한다. |
| Interrupt | Accepted active turn에만 exact native identity로 요청한다. Empty HTTP `202`는 control acknowledgement일 뿐이며 matching stream terminal이 authoritative하다. Nonfatal control failure는 existing stream을 유지한다. |
| Failure | Pre-acceptance mutation error는 safe JSON error와 `unknownOutcome`을 보존하고 자동 retry하지 않는다. Acceptance 뒤 transport/process failure는 final `runtime.failed`로 정산한다. Raw child detail을 노출하지 않는다. |
| Backpressure·disconnect | NDJSON write backpressure를 bounded하게 기다리고 browser disconnect 뒤 best-effort interrupt와 bounded native drain을 수행한다. Terminal이 없으면 shared runtime을 닫아 outcome을 명시적으로 실패시킨다. |
| Lifecycle | Server close는 새 intake를 먼저 막고 listener close를 시작한 뒤 runtime close를 한 promise로 수렴한다. Runtime close는 idempotent하며 pending operation·stream, pipe와 Python/native process group disappearance를 모두 bounded하게 정산한다. |
| Browser | Safe loading/empty/unavailable/failure 상태, explicit new conversation, one active turn, interrupt와 same-thread sequential follow-up을 보존한다. Reload resume나 multi-thread persistence를 암시하지 않는다. |

다음은 compatibility contract가 아니다.

- Private `bridgeRequestId`, Node↔Python frame과 internal class/map/timeout name
- Deterministic fixture의 `thread-A`, `turn-A1`, `item-A1`, prompt와 expected literal text
- Legacy `RuntimeRun`, SSE, status/capability, Host generation/subscription과 error taxonomy
- Test count, generated method count와 과거 tracked file count
- Source file layout과 private helper naming

#### Root command와 artifact contract

| Command | Target behavior |
| --- | --- |
| `npm run dev` | `CODEX_CHAT_ORIGIN=http://127.0.0.1:4173`을 Server에 전달하고 Server+Chat Shell만 시작한다. |
| `npm run demo` | Live runtime 없이 static camp demo convenience command로 동작한다. |
| `npm run serve:camp-demo` | Artifact-local Vite owner로 camp demo를 제공한다. |
| `npm run export:camp-demo` | Inspector workspace 없이 deck을 export한다. |
| `npm run test:camp-demo` | Static product-flow와 export unit suite를 실행한다. |
| `npm run test:camp-demo:e2e` | Artifact-local Playwright config로 camp browser suite를 실행한다. |
| `npm test` | `codex-chat-runtime`, Server, Chat Shell과 camp unit owner만 호출한다. |
| `npm run test:e2e` | Chat Shell Playwright와 camp Playwright만 호출한다. |
| `npm run build` | 세 survivor workspace의 literal `./dist`를 `/bin/rm -Rfx --`로 먼저 비운 뒤 clean build한다. |
| `npm run typecheck` | 세 survivor workspace와 artifact-local camp TypeScript를 검사한다. |
| `npm run test:dev-entrypoint` | Canonical `npm run dev`의 origin-only/configured case, local `.env`·`PORT` startup behavior, process argv와 bounded reap을 검증한다. |
| `npm run check:docs-links` | Active Markdown relative link와 deleted current owner reference를 검증한다. Historical reference의 현재성 판정은 ordinary Standards·Spec review가 맡는다. |

`npm run lint -w @ay-ple/chat-shell`은 maintained UI lint gate다. Inspector lint와 `dev:chat-shell`, `smoke:codex`, `verify:codex-parity`, legacy method generation command는 제거한다.

Root와 세 survivor manifest는 command 이름만 남기는 것으로 충분하지 않다. Gate는 각 command가 위 target behavior를 실제로 실행하는지, survivor workspace roster와 camp invocation이 legacy workspace를 참조하지 않는지를 검증한다. 주석·`echo`·항상 성공하는 wrapper는 green으로 인정하지 않는다.

Cutover diff는 이 spec의 legacy deletion boundary, Server/root wiring, camp detach, active documentation과 그 검증에 필요한 최소 survivor 변경으로 제한한다. `packages/codex-chat-runtime`의 runtime pin·patch·observable contract, Chat Shell/Server의 unrelated behavior, static camp content와 역사 문서는 보존한다. 이 범위를 넘는 survivor 변경은 별도 spec과 validation을 요구한다.

#### Current documentation과 history invariant

새 `docs/adr/0012-adopt-codex-chat-only-and-remove-legacy-runtime-surfaces.md`는 Chat-only, deletion-default, executable exception 0개, permanent local cleanup, no migration, post-delete Chat-only recovery와 재로그인 결정을 장기 소유한다. Current mixed implementation map은 `docs/architecture/codex-chat-implementation-map.md`로 rename+rewrite하고 survivor topology만 설명한다. Old map의 redirect/archive copy는 만들지 않는다.

Root·docs index, AGENTS, active architecture/product docs, ADR 0005·0006·0007·0009·0011과 survivor README는 Chat-only current state로 갱신한다. 이 closed current set에는 `references/README.md`, `artifacts/camp-demo/README.md`의 실행 안내, camp deck·speaker notes의 current-vs-history 설명도 포함한다. Deleted path나 pin을 current dependency로 오해할 수 있는 technical reference에는 짧은 cutover banner와 survivor map pointer를 둔다.

ADR 0004는 본문을 보존하되 `완료·역사 기록`으로 재분류한다. ADR 0003·0008, 완료 specs/tickets, archived backlog, `docs/spikes/**`, Wayfinder와 static camp evidence는 point-in-time history로 유지한다. `spikes/codex-runtime-ownership/**`의 executable·package-local 문서는 이 예외에 포함하지 않고 삭제한다. 명시적인 history classification이나 cutover banner가 있는 문서는 당시 본문과 시제를 보존하며, current operational copy만 고친다.

Global zero-grep은 완료 oracle이 아니다. `Runtime Harness`, `Inspector`, `0.144.0`과 legacy identifier는 explicit historical allowlist 안에서는 남을 수 있지만 active navigation, production source, manifest, current owner와 실행 command에는 남아서는 안 된다. Hybrid camp/technical reference는 history classification·banner와 current operational copy를 별도 assertion으로 검사한다.

#### Completed rehearsal과 permanent-deletion contract

Ticket 003의 completed rehearsal은 historical confidence evidence다. Exact artifact identity, attempt history, source hash와 review evidence는 [Ticket 003](../tickets/2026-07-17-codex-chat-only-cutover/003-rehearse-cutover-candidate.md)이 소유한다. Git directory의 source v8과 기존 evidence는 byte-identical하게 보존하며 Ticket 004의 실행 입력으로 사용하지 않는다.

Ticket 004는 이 binding, authorization, attempt result나 automation을 실행 입력으로 재사용하지 않는다. 새 candidate SHA sealing, detached worktree, full matrix, source/review hash 또는 authorization JSON도 만들지 않는다. Ticket 003이 이미 제공한 broad product evidence 위에서 실제 deletion boundary만 현재 clone에서 다시 확인한다.

##### Authority와 time ordering

- 일반 `/implement` lifecycle에 따라 Ticket 004 claim과 deletion 전 tracked preparation을 먼저 commit한다. 그 뒤 tracked worktree가 clean하지 않거나 allowlist 밖 unexpected untracked change가 있으면 deletion을 시작하지 않는다.
- Read-only safety precheck가 exact seven roots의 tracked-zero·ordinary non-symlink root, effective six Chat path non-overlap과 관련 project·legacy process absence를 모두 확인해야 한다. 값이나 credential, target file content와 symlink target은 evidence로 출력하지 않는다.
- 모든 precheck가 green일 때만 일곱 root를 정해진 순서의 별도 literal argv로 한 번씩 삭제하고 매 command 직후 absence를 확인한다. 첫 실패에서 hard-stop하며 뒤 root나 parent·sibling으로 범위를 넓히지 않는다.
- 일곱 root가 모두 absent한 뒤 repository PR-ready checks, canonical dev entrypoint, docs link와 diff hygiene를 실행한다. Success 뒤 ticket과 parent spec은 일반 `/implement` closeout으로 닫는다.
- Ticket 004는 cleanup program, legacy allowlist나 deletion command를 final product source, install/start/CI/merge hook에 추가하지 않는다.

##### Exact permanent-deletion boundary

Tracked cutover가 완료된 뒤 다음 repository-relative root에 남은 ignored 또는 untracked residue만 삭제 권한에 포함한다. Target-local `.gitignore`가 tracked cutover에서 함께 사라져 기존 ignored child가 `??`로 보일 수 있지만, child shape를 새 deletion gate로 만들거나 이를 보존하려고 새 ignore rule을 추가하지 않는다.

| Order | Permanent-delete allowlist |
| --- | --- |
| 1 | `apps/inspector` |
| 2 | `packages/runtime-core` |
| 3 | `packages/runtime-fake` |
| 4 | `packages/runtime-codex` |
| 5 | `.ay-ple` |
| 6 | `apps/server/.ay-ple` |
| 7 | `spikes/codex-runtime-ownership` |

Deletion 전에는 다음 불변조건을 모두 재검증한다.

- Tracked worktree가 clean하고 allowlist 밖 unexpected untracked change가 없다.
- Tracked spike를 포함한 tracked cutover가 완료되어 각 target 아래 tracked file이 0개이며 target root 자체가 ordinary non-symlink directory다.
- Caller environment를 우선하고 Server 실행 `cwd`의 local `.env`를 fallback으로 적용한 effective six `CODEX_CHAT_*` path가 어느 target과도 양방향 overlap하지 않는다. Canonical root dev entrypoint에서는 `apps/server/.env`가 해당 local file이다.
- Server, Chat Shell, Inspector, Runtime Harness와 target을 사용하는 관련 process가 없다.
- Ticket 003 rehearsal은 completed이며 사용자의 exact-root permanent deletion과 no-data-rollback 승인이 유지된다.

Deletion은 표 순서대로 각각 별도의 literal `/bin/rm -Rx -- <validated-absolute-root>` argv로 실행하고 매번 target absence를 확인한다. Root 자체는 non-symlink이고 `-x`는 device boundary를 넘지 않으며 internal symlink는 link object로만 제거한다. 첫 command·postcondition 실패에서 즉시 hard-stop하고 parent/sibling, broad glob, `git clean`, permission 우회, copy·move·Trash·quarantine이나 recovery fallback으로 scope를 넓히지 않는다.

모든 target이 absent하면 `packages/codex-chat-runtime/.artifacts`와 root `.gitignore` protection을 확인한 뒤 repository PR-ready checks, `npm run test:dev-entrypoint`, docs link와 diff hygiene를 실행한다. 검증 실패는 삭제된 legacy root를 복원하거나 deletion을 다시 실행할 근거가 아니며 별도 Chat-only failure로 다룬다.

### Data and State Flow

#### Product execution flow

1. Root `npm run dev`가 exact Chat Origin과 함께 Server와 Chat Shell을 시작한다.
2. Server는 여섯 `CODEX_CHAT_*` path를 읽어 closed status를 계산한다. Config가 없거나 invalid해도 Server와 Shell은 시작하고 Chat mutation만 fail closed한다.
3. Complete config의 첫 status/mutation은 path와 full bundle을 검증하되 native process는 첫 mutation까지 lazy start한다.
4. `createServerApplication()`이 Chat composition과 listener를 소유한다. `CodexChatService`가 process-global thread/turn lease와 runtime identity를 관리한다.
5. Browser가 새 thread를 요청하면 runtime은 official SDK의 native ID를 그대로 반환한다. Turn은 acceptance-first NDJSON에서 allowlisted FIFO event와 authoritative terminal로 흐른다.
6. Browser parser와 reducer는 exact thread/turn/item scope를 확인해 transcript를 갱신한다. Private bridge correlation과 raw protocol은 이 경계를 넘지 않는다.
7. Interrupt, disconnect, fatal과 Server shutdown은 같은 runtime settlement·close path로 수렴하며 process tree disappearance까지 기다린다.

#### Cutover implementation slicing

Read-only consumer/configuration inventory와 starting SHA 기록은 첫 implementation slice의 precondition이며 독립 ticket이 아니다. Known 또는 unresolved consumer가 발견되면 아래 graph 전체를 시작하지 않는다.

| Slice | Outcome | Exit condition |
| --- | --- | --- |
| 1. Camp detach | Static camp demo의 serve/export/test/typecheck ownership을 Inspector에서 artifact/root tooling으로 분리한다. | Inspector·Harness 없이 camp unit, typecheck, browser E2E와 export가 green이다. |
| 2. Atomic tracked Chat-only cutover | Server mixed composition, 네 legacy workspace, tracked `spikes/codex-runtime-ownership/**`, root scripts/dependencies, lockfile와 active docs를 하나의 merge/revert 가능한 range에서 Chat-only로 바꾼다. | Survivor source/build/install graph와 active navigation에 executable legacy owner가 없고 current Chat contract와 local `.env`·`PORT` startup behavior가 유지된다. |
| 3. Candidate verification | Tracked Chat-only range와 deletion shape를 full rehearsal한다. | Ticket 003이 all-green evidence와 no-delete result를 기록하고 completed로 닫혔다. |
| 4. Permanent deletion과 handoff | Claim commit 뒤 current clone에서 최소 read-only safety precheck를 수행하고 일곱 literal root를 직렬 삭제한다. Absence 확인 뒤 repository PR-ready checks와 canonical dev entrypoint를 실행하고 일반 closeout을 만든다. | Exact roots가 absent·unrecreated이고 Chat checks가 green이며 no-data-rollback과 fresh-login 경계가 기록된다. |

`/to-tickets`는 위 네 outcome을 기본 ticket graph로 사용한다. Baseline 수집, candidate checkpoint, docs propagation, individual package 삭제, gate command 하나와 handoff를 별도 ticket으로 쪼개지 않는다. 새로운 독립 mergeable outcome이나 실제 context-size blocker가 증명될 때만 네 개보다 더 세분화한다.

Tracked docs는 code보다 먼저 “삭제 완료”를 주장하지 않는다. Slice 2 안에서 code와 docs commit을 나눌 수는 있지만 하나의 integration change로 함께 merge/revert할 수 있어야 한다. Slice 3의 rehearsal은 완료됐으며 Slice 4는 이를 재실행하지 않는다. Slice 4의 completed closeout은 permanent deletion과 post-delete verification 뒤로 미루고, deletion command는 install, start, CI, merge hook이나 application startup에 넣지 않는다.

### Failure Behaviour

| Failure | Required behavior |
| --- | --- |
| Known external consumer 발견 | Consumer owner, 호출 surface와 offboarding date를 기록하고 destructive phase를 block한다. 자동 legacy keep으로 전환하지 않는다. |
| Dirty tracked worktree 또는 allowlist 밖 unexpected untracked change | Deletion을 시작하지 않는다. Ticket claim과 필요한 tracked preparation을 먼저 commit하고 clean state를 다시 확인한다. |
| Missing·tracked·symlink root, Chat path overlap 또는 관련 process 발견 | 어떤 root도 삭제하지 않는다. Target contents를 조사하거나 exact allowlist 밖 root를 자동 포함하지 않는다. |
| Permanent deletion 첫 실패 | 즉시 hard-stop한다. 삭제된 root와 untouched root를 구분해 기록하고 permission 우회, parent/sibling cleanup, backup restore와 data rollback을 시도하지 않는다. |
| Post-delete Chat·docs check 실패 | Ticket을 완료하지 않고 실패 command와 deleted roots를 기록한다. Legacy data를 복구하거나 deletion을 재실행하지 않으며 별도 Chat-only fix로 처리한다. |
| Closeout 실패 | Deletion과 verified absence를 뒤집지 않는다. 일반 `/implement` lifecycle에서 closeout만 다시 완료한다. |
| Merge 후 code regression | 실제 known-good Chat-only change로 복구하거나 별도 Chat-only incident change를 수행하고 preserved contract를 다시 검증한다. Partial legacy resurrection과 dual-run은 금지한다. |
| 삭제 후 provider login 필요 | Fresh isolated `CODEX_CHAT_*` roots를 만들고 재로그인한다. Local credential 삭제를 remote OAuth revoke로 표현하지 않는다. |

Chat request 자체의 validation, conflict, known/unknown outcome, interrupt, disconnect, stream failure와 shutdown behavior는 `Interfaces and Invariants`의 현재 contract를 그대로 따른다. Cutover는 safe error code나 retry policy를 새로 정의하지 않는다.

### Compatibility and Migration

이 변경은 additive migration이나 deprecation period가 없는 hard cutover다.

- `@ay-ple/runtime-core`, `@ay-ple/runtime-fake`, `@ay-ple/runtime-codex`, `@ay-ple/inspector`에 source, package alias, compatibility export나 redirect를 남기지 않는다.
- `/api/runtime/*`, `/api/health`, `dev:chat-shell`, Inspector URL, legacy env와 smoke/parity/generation command는 compatibility surface가 아니다.
- Runtime Diagnostic History, legacy Codex auth/session/SQLite와 spike state를 Chat transcript, native conversation, `ModelingRun`, `SemesterModel`이나 `WorkspaceHistory`로 migration하지 않는다.
- Exact allowlist 밖 external/override root는 실행자가 자발적으로 disclose한 metadata만 기록한다. Contents를 열람하거나 복사·이동·삭제하고, Chat root로 편입하지 않는다.
- `packages/codex-chat-runtime/.artifacts`와 root `.gitignore`의 `.ay-ple/` 보호 규칙은 유지한다.
- Historical ADR/spec/ticket/Wayfinder와 static screenshot은 executable fallback이 아니라 point-in-time evidence로 남는다.
- Permanent deletion 전에는 tracked code를 Git으로 복구할 수 있다. 삭제 뒤 code recovery는 known-good Chat-only change나 별도 Chat-only incident가 소유하며 pre-cutover mixed graph는 recovery target이 아니다. Permanent local deletion에는 recovery copy와 지원되는 data rollback이 없다.
- External consumer offboarding이 필요하면 destructive action만 지연한다. 세 예외 조건인 현재 사용자, Chat으로 대체 불가능한 job, 명시적 owner·maintenance obligation을 새 evidence로 모두 증명하지 않는 한 maintained legacy architecture를 복원하지 않는다.

## Implementation Decisions

| Decision | Rationale |
| --- | --- |
| Codex Chat만 maintained runtime으로 남긴다 | Legacy 두 경로는 current product를 대체하거나 현실적인 rollback을 제공하지 않으며, 존재 자체가 architecture 선택지를 잘못 암시한다. |
| Executable legacy exception을 0개로 닫는다 | 코드 품질, test 수, 미래 approval/second engine 가능성, dormant rollback은 현재 사용자·대체 불가능한 job·owner를 증명하지 않는다. |
| 새 generic runtime/engine abstraction을 만들지 않는다 | Survivor `CodexChatRuntime`은 production과 deterministic implementation이 실제로 공유하는 깊은 Seam이고 current tracer에 맞는 Interface다. 두 번째 engine 요구가 생기기 전 추상화는 근거가 없다. |
| Legacy test를 1:1 이관하지 않는다 | `RuntimeRun`, SSE, Host generation과 legacy status vocabulary는 target behavior가 아니다. 동일한 invariant가 필요하면 Chat vocabulary와 가장 강한 current seam에서 검증한다. |
| Server mixed cluster와 workspace/root edge를 atomic하게 제거한다 | Package만 삭제하면 current Server compile/start와 Chat fixture가 깨진다. 이는 survivor architecture 문제가 아니라 하나의 wiring cause cluster다. |
| `createServerApplication()`만 남긴다 | Persistent runtime child는 listener와 shutdown owner가 필요하다. Chat을 항상 disable하는 Express-only compatibility factory를 유지할 job이 없다. |
| `/api/health`를 Chat alias로 만들지 않는다 | Legacy persistence health와 Chat status는 의미가 다르며, current diagnostic contract는 closed Chat status가 소유한다. |
| Static camp demo를 artifact-local로 유지한다 | 발표 artifact의 current job은 남지만 live Inspector/Harness dependency는 필요하지 않다. |
| Current docs와 history를 allowlist로 분리한다 | Legacy identifier의 repository-wide zero occurrence는 역사 기록과 source oracle을 훼손한다. 중요한 것은 active navigation과 execution graph의 Chat-only 상태다. |
| Ticket 003 rehearsal을 004에서 재실행하지 않는다 | Completed rehearsal evidence는 broad Chat confidence를 이미 제공하며, verifier overfit과 별도 cleanup framework를 반복하지 않는다. |
| Permanent local data deletion은 최소 safety precheck 뒤 literal command로 수행한다 | Destructive authority는 tracked-zero·root non-symlink·Chat path non-overlap·process absence와 exact seven roots에만 필요하다. |
| Exact `0.144.4` runtime과 patch stack은 그대로 둔다 | 이 effort는 architecture contraction이며 pin upgrade나 SDK rebase가 아니다. |

## Testing Decisions

Highest practical seam은 하나의 mega-E2E가 아니라 서로 대체할 수 없는 세 seam이다.

1. 사용자 observable 최고 seam은 actual Chromium + Vite + Express + deterministic `CodexChatRuntime`을 통과하는 Chat Shell Playwright다.
2. Native conversation 최고 seam은 production Node→bundled Python→official SDK→exact native runtime→official local provider를 통과하는 `test:local-provider`다.
3. Cross-package lifecycle 최고 seam은 actual HTTP listener와 Python/native process tree disappearance를 확인하는 Server actual shutdown이다.

이 세 seam은 각각 UI/HTTP, native identity·policy, listener/process ownership을 독립적으로 관찰하므로 하나로 합치지 않는다.

### Permanent-deletion verification

Ticket 003의 completed rehearsal은 clean install, browser, bundle/native/process와 residual matrix를 이미 검증했으며 Ticket 004에서 재실행하지 않는다. Ticket 004는 deletion 직전 read-only safety precheck와 post-delete observable verification만 수행한다.

| Checkpoint | Command/evidence | Meaning |
| --- | --- | --- |
| Read-only safety | Tracked-clean/untracked scope, seven literal root `lstat`, root별 `git ls-files`, effective six Chat path overlap, 관련 process absence | 실제 deletion boundary가 현재 clone에서도 안전한지 확인한다. 하나라도 실패하면 삭제하지 않는다. |
| Serial deletion | Seven separate literal `/bin/rm -Rx -- <absolute-root>` invocation과 각 root의 immediate `ENOENT` | Exact allowlist, order와 first-failure hard-stop을 보장한다. |
| Literal absence | 일곱 root가 모두 absent·unrecreated이고 `packages/codex-chat-runtime/.artifacts`와 `.gitignore` protection이 intact | Legacy residue만 사라졌음을 확인한다. |
| Default survivor | `npm test` | Survivor runtime, Server, Shell과 camp unit을 검증한다. |
| Type safety | `npm run typecheck` | Survivor와 artifact-local TypeScript graph를 검증한다. |
| Build | `npm run build` | Survivor release/build roster를 clean build한다. |
| Chat Shell lint | `npm run lint -w @ay-ple/chat-shell` | Maintained browser production source를 검사한다. |
| Canonical entrypoint | `npm run test:dev-entrypoint` | Server+Chat Shell startup, effective configuration과 bounded process reap을 검증한다. |
| Docs and patch hygiene | `npm run check:docs-links`, `git diff --check` | Active documentation link와 tracked diff hygiene를 검증한다. |

Live provider OAuth와 remote token revoke는 실행하지 않는다. Post-delete check 실패는 legacy data 복구나 deletion 재실행으로 처리하지 않고 별도 Chat-only failure로 넘긴다.

### Fixture와 semantic conformance rules

- Native conformance는 literal ID를 기대하지 않는다. 반환된 `threadId`가 event/UI까지 같고, follow-up은 같은 thread이면서 새 `turnId`이며, delta/completed가 같은 `itemId`인지를 relational하게 검증한다.
- `thread-A`, `turn-A1`, fixed prompt와 message는 scheduling/fault-injection input일 뿐 public naming이나 production branch의 근거가 아니다.
- `DeterministicCodexChatRuntime`과 Server `ControlledRuntime` green만으로 native ID 생성, bundle/process, policy, terminal completeness를 주장하지 않는다.
- Playwright가 `page.route()`로 Server를 우회하는 malformed/unknown-outcome case는 browser fail-closed evidence일 뿐 HTTP/Server conformance가 아니다.
- Expected text 외에 status transition, operation order, native scope, authoritative terminal, no retry, no raw leak와 cleanup을 독립 observable로 assert한다.
- Test count는 acceptance criterion이 아니다. Nominal, wrong scope, missing/late terminal, known/unknown mutation outcome, retryable error, interrupt acknowledgement/rejection, disconnect/backpressure, process loss와 reap이라는 falsifying trace가 해당 layer의 matrix에 남아야 한다.
- Legacy suite를 삭제해서 새 regression이 드러난 경우에만 그 survivor invariant의 최소 test를 추가한다. Legacy filename, fixture나 line count를 맞추지 않는다.
- Cutover가 `CodexChatService`의 composition 제거를 넘어 interrupt/disconnect semantics를 변경한다면, interrupt rejection 뒤 disconnect가 bounded settlement로 수렴하는 trace를 그 변경의 targeted gate에 추가한다.

## Out of Scope

- Multi-client/browser-tab isolation, native conversation ownership 재설계와 process-global 1/1 확장
- `thread/list`, `thread/read`, `thread/resume`, reload recovery, multi-thread sidebar와 browser persistence
- Command/file/tool activity, pending interaction, interactive approval, account/login/config/model toolbar
- AY-PLE `ModelingRecipe → ModelingInvocation → ModelingRun`, Assignment, Review Workspace와 academic product adapter
- ACP, 두 번째 engine, generic capability taxonomy와 engine selection UI
- Current official SDK/runtime pin upgrade, patch rebase와 generated protocol inventory 대체물
- Disposable live-provider automation과 remote OAuth token revoke
- Exact allowlist 밖 external/override state의 migration, deletion 또는 광범위한 machine scan
- Server state type refactor, interrupt attempt/ack redesign와 일반적인 code cleanup
- Windows/Linux support, macOS Desktop packaging, signing·notarization과 distribution
- Mobile과 small-screen responsive work

## Open Questions

None.

## Further Notes

- 이 spec은 [Codex Chat Shell cutover readiness map](../wayfinding/chat-shell-cutover-readiness/map.md)의 resolved decision을 implementation contract로 옮긴다.
- 보존할 observable envelope는 [ticket 002](../wayfinding/chat-shell-cutover-readiness/tickets/002-extension-envelope.md), survivor fitness와 fixture 역할은 [004 audit](../wayfinding/chat-shell-cutover-readiness/assets/004-chat-target-fitness-audit.md)가 근거다. [014 manifest](../wayfinding/chat-shell-cutover-readiness/assets/014-legacy-removal-manifest.md)와 [016 execution gates](../wayfinding/chat-shell-cutover-readiness/assets/016-cutover-execution-gates.md)는 initial investigation snapshot이며 current deletion contract가 아니다. Exact seven-root boundary와 최소 execution contract는 이 spec이 소유한다.
- `/to-tickets`는 `Cutover implementation slicing`의 네 outcome을 기본 graph로 사용한다. Ticket 003은 completed 상태로 유지하고, deletion framework나 command별 ticket을 추가하지 않는다.
