# Codex Runtime 격리 기술 메모

작성일: 2026-07-07

최근 갱신: 2026-07-28

분류: 활성

성숙도: 구현됨

관련 문서: [Codex App Server 우선 사용 ADR](../adr/0005-use-codex-app-server-as-first-class-mvp-runtime.md), [제품 실행 경로 분리 ADR](../adr/0006-separate-package-app-data-and-semester-workspace-roots.md), [user-owned Git SemesterWorkspace ADR](../adr/0018-adopt-user-owned-git-semester-workspaces.md), [pre-App native Bootstrap ADR](../adr/0020-bootstrap-semester-workspaces-before-app-startup.md), [InteractionCapability ADR](../adr/0019-use-mcp-interaction-capabilities-as-the-ay-app-seam.md), [AY–App Interaction Capability 아키텍처](ay-app-interaction-capabilities.md), [historical app-owned SemesterWorkspace ADR](../adr/0014-create-app-owned-normalized-semester-workspaces.md), [Official Codex Python SDK ADR](../adr/0011-reuse-official-codex-python-sdk-for-chat-shell.md), [single Runtime graph ADR](../adr/0012-adopt-codex-chat-only-and-remove-legacy-runtime-surfaces.md), [product-only cutover·durable v2 ADR](../adr/0013-adopt-product-only-public-surface-and-v2-store-compatibility-baseline.md), [macOS-first 제품 경로 ADR](../adr/0009-use-a-macos-first-local-web-app-product-path.md), [Codex Chat 구현 지도](codex-chat-implementation-map.md), [개발 백로그](../product/ay-ple-development-backlog.md)

## 목적

AY-PLE가 Codex App Server를 built-in local agent engine으로 사용할 때 runtime artifact, process environment, native state와 사용자 `SemesterWorkspace`를 어떻게 분리하는지 설명한다. [ADR 0006](../adr/0006-separate-package-app-data-and-semester-workspace-roots.md)이 root 소유권을, [ADR 0018](../adr/0018-adopt-user-owned-git-semester-workspaces.md)이 personal canonical layout과 workspace adoption을, [ADR 0020](../adr/0020-bootstrap-semester-workspaces-before-app-startup.md)이 pre-App Bootstrap과 prepared-root startup을, [ADR 0013](../adr/0013-adopt-product-only-public-surface-and-v2-store-compatibility-baseline.md)이 durable current v2 보존 정책을 결정한다. [ADR 0014](../adr/0014-create-app-owned-normalized-semester-workspaces.md), [ADR 0016](../adr/0016-distribute-public-preview-with-an-exact-npx-launcher-and-verified-runtime-release.md)과 [ADR 0017](../adr/0017-use-codex-managed-browser-oauth-for-product-account-lifecycle.md)은 제거한 app-owned workspace·public application delivery·managed account lifecycle의 historical 결정이다.

Transport, 상태 격리, sandbox, 인증 저장소와 packaging risk 같은 저수준 기술 경계는 이 문서가 소유한다. 제품 문제와 AY↔App interaction, package의 exact 동작, 작업 순서는 각각 Product Brief·Interaction Capability 아키텍처, 구현 지도·package README, Development Backlog를 따른다.

## 현재 구현과 후속

| 영역 | 현재 product 구현 | 후속 |
| --- | --- | --- |
| Runtime stack | `@ay-ple/codex-chat-runtime` materializer와 verifier가 explicit external app data의 `runtime/production-runtime-darwin-arm64`를 tracked canonical manifest와 complete tree에 대해 검증하고 product startup이 이 root만 사용한다. Exact SDK 재현 cache도 external `cache/exact-sdk/`에 둔다. | 없음 |
| Runtime state | Canonical composition이 sibling `../.ay-ple/` 아래 controlled `state/runtime/home`, `temp/`와 Runtime cache를 계산하고 caller의 전역 `CODEX_HOME`을 account·config·session authority로 사용한다. External `state/workspace-registry.json`의 strict v1 CAS store는 exact effective MCP declaration과 held Adapter lifecycle readiness 뒤 active pointer를 commit하며 current product composition의 reopen authority다. Separate `CODEX_SQLITE_HOME`이나 per-workspace durable operation file은 만들지 않는다. Pending interaction·operation과 Broker-owned Adapter status는 process-local Runtime generation memory에서 terminal 정산한다. | 없음 |
| Account lifecycle | Current dev·dogfood는 workspace-only `CodexWorkspaceRuntime`을 통해 caller의 `CODEX_HOME`, 또는 미설정 시 `~/.codex`에서 fresh account readiness만 읽는다. 별도 auth profile·device-auth helper·credential copy·Browser OAuth UI와 Node login·logout surface는 없다. | Read-only account plan·usage가 실제 제품 행동에 필요할 때 별도 surface 검토 |
| 작업 `cwd` | Native Bootstrap이 끝난 한 학기 Git root를 explicit launch input 또는 registry에서 resolve하고 project root와 정상 thread의 고정 `cwd`로 사용한다. No-root startup은 fail closed하고 `CODEX_CHAT_WORKSPACE`·ambient `cwd`를 fallback으로 쓰지 않는다. | 없음 |
| 학기 제품 상태 | Git-tracked root `workspace-state.json`은 strict v4 identity와 opaque JSON snapshot만 제공한다. 학업 결과는 actual files와 Git checkpoint에 남고 Interaction request/result·academic event history는 App store에 저장하지 않는다. 기존 v2/v3/malformed/future bytes는 지원하지 않는 상태로 보존한다. | Snapshot 구조가 실제 사용자 필요로 안정될 때 별도 schema 결정 |
| Native context | Runtime의 persistent bridge와 one-shot official App Server sidecar가 모두 exact workspace Git root `cwd`, native `.git` project boundary와 controlled environment를 사용한다. Sidecar의 `config/read`·`skills/list` raw protocol은 Runtime-private이고 Server는 atomic high-level snapshot만 소비한다. Process-wide managed Skill root, package-owned bundle/context guard와 `skills/extraRoots/set` injection은 없다. | User-added Skill 지원 policy가 필요할 때 별도 결정 |
| Transport·policy | Local companion이 detached Node→Python→App Server tree를 supervise한다. First Assignment product Turn은 `auto_review + workspace_write`를 explicit하게 보내고 Codex execution permission과 InteractionCapability result를 분리하며, Browser에는 allowlisted product activity와 capability UI만 전달한다. | Interactive native approval UX과 cloud threat model |

Current product startup·Runtime command는 canonical `../.ay-ple/`의 external Runtime·controlled state, 전역 `CODEX_HOME`과 prepared Git root를 조합한다. First open·학기 변경은 explicit `--workspace`, 이후 start는 registry active pointer를 fresh reopen하며 required root가 없으면 fail closed한다. Legacy dogfood profile·managed development materializer와 package-local Runtime/cache command는 tracked graph에서 제거됐고 validated clone-local residue도 one-shot cleanup으로 정리했다. Public application host, Runtime release resolver, public-preview Account→Setup→Ready graph와 app-owned v3 scaffold·bundle kernel도 tracked product graph에 없다.

## 격리 레이어

| 레이어 | 채택한 경계 | 보장하지 않는 것 |
| --- | --- | --- |
| Runtime/version | `@ay-ple/codex-chat-runtime`의 tracked canonical manifest와 complete-tree verifier를 통과한 external `../.ay-ple/runtime/` Python·SDK·native bundle만 사용한다. | Codex state, auth와 session 분리 |
| Runtime environment | Inherited environment 대신 explicit `HOME`, Codex homes, temp, fixed executable path와 current Interaction Broker endpoint·token·Runtime binding을 전달한다. Project MCP declaration의 `env_vars`가 dynamic binding만 STDIO Adapter로 forward한다. | Container, VM 또는 별도 OS user 수준 격리 |
| Runtime state roots | Global Codex authority `~/.codex`와 AY-PLE appData `../.ay-ple/`의 Runtime payload·registry·cache·temp를 명시적으로 구분 | Codex 전역 config·Skill·memory의 AY-PLE 전용 격리 |
| Account lifecycle | 전역 `CODEX_HOME`의 fresh Account Readiness만 Server가 Browser-safe `ready | not_ready | unavailable`로 투영 | In-app login·logout·account switching, 모든 official Browser URL의 무토큰성 |
| Workspace | Native Bootstrap이 App 시작 전에 준비한 한 학기 Git repository만 launch input 또는 registry에서 resolve해 active `SemesterWorkspace`와 exact native `cwd`로 전달 | Bootstrap 진행·권한, Auth·Runtime state 저장소 격리, AY의 file operation 정확성 |
| Native context | Pre-App native client는 canonical `hub/`에서 init Skill을 발견하고, App의 Workspace Runtime·probe는 canonical Git root를 같은 `cwd`로 사용해 그 project의 config·instruction·Skill을 발견한다. Raw App Server protocol은 Runtime-private이며 opt-in Memories는 별도 비권위적 맥락이다. | Workspace identity, official system capability, 학업 사실의 정확성, 모든 작업의 memory 생성 |
| Sandbox·approval | Product Turn의 permission profile과 InteractionCapability의 사용자 result를 서로 다른 경계로 유지 | OS process 보안 경계, path-level filesystem immutability, generic approval center |
| Transport | Local companion이 private Node↔Python NDJSON과 `stdio://` App Server process를 소유한다. Interaction Adapter는 Browser API와 같은 pre-bound loopback HTTP listener의 Server-private Broker route를 Runtime-scoped token·binding으로 사용한다. | Protocol 변경과 packaging risk 제거, Browser Origin만으로 private process를 인증 |

## Canonical product layout seam

### 현재 개발 composition

Root `npm run dev`는 repository sibling `../.ay-ple/`의 Runtime·controlled state, caller-global Codex home과 prepared Git workspace를 직접 조합한다. First open·학기 변경은 explicit absolute `--workspace`, 이후 start는 registry active pointer를 사용한다. Caller가 legacy path를 맞추거나 environment에서 root model을 다시 만들지 않으며 unprepared·legacy root는 Runtime spawn 전에 fail closed한다.

### 현재 personal canonical layout

| Root | Canonical path | 소유권 |
| --- | --- | --- |
| `packageRoot` | `hub/` | Tracked source, built-in Skill과 `@ay-ple/interaction-mcp` source, rebuildable `node_modules`·`dist` |
| `appDataRoot` | `../.ay-ple/` | Verified Runtime payload, `WorkspaceRegistry`, cross-workspace 운영 metadata·config, cache와 temp |
| Semester parent | `../workspace/` | 학기별 독립 Git repository |
| Global Codex | `~/.codex/` | 기존 account, config, Skill과 Codex-managed session state |

Path는 `packageRoot` 기준 sibling을 canonicalize하며 current process directory나 environment fallback으로 다시 추론하지 않는다. Runtime payload는 `../.ay-ple/runtime/`에 materialize·검증하고 package-local byte를 migration source나 fallback으로 사용하지 않는다. Generated ModelingRecipe, assignment staging, isolated Codex home과 managed development workspace도 이관하지 않았다. Canonical Runtime·registry reopen·prepared-root relaunch·Interaction smoke 뒤 ownership marker와 exact layout을 다시 검증한 one-shot cleanup이 legacy dogfood appData, managed development workspace와 package-local Runtime/cache residue를 제거했다. Source-derived npm dependency와 build output은 `hub/`에 남길 수 있지만 mutable 실행 state는 두지 않는다.

Sibling `../.ay-ple/`은 Git 밖의 cross-workspace 운영 metadata·config·Runtime·cache·temp 전용이다. SemesterWorkspace는 같은 hidden directory 이름을 재사용하지 않고 repository root의 `AGENTS.md`, `workspace-state.json`과 실제 자료에 학기-local 정보를 둔다.

### 중단한 public target

아래 표는 2026-07-23까지 public setup·relaunch target으로 검토한 historical context다. 현재 제품 목표나 구현 불변 조건이 아니다.

| 입력·결과 | 불변 조건 |
| --- | --- |
| `packageRoot` | Product state를 쓰지 않으며 exact application code, dedicated workspace instruction/Skill resource subtree·digest descriptor와 embedded Runtime descriptor·canonical manifest를 찾는다. Ambient repository-root `AGENTS.md`·`.agents/`를 product resource로 복사하지 않는다. Host는 declared application resource를 workspace mutation 전에 complete-tree 검증한다. Runtime payload cache나 moving remote catalog를 authority로 두지 않는다. |
| `appDataRoot` | Explicit absolute non-symlink directory다. Workspace 밖에 있고 verified immutable Runtime generation·retained archive, app-managed `HOME`·`CODEX_HOME`·`CODEX_SQLITE_HOME`·temp/runtime state와 workspace registry를 분리해 계산한다. Pending approved setup transaction과 active Ready pointer를 구분하며 registry는 pointer이지 workspace identity authority가 아니다. |
| Resolver result | Single `RuntimeResolver`가 exact binding과 complete tree를 확인한 immutable `runtimeRoot`·Runtime identity만 production host에 반환한다. Missing·corrupt state는 scoped repair하거나 fail closed하며 다른 version으로 fallback하지 않는다. |
| Auth-only bootstrap | 당시에는 Runtime role과 empty·disjoint root validation을 package primitive로 구현했다. Current Runtime에서는 이 role과 primitive를 제거했고 historical evidence로만 남는다. |
| `workspaceRoot` | 사용자가 고른 위치에 app code가 생성하고 `WorkspaceManifest` validation을 통과한 root다. Active 상태에서 native thread `cwd`와 일치한다. Current development override는 이 target의 admission을 대신하지 않는다. |
| Workspace instruction/Skill bundle | Exact application package가 선언한 `AGENTS.md`와 `.agents/skills/` built-in Skill root를 fresh scaffold에 no-clobber로 설치한다. Verifier는 `AGENTS.md`와 각 declared Skill root의 exact complete tree·digest를 검사하므로 그 root 안의 undeclared file도 drift다. `.agents/skills/` container의 descriptor 밖 sibling root는 소유·변경하지 않는다. Missing은 explicit no-clobber recovery, modified byte나 undeclared in-root entry는 App이 byte를 바꾸지 않는 manual recovery로 수렴한다. Bundle은 workspace identity authority가 아니다. |
| Native project boundary | Workspace Runtime은 exact workspace root를 `cwd`로 쓰고 persistent bridge와 one-shot probe 모두 fixed command-line config override `project_root_markers=[]`를 적용한다. App-managed `HOME`에는 ambient user Skill을 import하지 않고 controlled `CODEX_HOME`에는 global `AGENTS.override.md`·`AGENTS.md`를 두지 않는다. Runtime actual smoke가 선택한 parent의 상위 context를 읽지 않는 discovery 결과와 full sidecar reap을 검증하며, public setup composition은 이 primitive를 admission 뒤 호출해야 한다. |
| Effective native context | Declared bundle integrity와 Codex가 실제로 읽는 native context는 별도 gate다. Runtime은 같은 caller `AbortSignal`의 official native App Server `config/read`·`skills/list`를 한 atomic snapshot으로 투영하고, Server boundary는 두 read를 첫 `await` 전에 함께 claim한다. Workspace root의 `AGENTS.override.md`, workspace-local `.codex/`, descriptor 밖 effective `repo | user | admin` Skill은 conflict로 닫는다. Official `system` Skill은 응답을 검증한 뒤 product effective roster에서 제외하며 `CODEX_HOME/skills/.system` cache를 conflict로 취급하지 않는다. Public setup·action composition은 아직 이 gate를 호출하지 않는다. User-added Skill 지원 policy는 후속 결정이다. |
| Account transition | Public-preview auth-only→workspace transition과 `Semester Ready` gate는 제거됐다. Current product는 시작부터 workspace Runtime과 전역 `CODEX_HOME`을 사용한다. |
| Ready registry commit | Admitted workspace와 valid bundle은 pending setup result일 뿐이다. Auth-only Runtime close, workspace Runtime start와 fresh account read가 끝난 뒤에만 active Ready pointer를 commit한다. 실패하면 workspace·bundle을 보존하고 pending transaction에서 transition retry·reauth로 수렴한다. |
| Root relation | Package, app data, workspace와 controlled child root의 의미를 섞지 않고 unsafe overlap과 symlink를 거절한다. |
| Manual override | `CODEX_CHAT_WORKSPACE`는 당시 development materializer의 caller-owned selection input일 뿐 public workspace admission, Runtime root, app data 또는 별도 `cwd` authority가 아니었다. |
| Data loss | `appDataRoot`가 사라져도 `RawMaterial`과 confirmed·settled product state를 workspace에서 다시 열 수 있다. |

Current product factory는 Runtime spawn 전과 factory 내부에서 external appData artifact·path를 다시 검증해 TOCTOU drift를 fail closed한다. Child environment는 controlled root와 필수 OS directory만으로 재구성하며 ambient credential·provider·`PYTHONPATH`·dynamic loader variable를 계승하지 않는다.

## 제품용 directory 구조

현재 personal canonical layout은 아래와 같다. Root `workspace-state.json`은 Git-tracked v4 identity와 opaque snapshot authority다.

```text
hub/
  .agents/skills/             # 개발 harness와 초기 Bootstrap Skill
  skills/                     # AY-PLE built-in Skill source catalog
  packages/interaction-mcp/
    dist/                     # rebuildable built STDIO entrypoint
  node_modules/               # rebuildable npm dependency
  **/dist/                    # rebuildable output

../.ay-ple/
  runtime/                    # verified Python/Codex Runtime dependency
  state/
    runtime/home/             # controlled Runtime process HOME
    workspace-registry.json   # known roots와 active pointer의 durable CAS authority
  cache/
  temp/

~/.codex/                     # global Codex authority

../workspace/<semester>/      # one semester, one Git repository
  AGENTS.md                   # init Skill이 준비하는 간단한 workspace 지침
  .agents/skills/             # source catalog에서 복사한 Git-tracked 실행 Skill
  .codex/config.toml          # Git-safe한 Interaction MCP project declaration
  workspace-state.json        # Git-tracked workspace-local JSON authority
  <actual-semester-files>
```

`hub/.agents/skills/`에는 repository 개발 harness와 `hub` project에서 App 실행 전 native discovery할 초기 Bootstrap Skill을 둔다. AY-PLE built-in Skill의 tracked source catalog는 `hub/skills/`가 별도로 소유한다. Bootstrap은 선택한 catalog directory를 workspace의 `.agents/skills/`로 복사하며 symlink를 만들지 않는다. Workspace copy가 exact Git root에서 Codex가 native discovery하는 실행 authority이고 Git이 실제 사용 byte를 기록한다. Catalog 변경은 명시적인 Bootstrap·Update와 workspace diff 없이 기존 학기를 바꾸지 않는다. Public distribution 요구 전에는 download·package·plugin 계층을 추가하지 않는다.

사용자는 App을 시작하기 전에 `hub/`를 연 Codex CLI 같은 native client에서 Bootstrap Skill을 직접 실행한다. App은 이 native thread를 열거나 resume하지 않고 candidate·init 상태를 알지 않는다. 첫 open·학기 변경은 `--workspace <absolute-prepared-git-root>`, 이후 일반 실행은 registry active pointer를 사용한다. Explicit root도 valid pointer도 없으면 Browser나 Workspace Runtime을 열지 않고 fail closed한다. App은 prepared root의 exact Git marker와 v4 identity를 fresh 검증한 뒤 exact root를 cwd로 쓰는 Workspace Runtime을 표준 `workspace-write`로 시작한다. Current pinned App Server는 trust가 미지정된 exact Git root를 native user config에 기록하고 config를 reload한 뒤 thread를 만든다.

Workspace Runtime start 전 App은 Browser API와 공유할 loopback listener를 먼저 bind하고 Server-private Broker route, fresh Runtime-generation token과 opaque binding을 준비한다. 이 선행 단계가 실패하면 Codex child를 spawn하지 않는다. Exact-root native thread가 trust·project config reload를 성립시킨 뒤 App은 bounded effective declaration 전체를 확인한다. 실제 Adapter는 authenticated handshake와 Broker가 accept한 held lifecycle channel을 모두 열어야 initialize를 성공시키며, 이 Broker status가 startup readiness와 live loss의 authority다. 두 gate와 startup thread의 Product handoff가 성공한 뒤에만 prepared root를 verified `workspaceId`와 함께 registry known entry·active pointer로 CAS commit한다. Durable transaction 안의 synchronous acceptance callback은 Runtime generation과 Broker의 `isLost()`가 아직 유효한지 판정하는 되돌릴 수 없는 cutover다. Acceptance 전 failure는 prior pointer를 exact 복원한다. Acceptance 뒤 housekeeping 오류는 committed authority와 다음 writer의 residue reconciliation으로 흡수하며 startup failure로 다시 번역하지 않는다. Transaction 반환 시 generation이 여전히 live면 coordinator-owned lifecycle reader를 active로 바꾸고, acceptance 직후 continuity를 잃었으면 새 pointer를 유지한 채 바로 recovery를 공개한다. Startup에서 검증한 native thread는 정상 Product Turn에도 그대로 재사용한다. Durable writer phase와 new-file proof는 process death reconciliation에서도 pending first open을 제거하고 pending switch를 prior authority로 되돌린다. No-argument authoritative reopen은 registry read 전에 이 dead pending writer reconciliation을 수행하므로 새 writer가 없어도 unaccepted target을 active로 관찰하지 않는다. Broker는 generation마다 pending interaction slot 하나만 유지하며 slot이 찬 상태의 후속 request를 queue·preempt하지 않고 즉시 `busy`로 끝낸다. Runtime replacement·close와 App shutdown은 binding을 닫고 pending interaction을 terminal 정산한 뒤 token을 폐기하며, Broker → Runtime → listener cleanup을 하나의 5초 deadline 안에서 모두 시도하고 stale credential을 다음 Runtime generation에 재사용하지 않는다.

Registry의 durable writer transaction 외의 pending product operation, InteractionCapability와 Broker-owned Adapter lifecycle status는 현재 App process의 Runtime generation memory에만 존재한다. Unexpected lifecycle EOF는 Adapter loss를 동기적으로 latch하고 pending interaction을 `transport_failed`로 정산한다. Runtime terminal은 `runtime_terminated`, expected Runtime replacement·App shutdown은 각각의 정상 close reason을 유지해 false loss를 만들지 않는다. Process restart 뒤 별도 recovery record가 없는 operation의 성공이나 사용자 result를 추정하지 않는다.

Target workspace의 `AGENTS.md`와 Skills는 App-owned exact bundle이 아니다. Init Skill은 existing bytes를 존중하면서 최소 지침과 Skill copy를 준비하고, AY는 exact Git root에서 Codex의 native project config·instruction·Skill discovery를 사용한다. Current Runtime은 fixed `project_root_markers=[]`와 process-wide managed Skill root를 제거했고, persistent bridge와 one-shot `config/read`·`skills/list` probe가 같은 native `.git` boundary를 사용한다. Package-owned v3 bundle verifier와 context guard도 제거되어 일반 사용자 context를 drift로 차단하지 않는다.

Pre-App native Bootstrap이 설치하는 `.codex/config.toml`은 exact SemesterWorkspace root에서 `hub/packages/interaction-mcp`의 built STDIO Adapter까지 계산한 상대 `command`, forwarded env 이름, capability allowlist와 `required = true`를 담고 MCP server `cwd`와 `tool_timeout_sec`은 생략한다. Current pinned local STDIO launcher가 Runtime fallback `cwd`를 쓰므로 relative command의 기준은 `.codex/`가 아니라 Workspace Runtime의 exact Git root이며, MCP tool timeout은 current pinned native default 300초다. Timeout은 정상 result 없이 pending interaction을 MCP failure로 정산하고 retry는 fresh capability call로 시작한다. App-level countdown·연장·keepalive·자동 retry는 만들지 않으며 Codex pin upgrade 때 native default를 재검증한다. `apps/server`가 App endpoint·token·Runtime binding을 소유하고, capability-neutral `@ay-ple/codex-chat-runtime`은 그 값을 Codex child environment로만 전달하며, Codex가 STDIO Adapter로 allowlist 전달한다. Runtime이 투영하는 effective declaration은 `command`·`args`·name과 nullable `local | remote` source를 보존하는 `env_vars`·`cwd`·`tool_timeout_sec`·static `env`·`enabled`·`required`·`enabled_tools`·`disabled_tools`까지 bounded하게 닫히고 Server가 Bootstrap contract와 exact match를 검증한다. Required Interaction declaration의 세 env var는 unsourced이고 `disabled_tools`는 empty여야 한다. Adapter는 current App Broker와 authenticated handshake 뒤 held lifecycle channel acceptance까지 끝낸 다음에만 initialize를 성공시킨다. Runtime은 `mcpServerStatus/list` polling이나 live MCP health API를 소유하지 않는다. Current thread-start private MCP config injection은 제거하며, project config가 load되지 않거나 Broker lifecycle binding이 실패한 Runtime은 active workspace로 열지 않는다.

사용자가 선택한 Git root의 실제 자료는 별도 import·registration 없이 AY의 작업 대상이다. App은 자료를 `RawMaterial`로 승격하거나 snapshot해야만 native `cwd`에서 읽을 수 있게 하는 admission layer를 두지 않는다. Codex-managed state의 내부 file roster도 product contract로 고정하지 않는다.

## Durable store와 rollback

Workspace-local file과 Git은 app data나 native session과 다른 durable authority다. Current-v2/v3 bytes는 전환 전 historical data이므로 Server lifecycle과 contraction이 original bytes를 삭제·rewrite하지 않는다. Current root `workspace-state.json`은 v4 identity와 opaque snapshot만 두고 pending interaction·native execution·academic event history를 넣지 않는다. Exact codec 동작은 [`@ay-ple/semester-workspace` README](../../packages/semester-workspace/README.md), workspace authority는 ADR 0018, interaction state 경계는 ADR 0019가 소유한다.

## 리스크와 대응

| 리스크 | 설명 | 대응 |
| --- | --- | --- |
| Artifact drift | Canonical appData Runtime byte가 바뀌면 검토한 Runtime과 달라진다. | Tracked manifest와 complete tree를 composition preflight와 spawn 경계에서 fail closed로 검증한다. |
| Silent Runtime fallback | 손상된 canonical Runtime에서 package-local residue, system Python이나 ambient executable로 넘어가면 application contract가 바뀐다. | Factory는 `../.ay-ple/runtime/`의 exact verified bundle만 시작하고 실패 시 닫는다. |
| Runtime state root 분리 | 전역 Codex state, AY-PLE의 durable 운영 state, process-local operation과 학기 authority의 수명·복구 책임이 다르다. | Codex-managed account·config·session은 `~/.codex`, Runtime payload·registry·cross-workspace metadata·config·cache·temp는 `../.ay-ple/`, 학기 상태는 workspace에 둔다. Pending operation·interaction·Adapter health는 process memory에서만 terminal 정산한다. |
| Credential authority 분열 | AY-PLE token store와 global Codex home를 함께 쓰면 refresh·logout owner가 갈라진다. | Current startup은 AY-PLE credential store를 만들지 않고 전역 `CODEX_HOME` 하나만 사용한다. |
| Workspace 오선택 | Registry나 development override가 사용자 의도와 다른 root를 가리킬 수 있다. | 한 학기 전용 Git root와 workspace-local JSON identity를 재검증하고 thread 생성·재개 전 recorded `cwd`가 canonical root와 정확히 같은지 확인한다. Registry는 pointer로만 사용한다. |
| Bootstrap owner 혼입 | App이 pre-App native setup 대화를 resume하거나 candidate 상태를 추적하면 app source context와 제품 lifecycle이 다시 결합된다. | Native Bootstrap은 App 시작 전에 끝내고 App은 prepared root만 입력받아 exact Git root에서 새 Workspace Runtime·thread를 시작한다. |
| Workspace authority 분열 | Current store 옆에 새 manifest sidecar를 만들면 같은 workspace·Course identity를 각각 소유한다. | Current aggregate model을 root `workspace-state.json`으로 옮기고 별도 sidecar를 만들지 않는다. |
| Process restart 중 pending work | Restart 전 interaction이나 operation의 terminal response가 실제로 전달됐는지 알 수 없는데 durable marker로 성공을 추정하면 workspace와 AY의 상태가 갈릴 수 있다. | Registry writer transaction만 정해진 crash reconciliation을 수행하고, 그 밖의 process-local pending work는 복구·성공으로 추정하지 않는다. 새 Runtime generation과 fresh call로 다시 시작한다. |
| 이력 중복 | Git history와 `statePatches`·`userConfirmations`·`modelingRuns` 배열이 같은 변경을 서로 다른 방식으로 기록하면 rollback 의미가 갈린다. | Workspace SSOT는 current confirmed snapshot만 저장하고 장기 변경 이력은 Git checkpoint 하나로 통일한다. |
| Evidence self-reference | `workspace-state.json`을 포함하는 commit SHA를 같은 JSON에 넣으면 commit identity를 계산할 수 없다. | `EvidenceRef`는 relative path, exact content digest와 locator를 저장하고 Git history는 해당 content version을 찾는 수단으로만 사용한다. |
| Evidence path escape·drift | Agent-supplied path가 workspace 밖을 읽거나 digest가 달라진 최신 file을 원래 근거처럼 표시할 수 있다. | Broker가 active Runtime의 exact root 안에서 bounded regular-file read, digest·locator 검증을 atomic preflight하고 하나라도 실패하면 Browser projection 없이 MCP call을 닫는다. |
| Workspace instruction drift | Init Skill이 기존 `AGENTS.md`를 덮어쓰거나 지나치게 상세한 policy를 만들면 사용자 지침과 AY의 판단 공간을 잃는다. | 기존 bytes를 존중하고 commit checkpoint 같은 짧은 원칙만 두며 App code가 exact instruction bundle을 소유하지 않는다. |
| Skill version drift | `hub/skills/`의 변경이 기존 학기의 실행 동작을 암묵적으로 바꾸면 Git history와 실제 AY behavior가 어긋난다. | Workspace에 real directory를 복사하고 명시적인 Bootstrap·Update와 Git diff·checkpoint를 거쳐서만 바꾼다. Symlink와 Runtime `extraRoots` 주입을 사용하지 않는다. |
| MCP secret의 Git 혼입 | Project config에 App endpoint·token이나 Runtime binding value를 쓰면 학기 history에 process-local secret이 남는다. | Config에는 env 이름과 정적 entrypoint만 두고 값은 Runtime child environment로 공급한다. |
| MCP entrypoint path drift | `hub/`와 SemesterWorkspace 중 하나만 이동하면 tracked relative command가 더는 Adapter를 가리키지 않는다. | Bootstrap Update가 두 canonical root 사이의 command를 다시 계산하고 config diff를 checkpoint한다. App startup은 missing required Adapter를 fail closed한다. |
| Broker-before-Runtime 순서 역전 | Shared listener나 private route가 online이 되기 전에 required Adapter를 시작하면 deterministic startup failure가 발생하거나 다른 endpoint로 우회하고 싶어진다. | Listener bind와 Broker binding을 Runtime spawn의 명시적인 선행 capability로 만들고 실패 시 child process를 만들지 않는다. |
| Stale Broker credential | 종료된 Adapter token이 다음 Runtime generation에서도 유효하면 old process가 새 workspace interaction으로 오인될 수 있다. | Generation마다 fresh token·opaque binding을 만들고 close·replacement에서 폐기하며 exact active generation만 admission한다. |
| Private route의 Browser 노출 | Loopback·same-origin만 믿거나 token을 Browser contract에 넣으면 page script와 다른 local process가 Broker를 호출할 수 있다. | Route를 Server-private로 유지하고 loopback peer, secret과 active binding을 모두 검사하며 secret을 Browser payload·log·config에 넣지 않는다. |
| Concurrent interaction의 App workflow화 | 여러 capability request를 queue하거나 동시에 표시하면 App이 ordering·priority·preemption과 여러 pending UI lifecycle을 소유하게 된다. | Runtime generation마다 slot 하나만 두고 후속 request는 Browser에 투영하지 않은 채 `busy`로 끝낸다. Fresh retry 판단은 AY에 둔다. |
| Human decision의 native timeout | Held Broker response가 정상이어도 current pinned default 300초를 넘기면 Codex가 MCP call을 먼저 실패시킬 수 있다. | 초기 제품 한계로 5분을 수용하고 timeout을 정상 result가 아닌 MCP failure로 terminal 정산한다. 실제 5분 초과 요구가 확인될 때만 explicit override를 검토한다. |
| Lost terminal response replay | User result 뒤 connection이 끊겼다고 App이 response를 replay하거나 apply하면 Agent가 실제로 result를 받았는지와 workspace state가 갈린다. | Delivery ambiguity를 성공으로 추정하지 않고 call을 실패 처리한다. Retry는 fresh capability call이며 App은 workspace mutation을 수행하지 않는다. |
| False-positive MCP readiness | 새 status 조회가 임시 MCP manager를 만들거나 단순히 STDIO process가 떴다는 사실만 관찰하면 실제 Product Adapter의 생존 여부를 증명하지 못한다. | Actual Adapter가 handshake 뒤 한 held Broker lifecycle channel을 열어야 initialize를 성공시키고, Broker status가 startup readiness·continuity loss·registry acceptance를 직접 소유한다. |
| Untrusted project config 무시 | Codex는 신뢰하지 않은 project의 `.codex/config.toml`을 읽지 않으므로 Interaction MCP가 조용히 사라지고 그 안의 `required = true`도 적용되지 않을 수 있다. | Exact Git root와 `workspace-write` thread start의 native trust write·config reload를 먼저 사용하고, 뒤이어 exact effective declaration과 held Adapter lifecycle을 확인한다. Explicit `untrusted`를 덮어쓰지 않고 startup을 실패시킨다. |
| Parent trust 오해 | `../workspace/`를 trusted로 기록하면 하위 학기 Git repository도 신뢰된다고 오해할 수 있다. | Current trust lookup은 exact project·Git root 기준이다. Bootstrap은 global trust를 수정하지 않고 pinned App Server의 exact-root thread-start 동작을 regression test로 고정한다. |
| Native context 오해 | Workspace의 `AGENTS.override.md`, project `.codex/`와 Skills는 AY behavior를 바꿀 수 있다. | App-owned exact bundle로 덮어쓰거나 일반 사용자 context를 drift로 차단하지 않는다. Init Skill은 existing bytes를 존중하고 Runtime은 실제 effective context를 관측 가능한 범위에서 표시한다. |
| Ancestor native context 혼입 | SemesterWorkspace가 독립 Git root가 아니거나 Runtime이 descendant·parent를 cwd로 사용하면 다른 project의 `AGENTS.md`, `.codex/`와 Skills를 읽을 수 있다. | 선택한 canonical directory가 한 학기 전용 Git root임을 확인하고 persistent bridge·one-shot probe·thread가 모두 그 exact root를 cwd로 사용한다. Native `.git` boundary의 effective config·Skill 결과를 provider-free smoke로 검증한다. |
| 기존 자료 손실 | Existing Git workspace를 app-owned scaffold로 정규화하거나 복사하면 실제 사용자 자료와 history가 갈라질 수 있다. | 사용자가 선택한 repository를 그 자리에서 채택하고 init Skill과 AY가 일반 Git 안전 원칙을 따른다. |
| 민감 상태 혼입 | `CODEX_HOME`을 workspace에 두면 auth·session·log가 사용자 자료와 섞인다. | 전역 `CODEX_HOME`과 workspace의 root 비중첩을 검증한다. |
| Host context 혼입 | Custom home만으로 ambient provider·environment가 모두 차단된다고 볼 수 없다. | Child environment를 allowlist로 재구성하고 exact local-provider에서 effective state를 검증한다. |
| Sandbox 과신 | Codex sandbox와 approval은 OS process 격리가 아니다. | Local personal-device 경계로 한정하고 cloud 전환 시 별도 threat model을 작성한다. |
| 권한 경계 혼동 | Native permission은 Codex execution을, InteractionCapability result는 AY workflow의 사용자 판단을 전달한다. | 어느 결정도 다른 결정을 암묵적으로 승인하지 않고 별도 identity·state로 다룬다. |

## 구현과 계획 연결

현재 횡단 topology와 검증 표면은 [Codex Chat 구현 지도](codex-chat-implementation-map.md), Runtime artifact·process의 package 동작은 [codex-chat-runtime README](../../packages/codex-chat-runtime/README.md), AY↔App seam은 [Interaction Capability 아키텍처](ay-app-interaction-capabilities.md)가 소유한다. 중단한 public distribution과 managed product account 결정은 historical ADR 0016·0017에 남기고, 후속 작업 순서와 완료 조건은 [개발 백로그](../product/ay-ple-development-backlog.md)에서만 관리한다.

## 근거 링크

| 주제 | 공식/확인 출처 |
| --- | --- |
| Codex App Server 용도, protocol, transport, schema generation | [Codex App Server](https://developers.openai.com/codex/app-server) |
| `CODEX_HOME`, `CODEX_SQLITE_HOME`, installer/auth environment variables | [Environment variables](https://developers.openai.com/codex/environment-variables) |
| `CODEX_HOME`의 config/auth/history/log 위치, project config 제한 | [Advanced configuration](https://developers.openai.com/codex/config-advanced) |
| `codex app-server` maturity와 CLI flags | [Command line options](https://developers.openai.com/codex/cli/reference) |
| Sandbox mode와 approval policy | [Sandbox](https://developers.openai.com/codex/concepts/sandboxing) |
