# @ay-ple/server

Explicit workspace authority와 official SDK 기반 Codex Runtime을 하나의 product lifecycle로 조합하는 Express local companion server다. `createServerApplication()`은 listener-independent application factory이며 product HTTP, 선택한 workspace graph와 bounded Runtime shutdown을 소유한다. Listener bind와 process signal은 별도 host adapter가 소유한다.

`/api/product/*`의 public JSON request·response와 NDJSON frame은 dependency-free [`@ay-ple/product-contract`](../../packages/product-contract/README.md)가 소유한다. Server는 shared decoder로 mutation body를 admission하고 domain object를 public projection으로 변환한다. Express route, status·Origin guard, neutral NDJSON line writer, workspace store와 private Runtime/MCP binding은 Server에 남는다.

`src/account-runtime/contract.ts`, `coordinator.ts`, `route-adapter.ts`는 Spine S1의 private `AccountRuntimeTransitionLease`, app-wide serialized account/Runtime transition과 mount-independent Account command adapter를 구현한다. Auth-only Runtime의 complete close 뒤 workspace Runtime을 시작하고 fresh account를 읽으며, transition 중 fresh `signed_out`는 `workspace_account_reauth_required`로 보존한다. Account route가 성공한 fresh non-ChatGPT 상태를 관찰하면 injected B-owned Ready attestation을 무효화하지만 unavailable/error/abort는 인증 증거로 취급하지 않는다. `createServerApplication({ publicPreview })`가 이 owner를 v3 setup graph와 직렬 조합한다.

기존 canonical development product 구현의 `SemesterWorkspaceController`는 chooser·development materializer가 넘긴 directory를 current v2 store로 열고 internal `ready`를 판정한다. 이와 별도로 exact workspace dependency인 [`@ay-ple/semester-workspace`](../../packages/semester-workspace/README.md)는 v3 admission, durable setup envelope·`SetupJourney`와 lease-bound Ready relaunch를 구현한다. Public-preview Server graph는 이 v3 owner와 native project boundary, lease-bound Ready transition/attestation, setup-envelope action readiness, Browser-safe Ready presentation을 조합한다. 아직 public host/startup이 이 graph를 선택하지 않으므로 기존 dogfood의 current `ready workspace`는 [domain glossary](../../CONTEXT.md)의 `Semester Ready`와 같지 않다.

## Public-preview application graph

`@ay-ple/server` package root는 side-effect-free `createServerApplication()`, listener lifecycle 순서를 캡슐화한 `listenToServerApplication()`과 startup 실패 뒤 retryable cleanup authority를 보존하는 `ServerStartupCleanupError`를 공개한다. Host는 내부 listener claim이나 Runtime ownership을 재구성하지 않고 이 error의 `close({ signal })`로 후속 cleanup을 요청할 수 있다. Concurrent close는 같은 attempt를 공유하고 proven complete cleanup만 terminal result로 latch한다. Reject·ambiguous attempt는 shutdown과 intake 차단을 유지한 채 다음 caller signal로 다시 시도할 수 있다. `publicPreview`와 legacy `codexChat`·`productRuntime`·`semesterWorkspace` bootstrap은 한 application에서 함께 사용할 수 없다. 따라서 하나의 application graph에 두 Runtime owner나 두 workspace authority가 생기지 않는다.

Public-preview graph는 다음 순서를 소유한다.

1. App package version, exact `npx ay-ple@<version>` command, Runtime release identity와 workspace bundle hash를 하나의 launch binding으로 교차 검증한다.
2. Host가 제공한 high-level spawn capability를 매 Runtime generation 직전에 검증하고 그 결과의 release descriptor SHA-256, manifest SHA-256, release ID, target과 Runtime contract version이 같은 binding과 모두 일치할 때만 native Runtime을 만든다.
3. Auth-only Runtime에서 managed Browser OAuth를 수행한다.
4. Native picker의 transient opaque parent selection을 prepare마다 authoritative하게 다시 확인하고, Host가 제공한 `PublicPreviewWorkspaceTargetGuard`에 `canonicalParent + leafName`만 전달한다. Guard가 허용한 target만 B-owned `SetupJourney`가 app-owned v3 workspace로 prepare·approve하며, blocked target은 store·workspace mutation 없이 Browser-safe `setup_invalid_input`으로 닫힌다.
5. A-owned lease 안에서 auth-only close → workspace Runtime start → fresh account → native context → Ready commit/readback을 완료한다.
6. Reconnect 뒤에는 durable Ready만으로 성공을 합성하지 않고 explicit `setup.resume`이 새 attestation을 만든 뒤에만 `Semester Ready`를 공개한다.

`GET|POST /api/product/public-preview`는 S1 exact Browser contract만 반환한다. Absolute path, Runtime identity, token, native ID, setup/release private binding과 nested error는 노출하지 않는다. Public-preview graph는 현재 `Semester Ready`에서 끝난다. `admitAcademicAction()`은 후속 action integration을 위한 B-owned admission probe일 뿐 route나 native action을 실행하지 않으며, legacy Course·material·Assignment·Chat·Review route와 private MCP host는 이 graph에 mount되지 않는다.

## Canonical 시작과 root 소유권

Repository root에서 다음 명령을 사용한다.

```bash
npm run dev -- --app-data-root /absolute/path/to/ay-ple-app-data
```

Canonical product composition은 다음 세 root를 명시적으로 분리한다.

| Root | Current owner와 계산 |
| --- | --- |
| `packageRoot` | Repository-owned product code와 `packages/codex-chat-runtime/.artifacts/production-runtime-darwin-arm64` verified artifact를 찾는 source root다. 사용자 상태를 쓰지 않는다. |
| `appDataRoot` | Caller가 `--app-data-root` 또는 explicit `AY_PLE_APP_DATA_ROOT`로 제공한 absolute non-symlink directory다. Composition이 `runtime/home`, `runtime/codex-home`, `runtime/codex-sqlite-home`, `runtime/temp`를 isolated `HOME`, `CODEX_HOME`, `CODEX_SQLITE_HOME`, temporary state로 계산·준비한다. |
| `workspaceRoot` | Current materializer 또는 Server-owned chooser가 선택한 internal-ready directory다. Product native thread의 exact `cwd`이며 current v2 confirmed product state와 user-owned TXT를 보존한다. Public target에서는 app-created `SemesterWorkspace`와 `WorkspaceManifest` validation이 이 input을 대체한다. |

Root는 서로 다르고 ancestor·descendant 관계가 없어야 한다. Ambient `HOME`, repository `.ay-ple`, legacy 여섯 `CODEX_CHAT_*` path, common parent와 `process.cwd()`를 fallback으로 사용하지 않는다. Fresh clone은 Runtime bundle이 tracked되지 않으므로 먼저 [runtime package README](../../packages/codex-chat-runtime/README.md#standalone-production-bundle)에 따라 materialize한다.

Canonical root command는 ambient `PORT`를 무시하고 Server `PORT`를 `3000`으로 고정해 Chat Shell Vite proxy target과 일치시킨다. Direct Server entrypoint는 caller environment를 local `.env`보다 우선하고 `PORT`가 없으면 `3000`, listener address는 `127.0.0.1`을 사용한다. Root command가 exact Chat Shell Origin을 설정한다. `dev:chat-only`와 `/api/codex-chat/*`는 supported entrypoint·route·alias가 아니다.

Build 뒤 Server만 실행하려면 product composition에 필요한 explicit roots와 Origin을 caller가 동일하게 준비한 경우에만 다음 명령을 사용한다.

```bash
npm run build -w @ay-ple/server
npm run start -w @ay-ple/server
```

## Current development workspace input

대표 First Assignment 자료는 Git이 추적하는 seed로만 유지하고 실제 native `cwd`로 사용하지 않는다. Root product command는 seed를 repository 밖의 `<dirname(packageRoot)>/.ay-ple-dev-workspaces/first-assignment-semester-workspace`로 materialize하고 정규 path와 development ownership을 보고한다. 이 fixture materialization은 public app-owned scaffold나 `WorkspaceManifest` admission이 아니다.

```bash
npm run materialize:dev-workspace
```

Materializer가 발급한 ownership marker가 있는 exact leaf만 재생성할 수 있다. Unmarked directory, broad parent, symlink와 caller-owned workspace는 reset·cleanup하지 않는다. `CODEX_CHAT_WORKSPACE`가 명시되면 manual-development materializer의 workspace selection을 caller-owned absolute directory로 override할 뿐 seed copy·reset·cleanup을 하지 않는다. 이 env는 Runtime artifact, controlled directory, native `cwd` owner 또는 장기 product identity를 대신하지 않는다.

`SemesterWorkspaceController.nativeCwd()`는 current active internal-`ready` directory의 canonical root만 반환한다. Ready snapshot에 recovery marker가 있으면 같은 `cwd` authority는 유지하되 product mutation admission이 복구 전까지 새 work를 닫는다. `incompatible/readOnly`, cancel·invalid selection은 Runtime start 전에 fail closed한다. Browser snapshot에 absolute root를 노출하지 않는다. Adopted target에서는 Server-owned admission이 app-created root와 `WorkspaceManifest`를 먼저 검증해야 한다.

## V3 setup과 native project boundary

`src/setup/native-project-boundary.ts`는 admitted v3 `SemesterWorkspace`와 controlled `HOME`·`CODEX_HOME`, Runtime의 `CodexNativeContextPort`를 입력으로 받는 Server-private gate다. Disjoint canonical roots, managed instruction/Skill bundle의 static conflict와 native effective config의 empty project marker·Skill roster를 검증한다. Exact native `cwd`·CLI config spelling과 App Server launch는 Runtime이 단독 소유한다. Server는 `config/read`, `skills/list` 또는 raw App Server JSON-RPC shape를 알지 않으며, Runtime이 projection한 `CodexEffectiveConfig`·`CodexEffectiveSkill`만 strict clone·decode한다.

Boundary는 config·Skill read를 첫 `await` 전에 같은 `AbortSignal`로 함께 요청하고 겹치는 동일 boundary 검증을 coalesce한다. Runtime은 signal별 read pair를 한 one-shot native App Server snapshot으로 묶고 full process-group reap 뒤 결과를 반환하므로 서로 다른 verification generation이 섞이지 않는다. Official `system` Skill은 Runtime에서 shape를 검증한 뒤 effective roster에서 제외한다. 따라서 Codex가 controlled `CODEX_HOME/skills/.system`에 관리하는 system cache는 root conflict가 아니며 보존한다. 반면 `CODEX_HOME/skills`의 legacy user Skill, admin Skill 또는 workspace bundle 밖에서 발견된 repo Skill은 high-level roster에 남아 exact-one managed Skill 조건을 깨므로 boundary가 fail closed한다. Controlled `HOME`·`CODEX_HOME`의 global `AGENTS.md`·`AGENTS.override.md`와 ambient `.agents`는 계속 static conflict다.

`src/setup/lease-bound-ready-transition.ts`는 B-owned `SemesterReadyTransitionPort`를 A1 lease에 결합한다. Authoritative 순서는 auth-only close → workspace Runtime start → fresh ChatGPT account read → native boundary callback → `active_ready` commit/strict readback이다. Process-local attestation은 exact Ready pointer를 복제해 보존하지만 durable authority가 아니며, 모든 app-wide workspace transition 시작과 Account route의 성공한 fresh non-ChatGPT 관찰에서 전부 무효화된다. Reconnect 뒤 ChatGPT 관찰만으로는 attestation을 재생성하지 않고 explicit full setup resume/relaunch transition이 다시 검증해야 한다.

`src/setup/setup-envelope-action-readiness.ts`는 durable `active_ready` pointer, exact release/workspace와 현재-process attestation이 모두 일치할 때만 action readiness를 연다. `workspace-action-admission.ts`는 이 readiness를 action 전후에 다시 읽으면서 v3 aggregate, bundle/static context와 native boundary를 fresh 검증한다. `ready-workspace-presentation.ts`와 `setup-journey-projection.ts`는 semester label, redacted workspace leaf와 safe breadcrumb만 Browser-safe Ready fixture로 옮기고 absolute path, workspace/setup/release identity와 사용자명 파생 copy를 제외한다.

Native boundary 하나의 성공이나 durable `active_ready` bytes만으로는 `Semester Ready`가 아니다. Public-preview application은 v3 admission, setup journey, account/Runtime coordinator와 Browser command router를 직렬 조합하고 process-local attestation까지 확인한다. 기존 development product actions는 별도 current-v2 graph에 남으며 이 v3 action admission을 사용하지 않는다.

## Workspace-local durable store

Workspace의 app-owned store는 current canonical `formatVersion: 2` 하나를 지원한다. [ADR 0013](../../docs/adr/0013-adopt-product-only-public-surface-and-v2-store-compatibility-baseline.md)이 이 format을 첫 durable compatibility baseline으로 채택한다.

Current v2 aggregate는 stable workspace ID와 한 Course identity도 소유한다. 새 `WorkspaceManifest`를 곁에 추가해 같은 identity를 두 곳에서 authoritative하게 만들 수 없다. [ADR 0014](../../docs/adr/0014-create-app-owned-normalized-semester-workspaces.md)의 adopted target은 같은 physical seam을 explicit v3 single aggregate로 전환해 logical `WorkspaceManifest`만 identity를 소유하게 한다. V3 codec·admission은 workspace package에 구현됐지만 current Server controller·product API는 아직 이를 사용하지 않으며 current v2 bytes를 자동 scaffold·adopt·reset하지 않는다.

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

`ProductOperationCoordinator`는 Assignment action과 free-form product Chat이 process-global active operation lease 하나를 공유하게 한다. Assignment은 native call 전 durable `ModelingRun(starting)`을 기록하고 exact managed `SkillInput`·bounded `TextInput`, active workspace `cwd`와 private MCP를 Runtime에 전달한다. Chat은 optional source selection으로 proposal context를 만들 수 있지만 `ModelingRun`을 만들지 않는다.

Private `propose_state_patch` MCP는 selected source·base revision·exact quote를 검증한 pending `StatePatch`만 만든다. Exact Plan question이 active patch와 bind될 때만 product Review가 된다. Accept/reject는 product transaction을 native answer보다 먼저 commit하고, revise는 `UserConfirmation` 없이 bounded feedback·fresh private request key로 replacement를 기다린다. General Plan clarification은 별도 ephemeral binding으로 answer/cancel하며 academic state를 바꾸지 않는다.

`CodexChatService`는 Account Readiness, product thread·active Turn, interaction·interrupt, terminal observation, Runtime recycle와 bounded close를 캡슐화하는 deep product lifecycle Module다. Public tracer route가 사라져도 이 lifecycle owner와 Runtime의 internal text regression은 이름만으로 분해·제거하지 않는다.

## Public product API

| Endpoint | 동작 |
| --- | --- |
| `GET|POST /api/product/public-preview` | Optional public-preview graph의 Account→Setup→Ready observe와 exact command endpoint. Mutation은 absent-or-exact Origin과 loopback socket만 허용 |
| `GET /api/product/bootstrap` | Account Readiness, coarse operation status, active workspace·Course·material, confirmed revision·settled history |
| `POST /api/product/workspaces/activate` | Current Server-owned chooser directory activation, current-store adoption과 read-only incompatible boundary. `WorkspaceManifest` scaffold endpoint가 아님 |
| `POST /api/product/courses` | Empty internal-ready current workspace의 first-vertical Course 생성 |
| `POST /api/product/materials/refresh` | Normal refresh 또는 explicit source rebaseline |
| `GET /api/product/materials/:materialId/preview?digest=...` | Digest-bound bounded TXT preview |
| `POST /api/product/actions/first-assignment` | Durable Run·guard·curated Assignment stream |
| `POST /api/product/actions/first-assignment/retry` | Prior canonical input·ancestry의 one-child explicit retry |
| `POST /api/product/chat/messages` | Optional selection을 갖는 no-Run product Chat stream |
| `POST /api/product/operations/:operationId/interactions/:interactionId/answer` | General Plan interaction answer |
| `POST /api/product/operations/:operationId/interactions/:interactionId/cancel` | General Plan interaction cancel |
| `POST /api/product/reviews/:interactionId` | Exact active Review의 accept·revise·reject |
| `POST /api/product/operations/:operationId/interrupt` | Matching active Turn interrupt acknowledgement |

Mutation은 raw socket이 loopback이고 Origin이 없거나 configured local Origin과 exact match할 때만 허용한다. MCP host는 legacy development graph에서 loopback과 per-process high-entropy token을 모두 검증한다. Token, native identity, absolute source·scratch path, complete MCP payload, traceback과 persistence metadata는 Browser contract에 없다. Public-preview graph에서는 arbitrary `/workspaces/activate`, private MCP와 legacy/raw Codex route를 mount하지 않는다. `/api/health`, `/api/runtime/*`와 `/api/codex-chat/*`도 compatibility alias가 아니며 Express `404`로 닫힌다.

## NDJSON과 shutdown

Neutral Server-private NDJSON writer는 legacy development product stream의 backpressure·disconnect와 bounded drain을 소유한다. `CodexChatService`는 Runtime terminal을 한 번 관찰하고 accepted operation의 interrupt·terminal·unknown settlement를 관리한다. `createServerApplication().close()`는 새 work·listener restart를 막고 listener close를 시작한 뒤 active command/picker/transition을 abort·drain하고 Runtime close를 attempt별 single-flight promise로 수렴한다. Python·native process group과 pipe가 사라진 proven complete cleanup만 latch하며 ambiguous public-preview Runtime cleanup은 성공으로 합성하지 않는다. Composition 초기화, 초기 auth-only role 검증, listener bind 또는 address 확인 뒤 cleanup이 reject·ambiguous이면 같은 root-exported `ServerStartupCleanupError`가 Runtime·coordinator를 노출하지 않는 high-level retry closure를 보존한다. 후속 close는 새 caller signal로 listener와 application cleanup 전체를 다시 조정하며 product intake와 account/Runtime lease는 계속 닫혀 있다.

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

`verify:package-root`는 먼저 Server를 build한 뒤 `NODE_OPTIONS`를 제거한 plain Node child에서 default-condition `@ay-ple/server`를 import한다. Runtime export가 `ServerStartupCleanupError`, `createServerApplication()`, `listenToServerApplication()` 세 개뿐인지, application factory가 listener-independent인지와 close 뒤 child process가 종료되는지를 검증한다.
