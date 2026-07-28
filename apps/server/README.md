# @ay-ple/server

Explicit workspace authority와 official SDK 기반 Codex Runtime을 하나의 product lifecycle로 조합하는 Express local companion server다. Canonical `createPreparedServerApplication()`이 product HTTP, 선택한 workspace graph와 bounded Runtime shutdown을 소유한다. Listener bind와 process signal은 별도 host adapter가 소유하되, bind-first host는 Server-owned two-phase listener capability로 기존 cleanup authority에 합류한다. `createServerApplication()`은 listener lifecycle을 독립 검증하는 빈 host seam이다.

`/api/product/*`의 public JSON request·response와 NDJSON frame은 dependency-free [`@ay-ple/product-contract`](../../packages/product-contract/README.md)가 소유한다. Server는 shared decoder로 mutation body를 admission하고 domain object를 public projection으로 변환한다. Express route, status·Origin guard, active-root `WorkspaceSourceProjection`, neutral NDJSON line writer, `WorkspaceRegistry`와 transient Interaction Broker binding은 Server에 남는다.

Canonical product 구현은 App 시작 전에 준비한 user-owned Git SemesterWorkspace를 explicit `--workspace` 또는 `WorkspaceRegistry` active pointer로 선택한다. Shared listener·Interaction Broker, exact-root Runtime와 project-discovered MCP가 모두 준비된 뒤에만 registry와 Browser lifecycle을 `active`로 전환한다. 제거된 public-preview Account→Setup→Ready composition, in-App chooser·init·candidate transition, managed Browser OAuth route와 v3 setup adapter는 Server의 public graph에 없다.

`workspace-registry` Module은 canonical external app data의 `state/workspace-registry.json`을 exact v1 envelope로 읽고 compare-before-replace한다. Canonical root command의 read-only `prepared-workspace-launch` resolver는 explicit prepared root를 registry보다 우선하고, 인자가 없으면 active pointer를 fresh reopen한다. Canonical·exact Git root·strict v4 identity가 아니거나 active pointer가 없으면 fail closed한다. `prepared-workspace-startup` coordinator는 fresh validation → shared listener → Broker generation → exact-root Runtime·native thread start → bounded effective project config → authenticated Adapter lifecycle → fresh thread context → Product thread handoff → registry transaction → active projection 순서를 고정한다. Thread start가 exact-root trust와 project config reload를 먼저 성립시키고, 이 startup thread를 정상 Product Turn에도 그대로 재사용하므로 별도 health-only thread나 두 번째 Product thread를 만들지 않는다. Native config의 `ay_ple_interaction` declaration은 exact root-relative `command`, 빈 `args`, source 없는 exact 세 `env_vars`, 생략된 `cwd`·`tool_timeout_sec`, 빈 static `env`, `enabled=true`, `required=true`, exact `enabled_tools=["propose_state_patch"]`, empty `disabled_tools=[]`를 모두 만족해야 한다. 다른 user MCP server의 valid `local | remote` env-var source는 projection에서 보존하지만 Required Interaction check에는 관여하지 않는다. Native Codex가 `enabled_tools` 뒤에 `disabled_tools`를 적용하므로 denylist가 하나라도 있으면 fail closed한다. 실제 Adapter는 handshake 뒤 Broker가 accept한 held lifecycle channel을 열어야 MCP initialize가 성공하며, Broker의 generation status가 startup readiness와 이후 live loss의 authority다. Lifecycle reader는 readiness 동안 path-free `starting`, accepted registry transaction 반환 뒤 live generation이면 `active`, startup readiness failure·active Runtime terminal·자동 감지한 Adapter loss 뒤 `runtime_unavailable` recovery를 투영한다. Canonical host는 recovery 동안 HTTP listener를 유지해 Browser가 이 상태를 읽게 하고, App shutdown에서만 listener를 닫는다. Missing/moved/reused registry root는 Runtime spawn 전에 `workspace_unavailable`이며 malformed/future registry는 original bytes를 보존한 `registry_incompatible`다. Registry CAS는 verified `workspaceId`를 replace 직전까지 다시 확인하고 synchronous acceptance callback을 되돌릴 수 없는 cutover로 사용한다. Runtime terminal이나 Broker의 synchronous `isLost()`가 acceptance보다 먼저 관찰되면 같은 writer lease에서 prior pointer를 복원한다. Acceptance 뒤 housekeeping 오류는 committed authority와 residue reconciliation으로 수렴하며, 그 직후 continuity를 잃으면 새 pointer를 유지한 채 active를 잠깐 합성하지 않고 recovery를 공개한다. Explicit relaunch의 acceptance 이전 failure 뒤 no-argument reopen은 previous root를 fresh Runtime·thread·Broker credential로 다시 열며 cross-generation identity를 재사용하지 않는다.

## Canonical 시작과 root 소유권

Repository root에서 다음 명령을 사용한다.

```bash
npm run dev
```

Canonical product composition은 다음 root authority를 명시적으로 분리한다.

| Root | Current owner와 계산 |
| --- | --- |
| `packageRoot` | Current `hub/` source root다. Tracked source와 rebuildable output을 찾으며 사용자 상태를 쓰지 않는다. |
| `appDataRoot` | 기본값은 canonical sibling `../.ay-ple/`다. Verified Runtime은 `runtime/production-runtime-darwin-arm64`, controlled `HOME`은 `state/runtime/home`, temporary state는 `temp/`에 둔다. |
| `CODEX_HOME` | Caller의 전역 `CODEX_HOME`을 그대로 사용하며, 미설정이면 OS user의 `~/.codex`를 사용한다. Canonical dev는 별도 auth profile이나 credential copy를 만들지 않는다. |
| `workspaceRoot` | 첫 open·학기 변경은 `--workspace <absolute-prepared-git-root>`를 사용하고, 이후 인자 없는 canonical start는 `WorkspaceRegistry.activeWorkspaceId`를 fresh reopen한다. `CODEX_CHAT_WORKSPACE`와 ambient `cwd`는 fallback으로 사용하지 않는다. |

Package, app data, global Codex home와 workspace는 canonical realpath 기준 same-path·ancestor 관계가 없어야 하고 symlink·non-directory는 mutation 전에 fail closed한다. Controlled child state만 app data 아래에 중첩된다. Fresh clone은 Runtime bundle이 tracked되지 않으므로 먼저 [runtime package README](../../packages/codex-chat-runtime/README.md#standalone-production-bundle)에 따라 external app data에 materialize한다.

`WorkspaceRegistry` store는 최대 `64`개 canonical realpath root와 active pointer만 보존한다. `256 KiB` strict codec, synced temporary file, opened-byte compare, no-clobber initial publish, atomic replacement rename와 directory sync를 사용하며 실제 process death 뒤 owned writer residue만 정리한다. Malformed·future registry는 original bytes를 보존하고 missing file만 empty v1 시작점으로 취급한다. Active reopen과 explicit reselect는 root `workspace-state.json` v4 identity를 fresh read하며 registry root와 `workspaceId`가 일치할 때만 available로 반환한다. Explicit commit caller는 readiness에서 검증한 `expectedWorkspaceId`를 함께 넘기며 store는 initial identity read와 final replace boundary 모두에서 같은 identity를 요구한다.

Canonical root command는 ambient `PORT`를 무시하고 Server `PORT`를 `3000`으로 고정해 Chat Shell Vite proxy target과 일치시킨다. Direct Server entrypoint는 caller environment를 local `.env`보다 우선하고 `PORT`가 없으면 `3000`, listener address는 `127.0.0.1`을 사용한다. Root command가 exact Chat Shell Origin을 설정한다. `dev:chat-only`와 `/api/codex-chat/*`는 supported entrypoint·route·alias가 아니다.

Build 뒤 Server만 실행하려면 product composition에 필요한 explicit roots와 Origin을 caller가 동일하게 준비한 경우에만 다음 명령을 사용한다.

```bash
npm run build -w @ay-ple/server
npm run start -w @ay-ple/server
```

## Legacy bytes 보존 경계

Server production source에는 app-owned v2 academic store, Course·material registry, Assignment receipt, durable patch·confirmation·revision apply와 recovery I/O가 없다. `@ay-ple/semester-workspace`도 v4 identity codec·classification과 shared validators만 남기고 current-v2 decoder·v3 kernel을 제거했다. 기존 workspace의 v2/v3 파일은 읽거나 재작성·삭제하지 않으며 지원하지 않는 prepared root로 보존한다. Canonical authority는 root v4 identity, external `WorkspaceRegistry`와 user-owned Git workspace다.

## Product operation·Review authority

Canonical `PreparedProductOperationCoordinator`는 normal AY Chat과 static `organize_sources` action의 process-global operation lease를 소유한다. Shared `product-turn-coordinator`는 `product_turn` eligibility 확인과 lease claim을 같은 synchronous critical section에서 수행하고, Chat/action busy loser를 `409 action_busy`로 끝낸다. Lease는 start failure, authoritative native terminal 또는 completed Runtime close authority로만 once-only release된다.

Canonical normal Chat은 bounded `TextInput`, `workspace_write`, generic child environment와 project-discovered Skill·MCP를 사용한다. Canonical Semantic Review는 Interaction Broker의 transient request/result이고, 일반 Plan clarification은 별도 ephemeral binding으로 같은 Turn에 answer/cancel한다. Server는 academic receipt나 accepted result apply를 소유하지 않는다.

`organize_sources`는 dynamic manifest가 아닌 Server-owned 단일 action definition이다. Strict request decode와 shared lease 예약 뒤 account/settings를 확인하고, 선택한 `1..16`개 text file을 request order대로 fresh preflight한 다음 invocation마다 effective Skill을 다시 관찰한다. Skill 관찰 뒤 selected file을 다시 preflight하고, `operation.preparing` 전달이 끝난 뒤 Runtime dispatch 직전에 selected file·exact Skill·rendered input을 마지막으로 재검증한다. Exact workspace의 enabled `.agents/skills/ay-ple-first-assignment`와 canonical non-symlink `SKILL.md`만 허용하고, `workspace_write`, optional current settings, resolved Skill 하나와 `32 KiB` 이하 fixed action text 하나를 startup-approved thread의 Product Turn에 전달한다. Initial File·Skill·Runtime context failure는 Turn과 NDJSON을 열기 전에 safe JSON으로 닫고, `operation.preparing` 대기 중 생긴 drift는 Runtime 호출 없이 streamed `failed/action_context_stale`로 닫는다. Preflight disconnect는 Turn을 시작하지 않고 shutdown은 final revalidation까지 같은 signal을 abort한다. Accepted action은 normal Chat과 같은 activity, general clarification, Semantic Review, interrupt·disconnect와 terminal projection을 사용한다.

`WorkspaceSourceProjection`은 lifecycle이 `active`인 exact root를 stateless read-only로 읽는다. Bounded recursive scan은 hidden·managed·scaffold·secret-like path와 symlink를 제외하고 regular file의 relative path·size·preview kind만 반환한다. Action preflight는 exact root identity, exclusion, current text size classification, canonical containment와 non-symlink regular-file identity를 확인하고 `O_NOFOLLOW` open 전후 device·inode·size를 비교하되 file bytes·digest·snapshot을 읽거나 handle을 Turn까지 보존하지 않는다. Text preview는 bounded fatal UTF-8와 full-file SHA-256을 반환하고 PDF는 bounded bytes를 `application/pdf`, `nosniff`, same-origin·sandbox CSP, inline disposition과 `no-store`로 제공한다. Source GET admission은 loopback peer·loopback `Host`, absent 또는 exact configured local `Origin`과 non-cross-site Fetch Metadata를 요구해 DNS rebinding·cross-site read를 거절한다. App-owned Course·`RawMaterial`, source copy·snapshot·watcher·durable selection이나 filesystem mutation을 만들지 않는다.

`interaction-broker` Module은 `@ay-ple/interaction-mcp`의 strict private wire를 소비한다. Runtime generation마다 fresh token·binding, Adapter status와 pending slot 하나를 만들고, loopback·constant-time credential과 started `product_turn` binding을 모두 확인한 뒤 exact workspace root의 evidence를 한 byte snapshot으로 atomic preflight한다. Adapter는 handshake 뒤 한 held lifecycle channel을 열고 Broker acceptance를 받은 다음에만 MCP initialize를 완료한다. Channel의 unexpected EOF는 loss를 동기적으로 latch해 startup·registry acceptance와 새 Turn admission을 닫으며, Runtime terminal·replacement와 App shutdown이 시작한 expected close는 loss로 오인하지 않는다. In-memory UI Adapter가 `review.requested`를 받은 뒤 한 `accept | revise | reject`만 held capability response로 돌려주며 duplicate·late answer, HTTP abort, UI disconnect, Turn interrupt, Runtime terminal·replacement, Adapter loss와 shutdown은 normal result 없이 닫힌다.

Canonical `createPreparedServerApplication()`은 Broker Router를 같은 loopback listener의 `/api/_private/interaction-mcp`에 mount하고 normal Product Turn NDJSON에 semantic `review.requested | review.resolved | review.failed`를 기록한다. Browser의 exact semantic result는 bodyless `204`로 held call을 해제하고, resolved frame만 transcript settlement authority가 된다. Runtime thread는 project config에서 Adapter를 발견하므로 thread-start private MCP override나 Skill override를 받지 않는다. `organize_sources` Turn만 fresh effective discovery로 검증한 workspace-local Skill을 explicit `SkillInput`으로 받는다. AY 역할의 file apply는 workspace Skill·Interaction 결과 뒤 Runtime graph에서 수행하며 Server가 academic patch·revision을 적용하지 않는다. Listener-independent `createServerApplication()`은 academic Router나 persistence 없이 빈 host seam을 제공한다.

`CodexChatService`는 account lifecycle이나 Runtime role이 없는 `CodexWorkspaceRuntime`을 받아 Account Readiness, model catalog, bounded effective Skill observation, startup에서 readiness를 통과한 project-owned Product thread·active Turn, interaction·interrupt, native context, terminal observation, Runtime recycle와 bounded close를 캡슐화하는 deep product lifecycle Module다. Prepared host가 공급한 startup thread를 획득해 재사용하며 service가 별도 thread를 만들지 않는다. Public tracer route가 사라져도 이 lifecycle owner와 Runtime의 internal text regression은 이름만으로 분해·제거하지 않는다.

Prepared host의 startup thread는 effective declaration 검증과 Adapter lifecycle readiness를 통과한 뒤 Product Turn thread가 된다. Runtime은 bounded generic child environment와 effective native config projection만 소유하며 `waitForMcpServerReady`, official `mcpServerStatus/list` polling 또는 live MCP health API를 제공하지 않는다. Broker가 보유한 lifecycle channel이 끊기면 Adapter loss를 `transport_failed`로 pending interaction에 전달하고 lifecycle을 recovery로 바꾸며 Broker·Runtime을 bounded cleanup으로 정산한다. Runtime terminal은 별도의 `runtime_terminated` 경로로 처리하고, 정상 App shutdown은 expected lifecycle close로 표시해 transport loss로 오인하지 않는다.

## Public product API

| Endpoint | 동작 |
| --- | --- |
| `GET /api/product/bootstrap` | Path-free `starting | active | recovery_required` prepared-workspace lifecycle와 coarse operation status |
| `GET /api/product/codex-settings` | Active workspace에서만 visible native model catalog, advertised reasoning effort order와 Fast availability를 반환한다. Non-active lifecycle은 Runtime을 시작하지 않고 `503 workspace_unavailable`이다. |
| `GET /api/product/sources` | Active exact root의 bounded Browser-safe relative source list를 `no-store`로 반환한다. |
| `GET /api/product/sources/text?relativePath=...` | 검증한 regular UTF-8 source의 bounded text, full-file digest와 truncation 상태를 반환한다. |
| `GET /api/product/sources/pdf?relativePath=...` | 검증한 bounded PDF bytes를 same-origin inline preview로 반환한다. |
| `POST /api/product/chat/messages` | Prepared root의 normal AY Chat stream. Project-discovered Skill·MCP와 `workspace_write`를 사용하며 academic source·Run을 만들지 않음 |
| `POST /api/product/actions` | Closed `organize_sources` request의 current text refs와 exact workspace-local Skill을 fresh 검증한 뒤 shared Product operation NDJSON을 시작한다. |
| `POST /api/product/operations/:operationId/interactions/:interactionId/answer` | General Plan interaction answer |
| `POST /api/product/operations/:operationId/interactions/:interactionId/cancel` | General Plan interaction cancel |
| `POST /api/product/reviews/:interactionId` | Exact active Semantic Review의 `accept | revise | reject`를 bodyless `204`로 전달 |
| `POST /api/product/operations/:operationId/interrupt` | Matching active Turn interrupt acknowledgement |

Mutation은 raw socket이 loopback이고 Origin이 없거나 configured local Origin과 exact match할 때만 허용한다. Interaction Broker는 loopback과 Runtime-generation high-entropy token을 모두 검증한다. Token, native identity, absolute path, selected content·digest, Skill path/body, complete MCP payload와 traceback은 Browser contract에 없다. Old `/api/product/workspaces/activate`, Course/material mutation, `/api/product/actions/first-assignment`와 retry, academic Review compatibility route, `/api/product-mcp`, `/api/runtime/*`와 `/api/codex-chat/*`는 canonical composition에서 Express `404`로 닫힌다.

Public cutover 뒤에는 prepared-workspace Browser·read-only source projection·target Router·Broker·generic Runtime child environment·project Skill/MCP graph 전체가 한 unit이다. Old app-owned Course/material workflow, public academic action adapter·shared contract, Server academic persistence·managed Recipe, Runtime private override와 legacy SemesterWorkspace kernel은 제거됐다. 기존 v2/v3 on-disk bytes 자체는 자동 migration·deletion 없이 보존한다.

## NDJSON과 shutdown

Neutral Server-private NDJSON writer는 product stream의 backpressure·disconnect와 bounded drain을 소유한다. `CodexChatService`는 Runtime terminal을 한 번 관찰하고 accepted operation의 interrupt·terminal·unknown settlement를 관리한다. Canonical prepared host는 Runtime terminal과 held Broker lifecycle channel이 감지한 Adapter continuity loss 때 Broker intake와 Runtime을 정산하되 listener를 recovery bootstrap용으로 유지한다. App shutdown은 새 work를 막고 Broker의 expected lifecycle close → Runtime → listener를 bounded하게 닫으며 Python·native process group과 pipe가 사라진 뒤에만 완료한다.

`npm run test:product-entrypoint`는 root canonical command가 explicit `appDataRoot`와 workspace selection만으로 product API·Browser를 열고 legacy path를 무시하며 SIGINT 뒤 OS process graph와 port를 bounded하게 정리하는지 검증한다. Prepared startup·application tests는 listener refusal, close ordering과 recovery listener 유지를 검증한다.

## Exact·live conformance

Canonical prepared public graph의 actual conformance는 다음 명령으로 검증한다.

```bash
npm run test:prepared-workspace-product-actual
```

Prepared-workspace product actual은 native Bootstrap Skill의 exact CLI를 fresh temporary Git root에서 실행한 뒤, 그 root의 tracked v4 identity·`AGENTS.md`·project MCP declaration과 installed First Assignment Skill을 사용한다. Public `organize_sources`에는 두 selected text ref만 보내고, exact verified Runtime·isolated TypeScript First Assignment conformance provider가 workspace Skill body와 file-ref text, selected-only actual-file read, project MCP call과 `auto_review`를 관찰한다. 같은 native Turn의 revise→fresh Review→accept 흐름은 Review 전 bytes·index·HEAD 불변, accept 뒤 AY 역할의 explicit intended-path mutation·Git checkpoint와 unrelated dirty·untracked 보존을 검증하고, 두 번째 reject는 no-mutation으로 끝낸다. 기존 direct Adapter trace는 evidence digest·quote·path·symlink failure, busy, Turn interrupt, Browser disconnect와 Runtime·Adapter loss가 normal result·file mutation·checkpoint 없이 정산되는지 보완한다. Teardown은 credential 재사용 거절, Adapter held response, exact Node·Python·native process group, provider listener, Server listener와 temporary root를 완전히 닫고 production startup resolver·registry나 workspace 밖 bytes를 바꾸지 않는다.

일반 package 검증은 다음 명령으로 실행한다.

```bash
npm run test -w @ay-ple/server
npm run typecheck -w @ay-ple/server
npm run build -w @ay-ple/server
npm run verify:package-root -w @ay-ple/server
```

`verify:package-root`는 먼저 Server를 build한 뒤 `NODE_OPTIONS`를 제거한 plain Node child에서 default-condition `@ay-ple/server`를 import한다. Runtime export가 `ServerStartupCleanupError`, `bindServerApplicationListener()`, `createServerApplication()`, `listenToServerApplication()` 네 개뿐인지, application factory가 listener-independent인지와 close 뒤 child process가 종료되는지를 검증한다.
