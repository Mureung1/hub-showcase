# @ay-ple/server

Codex-native Chat transport와 명시적인 `SemesterWorkspace` 기반을 호스팅하는 Express local companion server다. `createServerApplication()`이 Chat 구성, 선택적인 workspace controller, HTTP listener와 runtime 종료를 함께 소유하는 유일한 application factory다.

## 시작과 환경

Server entrypoint는 이미 설정된 caller environment를 우선하고 실행 `cwd`의 local `.env`에서는 빠진 값만 읽는다. `PORT`가 없으면 `3000`을 사용하고 listener는 `127.0.0.1`에만 bind한다. Root product development entrypoint는 explicit `appDataRoot`를 요구하고, repository-owned `packageRoot`와 materialized/override workspace를 `SemesterWorkspaceController` 하나에 주입한 뒤 Server와 Chat Shell을 exact Origin으로 함께 시작한다.

```bash
npm run dev -- --app-data-root /absolute/path/to/ay-ple-app-data
```

`--app-data-root` 또는 explicit `AY_PLE_APP_DATA_ROOT`가 없으면 product command는 종료한다. Current Chat의 `CODEX_CHAT_*_HOME`, 공통 parent나 `process.cwd()`를 app data로 대신 사용하지 않는다. Chat-only process graph를 별도로 확인할 때만 `npm run dev:chat-only`를 사용하며 `npm run test:dev-entrypoint`는 이 경계를 검증한다.

Build 뒤 Server만 실행하려면 다음 명령을 사용한다. 이 경우 Chat Shell과 exact Origin은 caller가 별도로 준비해야 한다.

```bash
npm run build -w @ay-ple/server
npm run start -w @ay-ple/server
```

## SemesterWorkspace 기반

대표 first Assignment 자료는 Git이 추적하는 seed로만 유지하고 실제 workspace로 사용하지 않는다. 다음 저장소 명령은 세 TXT를 저장소 밖의 기본 형제 위치인 `<dirname(packageRoot)>/.ay-ple-dev-workspaces/first-assignment-semester-workspace`에 materialize하고 선택한 정규 path를 출력한다.

```bash
npm run materialize:dev-workspace
```

이 명령은 개발 workspace만 준비하고 경로를 보고한다. Canonical root `npm run dev -- --app-data-root ...`는 같은 materializer를 호출한 뒤 선택된 정규 path를 product controller에 주입하고 활성화 결과를 별도로 보고한다. `CODEX_CHAT_WORKSPACE` override가 있으면 caller-owned workspace를 그대로 선택하지만 복사·reset·cleanup하지 않는다.

기본 workspace를 다시 materialize하려면 materializer가 발급한 소유권 marker가 정확한 말단 directory에 있어야 한다. Marker가 없는 directory, 상위 directory와 symlink는 초기화하지 않는다. `CODEX_CHAT_WORKSPACE`가 있으면 명령은 해당 absolute readable directory를 호출자 소유 override로 선택해 출력할 뿐 seed 복사, 초기화 또는 정리를 수행하지 않는다. 기본 위치와 override 모두 `packageRoot` 또는 설정된 관리 대상 runtime root와의 ancestor·descendant 관계를 거절한다.

`createServerApplication({ semesterWorkspace })`은 `packageRoot`, `appDataRoot`와 Server가 소유한 directory chooser를 받으며 Browser용 snapshot에서 path를 제외하는 `SemesterWorkspaceController`를 노출한다. 실제 환경의 `createMacOsSemesterWorkspaceChooser()`는 macOS folder chooser를 소유하고, UI 없는 test는 `chooseDirectory` 결과만 주입한다. Activation은 선택한 workspace의 첫 bounded scan과 store update가 성공한 뒤에만 active authority를 교체하므로 취소, root 검증 실패와 scan 실패는 기존 activation을 바꾸지 않는다. `nativeCwd()`는 `ready` workspace의 정규 path만 Server 내부에 제공하며 `incompatible/readOnly` workspace에서는 `workspace_incompatible`로 거절한다. 이 path는 Browser snapshot이나 `Course` identity에 포함하지 않는다.

Workspace 내부의 product store v2는 stable opaque workspace ID, confirmed revision, 첫 제품 경로의 `Course` 하나와 `Assignment`, `StatePatch`, `UserConfirmation` aggregate를 보존한다. Course ID는 app이 발급한 opaque value이며 directory identity가 아니다. 기존 v1 store는 Course·material identity와 revision을 유지한 채 v2로 한 번 migration하고, app data를 다시 만들어도 같은 workspace에서 확정된 Assignment와 settled Review history를 다시 연다. Current-version record는 aggregate 관계와 exact known shape를 함께 검증해 손상된 state를 다시 쓰지 않는다. 지원 범위보다 새로운 store도 하위 버전으로 변환하지 않고 조치 안내가 있는 `readOnly/incompatible` snapshot으로 연다. Canonical product startup은 ready-only refresh나 `nativeCwd()`를 호출하지 않은 채 listener를 열어 이 snapshot을 Browser에 제공한다. 물리 schema와 저장 file은 public contract가 아니다.

같은 versioned store는 eligible regular UTF-8 `.txt`의 `RawMaterial` registry를 additive하게 보존한다. Bounded refresh는 workspace 안의 app-owned subtree, symlink·escape, unreadable·unsupported·oversized file을 제외하고 opaque material ID, workspace-relative display path, SHA-256 byte digest, media type과 size를 기록한다. 같은 path의 bytes가 바뀌어도 ID는 유지하고 digest만 갱신한다. Preview는 material ID와 current digest를 다시 검증해 bounded text만 반환하며 원본을 이동·rename·rewrite하지 않는다.

Server 내부의 Assignment authority는 app-issued proposal context와 exact in-process MCP tool `propose_state_patch` 하나를 결합한다. Tool은 active workspace·Course, base revision과 selected material ID·digest를 다시 검증하고, UTF-8 BOM만 제외한 원문 exact quote가 연결된 one `assignment.upsert`를 durable pending `StatePatch`로만 기록한다. 같은 request key와 canonical payload는 current lifecycle의 같은 patch를 반환하고 conflicting payload는 두 번째 patch를 만들지 않는다. Workspace 재활성화는 이전 proposal session과 Review binding을 폐기한다.

같은 native Turn의 exact 3-option Plan question만 pending patch와 결합한다. Accept는 `UserConfirmation(accepted)`, Assignment upsert, revision increment와 patch apply outcome을 store write 한 번으로 정산하고 reject는 `UserConfirmation(rejected)`와 no-apply outcome만 기록한다. Product coordinator는 이 commit이 끝난 뒤에만 native `answerUserInput`을 호출하며 nominal same-decision retry는 native answer나 apply를 반복하지 않는다. 이 transaction은 한 Server controller 안에서 직렬화되고 temporary-file rename으로 aggregate 교체를 수행한다. 별도 database나 multi-process transaction coordinator는 아니다.

현재 이 authority와 `assignmentState()`는 Server 내부/headless seam이다. Deterministic product Runtime과 실제 in-process MCP handler를 함께 쓰는 integration test가 proposal → Plan question → product commit → native answer → same-Turn terminal 순서를 Browser 없이 증명한다. Product action admission, `ModelingRun`, public action/activity HTTP, Browser Review, 수정 요청·replacement와 loss/recovery는 후속 product slices가 연결한다.

Playwright harness는 ambient `CODEX_CHAT_WORKSPACE`를 사용하지 않고 각 실행마다 OS 임시 directory 아래에 추적되는 seed의 새 복사본을 만든다. Server의 같은 activation 경계에 그 결과를 주입하고 application 종료 뒤 materializer가 발급한 marker가 있는 정확한 실행 root만 정리한다.

## Codex-native Chat 설정

Chat 설정이 없거나 일부이거나 검증할 수 없어도 Server listener는 시작한다. Status만 closed `unavailable` variant를 반환하고 mutation은 `503 codex_chat_unavailable`로 닫힌다. `CODEX_HOME`, `process.cwd()` 또는 ambient provider/auth로 fallback하지 않는다.

| 환경 변수 | 의미 |
| --- | --- |
| `CODEX_CHAT_RUNTIME_ROOT` | Canonical manifest와 complete roster를 검증할 materialized `@ay-ple/codex-chat-runtime` bundle의 absolute root |
| `CODEX_CHAT_WORKSPACE` | Native thread가 사용하는 explicit absolute workspace |
| `CODEX_CHAT_RUNTIME_HOME` | Isolated child `HOME` directory |
| `CODEX_CHAT_CODEX_HOME` | Isolated `CODEX_HOME` directory |
| `CODEX_CHAT_SQLITE_HOME` | Isolated `CODEX_SQLITE_HOME` directory |
| `CODEX_CHAT_TEMP_DIR` | Isolated temporary directory |
| `CODEX_CHAT_ORIGIN` | Optional exact local `http`/`https` Chat Shell Origin |

여섯 path와 optional Origin이 모두 없으면 `not_configured`다. Product development command처럼 Origin만 있고 Chat path가 없거나 path가 일부·empty·relative·unusable이면 Chat status는 `invalid_configuration`이지만 product workspace와 source preview는 계속 사용할 수 있다. Controlled directory는 준비됐지만 bundle을 검증할 수 없으면 `runtime_missing`이다. Workspace와 네 controlled directory는 서로 다르고 ancestor·descendant 관계가 없어야 한다. Complete config는 첫 status 또는 mutation에서 한 번 preflight하지만 runtime process는 첫 mutation까지 lazy하게 시작한다. Verified status에는 path 대신 exact `sourceCommit`과 `runtimeVersion`만 포함된다.

Fresh clone에는 production bundle이 tracked되어 있지 않다. 먼저 [runtime package README](../../packages/codex-chat-runtime/README.md#standalone-production-bundle)의 전제와 검증법을 확인하고 macOS arm64 bundle을 명시적으로 materialize한다.

```bash
npm run materialize:production-runtime -w @ay-ple/codex-chat-runtime
npm run verify:production-runtime -w @ay-ple/codex-chat-runtime
```

그 뒤 repository root 기준 예시는 다음과 같다. 실제 provider 대화가 필요하면 `CODEX_CHAT_CODEX_HOME`에는 사용자가 명시적으로 선택한 auth/config만 준비해야 한다. Ambient home이나 다른 local auth/runtime state를 자동으로 복사하지 말고 secret은 git에 넣지 않는다.

```bash
export CODEX_CHAT_RUNTIME_ROOT="$PWD/packages/codex-chat-runtime/.artifacts/production-runtime-darwin-arm64"
export CODEX_CHAT_WORKSPACE="/absolute/path/to/workspace"
export CODEX_CHAT_RUNTIME_HOME="/absolute/path/to/isolated/home"
export CODEX_CHAT_CODEX_HOME="/absolute/path/to/isolated/codex-home"
export CODEX_CHAT_SQLITE_HOME="/absolute/path/to/isolated/sqlite-home"
export CODEX_CHAT_TEMP_DIR="/absolute/path/to/isolated/temp"
npm run dev -- --app-data-root /absolute/path/to/ay-ple-app-data
```

Provider credential 없이 exact native path만 검증하려면 위 개발 실행 대신 `npm run test:local-provider -w @ay-ple/codex-chat-runtime`을 사용한다.

Root product development command에서 실제 runtime까지 활성화하려면 explicit product `appDataRoot`와 위 여섯 absolute Chat path를 caller environment 또는 local `.env`에 함께 준비해야 한다. 이 ticket의 source workbench는 selected product workspace를 current text Chat의 native `cwd`로 다시 배선하지 않으며 structured product Turn 결합은 후속 action slice가 소유한다. Chat Shell 구현·검증 범위는 [app README](../chat-shell/README.md)가 소유한다.

| Endpoint | 동작 |
| --- | --- |
| `GET /api/codex-chat/status` | `unavailable | configured | starting | ready | failed` closed union과 fixed `deny_all + read_only` policy를 반환한다. |
| `POST /api/codex-chat/threads` | 현재 idle transient thread를 release한 뒤 새 native thread를 만들고 `{ threadId }`를 반환한다. |
| `POST /api/codex-chat/threads/:threadId/turns` | Exact `{ text }`만 받고 native turn response 뒤 acceptance-first NDJSON event stream을 연다. |
| `POST /api/codex-chat/threads/:threadId/turns/:turnId/interrupt` | Matching active turn의 native interrupt acknowledgement 뒤 `202`를 반환한다. Stream terminal이 최종 상태다. |

이 네 route는 current text Chat API다. Source workbench는 별도 `/api/product/*` browser-safe surface에서 다음 operation을 제공하며 raw path나 store schema를 노출하지 않는다.

| Endpoint | 동작 |
| --- | --- |
| `GET /api/product/bootstrap` | Active workspace·Course·material registry snapshot을 `no-store`로 반환한다. |
| `POST /api/product/workspaces/activate` | Server-owned chooser를 열고 선택한 registry의 첫 bounded refresh까지 성공한 경우에만 active authority를 교체한다. |
| `POST /api/product/courses` | Empty ready workspace에 first-vertical Course 하나를 만든다. |
| `POST /api/product/materials/refresh` | Eligible TXT registry를 bounded scan으로 갱신한다. |
| `GET /api/product/materials/:materialId/preview?digest=...` | Current registry digest와 file을 재검증한 bounded TXT preview를 `no-store`로 반환한다. |

Product mutation도 같은 loopback socket과 exact/absent Origin guard를 사용한다. `/api/health`와 `/api/runtime/*`는 compatibility alias 없이 제거됐으며 Express `404`로 닫힌다.

현재 `CodexChatService`는 Server process 전체에서 current native thread 하나와 active turn 하나만 소유한다. 모든 browser tab과 HTTP client가 이 slot을 공유하며, 새 thread 생성은 idle current thread의 local handle을 release해 현재 Server instance의 Chat route가 이전 ID를 더 이상 active handle로 받지 않게 한다. Native thread 자체를 archive/delete하거나 identity를 무효화하지는 않는다. Active turn 중에는 새 thread를 만들 수 없다. 이는 첫 tracer의 의도적인 cardinality이며 browser session별 격리나 multi-client conversation service가 아니다.

Mutation은 raw socket이 loopback이고 Origin이 없거나 configured local Origin과 exact match할 때만 허용한다. Chat router의 isolated JSON parser는 generic global parser 없이 route scope 안에서만 실행하며 original text를 유지한 채 `text`에 exact 131,072 UTF-8 byte limit을 적용한다. NDJSON writer는 `res.write(false)`마다 최대 5초 동안 `drain` 또는 response close를 기다리고, deadline이 끝나면 listener와 timer를 정리한 뒤 response를 destroy해 disconnect로 분류한다. Accepted turn은 그 시점부터 별도의 최대 5초 native drain 동안 interrupt와 terminal 소비를 계속한다. Terminal이 오면 active-turn lease를 해제하고 runtime을 `ready`로 유지하며, 오지 않으면 `disconnect_drain_timeout`으로 shared runtime을 닫는다. 다른 browser disconnect도 dispatch phase에 따라 local pre-dispatch reservation 취소, late thread release 또는 같은 accepted-turn 정산을 사용한다. Outcome을 알 수 없거나 autonomous cleanup의 runtime close 자체가 실패하면 status는 path나 child error를 노출하지 않는 stable failure code로 닫히며 cleanup failure는 `runtime_cleanup_failed`로 승격한다.

`createServerApplication()`은 listener와 Chat composition을 함께 소유한다. Runtime factory가 resolve되면 service는 public `CodexChatRuntime.terminal`을 한 번 관찰하고, active stream이 없는 idle failure도 cached runtime identity를 확인해 status를 `failed`로 전환한 뒤 같은 close-once 경로로 정리한다. `close()`는 새 Chat work와 listener 재시작을 먼저 막고 listener close를 시작한 뒤 runtime `close()`를 한 promise로 수렴한다. 구현은 path/source preparation, native conversation lifecycle, Express/NDJSON transport와 composition facade로 분리돼 있으며 lifecycle service는 Express를 import하지 않는다. Server contract tests와 Chat Shell Playwright는 `@ay-ple/codex-chat-runtime/testing`의 public runtime interface를 주입하며 live provider를 사용하지 않는다.

`npm run test:codex-chat-actual -w @ay-ple/server`는 materialized macOS arm64 production runtime을 요구하는 명시적 actual-child gate다. 실제 HTTP mutation으로 verified Python worker와 provider-free fake native App Server child를 시작하고, Server shutdown이 새 TCP intake를 먼저 거부한 뒤 runtime close와 전체 process-group reap을 마치기 전에는 resolve하지 않는지 검증한다. Ignored bundle을 요구하므로 일반 `npm test`에는 포함하지 않는다.

일반 package 검증은 다음 명령으로 실행한다.

```bash
npm run test -w @ay-ple/server
npm run typecheck -w @ay-ple/server
npm run build -w @ay-ple/server
```
