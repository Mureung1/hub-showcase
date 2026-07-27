# Codex Runtime 격리 기술 메모

작성일: 2026-07-07

최근 갱신: 2026-07-27

분류: 활성

성숙도: 채택

관련 문서: [Codex App Server 우선 사용 ADR](../adr/0005-use-codex-app-server-as-first-class-mvp-runtime.md), [제품 실행 경로 분리 ADR](../adr/0006-separate-package-app-data-and-semester-workspace-roots.md), [app-owned SemesterWorkspace ADR](../adr/0014-create-app-owned-normalized-semester-workspaces.md), [Official Codex Python SDK ADR](../adr/0011-reuse-official-codex-python-sdk-for-chat-shell.md), [single Runtime graph ADR](../adr/0012-adopt-codex-chat-only-and-remove-legacy-runtime-surfaces.md), [product-only cutover·durable v2 ADR](../adr/0013-adopt-product-only-public-surface-and-v2-store-compatibility-baseline.md), [macOS-first 제품 경로 ADR](../adr/0009-use-a-macos-first-local-web-app-product-path.md), [historical public npx distribution ADR](../adr/0016-distribute-public-preview-with-an-exact-npx-launcher-and-verified-runtime-release.md), [Codex-managed product account ADR](../adr/0017-use-codex-managed-browser-oauth-for-product-account-lifecycle.md), [Codex Chat 구현 지도](codex-chat-implementation-map.md), [개발 백로그](../product/ay-ple-development-backlog.md)

## 목적

AY-PLE가 Codex App Server를 built-in local agent engine으로 사용할 때 runtime artifact, process environment, native state와 사용자 `SemesterWorkspace`를 어떻게 분리하는지 설명한다. [ADR 0006](../adr/0006-separate-package-app-data-and-semester-workspace-roots.md)이 root 소유권을, [ADR 0014](../adr/0014-create-app-owned-normalized-semester-workspaces.md)가 workspace admission·identity authority를, [ADR 0013](../adr/0013-adopt-product-only-public-surface-and-v2-store-compatibility-baseline.md)이 canonical product cutover와 durable current v2 보존 정책을 결정한다. [ADR 0016](../adr/0016-distribute-public-preview-with-an-exact-npx-launcher-and-verified-runtime-release.md)과 [ADR 0017](../adr/0017-use-codex-managed-browser-oauth-for-product-account-lifecycle.md)은 제거한 public application delivery·managed account lifecycle의 historical 결정이다.

Transport, 상태 격리, sandbox, 인증 저장소와 packaging risk 같은 저수준 기술 경계는 이 문서가 소유한다. 제품 문제와 작업 조합, package의 exact 동작, 작업 순서는 각각 Product Brief·composition, 구현 지도·package README, Development Backlog를 따른다.

## 현재 구현, 제품 목표와 후속

| 영역 | 현재 product 구현 | 채택한 목표 | 후속 |
| --- | --- | --- | --- |
| Runtime stack | `@ay-ple/codex-chat-runtime`이 exact official source, generated SDK, standalone CPython과 native `0.144.4`를 canonical manifest로 검증한 뒤 package-local bundle만 시작한다. | Repository-local 실행은 이 package-local verified bundle을 그대로 사용한다. 별도 release resolver와 production host는 유지하지 않는다. | Runtime pin upgrade가 실제로 필요할 때의 별도 검증 |
| Runtime state | Canonical composition이 explicit `appDataRoot` 아래 app-managed `HOME`, `CODEX_SQLITE_HOME`, temp/runtime state를 계산·준비하고 caller의 전역 `CODEX_HOME`을 결합한다. | 개인용 실행은 기존 Codex 인증·설정을 재사용하고 AY-PLE 전용 auth profile을 만들지 않는다. | macOS 기본 app data path와 runtime state rollover 정책 |
| Account lifecycle | Current dev·dogfood는 workspace-only `CodexWorkspaceRuntime`을 통해 caller의 `CODEX_HOME`, 또는 미설정 시 `~/.codex`에서 fresh account readiness만 읽는다. 별도 auth profile·device-auth helper·credential copy·Browser OAuth UI와 Node login·logout surface는 없다. | 개인용 실행에서는 전역 Codex account를 단일 authority로 사용한다. | Read-only account plan·usage가 실제 제품 행동에 필요할 때 별도 surface 검토 |
| 작업 `cwd` | Root startup·Browser activation이 chooser·development override로 연 current-v2 directory를 internal `ready`로 판정해 product thread의 exact native `cwd`로 사용한다. `CODEX_CHAT_WORKSPACE`는 manual-development selection override다. | App이 생성하고 `WorkspaceManifest` validation을 통과한 active `SemesterWorkspace`만 `cwd`가 된다. 사용자는 학기 정보와 생성 위치를 고르며 identity는 `WorkspaceManifest`가 소유한다. | Scaffold·admission 전환과 durable active workspace registry |
| 학기 제품 상태 | Workspace current canonical v2 store가 stable workspace ID·한 Course, confirmed state·settled history·execution guard를 original-byte authority와 compare-before-rename으로 보존한다. Invalid·unsupported bytes는 `incompatible/readOnly`로 연다. | `WorkspaceManifest`가 workspace·Course identity와 관계를 단독 소유하고, app data 손실·Server restart·rollback에도 workspace만으로 확인된 상태를 다시 연다. | Current v2 identity의 explicit version transition, backup/restore·signature 정책 |
| Native context | Runtime의 persistent bridge와 one-shot official App Server sidecar가 모두 fixed `project_root_markers=[]`, exact workspace `cwd`와 controlled environment를 사용한다. Sidecar의 `config/read`·`skills/list` raw protocol은 Runtime-private이고 Server는 atomic high-level snapshot만 소비한다. `@ay-ple/semester-workspace`의 bundle verifier와 Server native boundary는 static·effective conflict를 검사하지만 current action/setup composition에는 아직 연결되지 않았다. | Fresh setup이 workspace instruction/Skill bundle을 설치·검증하고 effective native context gate를 통과한 뒤에만 Codex action을 연다. Memory는 명시적 설정과 eligibility 확인 뒤 비권위적 맥락으로만 사용한다. | Memory 활성화·consent·rollover UX |
| Transport·policy | Local companion이 detached Node→Python→App Server tree를 supervise한다. First Assignment product Turn은 `auto_review + workspace_write`를 explicit하게 보낸다. | Codex execution permission은 AY-PLE Review·`UserConfirmation`과 분리하고 Browser에는 allowlisted product activity만 전달한다. | Interactive native approval UX과 cloud threat model |

Current product startup·install·Runtime command는 전역 `CODEX_HOME`만 의도적으로 재사용하고 ambient provider variable, legacy env, repository `.ay-ple`, system Python이나 `process.cwd()`를 fallback으로 사용하지 않는다. Legacy local data를 탐색·이관·삭제하지 않고 다른 clone·external root의 상태를 추론하지 않는다. Current chooser·materializer와 product action은 current v2 directory를 사용하며 internal `ready`를 adopted `Semester Ready`로 해석하지 않는다. Public application host, Runtime release resolver와 public-preview Account→Setup→Ready Server·Browser graph는 2026-07-24 hard cutover에서 제거했다. Node Runtime의 managed account·pre-workspace surface도 제거됐고 v3 workspace package primitive는 ADR 0014의 adopted target 기반으로 유지한다.

## 격리 레이어

| 레이어 | 채택한 경계 | 보장하지 않는 것 |
| --- | --- | --- |
| Runtime/version | `@ay-ple/codex-chat-runtime`의 tracked canonical manifest와 complete-tree verifier를 통과한 package-local Python·SDK·native bundle만 사용 | Codex state, auth와 session 분리 |
| Runtime environment | Inherited environment 대신 explicit `HOME`, Codex homes, temp와 fixed executable path를 전달 | Container, VM 또는 별도 OS user 수준 격리 |
| Runtime state roots | 전역 `CODEX_HOME`과 app-managed `CODEX_SQLITE_HOME`·`HOME`·temp를 명시적으로 결합 | Codex 전역 config·Skill·memory의 AY-PLE 전용 격리 |
| Account lifecycle | 전역 `CODEX_HOME`의 fresh Account Readiness만 Server가 Browser-safe `ready | not_ready | unavailable`로 투영 | In-app login·logout·account switching, 모든 official Browser URL의 무토큰성 |
| Workspace | App-owned admission과 `WorkspaceManifest` validation을 통과한 active `SemesterWorkspace`를 exact native `cwd`로 전달 | Auth·Runtime state 저장소 격리, 외부 `ImportSource` 분석·반입 방식 |
| Native context | Workspace instruction/Skill bundle과 실제 native config·Skill discovery를 각각 검증한다. Persistent Runtime과 one-shot probe는 workspace root와 fixed empty project marker를 공유하고 raw App Server protocol은 Runtime-private다. Opt-in Memories는 별도 비권위적 맥락이다. | Workspace identity, official system capability, 학업 사실의 정확성, 모든 작업의 memory 생성 |
| Sandbox·approval | Product Turn의 `auto_review + workspace_write`를 exact native profile로 전달하고 AY-PLE `UserConfirmation`과 별도 state로 유지 | OS process 보안 경계, path-level filesystem immutability, generic approval center |
| Transport | Local companion이 private Node↔Python NDJSON과 `stdio://` App Server process를 소유 | Protocol 변경과 packaging risk 제거 |

## Canonical product layout seam

### 현재 개발 composition

Root `npm run dev`는 repository-relative personal app data·existing workspace와 Runtime artifact를 직접 조합한다. Caller가 여섯 legacy path를 맞추거나 environment에서 root model을 다시 만들지 않는다. `--root`와 `--workspace` override도 repository 기준 상대 경로나 absolute path로 같은 검증을 통과한다. V3 scaffold·`WorkspaceManifest` admission Module은 구현됐지만 현재 composition은 existing directory와 current-v2 store를 사용하며, workspace registry와 public admission route를 조합하지 않는다.

### 중단한 public target

아래 표는 2026-07-23까지 public setup·relaunch target으로 검토한 historical context다. 현재 제품 목표나 구현 불변 조건이 아니다.

| 입력·결과 | 불변 조건 |
| --- | --- |
| `packageRoot` | Product state를 쓰지 않으며 exact application code, dedicated workspace instruction/Skill resource subtree·digest descriptor와 embedded Runtime descriptor·canonical manifest를 찾는다. Ambient repository-root `AGENTS.md`·`.agents/`를 product resource로 복사하지 않는다. Host는 declared application resource를 workspace mutation 전에 complete-tree 검증한다. Runtime payload cache나 moving remote catalog를 authority로 두지 않는다. |
| `appDataRoot` | Explicit absolute non-symlink directory다. Workspace 밖에 있고 verified immutable Runtime generation·retained archive, app-managed `HOME`·`CODEX_HOME`·`CODEX_SQLITE_HOME`·temp/runtime state와 workspace registry를 분리해 계산한다. Pending approved setup transaction과 active Ready pointer를 구분하며 registry는 pointer이지 workspace identity authority가 아니다. |
| Resolver result | Single `RuntimeResolver`가 exact binding과 complete tree를 확인한 immutable `runtimeRoot`·Runtime identity만 production host에 반환한다. Missing·corrupt state는 scoped repair하거나 fail closed하며 다른 version으로 fallback하지 않는다. |
| Auth-only bootstrap | Runtime role과 empty·disjoint root validation은 package primitive로 남지만 current Server·Browser consumer는 없다. |
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

채택한 target의 논리 seam은 아래와 같다. `.ay-ple/workspace-state.json`은 logical `WorkspaceManifest`와 app-owned dynamic state를 한 v3 atomic authority에 담는다. Exact field roster·encoding과 filesystem recovery primitive는 resulting implementation spec이 고정한다.

```text
user-app-data/
  <runtime-cache>/           # versioned verified Runtime generation·retained archive
  <runtime-home-pair>/       # Codex-managed account·native state, workspace 밖
  <auth-bootstrap-cwd>/      # pre-workspace account operation 전용 inert cwd
  <workspace-registry>/       # active·recent pointer, identity authority가 아님

semester-workspace/
  AGENTS.md                   # package-owned exact native instruction
  .agents/skills/             # package-owned exact built-in Skills
  .ay-ple/
    workspace-state.json      # v3 WorkspaceManifest identity + app-owned state
  inbox/                      # 검토 전후 자료 반입의 논리 seam
  courses/                    # human-readable Course projection의 논리 seam
```

`AGENTS.md`와 descriptor-declared `.agents/skills/` built-in Skill root는 workspace instruction/Skill bundle을 이루지만 v3 aggregate의 identity·schema seam은 아니다. 각 declared Skill root는 descriptor가 열거한 file만 허용하는 exact complete tree이며, `.agents/skills/` container 자체는 user-owned sibling과 공유할 수 있는 경계다. 따라서 aggregate admission, declared bundle digest와 effective native context를 각각 fresh 검증하고 모두 유효할 때만 Codex action을 허용한다. Descriptor 밖 sibling은 bundle verifier가 소유·변경하지 않지만 첫 preview action eligibility에는 포함하지 않는다. [Official Codex configuration](https://learn.chatgpt.com/docs/config-file/config-advanced.md#project-root-detection)은 `project_root_markers=[]`가 parent search를 건너뛰고 current working directory를 project root로 취급한다고 명시하며, [Skill discovery](https://learn.chatgpt.com/docs/build-skills.md#where-to-save-skills)는 working directory부터 repository root까지 `.agents/skills`를 검색한다. [Instruction discovery](https://learn.chatgpt.com/docs/agent-configuration/agents-md.md#how-codex-discovers-guidance)에 따르면 workspace root의 `AGENTS.override.md`는 같은 directory의 `AGENTS.md`보다 우선하고, project `.codex/config.toml`도 Runtime behavior를 바꿀 수 있다. 따라서 current Runtime은 fixed empty marker override와 controlled roots를 persistent·probe process에 함께 적용하고, Server boundary는 pinned native Runtime이 실제로 발견한 config·Skill roster를 high-level port로 검증한다. Official `system` Skill은 native response validation 대상이지만 managed bundle과 비교하는 effective roster에서는 제외한다. 따라서 Codex가 `CODEX_HOME/skills/.system`에 관리하는 cache는 허용되며, user·admin Skill이나 workspace 밖 repo Skill이 같은 home/context에 추가되면 boundary가 차단한다. 이는 official system capability를 제거한다는 주장이 아니다.

기존 자료 폴더는 이 tree의 변형이 아니라 workspace 밖의 `ImportSource`다. App-owned import가 검토·승인을 거쳐 반입하기 전에는 `RawMaterial`, active workspace 또는 native `cwd`로 취급하지 않는다. Codex-managed state의 내부 file roster도 product contract로 고정하지 않는다.

## Durable store와 rollback

Workspace-local store는 app data나 native session과 다른 durable authority다. 따라서 Server lifecycle과 public-surface cutover는 confirmed state의 삭제 권한을 갖지 않고, store를 안전하게 이해하지 못하는 Runtime은 product mutation authority를 얻지 못한다. Public target은 current aggregate seam을 v3로 올려 logical `WorkspaceManifest`만 stable workspace·Course identity를 정의하고 dynamic state는 그 ID를 참조하게 한다. Current v2 옆에 sidecar authority를 추가하거나 first preview에서 자동 scaffold·adopt·migration하지 않으며 original bytes를 `legacy_migration_required/readOnly`로 보존한다. Baseline과 이후 schema 변경 정책은 [ADR 0013](../adr/0013-adopt-product-only-public-surface-and-v2-store-compatibility-baseline.md), workspace authority는 [ADR 0014](../adr/0014-create-app-owned-normalized-semester-workspaces.md), exact current codec·I/O 동작은 [Server README](../../apps/server/README.md#workspace-local-durable-store)가 소유한다.

## 리스크와 대응

| 리스크 | 설명 | 대응 |
| --- | --- | --- |
| Artifact drift | Current bundle 또는 public descriptor가 선택한 release byte가 바뀌면 검토한 Runtime과 달라진다. | Current canonical manifest와 public exact binding·complete tree를 resolve·spawn 경계에서 fail closed로 검증한다. |
| Silent Runtime fallback | 손상·unavailable release에서 다른 cached Runtime을 고르면 application contract가 바뀐다. | Resolver는 exact release만 repair·검증하고 실패 시 닫는다. Rollback은 still-supported 이전 exact application pair를 명시적으로 실행한다. |
| Runtime state root 분리 | 전역 auth/config와 app-managed SQLite의 수명·복구 책임이 다르다. | 개인용 composition은 이 차이를 의도적으로 허용하고 product state는 workspace에, transient SQLite·temp는 app data에 둔다. |
| Credential authority 분열 | AY-PLE token store와 global Codex home를 함께 쓰면 refresh·logout owner가 갈라진다. | Current startup은 AY-PLE credential store를 만들지 않고 전역 `CODEX_HOME` 하나만 사용한다. |
| Workspace 오선택 | Registry나 development override가 사용자 의도와 다른 root를 가리킬 수 있다. | `WorkspaceManifest` identity·schema를 재검증하고 thread 재사용 전 sticky `cwd`를 확인한다. Registry는 pointer로만 사용한다. |
| Workspace authority 분열 | Current v2와 새 `WorkspaceManifest`가 같은 workspace·Course identity를 각각 소유하면 migration과 rollback 결과가 달라진다. | 첫 target은 `.ay-ple/workspace-state.json` 하나를 v3 aggregate authority로 사용하고 sidecar를 만들지 않는다. Current v2는 자동 migration하지 않고 bytes를 보존한 채 fail closed한다. |
| Instruction bundle drift | Missing·modified declared `AGENTS.md`나 built-in Skill을 그대로 실행하거나 자동 덮어쓰면 검토한 Agent behavior 또는 사용자 byte를 잃는다. | Exact package descriptor로 `AGENTS.md`와 declared Skill root complete tree를 fresh 검증하고 Codex action을 막되 workspace data를 보존한다. Missing file은 explicit no-clobber recovery만 허용하고 modified file은 manual recovery로 남긴다. |
| Native context shadowing | Valid bundle 옆의 `AGENTS.override.md`, project `.codex/`, undeclared Skill이나 declared Skill root 안의 추가 file이 App 검증을 우회해 실제 Agent behavior를 바꿀 수 있다. | Declared Skill root는 exact complete tree로 검증한다. Server boundary는 descriptor 밖 static entry와 Runtime이 투영한 non-system effective Skill을 fail closed하며 사용자 byte는 보존한다. Public setup·action composition은 이 gate를 admission에 연결해야 한다. |
| Ancestor native context 혼입 | 사용자가 고른 parent가 다른 repository 안이면 Codex의 기본 project-root discovery가 상위 `AGENTS.md`, `.codex/`와 Skills를 함께 읽을 수 있다. | Persistent bridge와 one-shot probe가 fixed `project_root_markers=[]`, exact workspace `cwd`, controlled `HOME`·`CODEX_HOME`을 공유하고 exact native provider-free smoke가 effective result와 full reap을 검증한다. |
| `ImportSource` 오인 | 기존 자료 폴더를 곧바로 workspace로 열면 외부 tree의 우연한 구조가 schema가 된다. | App-owned scaffold만 활성화하고 import 분석·mapping·apply를 별도 검토 흐름으로 둔다. |
| Workspace authority drift | Registered TXT나 store가 Turn·Server 수명 중 바뀌면 stale authority로 덮어쓸 수 있다. | Source drift는 interrupt·explicit rebaseline, store drift는 compare-before-rename·explicit reactivation으로 원본을 보존한다. |
| 민감 상태 혼입 | `CODEX_HOME`을 workspace에 두면 auth·session·log가 사용자 자료와 섞인다. | 전역 `CODEX_HOME`과 workspace의 root 비중첩을 검증한다. |
| Host context 혼입 | Custom home만으로 ambient provider·environment가 모두 차단된다고 볼 수 없다. | Child environment를 allowlist로 재구성하고 exact local-provider에서 effective state를 검증한다. |
| Sandbox 과신 | Codex sandbox와 approval은 OS process 격리가 아니다. | Local personal-device 경계로 한정하고 cloud 전환 시 별도 threat model을 작성한다. |
| 권한 경계 혼동 | Native permission은 Codex execution을, `UserConfirmation`은 academic apply를 제어한다. | 어느 결정도 다른 결정을 암묵적으로 승인하지 않고 별도 identity·state로 다룬다. |

## 구현과 계획 연결

현재 횡단 topology와 검증 표면은 [Codex Chat 구현 지도](codex-chat-implementation-map.md), Runtime artifact·process의 package 동작은 [codex-chat-runtime README](../../packages/codex-chat-runtime/README.md), Server startup·store behavior는 [Server README](../../apps/server/README.md)가 소유한다. 중단한 public distribution과 managed product account 결정은 historical ADR 0016·0017에 남기고, 후속 작업 순서와 완료 조건은 [개발 백로그](../product/ay-ple-development-backlog.md)에서만 관리한다.

## 근거 링크

| 주제 | 공식/확인 출처 |
| --- | --- |
| Codex App Server 용도, protocol, transport, schema generation | [Codex App Server](https://developers.openai.com/codex/app-server) |
| `CODEX_HOME`, `CODEX_SQLITE_HOME`, installer/auth environment variables | [Environment variables](https://developers.openai.com/codex/environment-variables) |
| `CODEX_HOME`의 config/auth/history/log 위치, project config 제한 | [Advanced configuration](https://developers.openai.com/codex/config-advanced) |
| `codex app-server` maturity와 CLI flags | [Command line options](https://developers.openai.com/codex/cli/reference) |
| Sandbox mode와 approval policy | [Sandbox](https://developers.openai.com/codex/concepts/sandboxing) |
