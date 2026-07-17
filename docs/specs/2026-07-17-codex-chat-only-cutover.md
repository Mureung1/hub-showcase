# Codex Chat-only runtime cutover

## Agent triage

- State: ready-for-ticketing
- Surface: local-spec
- Next actor: /to-tickets

## Problem Statement

Official SDK 기반 Codex Chat Shell은 native thread·turn·item identity, AgentMessage streaming, interrupt, same-thread follow-up과 bounded process-tree cleanup까지 구현·검증됐다. 그러나 repository의 기본 실행과 active architecture에는 그 이전 단계였던 Runtime Harness·Inspector와 legacy `HeadlessCodexClientHost` 경로가 함께 남아 있다.

이 공존은 실제 rollback이나 대체 가능한 제품 capability를 제공하지 않는다. Runtime Harness는 Chat conversation을 관찰하지 못하고, legacy Host는 production caller와 thread·turn 제품 동작이 없다. 그럼에도 네 legacy workspace, `/api/runtime/*`, Runtime Diagnostic History, `@openai/codex@0.144.0` generated protocol, root command와 active 문서가 유지되면서 앞으로의 작업자가 두 경로를 대칭적인 architecture 선택지로 오해하게 만든다. 삭제된 architecture의 local auth·history state도 repository 아래 `.ay-ple` 계열 root에 남아 있다.

프로젝트가 Codex Chat을 유일하게 발전시킬 runtime으로 확정했으므로, 이번 변경은 legacy surface를 deprecated 상태로 보존하는 일이 아니라 hard cutover로 제거해야 한다. 동시에 대규모 삭제가 현재 Chat의 observable behavior, process lifecycle과 검증 근거를 약화시키거나, 고정 fixture와 default unit suite만으로 green을 주장하거나, broad local cleanup으로 승인하지 않은 data를 건드려서는 안 된다.

## Solution

`@ay-ple/codex-chat-runtime`, Chat-only `@ay-ple/server`, `@ay-ple/chat-shell`을 유일한 maintained runtime graph로 남긴다. Runtime Harness·Inspector, `runtime-core`, `runtime-fake`, legacy `runtime-codex`, executable runtime-ownership spike 전체와 Server·root·lockfile의 연결 edge를 하나의 cutover에서 제거한다. Root `npm run dev`는 Server와 Chat Shell만 시작하는 canonical entrypoint가 되고, static camp demo는 Inspector workspace와 분리된 artifact-local tooling으로 유지한다.

삭제는 현재 Chat contract를 동결하는 것이 아니라 observable invariant를 보존하는 behavior-preserving contraction이다. Browser-safe contract, `CodexChatRuntime` Interface, process supervisor, `CodexChatService`, Chat Shell parser·reducer를 유지하고 private Node↔Python frame, class·field 배치와 test fixture literal은 호환성 표면으로 취급하지 않는다.

Active ADR·architecture·product·package 문서는 Chat-only current state로 전파하고, 과거 Runtime Harness의 교훈은 Git history와 완료·역사 문서, Wayfinder evidence와 static camp artifact에만 남긴다. Executable legacy exception은 없다.

Tracked cutover와 full pre-delete gate를 clean candidate SHA에서 검증한 뒤, 사용자가 승인한 일곱 exact ignored legacy residue root를 non-follow one-shot operator로 영구 삭제한다. Recovery copy나 product/native history migration은 만들지 않는다. Permanent deletion 전에는 cutover range를 pre-cutover base로 revert할 수 있지만, 삭제 뒤 이 one-shot gate가 재검증할 수 있는 code는 sealed candidate SHA뿐이다. Regression recovery는 legacy graph를 되살리지 않는 known-good Chat-only release redeploy나 별도 incident change가 소유한다. 삭제한 auth·config·session·history data에는 rollback이 없으며, 이후 live provider가 필요하면 새 isolated Chat roots에서 재로그인한다.

## User Stories

1. 유지보수자로서 repository에서 하나의 runtime architecture만 보고 싶다. 그래야 새 기능과 수정이 사용되지 않는 Host·Harness abstraction으로 분산되지 않는다.
2. 개발자로서 `npm run dev` 하나로 Server와 Chat Shell을 시작하고 싶다. 그래야 기본 개발 경로가 실제 제품 경로와 일치한다.
3. Chat 사용자로서 cutover 뒤에도 status, native conversation, streaming, interrupt, terminal과 safe failure 동작이 그대로 유지되길 원한다. 그래야 architecture 정리 때문에 현재 제품 behavior가 회귀하지 않는다.
4. 테스트 유지보수자로서 legacy test 수나 canned identifier를 이관하는 대신 survivor invariant를 각자 가장 강한 seam에서 검증하고 싶다. 그래야 fixture에 맞춘 green과 실제 native/process conformance를 구분할 수 있다.
5. 운영자로서 clean install, browser, exact native와 actual process gate가 모두 green일 때만 local legacy state를 삭제하고 싶다. 그래야 stale build나 missing prerequisite를 성공으로 오인하지 않는다.
6. 운영자로서 승인한 일곱 local residue root만 symlink target을 따라가지 않고 영구 삭제하고 싶다. 그래야 broad cleanup이 current Chat bundle이나 다른 사용자 data로 확장되지 않는다.
7. 문서 독자로서 active 문서에서는 Codex Chat-only topology만 보고, 과거 결정은 명시적인 역사 기록으로 구분하고 싶다. 그래야 완료된 실험이 현재 architecture owner로 다시 인용되지 않는다.
8. 외부 consumer owner로서 실제 legacy 호출이 발견되면 삭제 예외로 자동 존치되는 대신 offboarding surface와 시점을 명확히 조정하고 싶다. 그래야 hidden dependency를 깨뜨리지 않으면서 cutover 방향은 유지된다.
9. 장애 대응자로서 permanent deletion 뒤 code regression은 기록된 known-good Chat-only SHA로 복구하되, pre-cutover legacy graph나 삭제한 local data가 복원된다고 오해하지 않고 싶다. 그래야 code rollback과 credential/history recovery의 책임이 섞이지 않는다.

## Current State and Constraints

### 현재 구현

현재 repository는 두 실행 graph를 한 Server와 root command에 함께 조립한다.

| 영역 | 현재 상태 |
| --- | --- |
| Codex Chat runtime | `@ay-ple/codex-chat-runtime`이 exact official source commit `8c68d4c87dc54d38861f5114e920c3de2efa5876`, native runtime `0.144.4`, verified macOS arm64 bundle, persistent Python bridge와 hardened Node supervisor를 소유한다. |
| Server Chat surface | `/api/codex-chat/*`가 explicit configuration, closed status, native thread/turn stream, interrupt, disconnect drain과 lifecycle-owned shutdown을 제공한다. |
| Browser surface | `@ay-ple/chat-shell`이 browser-safe `./contract`만 사용해 transient one-thread conversation을 표시한다. |
| Legacy Harness | `apps/inspector`, `packages/runtime-core`, `packages/runtime-fake`, `packages/runtime-codex`와 Server의 `/api/runtime/*`, `/api/health`, persistence·SSE composition이 함께 남아 있다. |
| Legacy Host | `packages/runtime-codex`가 `HeadlessCodexClientHost`, product layout, bidirectional transport와 generated `0.144.0` protocol을 export·self-test하지만 production caller는 없다. |
| Root entrypoint | `npm run dev`는 Server+Inspector, 별도 `npm run dev:chat-shell`은 Server+Chat Shell을 시작한다. Camp tooling도 Inspector workspace에 결합돼 있다. |
| Legacy spike | `spikes/codex-runtime-ownership`에는 tracked login/verify runner와 `@openai/codex@0.142.5` lock, ignored `node_modules`·auth·runtime state가 함께 남아 있고 삭제한 runtime root를 다시 만들 수 있다. |
| Local state | `.ay-ple`, `apps/server/.ay-ple`과 executable spike root에 ignored legacy history·auth·runtime state가 있다. Current Chat bundle은 별도 `packages/codex-chat-runtime/.artifacts`가 소유한다. |

현재 file-level 연결은 [014 removal manifest](../wayfinding/chat-shell-cutover-readiness/assets/014-legacy-removal-manifest.md)의 조사 snapshot이다. 이 목록은 구현 시 live tree와 다시 대조해야 하며, 완료 기준은 과거 file count가 아니라 아래 contract와 residual oracle이다.

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
- Live provider OAuth 성공은 deletion gate가 아니다. Provider-free exact native와 actual process gates는 필수다.
- General debt인 Server impossible-state type, interrupt attempt/ack conflation, component locality와 fixture helper 구조는 cutover가 해당 semantics를 건드리지 않는 한 이번 scope에서 refactor하지 않는다.
- External/override legacy root는 exact deletion allowlist에 자동 포함하지 않는다. 광범위한 home, shell history나 browser history scan도 수행하지 않는다.

## Implementation Contract

### Module Responsibilities and Seams

| Module | Target responsibility | Boundary |
| --- | --- | --- |
| `@ay-ple/codex-chat-runtime` | Exact bundle verification, controlled-environment Python spawn, private correlation, native event projection, bound·deadline·fatal settlement와 process-group reap | Node-only `.`, browser-safe `./contract`, test-only `./testing`의 세 export를 유지한다. Generic engine Interface, raw JSON-RPC export와 AY-PLE domain state를 추가하지 않는다. |
| `@ay-ple/server` | Chat configuration, `CodexChatService` lease/lifecycle, loopback·Origin guarded HTTP/NDJSON와 listener/runtime close ordering | Lifecycle을 소유하는 `createServerApplication()`을 유일한 application composition으로 사용한다. Express-only legacy compatibility factory, Kernel/history composition, generic CORS와 legacy routes를 제거한다. |
| `@ay-ple/chat-shell` | Status 조회, thread/turn HTTP client, strict NDJSON parsing, native identity reducer, transcript와 interrupt UI | Production source는 `@ay-ple/codex-chat-runtime/contract`만 사용한다. Node runtime, Python bridge나 private transport를 import하지 않는다. |
| Root developer graph | Canonical Chat dev entrypoint와 survivor/camp command orchestration | `dev`는 Server+Chat Shell만 시작한다. `dev:chat-shell` alias와 executable Inspector 경로는 남기지 않는다. |
| `artifacts/camp-demo` | Static deck/product-flow의 serve, export, unit, typecheck와 browser E2E | Live Server·Inspector·Harness 없이 artifact-local helper와 config로 실행한다. Week 1 screenshot은 역사 evidence이지 executable exception이 아니다. |
| Active documentation | Current Chat topology, runtime isolation, product boundary와 work order | 새 cutover ADR과 survivor-only implementation map이 current owner가 된다. 완료·역사 문서는 current owner로 인용하지 않는다. |
| Cutover gate artifact | Candidate-specific log, reviewed residual checker와 permanent-delete operator | Git directory 아래에만 존재한다. Final product tree, install/start/CI/merge hook에 legacy allowlist나 cleanup utility를 maintained script로 남기지 않는다. |

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
| Configuration | `CODEX_CHAT_RUNTIME_ROOT`, `CODEX_CHAT_WORKSPACE`, `CODEX_CHAT_RUNTIME_HOME`, `CODEX_CHAT_CODEX_HOME`, `CODEX_CHAT_SQLITE_HOME`, `CODEX_CHAT_TEMP_DIR` 여섯 explicit absolute path를 요구한다. Workspace는 readable/executable non-symlink directory이고, 네 controlled directory는 readable/writable/executable non-symlink이면서 서로 distinct하다. Complete bundle과 sanitized child environment를 검증하며 legacy env, `.ay-ple`, `process.cwd()`, system Python, ambient `PATH`나 credential/provider로 fallback하지 않는다. |
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
| `npm run test:dev-entrypoint` | Canonical `npm run dev`의 origin-only/configured 두 case, process argv와 bounded reap을 검증한다. |
| `npm run check:docs-links` | Active Markdown relative link와 deleted current owner reference를 검증한다. Historical allowlist의 시제 판정은 residual checker가 맡는다. |

`npm run lint -w @ay-ple/chat-shell`은 maintained UI lint gate다. Inspector lint와 `dev:chat-shell`, `smoke:codex`, `verify:codex-parity`, legacy method generation command는 제거한다.

Root와 세 survivor manifest는 command 이름만 남기는 것으로 충분하지 않다. Gate는 각 command가 위 target behavior를 실제로 실행하는지, survivor workspace roster와 camp invocation이 legacy workspace를 참조하지 않는지를 검증한다. 주석·`echo`·항상 성공하는 wrapper는 green으로 인정하지 않는다.

Candidate diff는 이 spec의 legacy deletion boundary, Server/root wiring, camp detach, active documentation과 그 검증에 필요한 최소 survivor 변경으로 제한한다. `packages/codex-chat-runtime`의 runtime pin·patch·observable contract, Chat Shell/Server의 unrelated behavior, static camp content와 역사 문서는 보존한다. 이 범위를 넘는 survivor 변경은 별도 spec과 validation을 요구한다.

#### Current documentation과 history invariant

새 `docs/adr/0012-adopt-codex-chat-only-and-remove-legacy-runtime-surfaces.md`는 Chat-only, deletion-default, executable exception 0개, permanent local cleanup, no migration, post-delete Chat-only recovery와 재로그인 결정을 장기 소유한다. Current mixed implementation map은 `docs/architecture/codex-chat-implementation-map.md`로 rename+rewrite하고 survivor topology만 설명한다. Old map의 redirect/archive copy는 만들지 않는다.

Root·docs index, AGENTS, active architecture/product docs, ADR 0005·0006·0007·0009·0011과 survivor README는 Chat-only current state로 갱신한다. 이 closed current set에는 `references/README.md`, `artifacts/camp-demo/README.md`의 실행 안내, camp deck·speaker notes의 current-vs-history 설명도 포함한다. Deleted path나 pin을 current dependency로 오해할 수 있는 technical reference에는 짧은 cutover banner와 survivor map pointer를 둔다.

ADR 0004는 본문을 보존하되 `완료·역사 기록`으로 재분류한다. ADR 0003·0008, 완료 specs/tickets, archived backlog, `docs/spikes/**`, Wayfinder와 static camp evidence는 point-in-time history로 유지한다. `spikes/codex-runtime-ownership/**`의 executable·package-local 문서는 이 예외에 포함하지 않고 삭제한다. 명시적인 history classification이나 cutover banner가 있는 문서는 당시 본문과 시제를 보존하며, current operational copy만 고친다.

Global zero-grep은 완료 oracle이 아니다. `Runtime Harness`, `Inspector`, `0.144.0`과 legacy identifier는 explicit historical allowlist 안에서는 남을 수 있지만 active navigation, production source, manifest, current owner와 실행 command에는 남아서는 안 된다. Hybrid camp/technical reference는 history classification·banner와 current operational copy를 별도 assertion으로 검사한다.

#### Candidate gate artifact와 one-shot program contract

Gate artifact root는 literal `.git` path가 아니라 current clone에서 `git rev-parse --absolute-git-dir`로 resolve한 `<absolute-git-dir>/codex-chat-cutover/`다. Phase 0에는 아직 candidate SHA가 없으므로 exclusive-create한 새 `pending-<rollback_base_sha>-<UTC>-<pid>/`를 만들고, Phase 4에서 candidate를 clean commit으로 고정한 뒤 destination이 없음을 확인해 같은 filesystem 안에서 `<cutover_candidate_sha>/`로 atomic rename한다. 이후 모든 gate와 deletion은 final directory만 사용한다.

Directory mode는 `0700`, reviewed gate program, `cutover-state.json`, `gate-results.json`과 deletion journal은 `0600`이다. Symlink가 아닌 current user 소유 regular file과 canonical path만 허용한다. Reviewed program은 candidate를 승인하기 전에 byte length와 SHA-256으로 state에 고정하며, results는 state raw bytes의 SHA-256에 단방향으로 bind한다. Results file 자체의 raw SHA-256은 deletion journal에 고정해 self-reference cycle을 피한다.

`cutover-state.json`의 final shape는 다음 closed field를 갖는다.

| Field | Exact meaning |
| --- | --- |
| `schemaVersion`, `phase` | `1`, `candidate` |
| `createdAt`, `candidateBoundAt` | Canonical UTC ISO timestamp |
| `repository` | Current clone의 `canonicalRoot`, decimal-string `device`·`inode`, `absoluteGitDir` |
| `rollbackBaseSha`, `candidateSha` | 서로 다른 full lowercase 40-hex commit이며 base는 candidate ancestor다. |
| `preDeleteCandidateWorktree` | Candidate SHA의 별도 canonical detached clean worktree absolute path. Current clone, Git directory와 deletion target에 overlap하지 않는다. |
| `sources` | `residualChecker`와 `deleteOperator` 각각의 reviewed `file`, positive `bytes`, 64-hex `sha256`, `mode: "0600"` |
| `preflight` | `status: "green"`, canonical UTC `finishedAt`, `activeProjectProcessCount: 0`와 아래 closed `externalConsumerReview` |
| `provisionalStateSha256` | Candidate binding 전 provisional state raw bytes의 64-hex SHA-256 |

`externalConsumerReview`는 `scopeVersion: 1`, canonical UTC `reviewedAt`, ordered `reviewedSurfaceIds`, ordered `evidenceGateIds`, `knownConsumerCount: 0`, `unresolvedConsumerCount: 0`, `ownerAttestation: "repository-owner:no-known-external-consumer"`의 closed key roster다. Surface roster는 `repository-production-callers`, `repository-ci-deploy-and-docs`, `owner-known-local-launchers-and-workflows` 순서이고, evidence gate는 `docs-links`, `cutover-residual` 순서다. 앞의 두 surface는 sealed gate command/result로 검증하고 마지막 surface는 machine-wide scan으로 가장하지 않는 repository owner의 명시적 known-consumer attestation이다. Timeline은 `createdAt <= reviewedAt <= preflight.finishedAt <= candidateBoundAt`이어야 한다.

Phase 0 implementation owner가 provisional state와 두 source를 exclusive-create하고, Phase 4 implementation owner만 final state를 atomic replace한 뒤 directory를 rename한다. Final rename 뒤 state는 다시 쓰지 않는다.

`gate-results.json`은 `schemaVersion: 1`, `candidateSha`, raw `cutoverStateSha256`, ordered `requiredGateIds`, ordered `gates`, `finalized`, `finalizedAt`과 exact `summary { required, green, red, blocked }`를 갖는다. Gate record는 `id`, `status`, canonical UTC `startedAt`·`finishedAt`, absolute `cwd`, ordered `commands [{ argv, exitCode, signal, stderrEmpty }]`, string-only `prerequisites`, safe `summaryCode`와 `failureOwner`를 갖는다. `environment` record만 exact `evidence { system, machine, nodeVersion, npmVersion, playwrightVersion, uvVersion, pythonVersion, chromiumExecutable, chromiumAccessible }`를 추가하며 다른 gate에는 `evidence`가 없다. State, nested repository/source/preflight, results/summary, record/command/evidence는 모두 closed key roster다. Authorization boundary인 ID, cwd, argv, order, time와 status는 exact source가 literal/dynamic contract와 대조한다. `prerequisites`, `summaryCode`, `failureOwner`는 failure class에 따라 달라지는 audit metadata이므로 structural validation을 하고 의미는 아래 matrix가 소유한다.

Gate executor는 먼저 다음 17 IDs를 표 순서대로 기록한다.

`environment`, `clean-install`, `default-survivor`, `typecheck`, `build`, `current-build`, `chat-shell-lint`, `browser`, `camp-export`, `bundle-before-actual`, `node-actual`, `local-provider`, `server-actual`, `bundle-after-actual`, `dev-entrypoint`, `diff-check`, `docs-links`

이때 `finalized: false`, `finalizedAt: null`, 17/17 green이어야 한다. Pre-delete checker는 자기 결과를 미리 요구하지 않고 이 17개를 검증한 뒤 residual assertion을 실행한다. Checker만 18번째 `cutover-residual` record를 추가하고, green일 때만 `finalized: true`, `summary: { required: 18, green: 18, red: 0, blocked: 0 }`로 same-directory atomic replace한다. Red/blocked result도 18번째 record로 남기되 finalized하지 않으며 deletion을 승인하지 않는다. Delete operator는 exact ordered 18 IDs, serial monotonic timestamps와 all-green finalized result만 소비한다. Extra key나 non-string device/inode, `createdAt > candidateBoundAt`, reordered checker argument와 bound worktree가 아닌 invocation cwd는 blocked다.

`permanent-deletion.jsonl`은 fresh operator invocation이 `O_RDWR | O_EXCL | O_NOFOLLOW`로 한 번만 만든다. 모든 line은 `schemaVersion`, 1부터 연속인 `sequence`, `event`와 같은 `phase`, canonical UTC `at`·`startedAt`·`finishedAt`, current clone `cwd`, exact `argv`, `prerequisites`, `status`, `failureOwner`, `candidateSha`, raw state/results SHA-256, 두 source hash, `previousLogSha256`와 safe event `payload`를 갖는다. 첫 `previousLogSha256`은 empty bytes의 SHA-256이고 이후 값은 직전 line까지의 raw bytes SHA-256이다. 매 append 전과 `fsync` 뒤에 open handle의 device·inode·owner·mode·size 및 accumulated full bytes를 다시 읽어 확인하고, 각 destructive command 직전에도 같은 bytes를 재검증한 뒤에만 진행한다. Target preflight payload는 top-level child set과 root identity 외에 non-follow `entryCount`, `descendantSymlinkCount`, relative symlink-path SHA-256과 `allEntriesOnTargetDevice: true`를 기록하되 link target과 file content는 기록하지 않는다. Postcondition journal append가 실패하면 `knownAbsent` target은 `deletedTargets`에만, 결과를 확정할 수 없는 target은 `indeterminateTarget`에만 기록해 일곱 target 분류가 겹치지 않게 한다. Environment value, credential, file content, symlink target과 child stdout/stderr payload는 기록하지 않는다.

Closed deletion events는 `operation.started`, 일곱 target마다 `target.preflight` → `target.command` → `target.postcondition`, 마지막 `operation.completed`다. 첫 실패는 `operation.hard_stop`과 current `indeterminateTarget`, already deleted와 untouched target을 기록하고 자동 재실행하지 않는다. Completed deletion journal은 그 23개 green event 뒤 immutable하다.

`operation.completed`와 `postdelete.completed`는 각각 모든 status-determining binding·filesystem 검사를 마친 뒤 append하고, `fsync`와 full-byte readback이 성공한 시점을 authoritative commit으로 삼는다. 그 뒤의 descriptor close는 best-effort resource cleanup이며 이미 durable한 terminal status를 뒤집지 않는다. `operation.completed` 직전에는 sealed gate binding, current candidate, 일곱 root의 absence, protected Chat artifact와 journal bytes를 다시 검증한다.

Post-delete verification은 deletion journal을 수정하지 않는다. 매 invocation은 candidate gate directory에 random 32-hex ID를 가진 fresh `postdelete-attempt-<id>.jsonl`을 exclusive-create한다. 첫 `postdelete.started`가 attempt ID와 deletion journal의 exact bytes/SHA-256을 bind하고, 실행된 gate prefix와 terminal `postdelete.completed`를 같은 full-byte readback/hash chain으로 기록한다. Green terminal 전에는 sealed binding, deletion journal, 일곱 root absence와 protected Chat artifact를 다시 확인한다. Red/blocked attempt나 terminal 이전 중단은 immutable evidence로 남고, 다음 invocation은 새 attempt file에서 같은 sealed candidate를 재검증한다. 성공 attempt ID는 command result와 handoff에 노출하며, 그 attempt만 phase 7 exit condition을 충족한다.

Implementation ticket은 다음 두 one-shot program을 작성·review하고 candidate gate directory에 materialize한 뒤 실제 byte length와 SHA-256을 state에 기록한다. 이 spec은 실행 source 자체를 내장하거나 특정 hash를 미리 고정하지 않는다.

1. `check-chat-only-residual.mjs`
   - `--rollback-base <full-sha> --candidate <full-sha> --candidate-worktree <absolute-path>`를 받고, post-delete에서만 `--post-delete`를 추가한다.
   - Shell interpolation 없이 Git/npm/HTTP child argv를 구성한다.
   - Deleted workspace/package/symbol/route/script/lock closure, 세 package export를 포함한 survivor build roster, exact command body, protected survivor diff, canonical entrypoint, active-doc closed list와 historical allowlist, `.ay-ple` fallback 부재를 폐쇄 상수로 검사한다.
   - Canonical built Server에서 full legacy route roster가 `404`인지 확인하고, origin-only 부팅은 exact `unavailable/invalid_configuration`, `CODEX_CHAT_*`가 전혀 없는 non-Chat legacy environment-only 부팅은 exact `unavailable/not_configured`인지 확인한다. 두 부팅 모두 세 valid Chat mutation shape가 blanket `400`이나 stub이 아니라 exact safe `503 codex_chat_unavailable` mapping에 도달해야 한다.
   - Test 선언 수나 fixture literal을 acceptance로 세지 않는다. Retained runtime·Browser·Server oracle은 observable behavior와 sealed actual/browser command result로 보존한다.
   - Canonical dev-entrypoint test는 root `npm run dev`의 두 bounded process/port trace를 직접 수행하고, docs-link checker는 current active Markdown link를 독립 실행한다. Residual oracle은 두 command가 candidate에서 실제로 존재하고 성공했음을 확인한다.
   - `tsx --test`가 test-file exit 2를 outer exit 1로 축약하므로 pre-delete gate executor와 post-delete checker는 dev-entrypoint command에만 bounded stdout/stderr streaming marker를 적용한다. Exact closed marker는 `DEV_ENTRYPOINT_BLOCKED:` 뒤의 `PREFLIGHT`, `PORT_UNAVAILABLE`, `SPAWN_TIMEOUT`, `READINESS_TIMEOUT`, `TEARDOWN_TIMEOUT`, `HELPER_REAP_RECOVERED`, `HELPER_REAP_TIMEOUT`, `HELPER_OUTPUT_BOUND`, `HELPER_REAP_SIGNAL_FAILED`, `HELPER_TIMEOUT`, `MULTIPLE_FAILURES`다. 이 marker가 있으면 actual child exit code를 command evidence에 그대로 남기면서 gate status를 local-operator `blocked`로 normalize하고, marker가 없는 nonzero는 implementation `red`다. Bundle verifier 등 다른 command에는 marker interpretation을 적용하지 않으며 raw TAP/stdout/stderr는 저장하지 않는다.
   - 모든 assertion이 참이면 exit `0`, semantic residual은 exit `1`과 implementation owner의 `red`, missing tool/artifact는 exit `2`와 local operator의 `blocked`다.
2. `permanent-delete-legacy-state.mjs`
   - Target argument를 받지 않고 아래 relative allowlist와 expected top-level child set을 source에 hard-code한다.
   - Shell을 거치지 않고 current clone identity와 exact candidate `HEAD`를 확인한다. Porcelain-v1 NUL status는 tracked change를 허용하지 않고 exact deletion target 아래의 normalized `??` record만 임시 예외로 허용한 뒤, target의 ordinary-directory `lstat`, exact canonical parent, tracked-file 0, exact child set과 target 사이의 상호 non-overlap을 다시 검사한다.
   - Current project Server·Chat Shell·legacy process와 target 아래 open handle이 없어야 한다. Runtime root와 네 controlled state root는 각 target과 양방향으로 disjoint해야 한다. Workspace가 target 안이거나 target과 같으면 block하고, canonical repository workspace가 target의 ancestor인 경우에만 project process/open-handle 0 조건 아래 허용한다.
   - `find -P`와 같은 non-follow 방식으로 모든 descendant symlink와 device boundary를 기록한다. 조사 snapshot의 `.ay-ple` 3개와 spike `node_modules`·`runtime` 아래 6개, 합계 9개 symlink도 target object로 포함하되 link target은 열거나 따라가지 않는다.
   - 같은 candidate SHA의 full pre-delete matrix와 residual이 모두 green이고 `blocked` record가 0개인지 확인한다.
   - 각 target 직전에 guard를 다시 확인하고 macOS `/bin/rm`을 argv `['-Rfx', '--', validatedAbsoluteRootWithoutTrailingSlash]`로 실행한다.
   - 표 순서대로 한 root씩 삭제하고 매번 `lstat == ENOENT`를 확인한다. Nonzero exit, nonempty stderr 또는 failed postcondition에서 즉시 hard-stop하여 뒤 target을 건드리지 않는다.

Exact invocation order는 다음과 같다. Pre-delete checker는 residual 제외 gate를 직접 재실행하지 않고 검증·finalize한다. Post-delete checker는 journal과 binding을 검증한 뒤 bundle verifier, canonical entrypoint, residual oracle을 이 순서로 직접 실행·기록한다.

```text
node <absolute-gate-dir>/check-chat-only-residual.mjs \
  --rollback-base <full-rollback-sha> \
  --candidate <full-candidate-sha> \
  --candidate-worktree <absolute-detached-worktree>

# Argument 0, cwd == current clone canonical root
node <absolute-gate-dir>/permanent-delete-legacy-state.mjs

node <absolute-gate-dir>/check-chat-only-residual.mjs \
  --post-delete \
  --rollback-base <full-rollback-sha> \
  --candidate <full-candidate-sha> \
  --candidate-worktree <absolute-current-clone>
```

| Permanent-delete allowlist | Expected top-level child set |
| --- | --- |
| `apps/inspector` | `dist`, `node_modules`, `test-results` |
| `packages/runtime-core` | `dist` |
| `packages/runtime-fake` | `dist` |
| `packages/runtime-codex` | `dist`, `node_modules` |
| `.ay-ple` | `runtime-codex`, `runtime-harness` |
| `apps/server/.ay-ple` | `runtime-harness` |
| `spikes/codex-runtime-ownership` | `node_modules`, `runtime` |

Operator는 symlink target을 따라가지 않고 link object와 containing root만 삭제하며 nested device boundary를 넘지 않는다. Glob, environment/user target, repository root·parent, copy, move, Trash, quarantine, broad parent fallback, `git clean -fdX`와 secure-erase 확장은 금지한다. Executable program file과 executable allowlist constant는 final maintained product script, hook이나 agent navigation에 남기지 않는다. 이 spec·Wayfinder의 historical documentation과 Git-directory gate source/log는 비실행 evidence로 유지할 수 있다.

### Data and State Flow

#### Product execution flow

1. Root `npm run dev`가 exact Chat Origin과 함께 Server와 Chat Shell을 시작한다.
2. Server는 여섯 `CODEX_CHAT_*` path를 읽어 closed status를 계산한다. Config가 없거나 invalid해도 Server와 Shell은 시작하고 Chat mutation만 fail closed한다.
3. Complete config의 첫 status/mutation은 path와 full bundle을 검증하되 native process는 첫 mutation까지 lazy start한다.
4. `createServerApplication()`이 Chat composition과 listener를 소유한다. `CodexChatService`가 process-global thread/turn lease와 runtime identity를 관리한다.
5. Browser가 새 thread를 요청하면 runtime은 official SDK의 native ID를 그대로 반환한다. Turn은 acceptance-first NDJSON에서 allowlisted FIFO event와 authoritative terminal로 흐른다.
6. Browser parser와 reducer는 exact thread/turn/item scope를 확인해 transcript를 갱신한다. Private bridge correlation과 raw protocol은 이 경계를 넘지 않는다.
7. Interrupt, disconnect, fatal과 Server shutdown은 같은 runtime settlement·close path로 수렴하며 process tree disappearance까지 기다린다.

#### Cutover execution flow

| Phase | Work | Exit condition |
| --- | --- | --- |
| 0. Immutable baseline·preflight | Clean starting `HEAD`, canonical clone root와 device/inode, package graph, exact local-root metadata와 optional known-good Chat-only release를 기록한다. Repository production caller와 CI/deploy·documented integration은 tracked scan으로 확인하고, repository owner는 known local launcher·workflow consumer가 없음을 명시적으로 attestation한다. 최근 Inspector workflow·demo/CI command, current process/port, active environment와 repository/server `.env`를 확인한다. 실행자가 자발적으로 disclose한 `RUNTIME_HISTORY_DIR`, `CODEX_HOME`, `CODEX_SQLITE_HOME`, `CODEX_RUNTIME_CWD`와 smoke/parity wrapper의 external path는 metadata만 기록한다. Sibling repository나 broad home, shell/browser history를 자동 scan하지 않는다. | `rollback_base_sha`, clone identity, gate location, closed `externalConsumerReview`와 read-only inventory가 명확하다. Dirty worktree, missing identity, known/unresolved consumer 또는 owner attestation 부재면 block한다. |
| 1. Camp detach | Artifact-local Vite/Playwright/TypeScript helper와 root command/dependency ownership을 만든다. | Inspector workspace와 live Harness 없이 camp unit/typecheck/E2E/export가 green이다. |
| 2. Atomic tracked cutover | Server mixed cluster와 네 legacy workspace를 함께 제거하고 Chat fixture를 legacy option에서 분리한다. Root manifest를 target state로 바꾼 뒤 current clone에서 exact `npm install`로 lockfile과 install graph를 재생성한다. | Survivor source가 legacy package/route/env/store/factory를 import하지 않고 compile/run하며 `npm ls --all`에 deleted link/closure가 없다. Deleted package만 먼저 사라진 intermediate integration state가 없다. |
| 3. Decision/docs propagation | Cutover ADR, survivor map, architecture/product/package docs, root/docs index 순으로 current state를 갱신하고 generated inventory를 삭제한다. | Active docs에는 deleted current owner/link/command가 없다. Explicit history classification/banner가 있는 evidence body는 보존되고 hybrid document의 current operational copy만 Chat-only다. |
| 4. Candidate checkpoint | Tracked cutover range를 review 가능한 commit에 고정하고 provisional gate directory를 final candidate-SHA directory로 atomic rename한다. Detached candidate는 완전히 clean해야 한다. Current clone은 `HEAD == candidate`이고 tracked change가 없으며, `git status --porcelain=v1 -z --untracked-files=all`의 모든 record가 exact deletion target 아래 `??` path인 상태만 허용한다. | Full `cutover_candidate_sha`, diff scope, sealed local-target inventory와 final gate artifact가 연결된다. |
| 5. Full pre-delete gate | Detached clean candidate에서 install/default/browser/camp/residual을, materialized current clone에서 survivor clean-build, bundle/actual/entrypoint gate를 실행한다. | Required matrix가 모두 `green`이고 `blocked`가 0개다. |
| 6. Permanent local deletion | Current clone의 exact `HEAD == cutover_candidate_sha`, target-only untracked exception과 destructive guard를 재검사하고 exact seven roots를 serial 삭제한다. | 일곱 root가 `ENOENT`, current Chat `.artifacts`가 intact이며 recovery copy가 없다. |
| 7. Post-delete verification | Fresh attempt log에서 bundle, canonical entrypoint와 residual checker `--post-delete`를 다시 실행한다. 실패·중단 뒤 같은 sealed candidate의 environment/artifact 재시도는 immutable deletion journal을 재검증하고 새 attempt log를 만든다. Code bytes를 바꾼 새 SHA는 이 one-shot flow에 다시 bind하지 않는다. | 한 complete attempt에서 일곱 legacy residue root가 재생성되지 않고 Chat bundle/status/process/doc graph가 모두 green이다. |
| 8. Merge/handoff | SHA, exact command/result, successful post-delete attempt ID, failure owner와 no-data-rollback acknowledgement를 review artifact에 남긴다. | Reviewer가 candidate와 gate 결과를 재현할 수 있다. |

Tracked docs는 code보다 먼저 “삭제 완료”를 주장하지 않는다. Phase 2와 3은 review commit을 나눌 수 있지만 하나의 candidate range로 함께 merge/revert할 수 있어야 한다. Permanent deletion은 install, start, CI, merge hook이나 application startup에 넣지 않고 current clone에서 한 번 수행하는 operator action이다.

### Failure Behaviour

| Failure | Required behavior |
| --- | --- |
| Known external consumer 발견 | Consumer owner, 호출 surface와 offboarding date를 기록하고 destructive phase를 block한다. 자동 legacy keep으로 전환하지 않는다. |
| Dirty baseline/detached candidate, current clone의 tracked·target 밖 untracked change 또는 clone identity mismatch | Gate와 deletion을 시작하지 않는다. Exact target 아래 untracked record도 뒤이은 ordinary-root/top-level-child/tracked-zero/non-follow inventory를 모두 통과해야 하며, target을 다른 path로 추측하거나 scope를 넓히지 않는다. |
| Clean install/default/browser/residual failure | `red`로 기록하고 candidate를 고친다. Permanent deletion으로 진행하지 않는다. |
| Required tool/platform/bundle/Chromium 부재 | `blocked`로 기록한다. Skip, not-run 또는 unit green으로 대체하지 않는다. |
| Runtime actual/local-provider/Server actual failure | Chat runtime 또는 Server owner가 진단한다. Legacy Host/Harness를 fallback으로 되살리지 않는다. |
| Unexpected local child, symlink/root/device/process/open-handle 또는 Chat path overlap | 해당 root를 열람·삭제하지 않고 operator phase 전체를 block한다. Exact allowlist 밖 root를 자동 포함하지 않는다. |
| Permanent deletion 첫 실패 | 즉시 hard-stop한다. 삭제된 root와 untouched root를 구분해 기록하고 permission 우회, parent/sibling cleanup, backup restore와 data rollback을 시도하지 않는다. |
| Post-delete residual failure | Handoff를 `red`로 유지한다. Environment/artifact처럼 sealed candidate bytes를 바꾸지 않는 원인만 fresh attempt log로 같은 SHA에서 재검증한다. Code defect면 이 cutover gate를 새 SHA에 재사용하지 않고 별도 Chat-only incident change로 넘긴다. Pre-cutover base와 삭제한 local data는 복구하지 않는다. |
| Merge 후 code regression | 실제 기록된 known-good Chat-only release로 redeploy하거나 별도 Chat-only incident change를 수행하고 preserved contract를 다시 검증한다. `rollback_base_sha`는 diff baseline일 뿐 post-delete recovery target이 아니며, partial legacy resurrection과 dual-run은 금지한다. |
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
- Permanent deletion 전에는 tracked cutover range를 `rollback_base_sha`로 되돌릴 수 있다. 삭제 뒤 이 gate의 retry는 sealed candidate의 environment/artifact 재검증에만 적용된다. Code recovery는 known-good Chat-only release나 별도 Chat-only incident change가 소유하며 pre-cutover mixed graph는 recovery target이 아니다. Permanent local deletion에는 recovery copy와 지원되는 data rollback이 없다.
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
| Cleanup checker/operator를 one-shot gate artifact로 둔다 | Exact deletion에는 reviewable automation이 필요하지만 legacy allowlist를 future product surface로 유지하면 다시 architecture trace가 된다. |
| Permanent local data deletion은 full gate 뒤에만 수행한다 | Code correctness와 current Chat operability를 먼저 증명하고, destructive action은 승인된 literal roots로 제한해야 한다. |
| Exact `0.144.4` runtime과 patch stack은 그대로 둔다 | 이 effort는 architecture contraction이며 pin upgrade나 SDK rebase가 아니다. |

## Testing Decisions

Highest practical seam은 하나의 mega-E2E가 아니라 서로 대체할 수 없는 세 seam이다.

1. 사용자 observable 최고 seam은 actual Chromium + Vite + Express + deterministic `CodexChatRuntime`을 통과하는 Chat Shell Playwright다.
2. Native conversation 최고 seam은 production Node→bundled Python→official SDK→exact native runtime→official local provider를 통과하는 `test:local-provider`다.
3. Cross-package lifecycle 최고 seam은 actual HTTP listener와 Python/native process tree disappearance를 확인하는 Server actual shutdown이다.

이 세 seam은 각각 UI/HTTP, native identity·policy, listener/process ownership을 독립적으로 관찰하므로 하나로 합치지 않는다.

### Required gate matrix

| Gate | Command/evidence | Checkpoint and meaning |
| --- | --- | --- |
| Environment | `uname -s`, `uname -m`, Node/npm, exact `uv 0.8.13`, discoverable CPython `3.10.12`, Playwright와 Chromium accessibility를 기록 | 모든 gate 전. `Darwin`/`arm64` 또는 prerequisite가 없으면 `blocked`다. |
| Clean install | Detached clean candidate에서 `npm ci` | Lock/manifest consistency와 stale local workspace link 부재를 증명한다. |
| Default survivor | `npm test` | Survivor runtime/Server/Shell contract와 camp unit을 검증한다. |
| Type safety | `npm run typecheck` | Survivor와 artifact-local camp TypeScript graph를 검증한다. |
| Build | `npm run build` | Survivor release/build roster만 생성한다. |
| Current clean build | Current clone에서 `npm run build` | 세 survivor `dist`를 literal-path clean build해 deleted Server emit과 stale legacy package output이 current actual/post-delete oracle에 남지 않게 한다. |
| Chat Shell lint | `npm run lint -w @ay-ple/chat-shell` | Maintained browser production source를 검사한다. |
| Browser | `npm run test:e2e` | Chat Shell과 artifact-local camp desktop browser behavior를 검증한다. |
| Camp export | `npm run export:camp-demo` | Inspector 없이 static artifact를 export한다. |
| Bundle pre/post | `npm run verify:production-runtime -w @ay-ple/codex-chat-runtime` | Canonical manifest와 complete ignored bundle을 pre/post actual·deletion에 검증한다. Missing artifact는 `blocked`, mismatch는 `red`다. |
| Node actual | `npm run test:node-actual -w @ay-ple/codex-chat-runtime` | Bundle/Python/private bridge fault, queue/deadline, unknown outcome, raw-leak 방지와 process-group reap을 provider 없이 검증한다. |
| Exact local provider | `npm run test:local-provider -w @ay-ple/codex-chat-runtime` | Opaque native identity/FIFO, AgentMessage, terminal, interrupt, follow-up와 effective `never + readOnly` state를 provider/auth 없이 검증한다. |
| Server actual | `npm run test:codex-chat-actual -w @ay-ple/server` | Listener intake refusal, close wait와 independent Python/native PID·process-group disappearance를 검증한다. |
| Canonical entrypoint | `npm run test:dev-entrypoint` | Origin-only `invalid_configuration`, valid six-root `configured`, Shell readiness, exact Server+Shell process graph와 bounded reap을 serial 검증한다. Probe 뒤 두 번의 stable full-tree observation, role별 exact cardinality·parent edge, escaped observed PID identity와 cleanup을 확인한다. Readiness 60초와 reap 10초는 test-only bound다. Missing tool/artifact, unsupported platform, occupied port와 readiness/helper/teardown timeout은 위 closed marker로 `blocked`가 되며 outer command exit 1일 수 있다. Marker 없는 script/manifest/bundle/process/behavior mismatch는 `red`다. |
| Patch/docs hygiene | `git diff --check "$rollback_base_sha" "$cutover_candidate_sha"`와 `npm run check:docs-links` | Candidate range whitespace와 active-doc link/owner를 검사한다. |
| Residual | Candidate gate artifact의 `check-chat-only-residual.mjs` | Deleted code/package/pin/route/command/current-doc와 stale build residual이 없을 때만 exit 0이다. |
| Post-delete | Bundle verifier → `npm run test:dev-entrypoint` → residual checker `--post-delete` | Exact legacy roots가 absent·unrecreated이고 current bundle/status/process graph가 유지됨을 검증한다. |

Actual 세 gate 뒤 production bundle verifier를 다시 실행해 test가 ignored bundle을 mutate하지 않았음을 확인한다. `validate:exact-sdk`와 live provider OAuth는 이번 cutover의 required gate가 아니다. Runtime source, ordered patch나 manifest가 변경됐다면 deletion scope를 벗어난 것이므로 별도 runtime validation과 review를 요구한다.

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
- 보존할 observable envelope는 [ticket 002](../wayfinding/chat-shell-cutover-readiness/tickets/002-extension-envelope.md), survivor fitness와 fixture 역할은 [004 audit](../wayfinding/chat-shell-cutover-readiness/assets/004-chat-target-fitness-audit.md)가 근거다. [014 manifest](../wayfinding/chat-shell-cutover-readiness/assets/014-legacy-removal-manifest.md)와 [016 execution gates](../wayfinding/chat-shell-cutover-readiness/assets/016-cutover-execution-gates.md)는 initial investigation snapshot이며, `/to-spec` live-tree/source review에서 발견한 ownership spike·ignored residue·retry binding 보정과 exact final contract는 이 spec이 소유한다.
- Implementation ticket은 이 contract를 tracer-bullet slice로 나누되 destructive phase가 full candidate gate보다 먼저 실행되도록 분해해서는 안 된다.
