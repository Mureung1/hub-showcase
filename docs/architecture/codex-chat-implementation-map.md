# Codex Chat 구현 지도

작성일: 2026-07-17

최근 검증: 2026-07-20

분류: 활성

성숙도: 구현됨

관련 문서: [Codex Chat-only cutover ADR](../adr/0012-adopt-codex-chat-only-and-remove-legacy-runtime-surfaces.md), [Official Codex Python SDK 재사용 ADR](../adr/0011-reuse-official-codex-python-sdk-for-chat-shell.md), [Codex Runtime 격리](codex-runtime-isolation.md), [Codex-native 제품 작업 조합](codex-native-product-composition.md), [first-vertical runtime sufficiency Wayfinder](../wayfinding/codex-chat-application-foundation/map.md), [runtime package README](../../packages/codex-chat-runtime/README.md), [server README](../../apps/server/README.md), [Chat Shell README](../../apps/chat-shell/README.md)

## 목적

Tracked repository에 남은 Codex Chat runtime의 현재 module, HTTP·Browser 경계, process lifecycle과 검증 표면을 한눈에 설명한다. 채택 이유와 삭제·복구 원칙은 ADR 0012, package별 사용법과 세부 명령은 각 README, 제품 작업 순서는 Development Backlog가 소유한다.

Runtime Harness, Runtime Inspector, `HeadlessCodexClientHost`와 generated legacy protocol inventory는 current topology가 아니다. 이들의 당시 구현과 교훈은 Git history와 완료·역사 문서에 남지만 executable fallback이나 compatibility surface로 해석하지 않는다.

## 현재 결론

| 질문 | 현재 답 |
| --- | --- |
| Maintained runtime은 무엇인가? | Official Python SDK를 재사용하는 `@ay-ple/codex-chat-runtime` 하나다. Generic engine Interface나 두 번째 runtime adapter는 없다. |
| Browser가 App Server와 직접 통신하는가? | 아니다. `@ay-ple/chat-shell`은 browser-safe contract와 Server의 `/api/product/*`, `/api/codex-chat/*`만 사용한다. |
| Native identity를 제품 ID로 다시 만드는가? | 아니다. Runtime, Server와 Browser가 native `threadId`, `turnId`, `itemId`를 관계적으로 보존한다. Private bridge correlation은 Browser로 나가지 않는다. |
| Persistent child lifecycle은 누가 소유하는가? | `createServerApplication()`이 listener와 `CodexChatService`를 함께 소유하고, runtime close와 process-tree disappearance까지 같은 shutdown promise로 정산한다. |
| Runtime과 workspace는 어떻게 선택하는가? | 현재 Chat은 여섯 explicit absolute `CODEX_CHAT_*` path를 검증한다. Root `npm run dev -- --app-data-root <absolute-path>`는 explicit `packageRoot`·`appDataRoot`와 materialize한 초기 workspace를 Server에 주입하고, Browser의 workspace activation은 macOS chooser 결과를 같은 root들과 교차 검증한다. 어느 경로도 legacy env, 저장소의 `.ay-ple` 또는 `process.cwd()`로 fallback하지 않는다. |
| Current clone의 local legacy residue는 남아 있는가? | 아니다. Current-clone deletion handoff는 [Ticket 004](../tickets/2026-07-17-codex-chat-only-cutover/004-delete-legacy-residue-and-handoff.md)에서 완료했다. Current topology에는 legacy fallback이나 자동 cleanup command가 없으며 다른 clone·external path 상태를 추론하지 않는다. |
| 제품의 `ModelingRun`까지 구현됐는가? | 아니다. Current public tracer는 transient Chat conversation이다. Server 내부에는 canonical `StatePatch` proposal, exact Plan Review binding과 accepted/rejected `UserConfirmation` transaction이 구현됐지만 `ModelingInvocation` admission과 durable `ModelingRun` receipt는 후속 제품 계층이다. |
| Native Plan interaction은 어디까지 열렸는가? | Exact official SDK와 production wheel, private bridge와 Node `CodexProductCapableRuntime`이 native Plan `collaborationMode`, typed `request_user_input`, opaque answer/cancel과 curated activity를 제공한다. Server의 headless coordinator는 exact same-Turn question을 active patch와 결합해 product commit 뒤 native answer를 보낸다. Public action HTTP와 Browser Review는 아직 연결하지 않았다. |
| 이 tracer가 제품 runtime으로 충분한가? | Additive runtime seam과 Server 내부 Assignment authority는 deterministic product Runtime/MCP harness에서 proposal → question → commit → answer → terminal을 증명한다. Current public Server·Browser tracer는 여전히 text-only이므로 action admission, activity stream과 Review UI를 연결하는 후속 계층이 필요하다. |

## Tracked 구성

| 위치 | 책임 | 공개 경계 |
| --- | --- | --- |
| `packages/codex-chat-runtime` | Exact bundle verification, private Node↔Python bridge, official SDK conversation, native event projection, deadline·bound·fatal settlement와 process-group reap | Node-only `.`, browser-safe `./contract`, test-only `./testing` |
| `apps/server` | Chat configuration·runtime lease와 별도로 주입 가능한 SemesterWorkspace activation, v2 workspace store의 `Course`·`RawMaterial`·Assignment/StatePatch/UserConfirmation aggregate, selected-source `propose_state_patch` 검증, exact Plan Review binding과 accept/reject transaction, bounded text scan·digest-bound preview, loopback·Origin guarded HTTP/NDJSON, listener/runtime close ordering과 signal handling | `createServerApplication()`, `SemesterWorkspaceController`, headless Assignment review coordinator, `/api/product/*`와 `/api/codex-chat/*` |
| `apps/chat-shell` | SourceSelection·자료 preview·workspace activation을 소유하는 source-centered 3-pane workbench와, native Chat identity reducer·transcript·interrupt·same-thread follow-up을 유지하는 오른쪽 companion | Strict browser-safe product API와 `@ay-ple/codex-chat-runtime/contract` |
| `artifacts/camp-demo` | Runtime과 독립적인 정적 발표 artifact | Artifact-local serve, export, unit, typecheck와 Playwright |
| `references/openai-codex` | Exact official source review와 pin upgrade diff를 위한 dev-only oracle | Production dependency가 아닌 fixed Git submodule |

`apps/inspector`, `packages/runtime-core`, `packages/runtime-fake`, `packages/runtime-codex`와 tracked `spikes/codex-runtime-ownership`은 source·workspace·install graph에 없다. 삭제한 package alias, redirect와 compatibility export도 없다.

## 실행 흐름

```mermaid
flowchart LR
  Shell["apps/chat-shell"]
  Http["apps/server /api/codex-chat/*"]
  Service["CodexChatService"]
  Verifier["Canonical manifest + bundle verifier"]
  Node["CodexChatRuntime Node supervisor"]
  Python["Persistent Python bridge"]
  SDK["Official openai-codex AsyncCodex"]
  Native["Exact 0.144.4 App Server"]

  Shell -->|"status + JSON/NDJSON"| Http
  Http --> Service
  Service --> Verifier
  Verifier --> Node
  Node -->|"private correlated NDJSON"| Python
  Python --> SDK
  SDK --> Native
```

Server는 complete configuration을 spawn 전에 검증하되 runtime process는 첫 mutation까지 lazy하게 시작한다. Python worker가 SDK initialize를 마치고 private `ready` frame을 보낸 뒤에만 public runtime factory가 resolve한다. Native acceptance가 확인된 turn만 HTTP NDJSON을 commit하며 `turn.accepted`가 첫 frame이다.

## HTTP와 Browser contract

| 표면 | 현재 동작 |
| --- | --- |
| `GET /api/codex-chat/status` | `unavailable | configured | starting | ready | failed` closed union, tracer 고정값인 `deny_all + read_only`, configured 이후 exact source/runtime evidence를 반환한다. 이 값은 장기 제품 permission profile이 아니다. |
| `POST /api/codex-chat/threads` | Active turn이 없을 때 idle current handle을 release하고 새 native thread를 만든다. Native thread를 archive/delete하지 않는다. |
| `POST /api/codex-chat/threads/:threadId/turns` | Exact text body를 검증하고 native acceptance 뒤 AgentMessage와 terminal을 acceptance-first NDJSON으로 보낸다. |
| `POST /api/codex-chat/threads/:threadId/turns/:turnId/interrupt` | Matching active turn의 native interrupt acknowledgement 뒤 `202`를 반환한다. Stream terminal이 authoritative하다. |
| `GET /api/product/bootstrap` | 활성 workspace의 root 비노출 product snapshot, `Course`, `RawMaterial` registry를 반환하거나 비활성·incompatible outcome을 명시한다. Persistence store version과 내부 진단값은 Browser에 노출하지 않는다. |
| `POST /api/product/workspaces/activate` | macOS chooser로 선택한 root를 정규화·검증하고 첫 bounded scan·store update가 성공한 뒤에만 active authority를 교체한다. 선택한 workspace가 실패하면 기존 workspace를 유지한다. |
| `POST /api/product/courses` | 활성 workspace에 opaque `Course` 하나를 생성하거나 기존 값을 다시 연다. |
| `POST /api/product/materials/refresh` | Bounded scan으로 지원 text 자료 registry와 digest를 갱신하며 app-owned subtree·symlink·escape·과대·비텍스트 파일을 제외한다. |
| `GET /api/product/materials/:materialId/preview?digest=...` | Registry의 stable ID와 digest를 다시 검증한 bounded text preview만 반환하고 stale·escape·원본 drift는 fail closed 처리한다. |

Mutation은 loopback socket과 absent 또는 exact configured local Origin에서만 허용한다. Runtime은 process-global current thread 하나와 active turn 하나를 소유한다. Browser transcript는 tab memory에만 있고 reload resume, multi-thread persistence나 client별 isolation을 암시하지 않는다.

`agent_message.delta`는 exact item에 append하고 `agent_message.completed` text로 reconcile한다. `turn.error`는 nonterminal observation이며 matching `turn.completed` 또는 process-wide `runtime.failed`만 terminal이다. Raw protocol, hidden reasoning, traceback, path, credential과 private correlation은 Browser contract를 넘지 않는다.

## Runtime과 lifecycle

`@ay-ple/codex-chat-runtime`은 official source commit `8c68d4c87dc54d38861f5114e920c3de2efa5876`, exact native runtime `0.144.4`, standalone CPython, patched SDK와 dependency closure를 canonical manifest로 검증한다. Ordered 0006 patch의 Plan·pending request seam을 private bridge와 additive Node product contract가 raw App Server request ID 없이 projection한다. Answer/cancel은 native resolution 뒤 nonterminal same-Turn continuation까지 확인된 경우에만 성공하며, Bridge는 one resolved activity를 그 continuation보다 먼저 내보낸다. 같은 native resolution이 lifecycle cleanup에서 왔고 terminal이 이어지면 synthetic success 없이 `interaction_not_pending`으로 끝난다. Package-private routing과 bound의 상세는 [runtime README](../../packages/codex-chat-runtime/README.md)와 [patch ledger](../../packages/codex-chat-runtime/upstream/PATCHES.md)가 소유한다. `readAccountReadiness`는 native work를 시작하지 않고, structured Turn은 acceptance-first identity와 authoritative terminal을 보존한다. Production factory는 complete verified bundle만 시작하고 system Python, source checkout, ambient environment나 network repair를 사용하지 않는다.

Node는 detached Python worker와 native child를 explicit controlled environment에서 supervise한다. Existing text path는 `deny_all + read_only`를 유지하고, additive product Turn은 exact `SkillInput`·bounded `TextInput`, Plan mode와 `auto_review + workspace_write`를 사용한다. Product activity는 requested Skill, Plan, allowlisted `propose_state_patch` MCP lifecycle, opaque user-input, Agent message와 terminal만 projection한다. Operation·stream·queue·stderr bound와 deadline을 적용하며 fatal·disconnect·shutdown은 pending operation, interaction과 stream을 한 번 정산한 뒤 process group disappearance까지 확인한다.

Server shutdown은 다음 순서를 유지한다.

1. 새 Chat work와 listener restart를 막는다.
2. Listener close를 시작해 새 TCP intake를 거부한다.
3. Active disconnect drain과 runtime `close()`를 한 promise로 수렴한다.
4. Python/native process와 pipe가 사라진 뒤 application close를 resolve한다.

Caller environment는 local `.env`보다 우선하고 `PORT` 미지정 시 `3000`을 사용한다. Root `npm run dev -- --app-data-root <absolute-path>`는 explicit product root를 검증·materialize한 뒤 `CODEX_CHAT_ORIGIN=http://127.0.0.1:4173`과 함께 Server와 Chat Shell을 시작한다. Chat-only entrypoint 검증은 `npm run dev:chat-only`가 소유한다. Origin만 있고 여섯 Chat path가 없으면 Chat exact status는 `unavailable/invalid_configuration`이지만 product source workbench는 계속 동작한다.

## 검증 표면

| 명령 | 증명하는 것 |
| --- | --- |
| `npm test` | Workspace materializer, Runtime, Server, Chat Shell과 static camp unit contract |
| `npm run typecheck` | 세 survivor workspace, root tooling과 artifact-local camp TypeScript graph |
| `npm run build` | 세 survivor `dist`를 literal-path clean한 뒤 runtime → Server → Shell 순서의 build graph |
| `npm run lint -w @ay-ple/chat-shell` | Maintained Browser production source와 Playwright harness lint |
| `npm run test:e2e` | 실제 Express/Vite를 통과하는 Chat Shell desktop behavior와 static camp browser flow |
| `npm run test:dev-entrypoint` | Exact seven-process graph를 직접 소유하는 Chat-only `dev:chat-only`의 origin-only/configured 상태, local `.env`·`PORT`와 bounded reap. Product workspace activation은 Server bootstrap tests와 Browser E2E가 증명한다. |
| `npm run check:docs-links` | Active/current Markdown의 relative link와 삭제된 owner reference |
| `npm run verify:production-runtime -w @ay-ple/codex-chat-runtime` | Canonical manifest와 complete ignored bundle을 mutation 없이 검증 |
| `npm run test:node-actual -w @ay-ple/codex-chat-runtime` | Provider-free actual bridge의 text tracer와 Account·structured product Turn·Plan/MCP·user-input answer/cancel, fault, queue/deadline, unknown outcome와 process-group reap |
| `npm run test:local-provider -w @ay-ple/codex-chat-runtime` | Official local Responses harness를 통한 exact native identity/FIFO, terminal, interrupt, follow-up와 policy |
| `npm run test:codex-chat-actual -w @ay-ple/server` | 실제 listener와 Python/native child의 shutdown ordering·disappearance |

Deterministic runtime과 Browser green만으로 native identity, exact bundle·policy와 process-tree cleanup을 주장하지 않는다. 반대로 exact local-provider gate는 Browser reducer와 HTTP fail-closed behavior를 대체하지 않는다.

## 현재 미지원 경계

아래 항목은 current topology의 gap을 기록하며 모두가 채택된 선행 backlog라는 뜻이 아니다. 제품 작업 조합은 첫 Assignment vertical의 핵심 gap이고, 나머지 Chat·layout·approval capability는 [first-vertical runtime sufficiency Wayfinder](../wayfinding/codex-chat-application-foundation/map.md)와 실제 product need가 admission한 범위만 구현한다.

| Gap | 현재 사실 | 정본 |
| --- | --- | --- |
| 제품 작업 조합 | Runtime의 exact product Turn·permission·Plan/MCP seam과 Server 내부 canonical `StatePatch` proposal, exact Review binding, accept/reject transaction은 구현됐다. `ModelingInvocation`·`ModelingRun`, action admission, hosted MCP/product activity HTTP와 Browser Review를 이 authority에 결합하는 조정 계층은 아직 없다. | [Codex-native 제품 작업 조합](codex-native-product-composition.md) |
| Conversation persistence | Browser transcript는 transient이고 `thread/read`·`thread/resume`, reload recovery, multi-thread sidebar와 client별 isolation은 없다. | [Chat Shell README](../../apps/chat-shell/README.md) |
| 제품 layout | Explicit `appDataRoot`를 받는 canonical product development bootstrap, Browser activation, workspace 내부 versioned `Course`·`RawMaterial` registry와 source-centered 3-pane workbench가 구현됐다. 최근 workspace registry, macOS app data 기본 경로와 product Turn의 exact `cwd` binding은 아직 정하지 않았다. | [Codex Runtime 격리](codex-runtime-isolation.md) |
| Codex 실행 권한과 interaction projection | Existing text tracer는 `deny_all + read_only`를 유지하고 additive runtime product Turn은 `auto_review + workspace_write`와 opaque pending interaction을 제공한다. Server 내부 coordinator는 product commit과 native answer의 순서를 분리하지만 HTTP·Browser는 아직 product permission/activity와 Review를 노출하지 않는다. Codex permission은 AY-PLE `UserConfirmation`과 별도다. | [ADR 0011](../adr/0011-reuse-official-codex-python-sdk-for-chat-shell.md) |
| Packaging | macOS arm64 verified runtime은 있으나 Desktop signing·notarization, distribution과 다른 platform은 지원하지 않는다. | [macOS-first ADR](../adr/0009-use-a-macos-first-local-web-app-product-path.md) |
