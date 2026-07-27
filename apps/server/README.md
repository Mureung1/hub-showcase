# @ay-ple/server

Explicit workspace authority와 official SDK 기반 Codex Runtime을 하나의 product lifecycle로 조합하는 Express local companion server다. `createServerApplication()`은 listener-independent application factory이며 product HTTP, 선택한 workspace graph와 bounded Runtime shutdown을 소유한다. Listener bind와 process signal은 별도 host adapter가 소유하되, bind-first host는 Server-owned two-phase listener capability로 기존 cleanup authority에 합류한다.

`/api/product/*`의 public JSON request·response와 NDJSON frame은 dependency-free [`@ay-ple/product-contract`](../../packages/product-contract/README.md)가 소유한다. Server는 shared decoder로 mutation body를 admission하고 domain object를 public projection으로 변환한다. Express route, status·Origin guard, neutral NDJSON line writer, workspace store와 private Runtime/MCP binding은 Server에 남는다.

Canonical product 구현의 `SemesterWorkspaceController`는 chooser·development materializer가 넘긴 directory를 current v2 store로 열고 internal `ready`를 판정한다. 제거된 public-preview Account→Setup→Ready composition, managed Browser OAuth route와 v3 setup adapter는 Server의 실행·export·test graph에 남지 않는다. [`@ay-ple/semester-workspace`](../../packages/semester-workspace/README.md)의 v3 kernel은 현재 Server consumer가 없는 package-private 기반이며 current product authority가 아니다.

User-owned Git target의 internal `workspace-registry` Module은 canonical external app data의 `state/workspace-registry.json`을 exact v1 envelope로 읽고 compare-before-replace한다. Canonical root command의 read-only `prepared-workspace-launch` resolver는 explicit prepared root를 registry보다 우선하고, 인자가 없으면 active pointer를 fresh reopen한다. Canonical·exact Git root·strict v4 identity가 아니거나 active pointer가 없으면 Server·Browser process를 시작하기 전에 fail closed한다. Registry commit과 target `SemesterWorkspaceController` composition은 아직 연결되지 않았다.

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

`WorkspaceRegistry` store는 최대 `64`개 canonical realpath root와 active pointer만 보존한다. `256 KiB` strict codec, synced temporary file, opened-byte compare, no-clobber initial publish, atomic replacement rename와 directory sync를 사용하며 실제 process death 뒤 owned writer residue만 정리한다. Malformed·future registry는 original bytes를 보존하고 missing file만 empty v1 시작점으로 취급한다. Active reopen과 explicit reselect는 root `workspace-state.json` v4 identity를 fresh read하며 registry root와 `workspaceId`가 일치할 때만 available로 반환한다.

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

`SemesterWorkspaceController.nativeCwd()`는 current active internal-`ready` directory의 canonical root만 반환한다. Ready snapshot에 recovery marker가 있으면 같은 `cwd` authority는 유지하되 product mutation admission이 복구 전까지 새 work를 닫는다. `incompatible/readOnly`, cancel·invalid selection은 Runtime start 전에 fail closed한다. Browser snapshot에 absolute root를 노출하지 않는다.

## Workspace-local durable store

Workspace의 app-owned store는 current canonical `formatVersion: 2` 하나를 지원한다. [ADR 0013](../../docs/adr/0013-adopt-product-only-public-surface-and-v2-store-compatibility-baseline.md)이 이 format을 첫 durable compatibility baseline으로 채택한다.

Current v2 aggregate는 stable workspace ID와 한 Course identity도 소유한다. 새 `WorkspaceManifest`를 곁에 추가해 같은 identity를 두 곳에서 authoritative하게 만들 수 없다. Historical [ADR 0014](../../docs/adr/0014-create-app-owned-normalized-semester-workspaces.md)의 당시 target은 같은 physical seam을 explicit v3 single aggregate로 전환해 logical `WorkspaceManifest`만 identity를 소유하게 했다. V3 codec·admission은 workspace package에 구현됐지만 current Server controller·product API는 아직 이를 사용하지 않으며 current v2 bytes를 자동 scaffold·adopt·reset하지 않는다.

ADR 0018 target의 root v4 codec과 external `WorkspaceRegistry`도 current-v2 product store를 자동 변환하거나 함께 쓰지 않는다. Prepared-root launch resolver와 candidate-free Browser lifecycle contract는 current graph 옆의 target seam이며, required Runtime readiness와 registry commit이 연결되기 전에는 current public workspace authority가 계속 아래 v2 aggregate다.

| 영역 | Current behavior |
| --- | --- |
| Product aggregate | Stable workspace ID, confirmed revision, one `Course`, `RawMaterial`, Assignment, `StatePatch`, `UserConfirmation`, `ModelingRun`, execution guard와 nullable source-recovery marker를 한 authority로 보존한다. |
| Read | Server가 JSON parse와 physical no-follow/read-only I/O를 소유하고 package의 `decodeCurrentSemesterWorkspaceV2`로 current v2를 검증한다. Decoded value는 narrow clone adapter로 current `PersistedWorkspaceState`에 옮기며 original serialized bytes를 authority로 열고 startup에서 rewrite하지 않는다. |
| Write | Internal `semester-workspace-store` module이 codec·physical I/O·temporary rename·exact opened-byte comparison을 소유한다. Controller는 serialized transaction ordering과 in-memory authority 교체를 소유한다. |
| Incompatible | v1, decoder-invalid pre-baseline·malformed current v2, future version, symlink·non-regular·unreadable store는 historical recognizer·migration·reset 없이 original bytes를 보존한 `incompatible/readOnly`로 연다. Decoder-valid v2의 whitespace·key order 같은 serialization 차이는 original bytes 그대로 지원한다. |
| Future schema | Physical shape를 바꾸려면 explicit version bump와 migration을 제공하거나 bytes-preserving fail-closed rejection을 사용한다. Silent reset과 same-version shape drift는 허용하지 않는다. |
| Restart | Express `ServerApplication`을 같은 `appDataRoot`·workspace로 stop/start하면 confirmed Assignment·revision·settled history를 다시 연다. Transient transcript와 unanswered Review는 복원하지 않는다. |

App version rollback이나 public-surface cutover는 workspace-local confirmed state·history를 삭제하지 않는다. Older code가 newer format을 이해하지 못하면 bytes를 유지한 read-only로 멈춰야 한다. Generic migration framework, backup·restore journal은 current support surface가 아니다.

## Material·guard·recovery

Eligible regular UTF-8 `.txt`는 bounded scan을 통해 opaque material ID, relative display path, SHA-256 digest, media type과 size로 등록된다. Preview는 ID·digest·live file을 재검증하고 original TXT를 이동·rename·rewrite하지 않는다.

Assignment action은 selected source를 appDataRoot staging에 byte-preserving snapshot하고 workspace-local scratch와 source/revision guard를 준비한다. Registered source drift는 matching native Turn을 interrupt하고 `source_conflict`로 멈춘다. Explicit material refresh만 current TXT를 stable-ID 새 baseline으로 채택한다. Store drift는 external bytes를 덮어쓰지 않고 `store_conflict`로 멈추며 matching operation release 후 same-root explicit reactivation이 authority를 다시 연다. Stale guard·scratch cleanup은 next open 전 bounded reconciliation을 거친다.

## Product operation·Review authority

`ProductOperationCoordinator`는 Assignment action과 free-form product Chat이 process-global active operation lease 하나를 공유하게 한다. 내부 `product-turn-coordinator`는 normal `product_turn` eligibility 확인과 lease claim을 같은 synchronous critical section에서 수행한다. Busy loser는 existing operation을 preempt하지 않고 `409`로 끝난다. Product-turn lease는 start failure, authoritative native terminal 또는 completed Runtime close authority로만 once-only release되며 disconnect·interrupt·shutdown 시작 자체는 release authority가 아니다. Prepared-workspace startup은 이 operation lease를 사용하지 않는다.

Assignment은 native call 전 durable `ModelingRun(starting)`을 기록하고 exact managed `SkillInput`·bounded `TextInput`, active workspace `cwd`와 private MCP를 Runtime에 전달한다. Source를 선택하지 않은 일반 Chat은 Course 생성 전에도 workspace `cwd`에서 `deny_all + read_only`로 시작하며 academic state를 보호할 durable guard를 만들지 않는다. Course가 있는 Chat은 source/revision guard를 사용하고 optional source selection으로 proposal context를 만들 수 있지만 `ModelingRun`을 만들지 않는다.

Private `propose_state_patch` MCP는 selected source·base revision·exact quote를 검증한 pending `StatePatch`만 만든다. Exact Plan question이 active patch와 bind될 때만 product Review가 된다. Accept/reject는 product transaction을 native answer보다 먼저 commit하고, revise는 `UserConfirmation` 없이 bounded feedback·fresh private request key로 replacement를 기다린다. General Plan clarification은 별도 ephemeral binding으로 answer/cancel하며 academic state를 바꾸지 않는다.

Target expand의 internal `interaction-broker` Module은 `@ay-ple/interaction-mcp`의 strict private wire를 소비한다. Runtime generation마다 fresh token·binding과 pending slot 하나를 만들고, loopback·constant-time credential·`ProductOperationCoordinator`의 started `product_turn`을 모두 확인한 뒤 exact workspace root의 evidence를 한 byte snapshot으로 atomic preflight한다. In-memory UI Adapter가 `review.requested`를 받은 뒤 한 `accept | revise | reject`만 held response로 돌려주며 duplicate·late answer, HTTP abort, UI disconnect, Turn interrupt, Runtime terminal·replacement, Adapter loss와 shutdown은 normal result 없이 닫힌다.

`createServerApplication()`의 opt-in `internalInteractionTarget` composition은 이 Router를 같은 loopback listener의 `/api/_private/interaction-mcp`에 mount하고, current Product Turn NDJSON sink에 semantic `review.requested | review.resolved | review.failed`를 기록한다. Browser의 exact semantic result는 기존 Review URL에서 bodyless `204`로 held call을 해제하고, resolved frame만 transcript settlement authority가 된다. 이 option을 생략하는 production/current public First Assignment 구성은 old private MCP·academic Review/apply wire를 그대로 사용한다. Canonical Runtime child environment와 public First Assignment의 atomic cutover는 별도 후속 작업이다.

`CodexChatService`는 account lifecycle이나 Runtime role이 없는 `CodexWorkspaceRuntime`을 받아 Account Readiness, model catalog, product thread·active Turn, interaction·interrupt, native context, terminal observation, Runtime recycle와 bounded close를 캡슐화하는 deep product lifecycle Module다. Public tracer route가 사라져도 이 lifecycle owner와 Runtime의 internal text regression은 이름만으로 분해·제거하지 않는다.

## Public product API

| Endpoint | 동작 |
| --- | --- |
| `GET /api/product/bootstrap` | Account Readiness, coarse operation status, active workspace·Course·material, confirmed revision·settled history |
| `GET /api/product/codex-settings` | Visible native model catalog, advertised reasoning effort order와 Fast availability |
| `POST /api/product/workspaces/activate` | Current Server-owned chooser directory activation, current-store adoption과 read-only incompatible boundary. `WorkspaceManifest` scaffold endpoint가 아님 |
| `POST /api/product/courses` | Empty internal-ready current workspace의 first-vertical Course 생성 |
| `POST /api/product/materials/refresh` | Normal refresh 또는 explicit source rebaseline |
| `GET /api/product/materials/:materialId/preview?digest=...` | Digest-bound bounded TXT preview |
| `POST /api/product/actions/first-assignment` | Durable Run·guard·curated Assignment stream |
| `POST /api/product/actions/first-assignment/retry` | Prior canonical input·ancestry의 one-child explicit retry |
| `POST /api/product/chat/messages` | Optional selection을 갖는 no-Run product Chat stream |
| `POST /api/product/operations/:operationId/interactions/:interactionId/answer` | General Plan interaction answer |
| `POST /api/product/operations/:operationId/interactions/:interactionId/cancel` | General Plan interaction cancel |
| `POST /api/product/reviews/:interactionId` | Current exact active academic Review의 accept·revise·reject. Internal Interaction target composition에서는 semantic result를 bodyless `204`로 반환 |
| `POST /api/product/operations/:operationId/interrupt` | Matching active Turn interrupt acknowledgement |

Mutation은 raw socket이 loopback이고 Origin이 없거나 configured local Origin과 exact match할 때만 허용한다. MCP host는 loopback과 per-process high-entropy token을 모두 검증한다. Token, native identity, absolute source·scratch path, complete MCP payload, traceback과 persistence metadata는 Browser contract에 없다. 제거한 `/api/product/public-preview`, `/api/health`, `/api/runtime/*`와 `/api/codex-chat/*`는 compatibility alias가 아니며 Express `404`로 닫힌다.

## NDJSON과 shutdown

Neutral Server-private NDJSON writer는 product stream의 backpressure·disconnect와 bounded drain을 소유한다. `CodexChatService`는 Runtime terminal을 한 번 관찰하고 accepted operation의 interrupt·terminal·unknown settlement를 관리한다. `createServerApplication().close()`는 새 work·listener restart를 막고 listener close를 시작한 뒤 active operation을 drain하고 Runtime close를 single-flight promise로 수렴한다. Python·native process group과 pipe가 사라진 뒤에만 close를 완료한다. Listener bind 또는 address 확인 뒤 cleanup이 실패하면 root-exported `ServerStartupCleanupError`가 Runtime을 노출하지 않는 high-level retry closure를 보존한다.

`npm run test:product-entrypoint`는 root canonical command가 explicit `appDataRoot`와 workspace selection만으로 product API·Browser를 열고 legacy path를 무시하며 SIGINT 뒤 OS process graph와 port를 bounded하게 정리하는지 검증한다. `npm run test:product-shutdown-actual -w @ay-ple/server`는 product-capable Runtime process tree에서 listener refusal, close ordering과 child-of-child reap을 별도로 증명한다.

Existing Playwright harness의 same-root durability trace는 실제 Express `ServerApplication`과 Runtime generation을 닫고 같은 `appDataRoot`·workspace·API port로 다시 만든 뒤 Browser를 reload한다. 이 trace가 confirmed Assignment·revision·settled history를 다시 열고 transient transcript·unanswered Review를 복원하지 않음을 검증하며 별도 store·Runtime workflow를 만들지 않는다.

## Exact·live conformance

```bash
npm run test:first-assignment-product-actual -w @ay-ple/server
npm run trace:first-assignment-live -w @ay-ple/server -- --codex-home /absolute/path/to/isolated-auth-seed
```

Product actual은 verified production Runtime·exact local Responses provider·managed Recipe·real Server HTTP·private MCP host를 통과한다. Active internal-ready fixture directory의 exact `cwd`, selected source, representative Python/command, `auto_review + workspace_write`, proposal→Plan→Review revision→replacement→accept→same-Turn terminal, durable outcome과 process-group disappearance를 검증한다.

Live gate는 caller가 명시한 owner-only auth seed만 fresh `CODEX_HOME`으로 복사하고 disjoint `HOME`·SQLite·temp·appDataRoot·workspace를 사용한다. Credential content·token·digest를 출력하지 않는다. Prerequisite 부재는 `blocked`, product mismatch는 `failed`로 구분한다. Isolated live evidence는 complete Assignment action·Review·confirmed outcome과 clean shutdown을 통과했지만 external credential은 mandatory product cutover gate가 아니다.

일반 package 검증은 다음 명령으로 실행한다.

```bash
npm run test -w @ay-ple/server
npm run typecheck -w @ay-ple/server
npm run build -w @ay-ple/server
npm run verify:package-root -w @ay-ple/server
```

`verify:package-root`는 먼저 Server를 build한 뒤 `NODE_OPTIONS`를 제거한 plain Node child에서 default-condition `@ay-ple/server`를 import한다. Runtime export가 `ServerStartupCleanupError`, `bindServerApplicationListener()`, `createServerApplication()`, `listenToServerApplication()` 네 개뿐인지, application factory가 listener-independent인지와 close 뒤 child process가 종료되는지를 검증한다.
