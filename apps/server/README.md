# @ay-ple/server

Explicit workspace authority와 official SDK 기반 Codex Runtime을 하나의 product lifecycle로 조합하는 Express local companion server다. `createServerApplication()`은 listener-independent application factory이며 product HTTP, 선택한 workspace graph와 bounded Runtime shutdown을 소유한다. Listener bind와 process signal은 별도 host adapter가 소유하되, bind-first host는 Server-owned two-phase listener capability로 기존 cleanup authority에 합류한다.

`/api/product/*`의 public JSON request·response와 NDJSON frame은 dependency-free [`@ay-ple/product-contract`](../../packages/product-contract/README.md)가 소유한다. Server는 shared decoder로 mutation body를 admission하고 domain object를 public projection으로 변환한다. Express route, status·Origin guard, neutral NDJSON line writer, workspace store와 private Runtime/MCP binding은 Server에 남는다.

Canonical product 구현은 App 시작 전에 준비한 user-owned Git SemesterWorkspace를 explicit `--workspace` 또는 `WorkspaceRegistry` active pointer로 선택한다. Shared listener·Interaction Broker, exact-root Runtime와 project-discovered MCP가 모두 준비된 뒤에만 registry와 Browser lifecycle을 `active`로 전환한다. 제거된 public-preview Account→Setup→Ready composition, in-App chooser·init·candidate transition, managed Browser OAuth route와 v3 setup adapter는 Server의 public graph에 없다.

`workspace-registry` Module은 canonical external app data의 `state/workspace-registry.json`을 exact v1 envelope로 읽고 compare-before-replace한다. Canonical root command의 read-only `prepared-workspace-launch` resolver는 explicit prepared root를 registry보다 우선하고, 인자가 없으면 active pointer를 fresh reopen한다. Canonical·exact Git root·strict v4 identity가 아니거나 active pointer가 없으면 fail closed한다. `prepared-workspace-startup` coordinator는 fresh validation → shared listener → Broker generation → exact-root Runtime·native config → authenticated target thread → required MCP roster → fresh context → registry transaction → active projection 순서를 고정한다. Lifecycle reader는 readiness 동안 path-free `starting`, transaction acceptance 뒤 `active`, startup readiness failure·active Runtime terminal·Adapter loss 뒤 `runtime_unavailable` recovery를 투영한다. Canonical host는 recovery 동안 HTTP listener를 유지해 Browser가 이 상태를 읽게 하고, App shutdown에서만 listener를 닫는다. Missing/moved/reused registry root는 Runtime spawn 전에 `workspace_unavailable`이며 malformed/future registry는 original bytes를 보존한 `registry_incompatible`다. Registry CAS는 verified `workspaceId`를 replace 직전까지 다시 확인하고 durable replace 안의 synchronous acceptance에서 lifecycle reader를 active로 바꾼다. Runtime terminal이 acceptance보다 먼저 오면 같은 writer lease에서 prior pointer를 복원하고 active를 공개하지 않는다. Explicit relaunch failure 뒤 no-argument reopen은 previous root를 fresh Runtime·thread·Broker credential로 다시 열며 cross-generation identity를 재사용하지 않는다.

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

## Legacy development workspace input

아래 materializer와 dogfood profile helper는 final scoped cleanup 전 rollback evidence로만 남아 있으며 canonical `npm run dev`가 호출하지 않는다. 대표 First Assignment seed와 managed development workspace는 default selection authority가 아니다.

```bash
npm run materialize:dev-workspace
```

Materializer가 발급한 ownership marker가 있는 exact leaf만 재생성할 수 있다. Unmarked directory, broad parent, symlink와 caller-owned workspace는 reset·cleanup하지 않는다. `CODEX_CHAT_WORKSPACE`가 명시되면 manual-development materializer의 workspace selection을 caller-owned absolute directory로 override할 뿐 seed copy·reset·cleanup을 하지 않는다. 이 env는 Runtime artifact, controlled directory, native `cwd` owner 또는 장기 product identity를 대신하지 않는다.

Old `SemesterWorkspaceController.nativeCwd()`는 donor regression에서 active internal-`ready` directory의 canonical root만 반환한다. 이 controller와 chooser state는 canonical startup이나 Browser snapshot에 사용되지 않는다.

## Legacy rollback source: workspace-local durable store

Workspace의 app-owned `formatVersion: 2` store는 cutover 전 durable compatibility baseline이었다. Canonical prepared-workspace graph는 이 store를 읽거나 쓰지 않으며, 아래 내용은 rollback·donor regression source의 보존 계약이다.

Old v2 aggregate는 stable workspace ID와 한 Course identity도 소유한다. Historical [ADR 0014](../../docs/adr/0014-create-app-owned-normalized-semester-workspaces.md)의 v3 codec·admission은 consumer가 없으며 v2 bytes를 자동 scaffold·adopt·reset하지 않는다.

ADR 0018의 root v4 codec과 external `WorkspaceRegistry`는 current-v2 product store를 자동 변환하거나 함께 쓰지 않는다. Prepared-root launch resolver, candidate-free Browser lifecycle contract와 required-readiness startup coordinator가 current public workspace authority다. No-argument authoritative reopen은 registry를 읽기 전에 dead `pending` writer를 reconcile하여 acceptance 전 first-open target을 제거하거나 switch 이전 pointer를 복원한다. 아래 v2 aggregate는 rollback·contraction용 old implementation source일 뿐 public router가 mount하지 않는다.

| 영역 | Old donor behavior |
| --- | --- |
| Product aggregate | Stable workspace ID, confirmed revision, one `Course`, `RawMaterial`, Assignment, `StatePatch`, `UserConfirmation`, `ModelingRun`, execution guard와 nullable source-recovery marker를 한 authority로 보존한다. |
| Read | Server가 JSON parse와 physical no-follow/read-only I/O를 소유하고 package의 `decodeCurrentSemesterWorkspaceV2`로 current v2를 검증한다. Decoded value는 narrow clone adapter로 current `PersistedWorkspaceState`에 옮기며 original serialized bytes를 authority로 열고 startup에서 rewrite하지 않는다. |
| Write | Internal `semester-workspace-store` module이 codec·physical I/O·temporary rename·exact opened-byte comparison을 소유한다. Controller는 serialized transaction ordering과 in-memory authority 교체를 소유한다. |
| Incompatible | v1, decoder-invalid pre-baseline·malformed current v2, future version, symlink·non-regular·unreadable store는 historical recognizer·migration·reset 없이 original bytes를 보존한 `incompatible/readOnly`로 연다. Decoder-valid v2의 whitespace·key order 같은 serialization 차이는 original bytes 그대로 지원한다. |
| Future schema | Physical shape를 바꾸려면 explicit version bump와 migration을 제공하거나 bytes-preserving fail-closed rejection을 사용한다. Silent reset과 same-version shape drift는 허용하지 않는다. |
| Restart | Express `ServerApplication`을 같은 `appDataRoot`·workspace로 stop/start하면 confirmed Assignment·revision·settled history를 다시 연다. Transient transcript와 unanswered Review는 복원하지 않는다. |

App version rollback이나 public-surface cutover는 workspace-local confirmed state·history를 삭제하지 않는다. Older code가 newer format을 이해하지 못하면 bytes를 유지한 read-only로 멈춰야 한다. Generic migration framework, backup·restore journal은 current support surface가 아니다.

## Legacy rollback source: material·guard·recovery

Old academic graph에서 eligible regular UTF-8 `.txt`는 bounded scan을 통해 opaque material ID, relative display path, SHA-256 digest, media type과 size로 등록된다. 이 material path는 canonical Router에 mount되지 않는다.

Assignment action은 selected source를 appDataRoot staging에 byte-preserving snapshot하고 workspace-local scratch와 source/revision guard를 준비한다. Registered source drift는 matching native Turn을 interrupt하고 `source_conflict`로 멈춘다. Explicit material refresh만 current TXT를 stable-ID 새 baseline으로 채택한다. Store drift는 external bytes를 덮어쓰지 않고 `store_conflict`로 멈추며 matching operation release 후 same-root explicit reactivation이 authority를 다시 연다. Stale guard·scratch cleanup은 next open 전 bounded reconciliation을 거친다.

## Product operation·Review authority

Canonical `PreparedProductOperationCoordinator`는 normal AY Chat의 process-global operation lease를 소유한다. Shared `product-turn-coordinator`는 `product_turn` eligibility 확인과 lease claim을 같은 synchronous critical section에서 수행하고, busy loser를 `409`로 끝낸다. Lease는 start failure, authoritative native terminal 또는 completed Runtime close authority로만 once-only release된다.

Old Assignment의 `ModelingRun`, managed `SkillInput`, source/revision guard와 private MCP는 donor regression source에만 남는다. Canonical normal Chat은 bounded `TextInput`, `workspace_write`, generic child environment와 project-discovered Skill·MCP를 사용한다.

Old private patch/revision Review와 Server-owned academic apply는 donor regression source에만 남는다. Canonical Semantic Review는 Interaction Broker의 transient request/result이고, 일반 Plan clarification은 별도 ephemeral binding으로 같은 Turn에 answer/cancel한다.

`interaction-broker` Module은 `@ay-ple/interaction-mcp`의 strict private wire를 소비한다. Runtime generation마다 fresh token·binding과 pending slot 하나를 만들고, loopback·constant-time credential과 started `product_turn` binding을 모두 확인한 뒤 exact workspace root의 evidence를 한 byte snapshot으로 atomic preflight한다. In-memory UI Adapter가 `review.requested`를 받은 뒤 한 `accept | revise | reject`만 held response로 돌려주며 duplicate·late answer, HTTP abort, UI disconnect, Turn interrupt, Runtime terminal·replacement, Adapter loss와 shutdown은 normal result 없이 닫힌다.

Canonical `createPreparedServerApplication()`은 Broker Router를 같은 loopback listener의 `/api/_private/interaction-mcp`에 mount하고 normal Product Turn NDJSON에 semantic `review.requested | review.resolved | review.failed`를 기록한다. Browser의 exact semantic result는 bodyless `204`로 held call을 해제하고, resolved frame만 transcript settlement authority가 된다. Runtime thread는 project config에서 Adapter를 발견하므로 thread-start private MCP override나 managed `SkillInput`을 받지 않는다. AY 역할의 file apply는 workspace Skill·Interaction 결과 뒤 Runtime graph에서 수행하며 Server가 academic patch·revision을 적용하지 않는다. `createServerApplication()`과 old coordinator/store는 rollback·후속 contraction source로 남지만 canonical entrypoint와 public Router에는 mount되지 않는다.

`CodexChatService`는 account lifecycle이나 Runtime role이 없는 `CodexWorkspaceRuntime`을 받아 Account Readiness, model catalog, product thread·active Turn, interaction·interrupt, native context, terminal observation, Runtime recycle와 bounded close를 캡슐화하는 deep product lifecycle Module다. Public tracer route가 사라져도 이 lifecycle owner와 Runtime의 internal text regression은 이름만으로 분해·제거하지 않는다.

## Public product API

| Endpoint | 동작 |
| --- | --- |
| `GET /api/product/bootstrap` | Path-free `starting | active | recovery_required` prepared-workspace lifecycle와 coarse operation status |
| `GET /api/product/codex-settings` | Visible native model catalog, advertised reasoning effort order와 Fast availability |
| `POST /api/product/chat/messages` | Prepared root의 normal AY Chat stream. Project-discovered Skill·MCP와 `workspace_write`를 사용하며 academic source·Run을 만들지 않음 |
| `POST /api/product/operations/:operationId/interactions/:interactionId/answer` | General Plan interaction answer |
| `POST /api/product/operations/:operationId/interactions/:interactionId/cancel` | General Plan interaction cancel |
| `POST /api/product/reviews/:interactionId` | Exact active Semantic Review의 `accept | revise | reject`를 bodyless `204`로 전달 |
| `POST /api/product/operations/:operationId/interrupt` | Matching active Turn interrupt acknowledgement |

Mutation은 raw socket이 loopback이고 Origin이 없거나 configured local Origin과 exact match할 때만 허용한다. MCP host는 loopback과 per-process high-entropy token을 모두 검증한다. Token, native identity, absolute path, complete MCP payload와 traceback은 Browser contract에 없다. Old `/api/product/workspaces/activate`, Course/material/First Assignment/retry, academic Review compatibility route, `/api/product-mcp`, `/api/runtime/*`와 `/api/codex-chat/*`는 canonical composition에서 Express `404`로 닫힌다.

Public cutover 전 rollback unit은 current-v2 Browser·Server router·store·private Runtime/MCP graph 전체였다. Cutover 뒤에는 prepared-workspace Browser·target Router·Broker·generic Runtime child environment·project Skill/MCP graph 전체가 한 unit이며 양쪽을 섞는 half-state는 지원하지 않는다. Old academic source와 v2 persistence, old Browser workbench·Review alias의 물리 제거는 후속 contraction 범위다.

## NDJSON과 shutdown

Neutral Server-private NDJSON writer는 product stream의 backpressure·disconnect와 bounded drain을 소유한다. `CodexChatService`는 Runtime terminal을 한 번 관찰하고 accepted operation의 interrupt·terminal·unknown settlement를 관리한다. Canonical prepared host는 Runtime·Adapter continuity loss 때 Broker intake와 Runtime을 정산하되 listener를 recovery bootstrap용으로 유지한다. App shutdown은 새 work를 막고 Broker → Runtime → listener를 bounded하게 닫으며 Python·native process group과 pipe가 사라진 뒤에만 완료한다. Old `createServerApplication()` shutdown은 donor regression에서 같은 full-reap invariant를 유지한다.

`npm run test:product-entrypoint`는 root canonical command가 explicit `appDataRoot`와 workspace selection만으로 product API·Browser를 열고 legacy path를 무시하며 SIGINT 뒤 OS process graph와 port를 bounded하게 정리하는지 검증한다. `npm run test:product-shutdown-actual -w @ay-ple/server`는 product-capable Runtime process tree에서 listener refusal, close ordering과 child-of-child reap을 별도로 증명한다.

Existing Playwright harness의 same-root durability trace는 실제 Express `ServerApplication`과 Runtime generation을 닫고 같은 `appDataRoot`·workspace·API port로 다시 만든 뒤 Browser를 reload한다. 이 trace가 confirmed Assignment·revision·settled history를 다시 열고 transient transcript·unanswered Review를 복원하지 않음을 검증하며 별도 store·Runtime workflow를 만들지 않는다.

## Exact·live conformance

아래에서 `test:prepared-workspace-product-actual`만 canonical prepared public graph를 검증한다. `test:first-assignment-product-actual`과 `trace:first-assignment-live`는 old academic rollback source의 donor conformance이며 current product evidence가 아니다.

```bash
npm run test:first-assignment-product-actual -w @ay-ple/server
npm run test:prepared-workspace-product-actual
npm run trace:first-assignment-live -w @ay-ple/server -- --codex-home /absolute/path/to/isolated-auth-seed
```

Old academic donor product actual은 verified production Runtime·exact local Responses provider·managed Recipe·real Server HTTP·private MCP host를 통과한다. Active internal-ready fixture directory의 exact `cwd`, selected source, representative Python/command, `auto_review + workspace_write`, proposal→Plan→Review revision→replacement→accept→same-Turn terminal, durable outcome과 process-group disappearance를 rollback source에 대해서만 검증한다.

Prepared-workspace product actual은 native Bootstrap Skill의 exact CLI를 fresh temporary Git root에서 실행한 뒤, 그 root의 tracked v4 identity·`AGENTS.md`·project MCP declaration과 installed First Assignment Skill을 사용한다. 설치된 Skill에서 proposal-before-mutation, accept-only apply, revise·reject no-mutation과 intended-path checkpoint 계약을 읽고, 같은 exact root를 repository-owned shared listener·Interaction Broker와 built STDIO Adapter에 직접 공급해 handshake·exact tool roster, evidence-bound inline Review, revise→fresh card, accept 전 bytes·index 불변, accept 뒤 AY 역할의 explicit-path checkpoint와 unrelated dirty·untracked 보존을 한 trace로 검증한다. Reject, digest·quote·path·symlink evidence failure, busy, Turn interrupt, Browser disconnect와 Runtime·Adapter loss는 normal result·file mutation·Git checkpoint 없이 정산한다. 반복 teardown은 credential 재사용 거절, Adapter stderr·pending response 0, child exit와 listener process-tree close를 확인하며 production startup resolver·registry와 public composition은 이 command가 바꾸지 않는다.

Old academic donor live gate는 caller가 명시한 owner-only auth seed만 fresh `CODEX_HOME`으로 복사하고 disjoint `HOME`·SQLite·temp·appDataRoot·workspace를 사용한다. Credential content·token·digest를 출력하지 않는다. Prerequisite 부재는 `blocked`, donor mismatch는 `failed`로 구분한다. Isolated evidence는 complete Assignment action·Review·confirmed outcome과 clean shutdown을 통과했지만 canonical prepared product의 cutover gate가 아니다.

일반 package 검증은 다음 명령으로 실행한다.

```bash
npm run test -w @ay-ple/server
npm run typecheck -w @ay-ple/server
npm run build -w @ay-ple/server
npm run verify:package-root -w @ay-ple/server
```

`verify:package-root`는 먼저 Server를 build한 뒤 `NODE_OPTIONS`를 제거한 plain Node child에서 default-condition `@ay-ple/server`를 import한다. Runtime export가 `ServerStartupCleanupError`, `bindServerApplicationListener()`, `createServerApplication()`, `listenToServerApplication()` 네 개뿐인지, application factory가 listener-independent인지와 close 뒤 child process가 종료되는지를 검증한다.
