# User-owned SemesterWorkspace lifecycle과 canonical local roots

## Agent triage

- State: ready-for-ticketing
- Surface: local-spec
- Next actor: /to-tickets

## Problem Statement

AY-PLE의 target은 사용자가 소유한 한 학기 Git working tree에서 AY가 실제 파일을 직접 다루는 것이다. 그러나 처음 작성한 이 Spec은 App이 `hub/` cwd의 Bootstrap Runtime·thread를 열고 Browser에서 `BootstrapCandidate`를 선택한 뒤 App Product Turn으로 init Skill을 실행하고 activation하는 흐름을 전제했다.

이 전제는 personal native-client 사용 방식과 맞지 않는다. 사용자는 AY-PLE을 시작하기 전에 Codex CLI 같은 native client에서 `hub/.agents/skills/`의 Bootstrap Skill을 직접 실행할 수 있다. App이 같은 준비 작업을 다시 소유하면 candidate lifecycle, Browser chooser, additional `writableRoots`와 official SDK patch까지 필요해진다.

이미 완료된 canonical roots, v4 identity·registry와 generic operation coordinator 구현도 보존해야 한다. 동시에 진행 중인 W-004 dirty worktree에는 exact Git-root native context처럼 유효한 변경과 candidate additional-root patch처럼 폐기할 변경이 섞여 있다. Broad revert나 현재 generated manifest의 무비판적 commit은 안전하지 않다.

## Solution

Bootstrap과 App startup을 명확히 분리한다.

```text
User opens hub/ in Codex CLI or another native client
→ runs hub/.agents/skills/semester-workspace-init
→ Skill prepares one Git root, v4 state, AGENTS.md, workspace Skills,
  project Interaction MCP config and a reviewable checkpoint
→ Bootstrap succeeds
→ user starts AY-PLE with --workspace <absolute-prepared-git-root>
  (later starts may omit it and reopen WorkspaceRegistry.activeWorkspaceId)
→ App validates the prepared root read-only
→ shared listener and Interaction Broker binding
→ fresh Workspace Runtime/thread at the exact Git root
→ native project context, exact-root trust and required MCP readiness
→ WorkspaceRegistry known entry and active pointer commit
→ Browser opens the active AY workspace
```

App은 Bootstrap Skill을 실행·관찰하지 않고 candidate를 저장하지 않는다. Git·file·Skill 설치와 checkpoint는 native Bootstrap과 AY가 소유한다. App은 prepared root validation, exact-root Runtime, Interaction readiness와 registry commit만 소유한다.

Root `workspace-state.json`은 Git-tracked identity와 opaque current snapshot을, Git history는 장기 변경 이력과 rollback을 소유한다. Sibling `../.ay-ple/`은 Runtime payload, `WorkspaceRegistry`, cache·temp 같은 cross-workspace 운영 state만 소유한다. Existing current-v2/v3 bytes와 dirty user files는 자동 변환·삭제하지 않는다.

## User Stories

1. As the sole user, I want App 시작 전에 native Codex client로 새 학기 workspace를 준비하고 싶다, so that App 안에 중복 Bootstrap 기능이 필요 없다.
2. As a user with an existing Git repository, I want history, remote, user bytes와 dirty tree를 존중받고 싶다, so that setup이나 startup이 평소 작업을 막지 않는다.
3. As a student, I want 한 학기 Git root가 Codex project와 thread의 exact `cwd`이기를 원한다, so that ancestor나 하위 directory가 별도 context로 섞이지 않는다.
4. As a returning user, I want App이 active registry pointer를 fresh 검증해 같은 학기를 다시 열기를 원한다, so that 매번 Browser에서 directory를 다시 고르지 않는다.
5. As a user changing semesters, I want 새 root를 native Bootstrap한 뒤 launch argument로 명시하고 싶다, so that App 내부 chooser나 cross-workspace thread 이동 없이 전환한다.
6. As a student, I want AY가 actual file을 직접 읽고 수정하기를 원한다, so that `RawMaterial` 등록과 source copy가 선행되지 않는다.
7. As a student, I want AY가 의미 있는 checkpoint에서 commit하기를 원한다, so that 실제 변경을 Git으로 이해하고 되돌릴 수 있다.
8. As a maintainer, I want 이미 완료된 roots·registry·generic coordinator 결과를 보존하면서 obsolete candidate contract만 제거하기를 원한다, so that 유효한 구현을 다시 만들지 않는다.
9. As a maintainer, I want W-004 dirty diff를 hunk 단위로 회수하기를 원한다, so that native context work와 불필요한 SDK patch를 함께 잃거나 commit하지 않는다.

## Current State and Constraints

### Architecture correction

[ADR 0020](../adr/0020-bootstrap-semester-workspaces-before-app-startup.md)이 이 Spec의 startup owner와 시점을 교정한다. [ADR 0018](../adr/0018-adopt-user-owned-git-semester-workspaces.md)의 user-owned Git root, actual-file 작업, workspace-local Skill·config와 AY-owned checkpoint는 유지한다.

다음 구현 결과는 되돌리지 않는다.

| 완료 slice | 유지하는 결과 | 교정 대상 |
| --- | --- | --- |
| W-001 Canonical roots | `hub/`, external `../.ay-ple/`, global Codex home와 optional workspace root의 canonical 분리 | 없음 |
| W-002 V4 identity·registry | Strict v4 root identity, durable v1 registry CAS와 fresh reopen | “candidate는 activation 전 기록하지 않는다”는 표현만 prepared-root readiness로 번역 |
| W-003 Lifecycle contract·coordinator | Non-preemptive operation admission, terminal-only release와 current Turn 사용 | `BootstrapCandidate`, `workspace_init` eligibility와 candidate activation Browser union |
| I-001 Interaction foundation | Capability codec와 built Adapter foundation | 없음 |

W-004는 `0ae7b8158`, `1ade92d11`에서 구현·리뷰 보정을 완료했다. Mixed dirty diff에서 exact Git boundary·native project discovery와 trust 증거만 회수했고 candidate `writableRoots`와 replacement SDK patch는 폐기했다.

### Current implementation과 target

| 영역 | Current | Target |
| --- | --- | --- |
| Startup selection | No-argument startup이 `hub/`를 Runtime cwd로 쓰고 explicit `--workspace`만 current-v2 directory를 연다. | First open/change는 prepared root `--workspace`; later no-argument start는 registry active root다. Target root가 없으면 process가 fail closed한다. |
| Workspace store | Hidden current-v2 aggregate가 Course, materials, Run·patch·confirmation과 guard를 함께 저장한다. | Root v4 identity envelope만 App이 이해하고 `snapshot`은 opaque다. |
| Git | Current default directory는 독립 Git root가 아니고 App-owned action flow가 apply한다. | One semester = one Git repository, native Bootstrap과 AY-owned file mutation·checkpoint다. |
| Native context | Runtime이 exact canonical Git root를 child spawn 전에 검증하고 native `.git` boundary에서 root config·AGENTS·repo Skill을 발견한다. Fixed marker와 managed Skill override는 제거됐지만 thread private MCP overlay는 InteractionCapability cutover 전 donor로 남아 있다. | Project MCP도 tracked root config에서만 load하고 private thread overlay를 제거한다. |
| Lifecycle contract | Candidate/bootstrap union과 generic coordinator가 internal expansion으로 구현됐다. | Candidate branch는 contract하고 prepared-root startup만 남긴다. Generic coordinator는 재사용한다. |
| Runtime/appData | External canonical Runtime은 구현됐지만 legacy residue가 남아 있다. | Verified Runtime과 operating state는 sibling `../.ay-ple/`에만 둔다. |

### Governing boundaries

- [ADR 0020](../adr/0020-bootstrap-semester-workspaces-before-app-startup.md)이 pre-App native Bootstrap, launch-time handoff와 prepared-root startup ordering을 소유한다.
- [ADR 0019](../adr/0019-use-mcp-interaction-capabilities-as-the-ay-app-seam.md)과 [InteractionCapability Spec](./2026-07-27-interaction-capability-semantic-review.md)이 MCP schema, Broker transport, inline Review와 required readiness의 exact contract를 소유한다.
- [Codex Runtime 격리](../architecture/codex-runtime-isolation.md)가 package/appData/workspace/global Codex root와 process ordering을 소유한다.
- Current code와 package README는 구현 사실을 소유한다. 이 Spec의 target을 이미 구현된 동작처럼 기록하지 않는다.
- 완료 티켓과 commit history는 당시 결과를 보존한다. W-003 완료 상태를 취소하거나 candidate contract를 generic coordinator와 함께 revert하지 않는다.

## Implementation Contract

### Module Responsibilities and Seams

| Module | 소유하는 책임 | 소유하지 않는 책임 |
| --- | --- | --- |
| Native Codex client | App 시작 전 Bootstrap Skill 실행, 일반 native permission·approval | AY-PLE Browser lifecycle, registry commit |
| `semester-workspace-init` | Git root 준비, minimal files, selected Skill copy, project MCP config와 checkpoint | App Runtime spawn, Browser UI, registry mutation |
| `hub/skills/`와 workspace Skill copy | AY workflow source와 Git-tracked execution authority | Runtime injection, App credential |
| `@ay-ple/semester-workspace` | Root v4 identity envelope codec | Git lifecycle, snapshot academic schema |
| `apps/server` startup resolver | Explicit prepared root 또는 registry active root 선택, fresh validation | Directory chooser, unprepared root mutation |
| `apps/server` operation coordinator | Product Turn의 non-preemptive admission·terminal release | Bootstrap state, Interaction pending slot |
| `apps/server` Workspace lifecycle | Listener/Broker→Runtime→readiness→registry commit ordering | Git init/status/commit, Skill merge |
| `@ay-ple/codex-chat-runtime` | Fixed `cwd`, standard permission, native project discovery와 bounded process lifecycle | Candidate additional root, workspace identity, Interaction schema |
| `@ay-ple/product-contract` | Active/recovery Browser projection과 product operation codec | Candidate/init contract, filesystem path, registry bytes |
| `apps/chat-shell` | Active Chat와 honest Runtime recovery | Bootstrap chooser·init·activation UI, Git UI |
| SemesterWorkspace repository | Actual materials, instructions, project config, Skill copy, state와 Git history | Runtime credential, pending interaction |
| `../.ay-ple/` | Runtime payload, registry, cache·temp와 transient operation hints | Academic files·identity snapshot·Skill copy |

### Interfaces and Invariants

#### 1. Canonical roots와 layout

```text
hub/
  .agents/skills/semester-workspace-init/
  skills/<built-in-skill>/
  packages/interaction-mcp/dist/<stdio-entrypoint>

../.ay-ple/
  runtime/production-runtime-darwin-arm64/
  state/workspace-registry.json
  state/workspaces/<workspaceId>/runtime-state.json
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
- `../.ay-ple-dogfood`, `../.ay-ple-dev-workspaces`, repository-local `.ay-ple`, ambient `process.cwd()`와 `CODEX_CHAT_WORKSPACE`는 target fallback·selection authority가 아니다.
- Effective `CODEX_HOME`은 caller 값 또는 OS user의 `~/.codex`다. Separate app-owned Codex account·config·session authority와 `CODEX_SQLITE_HOME`을 만들지 않는다.
- Package, appData, global Codex home와 prepared workspace의 same-path·ancestor overlap, symlinked authority와 non-directory는 App mutation 전에 fail closed한다. Pre-App Bootstrap의 아직 존재하지 않는 target leaf에는 아래의 별도 생성 규칙을 적용한다.
- Semester parent로 sibling `../workspace/`를 권장하지만 prepared Git root는 다른 canonical location에도 있을 수 있다.

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
- `yearLevel`은 `1..20` safe integer다. `term.key`는 `^[a-z0-9]+(?:-[a-z0-9]+)*$`, 최대 `64` bytes이고 `displayName`은 trim 후 non-empty, 최대 `128` bytes다.
- App은 `snapshot`이 bounded JSON object인지까지만 확인하고 field를 해석·rewrite·apply하지 않는다.
- Hidden current-v2, historical v3와 malformed/future root bytes는 automatic v4 conversion 대상이 아니다.

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

- Maximum `256 KiB`, 최대 `64` entries, unique ID/root와 active-pointer membership을 검증한다.
- Root는 write 당시 realpath absolute directory다. Browser에는 path가 아니라 workspace ID, semester identity와 safe label만 보낸다.
- Missing registry는 empty v1로 시작할 수 있지만 malformed/future bytes는 보존하고 `registry_incompatible` startup failure로 연다.
- Mutation은 opened-byte compare, synced temporary file, atomic rename와 directory sync를 사용하고 external conflict를 덮어쓰지 않는다.
- Registry entry와 active pointer는 prepared root의 Runtime·required MCP readiness가 성공한 뒤 한 transaction으로 commit한다.
- Registry loss는 workspace identity와 Git history를 바꾸지 않는다. Explicit prepared root를 다시 열어 같은 identity를 등록할 수 있다.

#### 4. Pre-App native Bootstrap Skill

`hub/.agents/skills/semester-workspace-init/SKILL.md`는 Codex CLI 같은 native client에서 직접 실행하는 instruction-based Skill이다. App bundle, App Product Turn 또는 Browser command가 아니다.

1. Target은 existing canonical non-symlink directory이거나, existing canonical non-symlink writable parent 바로 아래의 missing leaf 하나다. Missing leaf만 한 번 만들 수 있고 missing ancestor를 recursive 생성하지 않는다. Fresh directory는 독립 Git root로 init하고 existing repository는 history·remote·dirty state를 존중한다. Foreign repository descendant와 target 밖 gitdir indirection은 거절한다.
2. Missing v4 state를 만들고 matching v4는 no-op한다. 다른 identity·semester, current-v2/v3와 malformed root file은 manual conflict다.
3. Missing `AGENTS.md`에는 one-semester repository, actual-file work, frequent meaningful commit와 dirty-tree non-blocking 원칙만 둔다. Existing instructions를 보존하고 exhaustive commit policy를 만들지 않는다.
4. `hub/skills/<skill>/` real tree를 workspace `.agents/skills/<skill>/`로 copy한다. Missing/exact match는 create/no-op, differing tree는 diff와 explicit user choice 없이 overwrite하지 않는다. Symlink와 Runtime `extraRoots`를 사용하지 않는다.
5. Initial built-in Skill은 sibling Interaction Spec의 `propose_state_patch` result contract를 따르는 `ay-ple-first-assignment`다.
6. Sibling Interaction Spec의 static `required = true` MCP declaration을 `.codex/config.toml`에 no-clobber로 설치한다. Endpoint·token·Runtime binding value, MCP server `cwd`와 `tool_timeout_sec`은 기록하지 않는다.
7. Legacy root `.ay-ple/`은 delete·move·stage하지 않는다. Fresh Git init이면 existing `.gitignore`를 보존해 exact `/.ay-ple/` ignore를 추가하고 existing repository의 tracked/ignore state는 임의 변경하지 않는다.
8. Fresh repository는 Skill-owned scaffold만 첫 checkpoint로 남긴다. Existing non-scaffold inventory는 explicit user pathspec 없이는 baseline commit하지 않는다.
9. Existing repository에서는 unrelated dirty·untracked file을 stage하지 않는다. Skill-owned change를 user modification과 안전하게 분리할 수 없으면 commit하지 않는다.
10. Re-run은 update mode다. Exact scaffold는 no-op·no empty commit이고 differing Skill·user config는 conflict policy 없이 overwrite하지 않는다.
11. Native client의 permission·approval이 target metadata와 Git command 권한을 소유한다. App permission profile, candidate writable root와 Turn-wide persistent grant를 Bootstrap contract에 추가하지 않는다.
12. Success output은 prepared canonical Git root와 target App launch command를 명확히 알려준다. Agent final text만으로 App registry를 바꾸지는 않는다.

#### 5. Startup selection과 public lifecycle

- First open 또는 학기 변경은 explicit absolute `--workspace <prepared-root>`다. Explicit root는 registry pointer보다 우선하는 requested target이지만 readiness 전 pointer를 바꾸지 않는다.
- No-argument startup은 compatible registry의 non-null active pointer를 fresh reopen한다.
- Explicit root와 valid active pointer가 모두 없으면 `prepared_workspace_required`로 process startup을 실패시키며 Browser chooser나 hub Runtime을 열지 않는다.
- Explicit root는 canonical existing non-symlink directory, exact Git root, valid v4 identity여야 한다. Dirty status는 검사할 수 있지만 error가 아니다.
- 다른 학기로 바꾸는 동안 old App process·Runtime은 이미 종료돼 있어야 한다. Runtime cwd mutation, cross-workspace thread resume와 in-app hot switch는 없다.
- Current `POST /api/product/workspaces/activate`와 candidate select/init/activate routes는 target public surface가 아니다.
- Shared listener가 Runtime 전 bind되므로 Browser-safe projection이 필요할 때 target lifecycle은 `starting | active | recovery_required`만 표현한다. Candidate, `workspace_init`과 activation target을 포함하지 않는다.
- `activeOperation`은 normal product Turn만 나타낸다. W-003 generic coordinator의 `product_turn` admission과 terminal-only release를 재사용하되 obsolete candidate eligibility를 제거한다.

#### 6. Native Git project context와 trust

- Persistent Runtime, native-context probe와 thread는 생성부터 종료까지 exact canonical SemesterWorkspace root 하나를 같은 `cwd`로 사용한다.
- Fixed `project_root_markers=[]`, process-wide managed Skill root와 `skills/extraRoots/set` injection을 제거한다. Native `.git` boundary, root `.codex/config.toml`, `AGENTS.md`와 `.agents/skills/`가 effective project context다.
- Nested independent Git root는 hostile ancestor의 instruction·project config·repo Skill을 상속하지 않아야 한다. Runtime과 probe가 같은 effective boundary를 관측한다.
- Normal Workspace thread/Turn은 exact workspace 하나만 standard `workspace-write`로 사용한다. Additional `writableRoots`와 이를 위한 high-level Python SDK patch를 추가하지 않는다.
- Current pinned App Server의 exact-root `workspace-write` start가 unset trust를 exact native user config에 기록하고 same-start project config를 reload하는 동작을 regression test로 고정한다. Explicit `untrusted`와 parent-only trust를 덮어쓰거나 상속하지 않는다.
- App은 native project config를 thread-start `--config`, private MCP override나 equivalent high-precedence overlay로 재작성하지 않는다.

#### 7. Required Interaction readiness

- App은 shared loopback listener와 private Broker route, fresh generation token·binding을 Runtime spawn 전에 준비한다.
- Runtime은 exact Git root의 tracked `.codex/config.toml`을 native load하고 App은 dynamic endpoint·token·binding value만 generic child environment로 공급한다.
- Adapter authenticated handshake와 expected `ay_ple_interaction` server·tool roster가 모두 ready여야 registry commit과 active Browser state가 가능하다.
- Missing/stale Adapter, ignored project config, wrong roster, Broker offline과 Runtime terminal은 degraded success가 아니다.
- Exact private wire, timeout과 pending interaction settlement는 sibling Interaction Spec이 소유한다.

### Data and State Flow

#### Native Bootstrap

1. User가 `hub/`를 native Codex client로 연다.
2. User가 `semester-workspace-init`을 explicit target·semester metadata와 함께 실행한다.
3. Skill이 root·existing bytes·Git relation을 검사하고 conflict면 mutation 전에 멈춘다.
4. Skill이 minimal files, selected Skill copy와 project MCP declaration을 no-clobber로 준비한다.
5. Skill이 explicit pathspec으로 safe checkpoint를 만들거나 왜 commit하지 않았는지 설명한다.
6. User는 성공한 prepared root를 App launch input으로 사용한다.

#### App first open·reopen

1. Root resolver가 explicit `--workspace` 또는 registry active pointer 하나를 선택한다.
2. App이 canonical root, exact Git marker와 fresh v4 identity를 read-only 검증한다.
3. Shared listener와 Interaction Broker binding을 준비한다.
4. Exact root의 fresh Workspace Runtime·thread를 시작한다.
5. Native project context, exact-root trust, Adapter handshake와 required MCP roster를 검증한다.
6. Explicit root인 경우 known entry와 active pointer를 atomic commit한다. Reopen이면 matching registry identity를 다시 확인한다.
7. Active Browser product surface와 normal Chat admission을 연다.

### Failure Behaviour

| Failure | Required behavior |
| --- | --- |
| Bootstrap conflict | Existing bytes·Git history를 보존하고 native client에서 manual resolution을 요청한다. App state는 없다. |
| No explicit or registered root | `prepared_workspace_required`; Browser·Runtime child 0, actionable Bootstrap/launch guidance |
| Invalid explicit root | Registry pointer unchanged, Runtime child 0, no automatic scaffold |
| Missing/moved/mismatched registry root | Fresh reopen failure; workspace bytes와 pointer를 추측해 rewrite하지 않음 |
| Malformed/future registry | Original bytes preserved, startup fail closed |
| Listener/Broker preparation failure | Runtime child 0, registry unchanged |
| Native context/trust/readiness failure | New registry commit 0, degraded mode 0, bounded Runtime teardown |
| Explicit switch failure | Previous active pointer preserved; user may restart without explicit root to reopen it |
| Dirty tree | Startup과 normal work를 허용; unrelated file stage·commit 0 |
| Runtime terminal after active | Broker intake·pending interaction을 sibling contract에 따라 정산하고 honest recovery를 표시 |
| Registry commit conflict | Runtime을 active authority로 노출하지 않고 conflict를 보존한 채 bounded close |

### Compatibility and Migration

1. W-001 canonical roots와 W-002 v4/registry 구현은 그대로 재사용한다.
2. W-003의 generic non-preemptive coordinator와 terminal-only release를 유지하고 unused candidate/bootstrap Browser codec, `workspace_init` eligibility와 tests만 contract한다.
3. Claimed W-004 dirty diff는 broad restore 없이 hunk별로 분리한다.
   - 유지: fixed marker override 제거, native `.git` boundary, exact project config·AGENTS·repo Skill discovery, hostile ancestor 배제와 managed Skill injection 제거.
   - 폐기: structured additional `writableRoots`, candidate validation, optional MCP·thread permission 전파, `0008-workspace-write-writable-roots`.
4. Existing `0008-standalone-skill-extra-roots` 제거는 native workspace Skill discovery가 green일 때 확정한다. Replacement patch 없이 exact SDK stack을 `0001..0007`로 regenerate하고 manifest·production bundle을 canonical tooling으로 갱신한다.
5. Interaction foundation과 pre-App init Skill은 current public product graph 옆에 expand한다.
6. Prepared-root startup, required readiness와 registry commit을 target composition으로 연결한 뒤 current chooser/activation과 candidate contract를 제거한다.
7. Joint Interaction cutover가 green인 뒤 current-v2 academic public surface·persistence, consumer 없는 v3 kernel과 scoped legacy residue를 별도 contract한다.
8. Existing current-v2/v3 workspace bytes, user Git history와 legacy appData는 automatic migration·delete 대상이 아니다.

## Implementation Decisions

| Decision | Rationale |
| --- | --- |
| Bootstrap은 pre-App native Skill | App과 SDK에 setup permission·candidate lifecycle을 중복하지 않는다. |
| First/change는 `--workspace`, later reopen은 registry | Current donor를 사용하면서 Browser chooser 없이 명시적 handoff와 편한 재실행을 모두 제공한다. |
| App은 prepared root만 연다 | Git/file setup과 Runtime readiness의 owner를 분리한다. |
| Candidate contract를 제거하고 generic coordinator 유지 | 완료 구현 중 실제 current Turn이 소비하는 deep seam만 보존한다. |
| Exact Git root native discovery | User instructions·project MCP·workspace Skills와 hostile ancestor boundary를 Codex 표준에 맡긴다. |
| Additional `writableRoots` SDK patch 없음 | App-internal Bootstrap이 없으면 정상 Runtime은 root 하나만 필요하다. |
| Dirty tree non-blocking | Personal workspace에서 사용자의 자유로운 작업을 admission policy로 막지 않는다. |
| AY-owned meaningful commit | Hook·App state machine보다 작업 의미를 아는 AY에게 판단 공간을 둔다. |
| Readiness 뒤 registry commit | Agent final text나 process spawn을 active proof로 오인하지 않는다. |

## Testing Decisions

### Highest practical seams

- Bootstrap: temporary fresh/existing Git roots에서 real Skill instruction을 실행하는 native-client fixture와 exact file/Git assertions.
- Native context: exact bundled App Server의 provider-free `config/read`·`skills/list`와 local-provider journal.
- Startup: real registry store + deterministic Runtime/Broker + temporary prepared Git root.
- Product: real Chromium → Vite → shared listener → deterministic Runtime/Broker → prepared temporary Git workspace.

### Required proof

- Explicit root vs registry reopen precedence, no-root fail closed와 failed switch의 prior pointer preservation
- V4/registry codec·CAS와 existing byte non-mutation
- Exact Git-root cwd, `.git` boundary, project config·AGENTS·workspace Skill discovery와 hostile ancestor exclusion
- No `project_root_markers=[]`, no `skills/extraRoots/set`, no candidate additional root와 no writable-roots SDK patch
- Pre-App Bootstrap fresh/existing/update/no-op/conflict, dirty-tree preservation와 explicit pathspec checkpoint
- Listener/Broker→Runtime→handshake/readiness→registry commit ordering
- Candidate/init routes·Browser state·eligibility consumer 0, generic coordinator regression green
- Current-v2/v3 bytes·legacy roots unchanged until explicit contraction

Implementation 완료 시 targeted package tests 뒤 `npm test`, `npm run typecheck`, `npm run build`, Chat Shell lint, `npm run test:e2e`, docs links와 exact SDK/production Runtime validation을 통과한다. UI는 1440×900과 1920px-class desktop에서 확인한다.

## Out of Scope

- App-internal Bootstrap Runtime·thread
- Browser directory chooser, `BootstrapCandidate`, init/retry/activate API와 UI
- Additional `writableRoots` product contract 또는 official SDK patch
- App-owned Git status/history UI, auto-commit hook와 clean-tree gate
- In-app hot workspace switching, recent workspace catalog와 one-click switch
- Automatic current-v2/v3 conversion 또는 legacy root deletion
- `workspace-state.json` snapshot의 exact academic schema
- Interaction MCP request/result·Broker·inline Review 세부
- Public distribution, packaged Desktop, mobile·small-screen과 Windows·Linux

## Open Questions

None.

## Further Notes

이 Spec은 sibling Interaction Spec과 함께 한 target vertical을 이루지만 책임을 합치지 않는다. Workspace Spec은 pre-App Bootstrap, exact-root startup과 registry authority를, Interaction Spec은 MCP request→typed UI→same-call result를 소유한다.

Ticket graph를 교정할 때 completed W-001·W-002·W-003과 I-001의 state·Result를 다시 쓰지 않는다. W-003에는 subsequent correction만 기록하고, 미완료 W-004–W-010과 affected Interaction blocker edge를 새 lifecycle에 맞게 축약한다.
