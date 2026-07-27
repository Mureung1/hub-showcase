# Codex Runtime 격리 기술 메모

작성일: 2026-07-07

최근 갱신: 2026-07-27

분류: 활성

성숙도: 채택

관련 문서: [Codex App Server 우선 사용 ADR](../adr/0005-use-codex-app-server-as-first-class-mvp-runtime.md), [제품 실행 경로 분리 ADR](../adr/0006-separate-package-app-data-and-semester-workspace-roots.md), [user-owned Git SemesterWorkspace ADR](../adr/0018-adopt-user-owned-git-semester-workspaces.md), [InteractionCapability ADR](../adr/0019-use-mcp-interaction-capabilities-as-the-ay-app-seam.md), [AY–App Interaction Capability 아키텍처](ay-app-interaction-capabilities.md), [historical app-owned SemesterWorkspace ADR](../adr/0014-create-app-owned-normalized-semester-workspaces.md), [Official Codex Python SDK ADR](../adr/0011-reuse-official-codex-python-sdk-for-chat-shell.md), [single Runtime graph ADR](../adr/0012-adopt-codex-chat-only-and-remove-legacy-runtime-surfaces.md), [product-only cutover·durable v2 ADR](../adr/0013-adopt-product-only-public-surface-and-v2-store-compatibility-baseline.md), [macOS-first 제품 경로 ADR](../adr/0009-use-a-macos-first-local-web-app-product-path.md), [Codex Chat 구현 지도](codex-chat-implementation-map.md), [개발 백로그](../product/ay-ple-development-backlog.md)

## 목적

AY-PLE가 Codex App Server를 built-in local agent engine으로 사용할 때 runtime artifact, process environment, native state와 사용자 `SemesterWorkspace`를 어떻게 분리하는지 설명한다. [ADR 0006](../adr/0006-separate-package-app-data-and-semester-workspace-roots.md)이 root 소유권을, [ADR 0018](../adr/0018-adopt-user-owned-git-semester-workspaces.md)이 personal canonical layout과 workspace adoption을, [ADR 0013](../adr/0013-adopt-product-only-public-surface-and-v2-store-compatibility-baseline.md)이 durable current v2 보존 정책을 결정한다. [ADR 0014](../adr/0014-create-app-owned-normalized-semester-workspaces.md), [ADR 0016](../adr/0016-distribute-public-preview-with-an-exact-npx-launcher-and-verified-runtime-release.md)과 [ADR 0017](../adr/0017-use-codex-managed-browser-oauth-for-product-account-lifecycle.md)은 제거한 app-owned workspace·public application delivery·managed account lifecycle의 historical 결정이다.

Transport, 상태 격리, sandbox, 인증 저장소와 packaging risk 같은 저수준 기술 경계는 이 문서가 소유한다. 제품 문제와 AY↔App interaction, package의 exact 동작, 작업 순서는 각각 Product Brief·Interaction Capability 아키텍처, 구현 지도·package README, Development Backlog를 따른다.

## 현재 구현, 제품 목표와 후속

| 영역 | 현재 product 구현 | 채택한 목표 | 후속 |
| --- | --- | --- | --- |
| Runtime stack | `@ay-ple/codex-chat-runtime`이 exact official source, generated SDK, standalone CPython과 native `0.144.4`를 canonical manifest로 검증한 뒤 package-local `.artifacts/` bundle만 시작한다. | Repository-local 실행은 같은 verified Runtime dependency를 sibling `../.ay-ple/runtime/`에서 시작한다. 별도 release resolver와 production host는 유지하지 않는다. | Canonical path materialization·검증 뒤 package-local `.artifacts/` cleanup |
| Runtime state | Canonical composition이 explicit `../.ay-ple-dogfood/app-data` 아래 app-managed `HOME`, `CODEX_SQLITE_HOME`, temp/runtime state를 계산·준비하고 caller의 전역 `CODEX_HOME`을 결합한다. | Canonical sibling `../.ay-ple/`은 Runtime payload, `WorkspaceRegistry`, cache·temp만 소유하고 기존 `~/.codex`를 account·config·session authority로 재사용한다. | Legacy dogfood profile·isolated Codex residue와 duplicate recipe/staging cleanup |
| Account lifecycle | Current dev·dogfood는 workspace-only `CodexWorkspaceRuntime`을 통해 caller의 `CODEX_HOME`, 또는 미설정 시 `~/.codex`에서 fresh account readiness만 읽는다. 별도 auth profile·device-auth helper·credential copy·Browser OAuth UI와 Node login·logout surface는 없다. | 개인용 실행에서는 전역 Codex account를 단일 authority로 사용한다. | Read-only account plan·usage가 실제 제품 행동에 필요할 때 별도 surface 검토 |
| 작업 `cwd` | Root startup·Browser activation이 chooser·development override로 연 current-v2 directory를 internal `ready`로 판정해 product thread의 exact native `cwd`로 사용한다. `CODEX_CHAT_WORKSPACE`는 manual-development selection override다. | `../workspace/` 아래에서 사용자가 선택한 한 학기 전용 Git root를 active `SemesterWorkspace`, Codex project root와 thread의 고정 `cwd`로 채택한다. Descendant는 작업 대상일 뿐 별도 cwd가 아니며 다른 학기 thread와 섞지 않는다. | Account-first selection, durable active workspace registry와 init Skill |
| 학기 제품 상태 | Workspace current canonical v2 store가 `.ay-ple/workspace-state.json`에 stable workspace ID·한 Course, confirmed state·settled history·execution guard를 original-byte authority와 compare-before-rename으로 보존한다. Invalid·unsupported bytes는 `incompatible/readOnly`로 연다. | Git-tracked root `workspace-state.json`은 identity와 필요한 current structured snapshot만 보존한다. Event history는 Git이 맡고 interaction request/result·duplicate Run 배열과 transient guard는 SSOT에서 제거한다. | Exact minimal schema와 split-store crash recovery 검증 |
| Native context | Runtime의 persistent bridge와 one-shot official App Server sidecar가 모두 fixed `project_root_markers=[]`, exact workspace `cwd`와 controlled environment를 사용한다. Sidecar의 `config/read`·`skills/list` raw protocol은 Runtime-private이고 Server는 atomic high-level snapshot만 소비한다. `@ay-ple/semester-workspace`의 bundle verifier와 Server native boundary는 static·effective conflict를 검사하지만 current action/setup composition에는 아직 연결되지 않았다. | Exact Git root에서 native project discovery를 사용해 workspace-local config·instruction·Skill을 읽는다. App은 broad CLI override나 process-wide managed Skill root로 이 context를 대체하지 않는다. | Fixed project marker·managed Skill override 제거, init Skill contract와 obsolete bundle verifier contraction |
| Transport·policy | Local companion이 detached Node→Python→App Server tree를 supervise한다. First Assignment product Turn은 `auto_review + workspace_write`를 explicit하게 보낸다. | Codex execution permission과 InteractionCapability result를 분리하고 Browser에는 allowlisted product activity와 capability UI만 전달한다. | Interactive native approval UX과 cloud threat model |

Current product startup·Runtime command는 전역 `CODEX_HOME`을 의도적으로 재사용하고 package-local Runtime과 sibling dogfood appData를 조합한다. Current chooser·materializer와 product action은 current v2 directory를 사용하며 internal `ready`를 adopted `Semester Ready`로 해석하지 않는다. Adopted personal target은 Runtime과 mutable execution state를 canonical `../.ay-ple/`로 모으고 전역 Codex authority를 그대로 사용하며, current legacy roots를 새 authority로 자동 채택하지 않는다. Public application host, Runtime release resolver와 public-preview Account→Setup→Ready Server·Browser graph는 2026-07-24 hard cutover에서 제거했다. App-owned v3 scaffold·bundle primitive도 ADR 0018의 target과 충돌하므로 후속 contraction 대상이다.

## 격리 레이어

| 레이어 | 채택한 경계 | 보장하지 않는 것 |
| --- | --- | --- |
| Runtime/version | `@ay-ple/codex-chat-runtime`의 tracked canonical manifest와 complete-tree verifier를 통과한 Python·SDK·native bundle만 사용한다. Current package-local bundle은 canonical `../.ay-ple/runtime/`으로 전환한다. | Codex state, auth와 session 분리 |
| Runtime environment | Inherited environment 대신 explicit `HOME`, Codex homes, temp와 fixed executable path를 전달 | Container, VM 또는 별도 OS user 수준 격리 |
| Runtime state roots | Global Codex authority `~/.codex`와 AY-PLE appData `../.ay-ple/`의 Runtime payload·registry·cache·temp를 명시적으로 구분 | Codex 전역 config·Skill·memory의 AY-PLE 전용 격리 |
| Account lifecycle | 전역 `CODEX_HOME`의 fresh Account Readiness만 Server가 Browser-safe `ready | not_ready | unavailable`로 투영 | In-app login·logout·account switching, 모든 official Browser URL의 무토큰성 |
| Workspace | 사용자가 선택한 한 학기 전용 Git repository를 active `SemesterWorkspace`와 exact native `cwd`로 전달 | Auth·Runtime state 저장소 격리, AY의 file operation 정확성 |
| Native context | Persistent Runtime과 one-shot probe는 같은 canonical Git root를 `cwd`로 사용하고 Codex의 native `.git` project boundary와 project config·instruction·Skill discovery를 따른다. Raw App Server protocol은 Runtime-private이며 opt-in Memories는 별도 비권위적 맥락이다. | Workspace identity, official system capability, 학업 사실의 정확성, 모든 작업의 memory 생성 |
| Sandbox·approval | Product Turn의 permission profile과 InteractionCapability의 사용자 result를 서로 다른 경계로 유지 | OS process 보안 경계, path-level filesystem immutability, generic approval center |
| Transport | Local companion이 private Node↔Python NDJSON과 `stdio://` App Server process를 소유 | Protocol 변경과 packaging risk 제거 |

## Canonical product layout seam

### 현재 개발 composition

Root `npm run dev`는 repository-relative personal app data·existing workspace와 Runtime artifact를 직접 조합한다. Caller가 여섯 legacy path를 맞추거나 environment에서 root model을 다시 만들지 않는다. `--root`와 `--workspace` override도 repository 기준 상대 경로나 absolute path로 같은 검증을 통과한다. V3 scaffold·`WorkspaceManifest` admission Module은 구현됐지만 현재 composition은 existing directory와 current-v2 store를 사용하며, workspace registry와 public admission route를 조합하지 않는다.

### 채택한 personal canonical layout

| Root | Canonical path | 소유권 |
| --- | --- | --- |
| `packageRoot` | `hub/` | Tracked source와 built-in Skill, rebuildable `node_modules`·`dist` |
| `appDataRoot` | `../.ay-ple/` | Verified Runtime payload, `WorkspaceRegistry`, cache와 temp |
| Semester parent | `../workspace/` | 학기별 독립 Git repository |
| Global Codex | `~/.codex/` | 기존 account, config, Skill과 Codex-managed session state |

Path는 `packageRoot` 기준 sibling을 canonicalize하며 current process directory나 environment fallback으로 다시 추론하지 않는다. Runtime payload는 `../.ay-ple/runtime/`에 새로 materialize·검증하고 package-local `.artifacts/` byte를 migration source로 복사하지 않는다. Generated ModelingRecipe, assignment staging, isolated Codex home과 managed development workspace도 이관하지 않는다. 전역 Codex 연결, actual SemesterWorkspace open과 canonical Runtime smoke가 성공한 뒤 `../.ay-ple-dogfood/`, `../.ay-ple-dev-workspaces/`와 package-local `.artifacts/`를 scoped residue cleanup한다. Cleanup 전에는 기존 directory를 rollback evidence로 그대로 보존한다. Source-derived npm dependency와 build output은 `hub/`에 남길 수 있지만 mutable execution state는 두지 않는다.

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
| Manual override | `CODEX_CHAT_WORKSPACE`는 current development materializer의 caller-owned selection input일 뿐 public workspace admission, Runtime root, app data 또는 별도 `cwd` authority가 아니다. |
| Data loss | `appDataRoot`가 사라져도 `RawMaterial`과 confirmed·settled product state를 workspace에서 다시 열 수 있다. |

Current product factory는 Runtime spawn 전과 factory 내부에서 package-local artifact·path를 다시 검증해 TOCTOU drift를 fail closed한다. Child environment는 controlled root와 필수 OS directory만으로 재구성하며 ambient credential·provider·`PYTHONPATH`·dynamic loader variable를 계승하지 않는다.

## 제품용 directory 구조

현재 구현은 아래 current-v2 layout을 사용한다. 이 tree는 First Assignment vertical의 구현 사실이며 app-owned scaffold target이 아니다.

```text
package-root/
  packages/codex-chat-runtime/
    .artifacts/production-runtime-darwin-arm64/
      bundle/

user-app-data/
  runtime/
    home/                     # isolated child HOME
    codex-sqlite-home/        # CODEX_SQLITE_HOME
    temp/                     # temporary/runtime state

global-codex-home/            # caller CODEX_HOME 또는 ~/.codex

chooser-selected-directory/
  AGENTS.md                  # 선택 사항, native instruction
  .agents/skills/             # 선택 사항, native Skills
  .ay-ple/
    workspace-state.json      # current durable v2 authority
    runtime-scratch/          # Run-bound transient workspace writes
```

채택한 personal target의 논리 seam은 아래와 같다. Root `workspace-state.json`은 Git-tracked workspace-local JSON authority이며 transient field 경계는 후속 결정이 고정한다.

```text
hub/
  .agents/skills/             # 개발 harness와 AY-PLE 제품 Skill source catalog
  node_modules/               # rebuildable npm dependency
  **/dist/                    # rebuildable output

../.ay-ple/
  runtime/                    # verified Python/Codex Runtime dependency
  state/                      # WorkspaceRegistry
    workspaces/<workspaceId>/
      runtime-state.json      # non-tracked transient operation state
  cache/
  temp/

~/.codex/                     # global Codex authority

../workspace/<semester>/      # one semester, one Git repository
  AGENTS.md                   # init Skill이 준비하는 간단한 workspace 지침
  .agents/skills/             # source catalog에서 복사한 Git-tracked 실행 Skill
  workspace-state.json        # Git-tracked workspace-local JSON authority
  <actual-semester-files>
```

Personal local target에서는 `hub/.agents/skills/`가 repository 개발 harness와 AY-PLE 제품 Skill의 tracked source catalog를 함께 맡는다. Init·Update Skill은 그중 선택한 source directory를 workspace의 `.agents/skills/`로 복사하며 symlink를 만들지 않는다. Workspace copy가 exact Git root에서 Codex가 native discovery하는 실행 authority이고 Git이 실제 사용 byte를 기록한다. Source catalog 변경은 명시적인 Update와 workspace diff 없이 기존 학기를 바꾸지 않는다. Public distribution 요구 전에는 별도 `hub/skills/`나 package·plugin 계층을 만들지 않는다.

Target workspace의 `AGENTS.md`와 Skills는 App-owned exact bundle이 아니다. Init Skill은 existing bytes를 존중하면서 최소 지침과 Skill copy를 준비하고, AY는 exact Git root에서 Codex의 native project config·instruction·Skill discovery를 사용한다. Current Runtime의 fixed `project_root_markers=[]`, process-wide managed Skill root와 one-shot `config/read`·`skills/list` probe는 현재 구현 사실이다. Target은 fixed marker와 managed Skill override를 제거하되 effective context 관측 seam은 필요한 범위에서 유지하며, consumer 없는 v3 bundle verifier가 target workspace contents를 소유하거나 drift를 이유로 일반 사용자 파일을 막지 않는다.

사용자가 선택한 Git root의 실제 자료는 별도 import·registration 없이 AY의 작업 대상이다. App은 자료를 `RawMaterial`로 승격하거나 snapshot해야만 native `cwd`에서 읽을 수 있게 하는 admission layer를 두지 않는다. Codex-managed state의 내부 file roster도 product contract로 고정하지 않는다.

## Durable store와 rollback

Workspace-local file과 Git은 app data나 native session과 다른 durable authority다. Current v2 store는 전환 전 compatibility baseline이므로 Server lifecycle과 cutover가 original bytes를 삭제하지 않는다. Target은 root `workspace-state.json` 하나에 identity와 필요한 current snapshot만 두고, pending interaction·native execution·academic event history는 넣지 않는다. Exact current codec·I/O 동작은 [Server README](../../apps/server/README.md#workspace-local-durable-store), target workspace authority는 ADR 0018, interaction state 경계는 ADR 0019가 소유한다.

## 리스크와 대응

| 리스크 | 설명 | 대응 |
| --- | --- | --- |
| Artifact drift | Canonical appData Runtime byte가 바뀌면 검토한 Runtime과 달라진다. | Tracked manifest와 complete tree를 composition preflight와 spawn 경계에서 fail closed로 검증한다. |
| Silent Runtime fallback | 손상된 canonical Runtime에서 package-local residue, system Python이나 ambient executable로 넘어가면 application contract가 바뀐다. | Factory는 `../.ay-ple/runtime/`의 exact verified bundle만 시작하고 실패 시 닫는다. |
| Runtime state root 분리 | 전역 Codex state, AY-PLE operation state와 학기 authority의 수명·복구 책임이 다르다. | Codex-managed account·config·session은 `~/.codex`, Runtime payload·registry·cache·temp·workspace별 transient guard는 `../.ay-ple/`, 학기 상태는 workspace에 둔다. |
| Credential authority 분열 | AY-PLE token store와 global Codex home를 함께 쓰면 refresh·logout owner가 갈라진다. | Current startup은 AY-PLE credential store를 만들지 않고 전역 `CODEX_HOME` 하나만 사용한다. |
| Workspace 오선택 | Registry나 development override가 사용자 의도와 다른 root를 가리킬 수 있다. | 한 학기 전용 Git root와 workspace-local JSON identity를 재검증하고 thread 생성·재개 전 recorded `cwd`가 canonical root와 정확히 같은지 확인한다. Registry는 pointer로만 사용한다. |
| Workspace authority 분열 | Current store 옆에 새 manifest sidecar를 만들면 같은 workspace·Course identity를 각각 소유한다. | Current aggregate model을 root `workspace-state.json`으로 옮기고 별도 sidecar를 만들지 않는다. |
| Split-store recovery | Workspace write와 appData의 transient operation state가 서로 다른 시점에 중단될 수 있다. | `workspace-state.json`의 confirmed bytes만 학기 authority로 취급하고 runtime state는 재검증 가능한 operation hint로 한정한다. |
| 이력 중복 | Git history와 `statePatches`·`userConfirmations`·`modelingRuns` 배열이 같은 변경을 서로 다른 방식으로 기록하면 rollback 의미가 갈린다. | Workspace SSOT는 current confirmed snapshot만 저장하고 장기 변경 이력은 Git checkpoint 하나로 통일한다. |
| Evidence self-reference | `workspace-state.json`을 포함하는 commit SHA를 같은 JSON에 넣으면 commit identity를 계산할 수 없다. | `EvidenceRef`는 relative path, exact content digest와 locator를 저장하고 Git history는 해당 content version을 찾는 수단으로만 사용한다. |
| Workspace instruction drift | Init Skill이 기존 `AGENTS.md`를 덮어쓰거나 지나치게 상세한 policy를 만들면 사용자 지침과 AY의 판단 공간을 잃는다. | 기존 bytes를 존중하고 commit checkpoint 같은 짧은 원칙만 두며 App code가 exact instruction bundle을 소유하지 않는다. |
| Skill version drift | `hub/.agents/skills/`의 변경이 기존 학기의 실행 동작을 암묵적으로 바꾸면 Git history와 실제 AY behavior가 어긋난다. | Workspace에 real directory를 복사하고 명시적인 Update와 Git diff·checkpoint를 거쳐서만 바꾼다. Symlink와 Runtime `extraRoots` 주입을 사용하지 않는다. |
| Native context 오해 | Workspace의 `AGENTS.override.md`, project `.codex/`와 Skills는 AY behavior를 바꿀 수 있다. | App-owned exact bundle로 덮어쓰거나 일반 사용자 context를 drift로 차단하지 않는다. Init Skill은 existing bytes를 존중하고 Runtime은 실제 effective context를 관측 가능한 범위에서 표시한다. |
| Ancestor native context 혼입 | SemesterWorkspace가 독립 Git root가 아니거나 Runtime이 descendant·parent를 cwd로 사용하면 다른 project의 `AGENTS.md`, `.codex/`와 Skills를 읽을 수 있다. | 선택한 canonical directory가 한 학기 전용 Git root임을 확인하고 persistent bridge·one-shot probe·thread가 모두 그 exact root를 cwd로 사용한다. Native `.git` boundary의 effective config·Skill 결과를 provider-free smoke로 검증한다. |
| 기존 자료 손실 | Existing Git workspace를 app-owned scaffold로 정규화하거나 복사하면 실제 사용자 자료와 history가 갈라질 수 있다. | 사용자가 선택한 repository를 그 자리에서 채택하고 init Skill과 AY가 일반 Git 안전 원칙을 따른다. |
| Workspace authority drift | Registered TXT나 store가 Turn·Server 수명 중 바뀌면 stale authority로 덮어쓸 수 있다. | Source drift는 interrupt·explicit rebaseline, store drift는 compare-before-rename·explicit reactivation으로 원본을 보존한다. |
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
