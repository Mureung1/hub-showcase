# @ay-ple/server

Explicit `SemesterWorkspace`와 official SDK 기반 Codex Runtime을 하나의 product lifecycle로 조합하는 Express local companion server다. `createServerApplication()`이 product HTTP, workspace authority, listener와 bounded Runtime shutdown을 함께 소유하는 application factory다.

`/api/product/*`의 public JSON request·response와 NDJSON frame은 dependency-free [`@ay-ple/product-contract`](../../packages/product-contract/README.md)가 소유한다. Server는 shared decoder로 mutation body를 admission하고 domain object를 public projection으로 변환한다. Express route, status·Origin guard, neutral NDJSON line writer, workspace store와 private Runtime/MCP binding은 Server에 남는다.

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
| `workspaceRoot` | Materializer 또는 Server-owned chooser가 선택한 active ready `SemesterWorkspace`다. Product native thread의 exact `cwd`이며 confirmed product state와 user-owned TXT를 보존한다. |

Root는 서로 다르고 ancestor·descendant 관계가 없어야 한다. Ambient `HOME`, repository `.ay-ple`, legacy 여섯 `CODEX_CHAT_*` path, common parent와 `process.cwd()`를 fallback으로 사용하지 않는다. Fresh clone은 Runtime bundle이 tracked되지 않으므로 먼저 [runtime package README](../../packages/codex-chat-runtime/README.md#standalone-production-bundle)에 따라 materialize한다.

Server entrypoint는 caller environment를 local `.env`보다 우선하고 `PORT`가 없으면 `3000`, listener address는 `127.0.0.1`을 사용한다. Root command가 exact Chat Shell Origin을 설정한다. `dev:chat-only`와 `/api/codex-chat/*`는 supported entrypoint·route·alias가 아니다.

Build 뒤 Server만 실행하려면 product composition에 필요한 explicit roots와 Origin을 caller가 동일하게 준비한 경우에만 다음 명령을 사용한다.

```bash
npm run build -w @ay-ple/server
npm run start -w @ay-ple/server
```

## Development `SemesterWorkspace`

대표 First Assignment 자료는 Git이 추적하는 seed로만 유지하고 실제 native `cwd`로 사용하지 않는다. Root product command는 seed를 repository 밖의 `<dirname(packageRoot)>/.ay-ple-dev-workspaces/first-assignment-semester-workspace`로 materialize하고 정규 workspace path와 ownership을 보고한다.

```bash
npm run materialize:dev-workspace
```

Materializer가 발급한 ownership marker가 있는 exact leaf만 재생성할 수 있다. Unmarked directory, broad parent, symlink와 caller-owned workspace는 reset·cleanup하지 않는다. `CODEX_CHAT_WORKSPACE`가 명시되면 manual-development materializer의 workspace selection을 caller-owned absolute directory로 override할 뿐 seed copy·reset·cleanup을 하지 않는다. 이 env는 Runtime artifact, controlled directory, native `cwd` owner 또는 장기 product identity를 대신하지 않는다.

`SemesterWorkspaceController.nativeCwd()`는 active `ready` workspace의 canonical root만 반환한다. Ready snapshot에 recovery marker가 있으면 같은 `cwd` authority는 유지하되 product mutation admission이 복구 전까지 새 work를 닫는다. `incompatible/readOnly`, cancel·invalid selection은 Runtime start 전에 fail closed한다. Browser snapshot에 absolute root를 노출하지 않는다.

## Workspace-local durable store

Workspace의 app-owned store는 current canonical `formatVersion: 2` 하나를 지원한다. [ADR 0013](../../docs/adr/0013-adopt-product-only-public-surface-and-v2-store-compatibility-baseline.md)이 이 format을 첫 durable compatibility baseline으로 채택한다.

| 영역 | Current behavior |
| --- | --- |
| Product aggregate | Stable workspace ID, confirmed revision, one `Course`, `RawMaterial`, Assignment, `StatePatch`, `UserConfirmation`, `ModelingRun`, execution guard와 nullable source-recovery marker를 한 authority로 보존한다. |
| Read | Exact decoder·aggregate invariant를 통과한 current v2는 original serialized bytes를 authority로 열고 startup에서 rewrite하지 않는다. |
| Write | Internal `semester-workspace-store` module이 codec·physical I/O·temporary rename·exact opened-byte comparison을 소유한다. Controller는 serialized transaction ordering과 in-memory authority 교체를 소유한다. |
| Incompatible | v1, pre-baseline/noncanonical v2, malformed·invalid current v2, future version, symlink·non-regular·unreadable store는 historical recognizer·migration·reset 없이 original bytes를 보존한 `incompatible/readOnly`로 연다. |
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
| `GET /api/product/bootstrap` | Account Readiness, coarse operation status, active workspace·Course·material, confirmed revision·settled history |
| `POST /api/product/workspaces/activate` | Server-owned chooser activation, current-store adoption과 read-only incompatible boundary |
| `POST /api/product/courses` | Empty ready workspace의 first-vertical Course 생성 |
| `POST /api/product/materials/refresh` | Normal refresh 또는 explicit source rebaseline |
| `GET /api/product/materials/:materialId/preview?digest=...` | Digest-bound bounded TXT preview |
| `POST /api/product/actions/first-assignment` | Durable Run·guard·curated Assignment stream |
| `POST /api/product/actions/first-assignment/retry` | Prior canonical input·ancestry의 one-child explicit retry |
| `POST /api/product/chat/messages` | Optional selection을 갖는 no-Run product Chat stream |
| `POST /api/product/operations/:operationId/interactions/:interactionId/answer` | General Plan interaction answer |
| `POST /api/product/operations/:operationId/interactions/:interactionId/cancel` | General Plan interaction cancel |
| `POST /api/product/reviews/:interactionId` | Exact active Review의 accept·revise·reject |
| `POST /api/product/operations/:operationId/interrupt` | Matching active Turn interrupt acknowledgement |

Mutation은 raw socket이 loopback이고 Origin이 없거나 configured local Origin과 exact match할 때만 허용한다. MCP host는 loopback과 per-process high-entropy token을 모두 검증한다. Token, native identity, absolute source·scratch path, complete MCP payload, traceback과 persistence metadata는 Browser contract에 없다. `/api/health`, `/api/runtime/*`와 `/api/codex-chat/*`는 compatibility alias가 아니며 Express `404`로 닫힌다.

## NDJSON과 shutdown

Neutral Server-private NDJSON writer는 product stream의 backpressure·disconnect와 bounded drain을 소유한다. `CodexChatService`는 Runtime terminal을 한 번 관찰하고 accepted operation의 interrupt·terminal·unknown settlement를 관리한다. `createServerApplication().close()`는 새 work·listener restart를 막고 listener close를 시작한 뒤 active disconnect drain과 Runtime close를 한 promise로 수렴한다. Python·native process group과 pipe가 사라진 뒤에만 resolve한다.

`npm run test:product-entrypoint`는 root canonical command가 explicit `appDataRoot`와 workspace selection만으로 product API·Browser를 열고 legacy path를 무시하며 SIGINT 뒤 OS process graph와 port를 bounded하게 정리하는지 검증한다. `npm run test:product-shutdown-actual -w @ay-ple/server`는 product-capable Runtime process tree에서 listener refusal, close ordering과 child-of-child reap을 별도로 증명한다.

Existing Playwright harness의 same-root durability trace는 실제 Express `ServerApplication`과 Runtime generation을 닫고 같은 `appDataRoot`·workspace·API port로 다시 만든 뒤 Browser를 reload한다. 이 trace가 confirmed Assignment·revision·settled history를 다시 열고 transient transcript·unanswered Review를 복원하지 않음을 검증하며 별도 store·Runtime workflow를 만들지 않는다.

## Exact·live conformance

```bash
npm run test:first-assignment-product-actual -w @ay-ple/server
npm run trace:first-assignment-live -w @ay-ple/server -- --codex-home /absolute/path/to/isolated-auth-seed
```

Product actual은 verified production Runtime·exact local Responses provider·managed Recipe·real Server HTTP·private MCP host를 통과한다. Active ready workspace의 exact `cwd`, selected source, representative Python/command, `auto_review + workspace_write`, proposal→Plan→Review revision→replacement→accept→same-Turn terminal, durable outcome과 process-group disappearance를 검증한다.

Live gate는 caller가 명시한 owner-only auth seed만 fresh `CODEX_HOME`으로 복사하고 disjoint `HOME`·SQLite·temp·appDataRoot·workspace를 사용한다. Credential content·token·digest를 출력하지 않는다. Prerequisite 부재는 `blocked`, product mismatch는 `failed`로 구분한다. Isolated live evidence는 complete Assignment action·Review·confirmed outcome과 clean shutdown을 통과했지만 external credential은 mandatory product cutover gate가 아니다.

일반 package 검증은 다음 명령으로 실행한다.

```bash
npm run test -w @ay-ple/server
npm run typecheck -w @ay-ple/server
npm run build -w @ay-ple/server
```
