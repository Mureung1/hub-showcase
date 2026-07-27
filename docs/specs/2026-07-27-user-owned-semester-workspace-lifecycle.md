# User-owned SemesterWorkspace lifecycle과 canonical local roots

## Agent triage

- State: ready-for-ticketing
- Surface: local-spec
- Next actor: /to-tickets

## Problem Statement

Current AY-PLE development command는 `../workspace/year-2-semester-2`를 hardcode하고 `<SemesterWorkspace>/.ay-ple/workspace-state.json` current-v2 aggregate를 App-owned authority로 사용한다. 실제 directory는 Git repository가 아니며 root `AGENTS.md`, `.codex/config.toml`과 `.agents/skills/`도 없다. Server가 TXT를 scan·register하고 source를 staging·scratch에 복사해야 AY가 자료를 다룰 수 있다.

이 경계는 public distribution에서 임의의 사용자 자료를 보호하기 위한 app-owned scaffold·copy에는 맞았지만, 소유자 한 명이 자신의 실제 학기 자료를 직접 관리하는 personal product에는 맞지 않는다. 사용자는 한 학기 Git working tree를 Codex project와 thread의 exact `cwd`로 쓰고, AY가 actual file을 수정하며 Git checkpoint를 남기기를 원한다.

App이 Git init·status·commit UI와 workspace file workflow까지 소유할 필요도 없다. App은 canonical root 선택, active pointer와 Runtime 전환만 소유하고, Git·file·Skill 설치는 hub-rooted Bootstrap Skill과 AY에게 맡겨야 한다.

## Solution

한 학기를 한 Git repository로 채택하고 다음 two-phase lifecycle을 만든다.

```text
Global Codex account
→ active workspace가 없으면 hub-rooted Bootstrap Runtime·thread
→ User가 semester metadata와 candidate directory 선택
→ semester-workspace-init Skill이 candidate에서 Git·minimal files·Skill·MCP config 준비
→ User가 explicit activation
→ Bootstrap Runtime·thread 종료
→ Broker binding 준비
→ exact SemesterWorkspace Git root의 fresh Workspace Runtime·thread
→ required Interaction MCP readiness 확인
→ WorkspaceRegistry known entry와 active pointer commit
```

Root `workspace-state.json`은 Git-tracked identity와 Skill-owned structured snapshot만 담는다. Git history가 장기 변경 이력과 rollback을 맡고 sibling `../.ay-ple/`은 Runtime payload, `WorkspaceRegistry`, cache·temp 같은 cross-workspace 운영 state만 소유한다. Existing current-v2/v3 bytes는 자동 변환하거나 삭제하지 않는다.

이 Spec은 canonical roots, workspace identity, registry, BootstrapCandidate·init/update Skill, Browser lifecycle, native project context와 activation ordering을 소유한다. MCP schema, Broker transport, inline Review와 old academic workflow contraction은 [InteractionCapability 기반 Semantic Review Spec](./2026-07-27-interaction-capability-semantic-review.md)이 소유한다.

## User Stories

1. As the sole user, I want AY-PLE이 기존 global Codex account를 사용하기를 원한다, so that 별도 credential lifecycle을 관리하지 않는다.
2. As a new-semester user, I want App에서 directory를 고른 뒤 AY가 그 자리에서 초기화하기를 원한다, so that app-owned 복사본 없이 실제 폴더를 workspace로 쓴다.
3. As a user with an existing Git repository, I want history와 dirty tree를 존중받기를 원한다, so that clean-tree gate 때문에 평소 작업이 막히지 않는다.
4. As a student, I want 한 학기 Git root가 Codex project와 thread의 exact `cwd`이기를 원한다, so that 하위 폴더가 별도 workspace로 오인되지 않는다.
5. As a returning user, I want App이 known workspace와 active pointer를 기억하기를 원한다, so that 재시작 뒤 같은 학기를 정확히 연다.
6. As a student, I want AY가 actual file을 직접 읽고 수정하기를 원한다, so that `RawMaterial` 등록과 source copy가 선행되지 않는다.
7. As a student, I want 의미 있는 checkpoint에서 AY가 commit하기를 원한다, so that 실제 변경을 Git으로 이해하고 되돌릴 수 있다.
8. As a maintainer, I want current-v2/v3와 legacy appData를 자동 변환·삭제하지 않기를 원한다, so that target vertical이 검증되기 전 rollback evidence를 잃지 않는다.

## Current State and Constraints

### Current implementation

| 영역 | Current | Target |
| --- | --- | --- |
| Selection | `scripts/product-local.mts`가 hardcoded workspace·dogfood appData를 계산하고 env가 process-local selection에 관여한다. | Durable registry와 explicit chooser가 authority다. |
| Workspace store | Hidden current-v2 aggregate가 Course, materials, Run·patch·confirmation과 guard를 함께 저장한다. | Root v4 identity envelope만 App이 이해하고 snapshot은 opaque다. |
| Git | Current default directory는 Git root가 아니고 App-owned action flow가 apply한다. | One semester = one Git repository, AY-owned file mutation·checkpoint다. |
| Native context | Exact `cwd`는 쓰지만 `project_root_markers=[]`, managed Skill root와 thread MCP override가 project discovery를 덮는다. | Exact Git root의 native config·AGENTS·Skill discovery를 사용한다. |
| Runtime/appData | Package-local `.artifacts/`와 `../.ay-ple-dogfood`에 mutable state가 있다. | Verified Runtime과 operating state를 sibling `../.ay-ple/`에 둔다. |
| Workspace kernel | Consumer 없는 app-owned v3 admission/setup/bundle primitive가 남아 있다. | Small v4 identity codec만 남기고 v3 kernel은 contract한다. |

Actual `../workspace/year-2-semester-2`에는 `.git`, root `AGENTS.md`, `.codex/config.toml`과 `.agents/skills/`가 없고 hidden empty current-v2 aggregate만 있다. Target workspace로 자동 간주하지 않는다.

### Governing decisions and split boundary

- [ADR 0018](../adr/0018-adopt-user-owned-git-semester-workspaces.md)이 user-owned Git root, two-phase Runtime, root state, native project context와 Git checkpoint를 소유한다.
- [Codex Runtime 격리](../architecture/codex-runtime-isolation.md)가 package/appData/workspace/global Codex root와 process ordering을 소유한다.
- [ADR 0019](../adr/0019-use-mcp-interaction-capabilities-as-the-ay-app-seam.md)의 required MCP는 Workspace Runtime readiness의 필수 dependency다. Exact declaration·Runtime env/readiness contract는 sibling Interaction Spec이 소유한다.
- Completed First Assignment과 residue-pruning artifacts는 current behavior·cleanup donor다. Residue ticket 005의 “v3 keep 뒤 ImportSource” 판단만 ADR 0018 이후 historical이다. 완료 상태를 뒤집거나 미완료 public-release ticket을 되살리지 않는다.
- Workspace contract·codec·native context·Bootstrap slice는 Interaction foundation과 병렬 구현할 수 있다. Interaction product trace는 native project-context seam을 소비하고, final activation은 built Adapter·Broker·Runtime readiness에 blocked되며, final cleanup은 sibling Interaction product cutover에 blocked된다.

## Implementation Contract

### Module Responsibilities and Seams

| Module | 소유하는 책임 | 소유하지 않는 책임 |
| --- | --- | --- |
| `semester-workspace-init` | Candidate Git 준비, minimal files, selected Skill copy, project MCP config와 checkpoints | Registry commit, Runtime spawn, Browser lifecycle |
| `hub/skills/`와 workspace Skill copy | AY workflow bytes와 Git-tracked execution authority | Runtime injection, App credential |
| `@ay-ple/semester-workspace` | Root v4 identity envelope codec | Scaffold bundle, Git lifecycle, snapshot academic schema |
| `apps/server` Product operation coordinator | Workspace transition과 product Turn의 atomic admission·terminal release | Interaction pending slot, MCP result |
| `apps/server` Workspace lifecycle | Canonical roots, candidate, registry, Runtime transition·activation | Git init/status/commit, Skill merge와 user file mutation |
| `@ay-ple/codex-chat-runtime` | Fixed `cwd`, Turn permission, native project discovery와 bounded process lifecycle | Workspace identity, Git policy, Interaction schema |
| `@ay-ple/product-contract` | Browser-safe bootstrap/candidate/active lifecycle codec | Filesystem path와 registry bytes |
| `apps/chat-shell` | Account/workspace lifecycle UI와 active Chat entry | Git/file operation, raw MCP |
| SemesterWorkspace repository | Actual materials, instructions, project config, Skill copy, state와 Git history | Runtime credential, pending interaction |
| `../.ay-ple/` | Runtime payload, registry, cache·temp와 transient operation hints | Academic files·identity snapshot·Skill copy |

### Interfaces and Invariants

#### 1. Canonical roots와 Runtime phases

```text
hub/
  .agents/skills/semester-workspace-init/
  skills/<built-in-skill>/
  packages/interaction-mcp/dist/stdio.js

../.ay-ple/
  runtime/production-runtime-darwin-arm64/
  state/workspace-registry.json
  state/workspaces/<workspaceId>/
  state/runtime/home/
  cache/
  temp/

~/.codex/

<SemesterWorkspace>/
  .git/
  AGENTS.md
  workspace-state.json
  .agents/skills/<selected-built-in-skill>/
  .codex/config.toml
  <actual-semester-files>
```

- `packageRoot`는 current `hub/`, `appDataRoot` 기본값은 sibling `../.ay-ple/`, verified Runtime root는 `<appDataRoot>/runtime/production-runtime-darwin-arm64`다.
- `../.ay-ple-dogfood`, `../.ay-ple-dev-workspaces`, repository-local `.ay-ple`, ambient `process.cwd()`와 `CODEX_CHAT_WORKSPACE`를 product fallback·selection authority로 사용하지 않는다.
- Effective `CODEX_HOME`은 caller 값 또는 OS user의 `~/.codex`다. App-owned credential/config/session authority와 separate `CODEX_SQLITE_HOME`을 만들지 않는다.
- Controlled child `HOME`은 `<appDataRoot>/state/runtime/home`, temporary state는 `<appDataRoot>/temp/` 아래다.
- Semester parent는 sibling `../workspace/`를 권장하지만 explicit chooser가 고른 다른 canonical Git root도 허용한다. Package, appData, global Codex home와 workspace의 unsafe overlap은 거절한다.

| Phase | Exact `cwd` | 목적 |
| --- | --- | --- |
| Bootstrap Runtime | `hub/` | Account readiness, native-discovered init Skill, candidate preparation |
| Workspace Runtime | selected Git root | Normal AY Chat, native project Skill·required Interaction MCP |

Runtime·thread는 생성부터 종료까지 하나의 `cwd`에 고정한다. Active workspace에서 candidate selection이 확정되면 old Workspace Runtime·Broker를 닫고 fresh Bootstrap Runtime을 만든다. Activation·restart는 Bootstrap을 닫고 fresh Workspace Runtime을 만든다. Bootstrap thread를 resume하거나 `cwd`만 바꾸지 않는다.

#### 2. Root `workspace-state.json`

```ts
type SemesterWorkspaceStateV4 = {
  readonly kind: 'ay-ple.semester-workspace'
  readonly formatVersion: 4
  readonly workspaceId: `workspace_${string}`
  readonly semester: {
    readonly yearLevel: number
    readonly term: {
      readonly key: string
      readonly displayName: string
    }
  }
  readonly snapshot: Readonly<Record<string, JsonValue>>
}
```

- Exact top-level keys, fatal UTF-8 JSON, maximum `1 MiB`다.
- `workspaceId`는 `^workspace_[0-9a-f]{32}$`이며 rename·registry rebuild로 바뀌지 않는다.
- `yearLevel`은 `1..20` safe integer다. `term.key`는 slug regex `^[a-z0-9]+(?:-[a-z0-9]+)*$`, 최대 `64` bytes다. `displayName`은 trim 후 non-empty, 최대 `128` bytes다.
- Init은 `snapshot: {}`로 시작한다. App은 JSON object·document bound만 확인하고 snapshot field를 해석·rewrite·apply하지 않는다.
- `modelingRuns`, `statePatches`, `userConfirmations`, `executionGuard`, `sourceRecovery` event history를 v4로 복사하지 않는다.
- File은 Git-tracked academic authority다. App activation은 identity만 read-only 검증한다.
- Hidden current-v2, historical v3와 malformed root file은 automatic v4 conversion 대상이 아니며 overwrite하지 않는다.

#### 3. `WorkspaceRegistry`

```ts
type WorkspaceRegistryV1 = {
  readonly kind: 'ay-ple.workspace-registry'
  readonly formatVersion: 1
  readonly activeWorkspaceId: string | null
  readonly workspaces: readonly {
    readonly workspaceId: string
    readonly canonicalRoot: string
  }[]
}
```

- Maximum `256 KiB`, 최대 `64` entries다. Workspace ID와 canonical root는 unique하고 non-null active ID는 matching entry가 있어야 한다.
- Root는 write 당시 realpath absolute directory다. Browser에는 path가 아니라 ID, semester identity와 safe basename만 보낸다.
- Activation·reopen은 root v4 identity를 fresh read한다. Missing, moved, reused와 identity mismatch면 Runtime을 시작하지 않는다.
- Missing file은 empty v1로 시작할 수 있다. Malformed/future bytes는 보존하고 `registry_incompatible`로 연다.
- Mutation은 temp file, file sync, rename, directory sync와 opened-byte compare를 사용한다. External conflict를 덮어쓰지 않는다.
- Candidate는 activation 성공 전 기록하지 않는다. Required Runtime readiness 뒤 known entry와 active pointer를 한 transaction으로 commit한다.
- Registry loss는 workspace identity와 Git history를 바꾸지 않는다. Explicit reselect와 valid v4 identity로 entry를 재등록할 수 있다.

#### 4. BootstrapCandidate와 init/update Skill

- Native directory chooser와 Browser semester metadata를 process-local `BootstrapCandidate`에 묶는다. Browser에는 `candidate_[0-9a-f]{32}`와 safe label만 보내고 absolute path를 보내지 않는다.
- Init command는 hub-rooted visible Turn이다. Server는 Browser path가 아닌 current candidate canonical root 하나만 additional native `writableRoots`로 전달한다.
- Agent final text는 activation proof가 아니다. Explicit activation이 candidate, v4 identity와 Runtime readiness를 fresh 검증한다.
- Candidate cancel·App restart는 binding만 버리고 Skill이 만든 file·commit을 rollback하지 않는다.

`hub/.agents/skills/semester-workspace-init/SKILL.md`는 instruction-based이며 별도 scaffold script를 선행하지 않는다.

1. Fresh directory는 exact root에서 Git init하고 existing repository는 history·remote·dirty state를 존중한다. Foreign repository descendant와 candidate 밖 gitdir indirection은 거절한다.
2. Missing v4 state를 만들고 matching v4는 no-op한다. 다른 identity·semester, v2/v3와 malformed file은 manual conflict다.
3. Missing `AGENTS.md`에는 one-semester repository, actual-file work, frequent meaningful commit와 dirty-tree non-blocking 원칙만 둔다. Existing instruction은 보존하고 semantic duplicate를 만들지 않는다.
4. `hub/skills/<skill>/` real tree를 workspace `.agents/skills/<skill>/`로 copy한다. Missing/exact match는 create/no-op, differing tree는 diff를 보여주고 explicit user merge·replace 전 overwrite하지 않는다. Symlink·Runtime `extraRoots`를 사용하지 않는다.
5. Initial selected Skill은 sibling Interaction Spec의 `propose_state_patch` result contract를 따르는 `ay-ple-first-assignment`다.
6. Sibling Interaction Spec의 static declaration을 `.codex/config.toml`에 설치한다. Missing table은 다른 config를 보존해 추가하고 exact table은 no-op한다. Managed table의 stale key만 고치며 malformed TOML, duplicate table, unknown key·wrong type와 safe comment preservation failure는 manual conflict다.
7. Legacy root `.ay-ple/`은 delete·move·stage하지 않는다. Fresh Git init이면 existing `.gitignore`를 보존해 exact `/.ay-ple/` ignore를 추가하고 existing Git repository의 tracked/ignore state는 바꾸지 않는다.
8. Fresh repository는 Skill-owned scaffold만 첫 checkpoint로 남긴다. 이후 existing non-scaffold untracked inventory에서 user-approved path만 별도 material baseline으로 commit한다. Ignore, credential candidate와 legacy `.ay-ple/`은 default stage하지 않는다.
9. Existing repository에서는 unrelated dirty file을 stage하지 않는다. Skill-owned change도 user modification과 분리할 수 없으면 commit하지 않는다.
10. Re-run은 update mode다. Exact scaffold는 no-op·no empty commit이고 stale MCP declaration의 managed table만 갱신한다. Differing Skill/user file은 conflict policy 없이 overwrite하지 않는다.
11. Pinned `workspaceWrite`가 `.git`, `.agents`, `.codex`를 보호하므로 해당 file operation과 Git command는 native shell/unified-exec의 explicit per-call escalation, exact candidate `cwd`와 staging/commit explicit pathspec을 사용한다. `on-request + auto_review` 승인 때만 실행하고 Turn-wide `dangerFullAccess`, persistent grant와 App fallback은 금지한다.

App은 Git init/status/clean/stage/commit/hook/remote/sync state machine을 구현하지 않는다. Activation은 root Git marker를 read-only로 확인할 수 있지만 dirty state를 error로 만들지 않는다.

#### 5. Browser workspace lifecycle

```ts
type ProductAccountReadiness =
  | { readonly state: 'ready' }
  | { readonly state: 'not_ready'; readonly displayMessage: string }
  | { readonly state: 'unavailable'; readonly displayMessage: string }

type ProductSemesterIdentity = {
  readonly yearLevel: number
  readonly term: { readonly key: string; readonly displayName: string }
}

type ProductWorkspaceSummary = {
  readonly workspaceId: string
  readonly semester: ProductSemesterIdentity
  readonly label: string
}

type ProductAvailableWorkspaceReference = {
  readonly availability: 'available'
  readonly workspaceId: string
  readonly semester: ProductSemesterIdentity
  readonly label: string
}

type ProductUnavailableWorkspaceReference = {
  readonly availability: 'unavailable'
  readonly workspaceId: string
  readonly label: string
}

type ProductBootstrapCandidate = {
  readonly candidateId: string
  readonly semester: ProductSemesterIdentity
  readonly label: string
  readonly initTurn:
    | { readonly state: 'not_started' }
    | { readonly state: 'active'; readonly operationId: string }
    | {
        readonly state: 'terminal'
        readonly operationId: string
        readonly outcome: 'completed' | 'failed' | 'interrupted'
      }
}

type ProductWorkspaceLifecycle =
  | {
      readonly state: 'bootstrap'
      readonly activeWorkspace: ProductWorkspaceSummary | null
      readonly candidate: ProductBootstrapCandidate | null
    }
  | {
      readonly state: 'active'
      readonly activeWorkspace: ProductWorkspaceSummary
      readonly candidate: null
    }
  | {
      readonly state: 'transitioning'
      readonly activeWorkspace: ProductWorkspaceSummary | null
      readonly candidate: ProductBootstrapCandidate | null
      readonly target:
        | { readonly kind: 'bootstrap_candidate'; readonly candidateId: string }
        | { readonly kind: 'candidate_activation'; readonly candidateId: string }
        | { readonly kind: 'active_restart'; readonly workspaceId: string }
    }
  | {
      readonly state: 'recovery_required'
      readonly activeWorkspace: ProductUnavailableWorkspaceReference
      readonly candidate: ProductBootstrapCandidate | null
      readonly reason: 'workspace_unavailable'
      readonly displayMessage: string
    }
  | {
      readonly state: 'recovery_required'
      readonly activeWorkspace: ProductAvailableWorkspaceReference | null
      readonly candidate: ProductBootstrapCandidate | null
      readonly reason: 'runtime_unavailable'
      readonly displayMessage: string
    }
  | {
      readonly state: 'registry_incompatible'
      readonly activeWorkspace: null
      readonly candidate: null
      readonly displayMessage: string
    }

type ProductBootstrap = {
  readonly accountReadiness: ProductAccountReadiness
  readonly workspaceLifecycle: ProductWorkspaceLifecycle
  readonly activeOperation:
    | { readonly operationId: string; readonly kind: 'chat' | 'workspace_init' }
    | null
}
```

`recovery_required/workspace_unavailable`의 active reference는 non-null unavailable summary이고, `runtime_unavailable`은 valid available summary 또는 first activation의 null이어야 한다. Product codec은 이 conditionality를 exact union으로 구현한다.

Product decoder는 union 내부의 다음 cross-field invariant도 거절 가능한 exact contract로 검증한다.

- `activeOperation`은 transition lease가 아니라 product Turn만 나타낸다. `chat`은 `active` state에서만 가능하고 `workspace_init`은 non-null candidate를 가진 `bootstrap`에서만 가능하다.
- `workspace_init` operation ID와 `candidate.initTurn.active.operationId`는 서로 존재 여부와 값이 정확히 같아야 한다. Terminal·not-started candidate에는 active operation이 없다.
- `transitioning/candidate_activation`은 target ID와 같은 non-null candidate를 요구한다. `transitioning/active_restart`는 candidate가 null이고 target ID와 같은 non-null active workspace를 요구한다.
- `transitioning`, 두 `recovery_required`와 `registry_incompatible`에는 `activeOperation`이 null이다. Transition 자체는 lifecycle `state`와 아래 coordinator lease로 표현한다.
- Workspace summary/reference의 `workspaceId`와 `semester`는 v4 identity codec을 재사용한다. `candidateId`는 `^candidate_[0-9a-f]{32}$`, `operationId`는 `^operation_[0-9a-f]{32}$`를 사용한다.

- `label`은 control character를 제거한 canonical root basename, 최대 `256` bytes다. Absolute path는 Browser에 없다.
- Initial Browser는 current active summary와 process-local candidate만 보여준다. Registry known list와 one-click switch는 deferred다.
- `GET /api/product/bootstrap`은 fresh registry/root/Runtime state를 위 union으로 반환한다.
- `POST /api/product/workspace-candidates/select` body는 exact `{ semester }`다. Command 시작 시 candidate ID를 발급해 transition을 표시한다. Cancel은 prior state와 `{status:"cancelled"}`, selection은 old active Runtime을 닫고 Bootstrap Runtime ready 뒤 `{status:"selected", candidate}`다.
- `POST /api/product/workspace-candidates/:candidateId/initialize`는 `{}`와 Product Turn NDJSON을 사용한다. Active init/transition과 duplicate operation은 `409`이고 terminal 뒤 fresh rerun은 허용한다.
- `POST /api/product/workspace-candidates/:candidateId/activate`는 `{}`를 받고 full terminal까지 기다려 `{status:"activated", workspace}`를 반환한다. Same-process lost response retry는 bounded last receipt로 수렴하고 restart 뒤 bootstrap GET이 recovery authority다.
- `POST /api/product/workspaces/active/restart`는 `{}`다. Current candidate가 non-null이면 DELETE 전 `409`; valid ready state는 idempotent, available pointer의 stopped Runtime은 fresh start한다.
- Candidate DELETE는 matching process binding만 버리고 `204`; stale repeat도 `204`이며 new candidate와 disk를 건드리지 않는다.
- Process-local `ProductOperationCoordinator`는 `workspace_transition | product_turn` 중 lease 하나만 atomic하게 admit한다. Candidate select·activate·active restart·candidate DELETE는 transition lease, normal Chat과 init은 product-turn lease를 lifecycle eligibility check와 같은 critical section에서 claim한다.
- Interaction Review는 chat lease 아래의 pending capability이고 별도 outer lock을 claim하지 않는다. Call-level Adapter HTTP abort·Browser disconnect는 pending settlement 뒤 native interrupt를 요청하고 generation credential을 유지한다. Adapter STDIO EOF는 credential revoke와 Workspace Runtime teardown을 요구한다. 어느 경우도 lease를 직접 풀지 않으며 coordinator는 Turn start failure, authoritative native terminal 또는 completed Runtime close 뒤에만 lease를 once-only release한다.
- 따라서 transition과 Chat/init 사이에는 check-then-start race가 없고 overlap은 existing operation을 preempt하지 않는 `409`다. Candidate mismatch는 `404`, incompatible identity는 `409`, account not ready는 `409`, Runtime start failure는 `503` safe error다.
- `active`만 normal Chat을 허용한다. Init terminal 뒤에도 `bootstrap`이고 explicit activation만 `active`를 만든다.

#### 6. Native project context와 Interaction readiness consumption

```ts
type CodexProductPermissionProfile =
  | { readonly mode: 'read_only' }
  | {
      readonly mode: 'workspace_write'
      readonly writableRoots: readonly string[]
    }
```

- `writableRoots`는 native workspace root 외 additional absolute root이고 initial maximum은 하나다. Runtime은 `startProductTurn`에서 Server canonical realpath와 existing non-symlink directory를 native `turn/start` 전에 검증한다.
- Normal Workspace Turn은 `writableRoots: []`, Bootstrap init Turn만 candidate root 하나, 다른 Bootstrap Turn은 `read_only`다.
- `workspace_write`는 pinned `ApprovalMode.auto_review`를 유지한다. Protected metadata write는 per-call native escalation이고 denial·reviewer unavailable은 honest failure다.
- Persistent Runtime과 context observation은 fixed `project_root_markers=[]`를 제거하고 exact Git root의 native config·`AGENTS.md`·Skill을 관측한다.
- Process-wide managed Skill root와 `skills/extraRoots/set` target injection을 제거한다. Workspace copy가 execution authority다.
- Exact Git-root `cwd`와 workspace-write thread start는 current pinned App Server의 unset trust write와 same-start project config reload를 사용한다. Explicit `untrusted`는 보존하고 parent trust를 child repository에 상속하지 않는다.
- Workspace activation은 sibling Interaction Spec의 listener/Broker-before-Runtime ordering, three-value child env, Adapter handshake와 exact MCP readiness port를 소비한다. Required MCP가 없거나 project config가 ignored면 active pointer를 commit하지 않고 degraded mode로 열지 않는다.

### Data and State Flow

1. Root host가 canonical appData·Runtime을 preflight하고 shared loopback listener를 503 delegate 상태로 bind한다.
2. Registry의 valid active root는 fresh identity를 읽는다. Entry가 없으면 hub-rooted Bootstrap Runtime을 시작한다.
3. Global Codex account not ready면 workspace bytes를 바꾸지 않는다.
4. User가 candidate를 선택한다. Existing active Runtime은 selection 확정 뒤 닫고 registry pointer는 유지한다.
5. Init command가 candidate-only writable root의 Bootstrap Turn을 실행한다.
6. Explicit activation이 candidate Git marker와 v4 identity를 fresh 검증하고 Bootstrap Runtime을 닫는다.
7. Interaction Broker binding 준비 뒤 exact candidate root의 Workspace Runtime을 시작한다.
8. Native project config, Adapter handshake와 exact tool roster readiness를 확인한다.
9. Thread recorded `cwd`와 root identity를 확인한 뒤 registry known entry와 active pointer를 atomic commit한다.
10. Browser가 active Chat으로 전환한다. Bootstrap thread/transcript를 이어 붙이지 않는다.

Activation failure는 active pointer를 바꾸지 않고 candidate를 보존한다. Hub Bootstrap restart가 성공하면 `bootstrap`, 실패하면 `recovery_required/runtime_unavailable`이며 first workspace는 null active reference다. Existing active pointer restart는 candidate DELETE 뒤 explicit하게 수행한다.

### Failure Behaviour

| Failure | Required behavior |
| --- | --- |
| Account not ready | Workspace bytes mutation과 Chat start 없음 |
| Registry malformed/future | Original bytes 보존, `registry_incompatible`, empty reset 없음 |
| Root missing/identity mismatch | Runtime start 없음, explicit reselect |
| Foreign Git descendant 또는 missing Git/v4 | Init/activation failure, user bytes 보존 |
| State/Skill/TOML conflict | Exact bytes·diff 보존, manual resolution |
| Material baseline not approved | Scaffold checkpoint만 남기고 existing file stage 없음 |
| Protected metadata approval denied | Init/update/checkpoint failure, broad permission fallback 없음 |
| Command/Turn overlap | Existing operation preempt 없는 `409` |
| Listener/Broker/Adapter/readiness failure | No active commit, old pointer unchanged |
| Explicit untrusted/ignored config | Global trust overwrite 없이 activation failure |
| Activation response loss | Same-process receipt 또는 bootstrap GET recovery |
| Runtime replacement/shutdown | Old generation/thread bounded close, stale credential reuse 없음 |
| Dirty tree | App admission과 무관, AY의 normal Git safety 판단 |

### Compatibility and Migration

1. V4 codec, registry, target Browser lifecycle와 Bootstrap Skill을 internal target composition으로 current graph 옆에 추가한다. Current public `ProductBootstrap` export·routes/UI는 이 단계에서 교체하지 않는다.
2. Sibling Interaction foundation과 병렬로 candidate init·Git output·native project discovery를 temporary roots에서 검증한다.
3. Interaction Adapter/Broker readiness가 green이면 fresh Git workspace의 full activation을 연결한다.
4. Sibling Interaction product cutover가 green이면 `@ay-ple/semester-workspace`를 small v4 codec으로 contract하고 v3 admission/setup/bundle/context kernel과 managed resource bundle을 제거한다.
5. Hidden current-v2와 historical v3 bytes는 automatic delete·move·rewrite하지 않는다. Fresh Git init에서는 `/.ay-ple/`을 baseline에서 제외하고 existing repository의 tracked state를 바꾸지 않는다.
6. Canonical Runtime, global account, registry reopen, active workspace와 Interaction smoke가 모두 green인 뒤 exact legacy dogfood appData, managed development workspace와 package-local Runtime `.artifacts/`만 scoped cleanup한다. Install/start/App runtime이 deletion을 수행하지 않는다.

Rollback 전에는 current source, matching package-local Runtime, old appData와 current-v2 bytes를 한 단위로 사용한다. New v4 files와 Git commits는 user-owned data라 rollback이 삭제하지 않는다. Scoped cleanup 뒤에는 mixed old graph로 fallback하지 않는다.

## Implementation Decisions

| Decision | Rationale |
| --- | --- |
| One semester = one Git root | Actual files, project context와 history authority를 일치시킨다. |
| V4 root envelope | Current v2와 historical v3의 의미를 재사용하지 않는다. |
| Opaque snapshot | App이 academic workflow authority를 되가져오지 않는다. |
| Process-local candidate + explicit activation | Agent text와 durable active state를 분리한다. |
| Instruction-based init Skill | Existing bytes·dirty state에 AY가 문맥적으로 대응한다. |
| Candidate-only additional writable root | Hub Skill discovery를 유지하면서 chosen directory만 init scope에 연다. |
| Per-call protected metadata review | Native `.git`·`.agents`·`.codex` protection을 제거하지 않는다. |
| Scaffold then approved material baseline | Actual files를 Git에 넣되 legacy·credential·unrelated file을 무차별 stage하지 않는다. |
| Active/candidate Browser surface only | Initial lifecycle에 recent catalog와 one-click switch를 추가하지 않는다. |
| No degraded Workspace Runtime | Required Interaction MCP가 AY-PLE의 정상 product seam이다. |

## Testing Decisions

### Highest practical seam

가장 높은 반복 가능한 seam은 **real Browser contract → Server lifecycle → deterministic Runtime/Broker port → temporary Git SemesterWorkspace**다. Candidate init, native project context, required readiness와 registry commit ordering을 실제 filesystem·Git으로 검증한다.

### Required proof

- V4 exact codec, opaque snapshot, v2/v3/malformed no-rewrite
- Registry uniqueness, CAS write, malformed preservation, loss/reselect recovery
- Fresh/existing repo init, no-clobber, baseline approval, update no-op·conflict
- Normal Workspace에서 AY가 actual file만 변경한 뒤 explicit pathspec으로 meaningful checkpoint를 만들고 unrelated dirty sentinel을 stage하지 않는 trace; protected Git approval denial은 honest no-commit failure
- Candidate-only writable root와 protected metadata `auto_review` approval/denial actual
- Bootstrap/active/transition/recovery exact Browser codec와 command idempotency/conflict
- Exact cwd, native `.git` project discovery, no managed Skill injection, trust behavior
- Listener→Broker→Runtime→handshake/readiness→registry ordering과 every pre-commit failure
- App restart, active reopen, chooser-based workspace change와 no cross-workspace thread
- Canonical root materialization 뒤 exact legacy cleanup과 unrelated path preservation

Implementation 완료 시 root test, typecheck, build, Chat Shell lint, E2E, docs links, exact SDK/Runtime/Node validation과 target local-provider trace를 통과한다. UI는 1440×900과 1920px-class desktop에서 Bootstrap·recovery·workspace change를 확인한다.

## Out of Scope

- `propose_state_patch` request/result, evidence codec와 Browser Review card
- Private Adapter↔Broker HTTP schema와 pending interaction lifecycle
- App-owned academic workflow contraction의 상세 contract
- Registry known-workspace list와 one-click switch
- App Git UI, clean-tree gate, hook, remote sync와 conflict-resolution subsystem
- Automatic v2/v3 migration 또는 academic history import
- Public distribution, package installer와 download/update lifecycle
- In-app Codex login/logout와 multiple account
- Mobile·small-screen, Windows와 Linux

## Open Questions

None.

## Further Notes

두 Spec은 backlog의 같은 상위 capability 아래에서 한 번의 `/to-tickets` input set으로 처리하고 다음 blocking graph와 sibling edge를 보존한다.

| Slice | Observable outcome | Depends on | Blocks |
| --- | --- | --- | --- |
| W0 Canonical root policy | Package·appData·global Codex·workspace overlap과 resolver contract가 green | — | W1, W2, W5, W6, W7 |
| W1 V4 identity codec | Exact envelope·opaque snapshot·legacy no-rewrite tests가 green | W0 | W4, W8, W10, W13 |
| W2 WorkspaceRegistry | Exact codec, CAS mutation과 loss/reselect recovery가 green | W0 | W4, W10, W13, W14 |
| W3 Product operation coordinator | Transition/product-turn atomic admission과 terminal-only release가 green | — | W4, W10, W13, sibling I8 |
| W4 Target Browser lifecycle codec | Exact union, ID reuse와 cross-field invariant가 green | W1, W2, W3 | W10, W11 |
| W5 Canonical Runtime/appData | Verified Runtime과 transient state가 `../.ay-ple/`에서 시작됨 | W0 | W13, W16 |
| W6 Native project context | Fixed Git-root cwd, native project config·AGENTS·Skill discovery가 green | W0 | W10, W13, sibling I5, sibling I8 |
| W7 Permission·trust | Candidate writable root, protected metadata review와 exact-root trust가 green | W0 | W8, W10, W12, W13 |
| W8 Init Skill core | Fresh/existing Git, v4, AGENTS와 approved baseline no-clobber가 green | W1, W7 | W9, W10 |
| W9 Managed resource install | Built-in Skill copy와 MCP table install/update conflict policy가 green | W8, sibling I1, sibling I6 | W10, W12 |
| W10 Candidate Server lifecycle | Chooser→init→cancel/retry와 target recovery state가 green | W1, W2, W3, W4, W6, W7, W8, W9 | W11, W13 |
| W11 Target Browser workspace UI | Bootstrap·candidate·transition·recovery desktop flow가 internal target composition에서 green | W4, W10 | sibling I9 |
| W12 Normal Git checkpoint policy | Actual file explicit-pathspec commit와 unrelated dirty sentinel preservation이 green | W6, W7, W9, sibling I6 | sibling I8 |
| W13 Required activation | Broker→Runtime→readiness→registry commit ordering이 green | W1, W2, W3, W5, W6, W7, W10, sibling I3, sibling I5 | W14, sibling I9 |
| W14 Reopen·change recovery | Restart, chooser-based workspace change와 no cross-workspace thread가 green | W2, W10, W13 | W15, sibling I9 |
| W15 V3 kernel contraction | `@ay-ple/semester-workspace`가 small v4 codec만 남김 | W14, sibling I11 | W16 |
| W16 Scoped legacy cleanup | Full canonical smoke 뒤 exact legacy roots만 제거됨 | W5, W15 | 완료 판단 |

Activation commit ordering을 Runtime·registry horizontal tickets로 분해하지 않는다.
