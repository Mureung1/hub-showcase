# User-owned SemesterWorkspace와 InteractionCapability 전환

## Agent triage

- State: ready-for-ticketing
- Surface: local-spec
- Next actor: /to-tickets

## Problem Statement

AY-PLE의 First Assignment vertical은 Codex가 `propose_state_patch`를 호출하고, Browser가 제안을 Review한 뒤, 사용자의 선택을 같은 Turn으로 돌려주는 round trip이 실제로 가능함을 증명했다. 그러나 현재 구현은 이 상호작용을 app-owned `RawMaterial`, `ModelingRun`, durable `StatePatch`·`UserConfirmation`, revision-bound `SemesterModel` apply와 built-in `request_user_input`에 결합한다. App이 학업 workflow와 file mutation의 authority까지 소유하므로 AY가 새 작업을 배울 때마다 Runtime, Server, Browser와 workspace store가 함께 바뀐다.

현재 workspace 경계도 개인 사용 목표와 다르다. Root development command는 `../workspace/year-2-semester-2`를 하드코딩하고, 그 directory의 `<SemesterWorkspace>/.ay-ple/workspace-state.json`을 app-owned current-v2 aggregate로 사용한다. 실제 directory는 Git repository가 아니며 workspace-local `AGENTS.md`, `.codex/config.toml`과 `.agents/skills/`도 없다. App은 TXT 전체를 scan해 `RawMaterial` registry를 만들고, selected source를 staging·scratch에 복사한 뒤에야 AY가 작업할 수 있다.

이 구조는 public distribution에서 임의의 사용자 자료를 보호하기 위한 app-owned scaffold·copy 경계에는 맞았지만, 소유자 한 명이 자신의 학기 자료를 직접 관리하는 현재 제품에는 맞지 않는다. 사용자가 원하는 동작은 AY가 별도 복사본이 아니라 한 학기 Git working tree의 실제 파일을 직접 읽고 수정하며, 판단이 필요한 순간에만 AY-PLE의 typed UI를 사용하고, 의미 있는 결과를 Git checkpoint로 남기는 것이다.

다음 구현은 두 질문을 하나의 vertical로 닫아야 한다.

1. 사용자가 선택한 한 학기 Git root가 Codex project·thread의 고정 `cwd`가 되고, App이 그 안의 실제 파일을 별도 registry·copy 없이 AY에게 맡길 수 있는가?
2. `propose_state_patch`가 App-owned academic transaction이 아니라, `AY → MCP → App → User → App → MCP → AY` 한 번의 transient Review round trip으로 동작할 수 있는가?

## Solution

AY-PLE을 다음 feedback loop로 전환한다.

```text
Global Codex account
→ active workspace가 없으면 hub-rooted Bootstrap Runtime·thread
→ 사용자가 SemesterWorkspace candidate 선택
→ semester-workspace-init Skill이 Git·최소 workspace file·Skill·MCP config 준비
→ 사용자가 명시적으로 activation
→ Bootstrap Runtime·thread 종료
→ exact SemesterWorkspace Git root의 fresh Workspace Runtime·thread
→ AY가 실제 학기 파일에서 작업
→ propose_state_patch MCP call
→ AY Chat inline Review card
→ accept | revise | reject
→ 같은 MCP call의 structured result
→ AY가 실제 파일 변경
→ AY가 의미 있는 Git checkpoint
```

App은 canonical root 선택, `WorkspaceRegistry`, Bootstrap→Workspace Runtime 전환, Interaction Broker와 capability-specific UI를 소유한다. AY와 Skill은 작업 순서, Review 요청 시점, 결과 해석, 실제 file mutation과 Git commit을 소유한다. Codex Runtime은 native thread·Turn, permission, project config·Skill·MCP discovery와 process lifecycle을 소유하되 capability schema를 알지 않는다.

`propose_state_patch`는 이름을 유지하지만 도메인 중립적인 semantic Review로 축소한다. Caller는 summary, question, 순서 있는 before/after change와 선택적인 `EvidenceRef`만 보낸다. App은 active Runtime에 결합된 exact workspace에서 evidence를 on-demand로 검증하고, 모든 ref가 유효할 때만 하나의 inline card를 publish한다. 사용자의 정상 result는 `accept | revise | reject`뿐이며, App은 결과를 workspace에 대신 적용하거나 durable Review ledger에 저장하지 않는다.

한 학기는 한 Git repository다. Root `workspace-state.json`은 학기 identity와 Skill-owned structured snapshot을 담는 Git-tracked envelope이고, Git history가 변경 이력과 rollback을 맡는다. Cross-workspace 운영 metadata와 active pointer는 sibling `../.ay-ple/`에 둔다. Existing current-v2 bytes는 전환 중 그대로 보존하지만 새 target의 authority로 자동 migration하지 않는다.

## User Stories

1. As the sole user, I want AY-PLE이 내 기존 global Codex account를 사용하기를 원한다, so that 별도 AY-PLE credential lifecycle을 관리하지 않는다.
2. As a new-semester user, I want App에서 학기 directory를 고른 뒤 AY가 init Skill로 그 자리에서 준비하기를 원한다, so that app-owned 복사본이나 scaffold script 없이 실제 폴더를 workspace로 쓸 수 있다.
3. As a user with an existing Git repository, I want 현재 파일과 dirty working tree를 그대로 존중받기를 원한다, so that App의 clean-tree gate 때문에 평소 작업이 막히지 않는다.
4. As a student, I want 한 학기 Git root가 Codex project와 thread의 exact `cwd`이기를 원한다, so that 하위 과목 폴더나 실행 당시 `process.cwd()`가 별도 workspace로 오인되지 않는다.
5. As a returning user, I want App이 known SemesterWorkspace와 active pointer를 기억하기를 원한다, so that 다른 학기를 추가하거나 명시적으로 전환할 수 있다.
6. As a student, I want AY가 SemesterWorkspace의 실제 파일을 직접 읽고 수정하기를 원한다, so that `RawMaterial` 등록과 source copy를 먼저 만들지 않아도 된다.
7. As a student, I want AY가 제안한 변경을 Chat 안의 semantic before/after card로 검토하기를 원한다, so that raw Git diff나 App 내부 ID를 이해하지 않아도 된다.
8. As a student, I want 변경 근거가 active workspace의 exact content version에서 왔는지 확인하기를 원한다, so that stale quote나 workspace 밖 file이 근거처럼 표시되지 않는다.
9. As a student, I want Review를 수락·수정 요청·거절하기를 원한다, so that AY가 다음 행동 전에 내 의도를 structured result로 받을 수 있다.
10. As a student, I want 수정 요청 뒤 기존 card가 기록으로 남고 새 제안이 새 card로 추가되기를 원한다, so that 서로 다른 MCP call의 chronology를 이해할 수 있다.
11. As a student, I want pending Review 중에는 다른 Turn을 실수로 시작하지 않되 전체 Turn은 중단할 수 있기를 원한다, so that 기다리는 MCP call과 별도 입력 흐름이 충돌하지 않는다.
12. As a student, I want 수락 전에는 제안한 file mutation이 적용되지 않기를 원한다, so that Review가 사후 보고가 아니라 실제 의사결정이 된다.
13. As a student, I want 수락 뒤 AY가 실제 파일을 바꾸고 자연스러운 checkpoint에서 commit하기를 원한다, so that 변경을 Git으로 이해하고 되돌릴 수 있다.
14. As a maintainer, I want Runtime이 generic child environment와 MCP readiness만 알기를 원한다, so that 새 InteractionCapability가 native lifecycle package를 바꾸지 않는다.
15. As a maintainer, I want InteractionCapability를 in-memory UI Adapter로 독립 검증하기를 원한다, so that app-owned academic store나 live provider 없이 round trip과 failure를 재현할 수 있다.
16. As a maintainer, I want current-v2와 historical v3 bytes를 자동 변환하거나 삭제하지 않기를 원한다, so that 새 vertical이 green이 되기 전 rollback evidence와 기존 사용자 상태를 잃지 않는다.

## Current State and Constraints

### Current implementation

| 영역 | 현재 구현 사실 | 이 Spec의 처리 |
| --- | --- | --- |
| Workspace selection | `scripts/product-local.mts`가 `../workspace/year-2-semester-2`와 `../.ay-ple-dogfood`를 기본값으로 계산하고 `CODEX_CHAT_WORKSPACE`·`AY_PLE_WORKSPACE_ROOT`가 process-local selection에 관여한다. Durable registry는 없다. | Hardcoded active workspace와 environment selection authority를 제거하고 `WorkspaceRegistry`를 사용한다. |
| Workspace store | `<SemesterWorkspace>/.ay-ple/workspace-state.json` current-v2가 workspace ID, Course, `RawMaterial`, Assignment, Run·patch·confirmation history와 execution guard를 한 aggregate로 보존한다. | Original bytes를 보존한 채 읽기·쓰기 consumer에서 분리한다. 새 root v4 envelope로 자동 migration하지 않는다. |
| 자료 처리 | Server가 eligible TXT를 전체 scan해 `RawMaterial` registry와 bounded preview를 만들고 action마다 source staging·workspace scratch를 준비한다. | App-owned registry·snapshot·copy를 제거한다. Evidence가 있는 한 call에 한해서만 bounded read한다. |
| Academic workflow | `ProductOperationCoordinator`가 First Assignment Recipe, Run, private MCP session, built-in `request_user_input`, Review replacement, durable apply와 recovery를 조정한다. | Native Turn lifecycle과 generic clarification만 남기고 academic workflow·apply를 AY와 Skill로 돌린다. |
| MCP | `apps/server`의 `/api/product-mcp`가 process token과 `requestKey` session을 받아 pending patch를 먼저 저장하고 즉시 tool success를 반환한다. Thread start가 URL·token config를 override한다. | `@ay-ple/interaction-mcp` STDIO Adapter와 Server Broker로 교체한다. 한 MCP call의 HTTP response를 사용자 result까지 유지한다. |
| Runtime | Exact workspace `cwd`는 이미 고정하지만 persistent bridge와 native-context sidecar 모두 `project_root_markers=[]`를 강제하고, absolute managed Skill root와 private MCP URL·token을 product-specific thread input으로 받는다. | Native Git project discovery를 복구하고 managed Skill·MCP override를 제거한다. Generic child env와 MCP readiness만 추가한다. |
| Browser | Current 3-pane workbench는 Course·material selection, Assignment action, durable Review replacement와 settled history를 표시한다. | General AY Chat과 inline InteractionCapability card를 target surface로 삼고 app-owned source/action/history UI를 제거한다. |
| Listener | Application·workspace activation 뒤 listener를 bind하는 canonical order지만, `server-listener`에는 503 delegate를 먼저 bind하고 application을 attach하는 검증된 seam이 있다. | Bind-first seam을 canonical startup으로 사용한다. |
| Runtime payload | Package-local ignored `.artifacts/`와 `../.ay-ple-dogfood` 아래 mutable execution state를 사용한다. | Verified payload와 operation state를 canonical `../.ay-ple/`로 옮긴다. |

현재 `../workspace/year-2-semester-2`에는 `.git`, `AGENTS.md`, `.codex/config.toml`과 `.agents/skills/`가 없고, 빈 current-v2 aggregate만 있다. 이를 이미 target SemesterWorkspace인 것처럼 처리하지 않는다.

### Adopted target and governing decisions

- [ADR 0018](../adr/0018-adopt-user-owned-git-semester-workspaces.md)이 user-owned Git root, two-phase Runtime, root `workspace-state.json`, native project context와 AY-owned Git checkpoint를 소유한다.
- [ADR 0019](../adr/0019-use-mcp-interaction-capabilities-as-the-ay-app-seam.md)이 MCP Adapter↔Broker, transient one-call result, single pending slot, inline Review, failure/result boundary와 AY-owned apply를 소유한다.
- [AY–App Interaction Capability 아키텍처](../architecture/ay-app-interaction-capabilities.md)가 long-lived module mapping을, [Codex Runtime 격리](../architecture/codex-runtime-isolation.md)가 canonical roots와 process boundary를 소유한다.
- [ADR 0011](../adr/0011-reuse-official-codex-python-sdk-for-chat-shell.md)의 exact official SDK/native baseline과 [ADR 0012](../adr/0012-adopt-codex-chat-only-and-remove-legacy-runtime-surfaces.md)의 single maintained Runtime graph·no-alias hard cutover는 유지한다.
- [ADR 0013](../adr/0013-adopt-product-only-public-surface-and-v2-store-compatibility-baseline.md)의 original-byte preservation과 explicit version transition 원칙을 유지한다.
- Mobile·small-screen은 제외하고 1440–1920px desktop을 검증한다.

### Superseded planning contracts

- 이 spec은 [personal/local dogfood spec](./2026-07-24-personal-local-dogfood.md)을 active implementation plan으로 대체한다. App-owned v3 scaffold, existing directory를 read-only `ImportSource`로 취급하는 copy flow, durable academic entity와 `AcademicActionPort`는 target이 아니다.
- 완료된 [First Assignment spec](./2026-07-19-first-assignment-product-bound-companion.md)과 001–009a ticket은 round trip, native lifecycle, Browser UI와 failure regression의 historical characterization donor다. 완료 상태와 과거 검증은 바꾸지 않지만 app-owned workspace·workflow·apply contract는 새 target으로 승격하지 않는다.
- 완료된 [public release residue pruning spec](./2026-07-27-public-release-residue-pruning.md)과 001–005 ticket도 완료 상태를 유지한다. Ticket 005의 당시 “v3 kernel 유지 후 `ImportSource` 진행” 결론만 ADR 0018·0019와 이 spec에 의해 historical 판단이 된다.
- 미완료 public-release ticket은 이 작업의 dependency나 backlog가 아니며 자동으로 되살리지 않는다.

## Implementation Contract

### Module Responsibilities and Seams

| Module | 소유하는 책임 | 소유하지 않는 책임 |
| --- | --- | --- |
| `semester-workspace-init` Bootstrap Skill | Candidate에서 Git 준비, 최소 workspace file, selected built-in Skill copy, project MCP config와 첫 checkpoint를 일반 file·Git 도구로 준비 | App registry commit, Runtime spawn, exact Browser lifecycle |
| `hub/skills/` built-in catalog와 workspace Skill copy | AY workflow, Review 요청 시점, result 해석, actual file mutation과 Git checkpoint | Browser correlation, App endpoint·credential |
| `@ay-ple/semester-workspace` | Root v4 `workspace-state.json` identity envelope codec와 registry가 참조할 stable workspace identity | App-owned scaffold·bundle, Git lifecycle, academic snapshot schema·apply |
| `@ay-ple/interaction-mcp` | Executable STDIO Adapter, capability별 request/result codec, private Adapter↔Broker HTTP codec와 safe error mapping | Express listener, active workspace selection, Browser UI와 academic workflow |
| `apps/server` Workspace lifecycle | Canonical roots, process-local BootstrapCandidate, durable `WorkspaceRegistry`, Bootstrap→Workspace Runtime transition과 active binding | Git init/status/commit, Skill copy와 user file mutation |
| `apps/server` Interaction Broker | Runtime credential, handshake, one pending slot, evidence resolution, Browser projection, once-only answer와 failure settlement | Capability result 적용, Review ledger, Agent retry |
| `@ay-ple/codex-chat-runtime` | Exact native lifecycle, fixed runtime `cwd`, generic child environment, native project loading, generic MCP readiness와 bounded cleanup | `propose_state_patch` schema, Broker route 의미, Browser UI |
| `@ay-ple/product-contract` | Browser-safe workspace lifecycle, Chat operation과 capability-specific Review request/result/frame codec | Raw MCP, private Broker protocol, filesystem path와 persistence bytes |
| `apps/chat-shell` | Bootstrap/activation surface, AY Chat, inline Review card, action input과 Turn interrupt | Raw MCP response, Git/file mutation, durable Review history |
| SemesterWorkspace Git repository | 실제 자료, `AGENTS.md`, root state envelope, project config, executing Skill bytes와 Git history | Runtime token·binding, pending interaction |
| Sibling `../.ay-ple/` | Runtime payload, `WorkspaceRegistry`, cache·temp와 workspace별 transient operation state | 학기 자료·identity snapshot, Skill copy와 Git history |

`apps/server`는 `@ay-ple/interaction-mcp`, `@ay-ple/codex-chat-runtime`, `@ay-ple/semester-workspace`와 `@ay-ple/product-contract`를 조합한다. `@ay-ple/interaction-mcp`와 Runtime package는 서로 import하지 않는다. Chat Shell은 계속 `@ay-ple/product-contract`만 shared production package로 사용한다.

### Interfaces and Invariants

#### 1. Canonical roots와 Runtime phase

Canonical repository-local product layout은 다음과 같다.

```text
hub/                                      # packageRoot
  .agents/skills/semester-workspace-init/
  skills/<built-in-skill>/
  packages/interaction-mcp/dist/stdio.js

../.ay-ple/                               # appDataRoot
  runtime/production-runtime-darwin-arm64/
  state/workspace-registry.json
  state/workspaces/<workspaceId>/
  state/runtime/home/
  cache/
  temp/

~/.codex/                                 # effective global CODEX_HOME

<SemesterWorkspace>/                      # one semester, one Git working tree
  .git/
  AGENTS.md
  workspace-state.json
  .agents/skills/<selected-built-in-skill>/
  .codex/config.toml
  <actual-semester-files>
```

- `packageRoot`는 current `hub/` checkout이고 tracked source·rebuildable dependency와 output만 소유한다.
- `appDataRoot` 기본값은 `packageRoot`의 sibling `../.ay-ple/`다. Canonical product command는 `../.ay-ple-dogfood`, `../.ay-ple-dev-workspaces`, repository-local `.ay-ple`와 ambient `process.cwd()`를 fallback으로 사용하지 않는다.
- Verified Runtime root는 `<appDataRoot>/runtime/production-runtime-darwin-arm64`다. Package-local Runtime artifact를 그대로 copy해 새 authority로 삼지 않는다.
- Effective `CODEX_HOME`은 caller 값 또는 OS user의 `~/.codex`다. App은 별도 Codex credential/config authority를 만들지 않는다. `CODEX_SQLITE_HOME`을 별도 app-owned session authority로 분리하지 않고 pinned native가 effective global Codex home을 사용하게 한다.
- Controlled child `HOME`은 `<appDataRoot>/state/runtime/home`, temporary state는 `<appDataRoot>/temp/` 아래에 둔다.
- SemesterWorkspace는 sibling `../workspace/` 아래를 권장하지만 사용자가 명시적으로 고른 다른 canonical Git working tree도 허용한다. Package, appData, global Codex home와 SemesterWorkspace는 unsafe overlap이 없어야 한다.
- Canonical `npm run dev`는 hardcoded workspace와 `CODEX_CHAT_WORKSPACE`를 selection authority로 사용하지 않는다. Test factory는 explicit temporary roots를 주입할 수 있지만 product fallback으로 승격하지 않는다.

Runtime phase는 다음 두 가지뿐이다.

| Phase | Exact `cwd` | 목적 | Interaction MCP |
| --- | --- | --- | --- |
| Bootstrap Runtime | canonical `hub/` | Global account readiness, native-discovered init Skill, candidate 준비 | Workspace project declaration을 주입하지 않는다. |
| Workspace Runtime | selected canonical SemesterWorkspace Git root | 정상 AY Chat, project Skill과 InteractionCapability | Git-tracked project declaration과 process env binding이 모두 필수다. |

한 Runtime과 thread는 생성부터 종료까지 하나의 `cwd`에 고정된다. Active workspace에서 candidate selection을 확정할 때 Workspace Runtime을 닫고 Bootstrap Runtime을 새로 만들며, candidate activation·active restart와 App shutdown도 old Runtime·thread와 Broker generation을 완전히 닫은 뒤 필요한 fresh Runtime·thread를 만든다. Bootstrap thread를 SemesterWorkspace에서 resume하거나 existing Runtime의 `cwd`만 바꾸지 않는다.

#### 2. Root `workspace-state.json`

새 target은 historical v2·v3와 같은 version 의미를 재사용하지 않고 다음 v4 envelope를 사용한다.

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

- Top-level key는 exact하고 document는 fatal UTF-8 JSON, 최대 `1 MiB`다.
- `workspaceId`는 `^workspace_[0-9a-f]{32}$`이고 한번 생성한 뒤 path rename이나 registry rebuild 때문에 바꾸지 않는다.
- `yearLevel`은 `1..20` positive safe integer다.
- `term.key`는 `^[a-z0-9]+(?:-[a-z0-9]+)*$`, 최대 `64` UTF-8 bytes다. Initial convention은 `semester-1`, `semester-2` 또는 사용자가 정한 stable slug다.
- `term.displayName`은 trim 후 non-empty, 최대 `128` UTF-8 bytes다.
- Init Skill은 `snapshot: {}`로 시작한다. App은 `snapshot`이 JSON object이고 전체 document bound 안에 있는지만 확인하며 내부 academic field를 해석·rewrite·apply하지 않는다. Snapshot schema는 해당 workspace의 Skill과 파일이 소유한다.
- Top-level envelope를 바꾸면 explicit `formatVersion` bump가 필요하다. Skill-owned `snapshot` 진화는 App contract나 migration framework를 자동으로 요구하지 않는다.
- App과 built-in Skill은 `modelingRuns`, `statePatches`, `userConfirmations`, `executionGuard`, `sourceRecovery`를 event history로 새 envelope에 복사하지 않는다.
- `workspace-state.json`은 Git-tracked academic file이다. App activation은 identity를 read-only로 검증할 수 있지만 정상 interaction result를 이 파일에 대신 쓰지 않는다.

Existing `<SemesterWorkspace>/.ay-ple/workspace-state.json` v2, app-owned v3 aggregate 또는 malformed root file은 자동 v4 conversion 대상이 아니다. Init Skill은 existing bytes를 overwrite하지 않고 사용자에게 충돌을 설명해야 한다.

#### 3. `WorkspaceRegistry`

`<appDataRoot>/state/workspace-registry.json`은 다음 strict v1 shape 하나를 사용한다.

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

- File maximum은 `256 KiB`, entry maximum은 `64`다.
- `workspaceId`와 `canonicalRoot`는 각각 unique하고 `activeWorkspaceId`가 non-null이면 matching entry가 반드시 존재한다.
- `canonicalRoot`는 write 당시 realpath로 canonicalize한 absolute directory다. Browser에는 absolute root를 보내지 않고 `workspaceId`, semester identity와 safe basename만 투영한다.
- Registry는 pointer다. Activation·reopen 때 root v4 identity를 fresh read하고 registry ID와 일치하는지 확인한다. Path가 missing, moved, reused 또는 identity-mismatched이면 active Runtime을 만들지 않는다.
- Missing registry는 empty v1로 시작할 수 있다. Existing malformed·unsupported bytes는 empty state로 reset하지 않고 원본을 보존한 `registry_incompatible`로 연다.
- Mutation은 temporary file, file sync, rename, directory sync와 opened-byte compare를 사용한다. Duplicate command는 같은 canonical entry로 수렴할 수 있지만 conflicting external bytes를 덮어쓰지 않는다.
- Candidate는 activation 성공 전 registry에 기록하지 않는다. New Runtime과 required Interaction MCP가 ready된 뒤 known entry와 active pointer를 한 transaction으로 commit한다.
- Registry loss는 SemesterWorkspace identity나 Git history를 바꾸지 않는다. 사용자가 root를 다시 선택해 valid v4 identity를 확인하면 entry를 재등록할 수 있다.

#### 4. BootstrapCandidate와 init Skill

- Active workspace가 없거나 사용자가 새 학기 추가를 선택하면 Server-owned directory chooser가 existing directory 하나를 고른다. Browser는 새 workspace의 `yearLevel`, `term.key`, `term.displayName`을 입력하고 Server는 canonical path를 process-local `BootstrapCandidate`에 묶는다.
- Browser는 opaque `candidate_[0-9a-f]{32}`와 safe label만 받는다. Candidate path는 registry, Browser storage나 workspace file에 별도 binding으로 기록하지 않는다.
- 사용자가 `AY로 초기화`를 명시적으로 시작하면 Bootstrap Runtime의 visible Turn이 native-discovered `semester-workspace-init` Skill에 candidate root와 semester identity를 전달한다. Server는 Browser가 보낸 path가 아니라 current `BootstrapCandidate`의 canonical root 하나만 그 Turn의 additional native `writableRoots`로 연다. Bootstrap `cwd`와 Skill discovery는 계속 `hub/`이고 App이 Git/file 작업을 대신 실행하지 않는다.
- Skill 완료 메시지는 activation proof가 아니다. 사용자가 `활성화`를 누르면 App이 candidate directory, root v4 identity와 native project/MCP readiness를 fresh 검증한다.
- Candidate cancel·App restart는 registry mutation 없이 process-local binding만 버린다. Skill이 이미 만든 file이나 Git commit을 App이 rollback·delete하지 않는다.

`hub/.agents/skills/semester-workspace-init/SKILL.md`는 instruction-based Skill이며 별도 scaffold script를 선행 구현하지 않는다. Skill은 다음 결과를 소유한다.

1. Candidate가 새 repository면 그 exact directory에서 Git을 initialize한다. Existing repository면 history·remote·dirty state를 존중한다. Candidate가 다른 repository의 descendant거나 `.git` indirection이 candidate 밖 repository를 가리키면 중단한다.
2. Missing root `workspace-state.json`을 v4 initial envelope로 만든다. Existing matching v4 identity·semester는 no-op이고, 다른 v4 identity·semester, v2/v3 또는 malformed file은 silent rewrite하지 않는 manual conflict다.
3. Missing `AGENTS.md`에는 “한 학기 repository”, “실제 file에서 작업”, “의미 있는 checkpoint마다 자주 commit”, “dirty tree를 이유로 작업을 막지 않음”의 짧은 원칙만 둔다. Existing `AGENTS.md`는 사용자 지침을 보존하고 필요한 최소 block만 review 가능한 diff로 추가한다.
4. `hub/skills/<skill>/` real directory를 `<SemesterWorkspace>/.agents/skills/<skill>/`로 copy한다. Missing target은 copy하고 exact matching tree는 no-op이다. Existing differing tree는 자동 삭제·교체하지 않고 source↔workspace diff를 보여주는 manual conflict로 남긴다. 사용자가 그 Bootstrap Turn에서 명시적으로 merge·replace를 지시한 경우에만 selected Skill tree를 바꾼다. Symlink와 Runtime `extraRoots`를 사용하지 않는다.
5. Initial vertical은 rewritten `ay-ple-first-assignment` built-in Skill을 설치한다. 이 Skill은 actual file을 읽고, mutation 전에 `propose_state_patch`를 한 번 호출하며, 같은 결정을 built-in `request_user_input`으로 다시 묻지 않고, normal result 뒤에만 file을 변경한다.
6. `.codex/config.toml`에 static Interaction MCP declaration을 준비한다. Missing file이나 missing target table은 다른 config를 보존해 추가하고, exact matching table은 no-op이다. Existing `[mcp_servers.ay_ple_interaction]`의 managed key만 stale하면 그 table만 review 가능한 diff로 고친다. Malformed TOML, duplicate target table, target table의 unknown key·wrong type 또는 comment를 보존한 안전한 edit가 불가능하면 manual conflict로 중단한다. 다른 MCP table과 project config를 rewrite하지 않는다.
7. Candidate root의 legacy `.ay-ple/`은 자동 delete·move·stage하지 않는다. New repository에 legacy root가 있으면 root `.gitignore`의 기존 규칙을 보존하면서 exact `/.ay-ple/` ignore를 추가한다. Existing Git repository의 ignore·tracked 상태는 바꾸지 않고 legacy bytes를 사용자 해결 대상으로 남긴다.
8. New repository에서는 Skill이 생성·변경한 scaffold path만 먼저 stage해 첫 checkpoint를 만든다. 그 뒤 기존 non-scaffold file의 exact untracked 목록을 보여주고, existing ignore와 `/.ay-ple/`을 제외한 사용자가 명시적으로 승인한 path만 별도 baseline checkpoint로 남긴다. 승인하지 않은 file, credential 가능성이 있다고 표시한 file과 legacy `.ay-ple/`은 stage하지 않는다. 따라서 실제 원본 자료를 Git으로 baseline하는 선택은 명시적이지만 App 기능이나 clean-tree gate가 아니다.
9. Existing repository에서는 unrelated tracked·untracked change를 임의로 stage하지 않는다. Skill-owned path도 기존 user modification과 분리할 수 없으면 commit하지 않고 exact diff를 남긴다. 자연스러운 checkpoint 범위는 AY가 일반 Git 안전 원칙으로 판단한다.
10. 같은 Skill을 initialized workspace에서 다시 실행하면 update mode로 동작한다. Exact current scaffold는 no-op이고 empty commit을 만들지 않는다. Stale relative MCP command는 managed table만 갱신하며, differing Skill tree와 user-owned file은 위 conflict 규칙 없이 overwrite하지 않는다.
11. Current pinned `workspaceWrite`가 `.git`, `.agents`, `.codex`를 protected metadata로 유지하므로, 이 세 path를 만드는 file operation과 `git init/add/commit`은 native shell/unified-exec의 explicit per-call escalated permission, exact candidate `cwd`를 사용하고 staging·commit 범위에는 explicit pathspec을 사용한다. Turn 전체를 `dangerFullAccess`로 바꾸거나 protected path를 persistent writable root로 열지 않는다. `on-request + auto_review`가 그 exact call을 승인한 경우에만 실행하고 denial·unavailable은 honest init/update failure다.

App은 Git init, status, clean-tree requirement, staging, commit, hook, remote와 sync UI를 구현하지 않는다. Activation preflight는 selected root가 `.git` working-tree marker를 가진 exact candidate인지 read-only로 확인할 수 있지만 Git lifecycle state machine으로 확장하지 않는다.

#### 5. Browser workspace lifecycle contract

`@ay-ple/product-contract`의 workspace bootstrap shape는 app-owned Course·material·history를 제거하고 다음 exact discriminated state로 hard cutover한다.

```ts
type ProductAccountReadiness =
  | { readonly state: 'ready' }
  | { readonly state: 'not_ready'; readonly displayMessage: string }
  | { readonly state: 'unavailable'; readonly displayMessage: string }

type ProductSemesterIdentity = {
  readonly yearLevel: number
  readonly term: {
    readonly key: string
    readonly displayName: string
  }
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
        | {
            readonly kind: 'candidate_activation'
            readonly candidateId: string
          }
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
    | {
        readonly operationId: string
        readonly kind: 'chat' | 'workspace_init'
      }
    | null
}
```

- ID와 semester field는 앞 절과 같은 codec을 사용한다. `label`은 canonical root의 safe basename에서 control character를 제거한 최대 `256` UTF-8 bytes이고 absolute path가 아니다.
- Initial Browser contract는 current active summary와 process-local candidate만 투영한다. Registry의 known root 목록과 canonical path는 투영하지 않는다. 다른 학기를 추가하거나 바꿀 때는 directory chooser로 root를 다시 선택한다. Recent-workspace list와 one-click switch는 관찰된 반복 필요 전까지 deferred다.
- `GET /api/product/bootstrap`은 위 `ProductBootstrap` 하나를 반환한다. App restart 뒤 candidate와 active operation은 사라지지만 registry의 valid active root는 fresh 검증·start한 뒤 `active`로 돌아온다. Active pointer의 root가 없거나 identity를 읽을 수 없으면 `recovery_required/workspace_unavailable`, valid root의 Runtime start가 실패하면 `recovery_required/runtime_unavailable`, registry 자체가 malformed/future면 `registry_incompatible`다.
- `bootstrap` state는 hub-rooted Bootstrap Runtime이 ready라는 뜻이다. `activeWorkspace`가 non-null이면 registry pointer는 남아 있지만 그 Workspace Runtime은 닫힌 상태다. `active` state만 exact workspace Runtime·required MCP가 ready라는 뜻이다.
- `POST /api/product/workspace-candidates/select`는 exact `{ semester: ProductSemesterIdentity }` body로 native chooser를 연다. Server는 command 시작 때 opaque candidate ID를 미리 발급해 `transitioning/bootstrap_candidate`를 표시한다. Cancel은 old `active` 또는 `bootstrap` state를 그대로 복구한 `{ status: "cancelled" }`, selection은 `{ status: "selected", candidate: ProductBootstrapCandidate }`다. Active Runtime에서 selection이 확정되면 Server는 durable active pointer를 바꾸지 않은 채 old Workspace Runtime·Broker를 bounded close하고 hub-rooted Bootstrap Runtime을 시작해 `bootstrap` state가 된 뒤 response를 반환한다. Existing idle candidate는 새 selection으로 교체할 수 있지만 file을 rollback하지 않는다. Active init Turn이나 workspace transition 중에는 `409 workspace_command_conflict`다.
- `POST /api/product/workspace-candidates/:candidateId/initialize`는 exact empty object를 받고 existing Product Turn NDJSON stream을 반환한다. Server가 candidate-bound prompt와 Turn-scoped writable root를 구성하며 Browser가 path·Skill path를 보내지 않는다. Init Turn 하나가 active일 때 duplicate는 `409`; terminal 뒤 같은 candidate에 fresh operation으로 다시 실행할 수 있다.
- `POST /api/product/workspace-candidates/:candidateId/activate`는 exact empty object를 받고 full activation terminal까지 기다린 뒤 `{ status: "activated", workspace: ProductWorkspaceSummary }`를 반환한다. 같은 process에서 response가 유실된 same candidate retry는 bounded in-memory last receipt로 같은 summary에 수렴하고 새 Runtime을 만들지 않는다. Restart 뒤에는 `GET /api/product/bootstrap`이 durable recovery authority다.
- `POST /api/product/workspaces/active/restart`는 exact empty object를 받는다. Valid active Runtime이면 current `{ status: "activated", workspace }`에 수렴하고, available pointer만 남고 Runtime이 닫혔으면 exact active root로 full start를 다시 시도한다. Current candidate가 non-null이면 사용자가 먼저 DELETE로 binding을 버리도록 `409 workspace_command_conflict`이고 candidate file을 암묵적으로 버리지 않는다. Unavailable 또는 null pointer는 directory chooser로 root를 다시 선택해야 한다. Known-list switch endpoint는 initial contract에 없다.
- `DELETE /api/product/workspace-candidates/:candidateId`는 current matching candidate binding만 버리고 `204`다. 같은 stale ID의 반복 delete도 `204`이고 새 candidate나 disk bytes를 건드리지 않는다. Bootstrap state에 previous active pointer가 남아 있어도 Workspace Runtime을 자동 restart하지 않는다. User는 explicit active restart를 사용한다.
- 모든 mutating command는 Server-wide workspace transition lease 하나를 사용한다. 서로 다른 candidate ID, init Turn, active Chat/Review 또는 transition과 충돌하는 command는 기존 작업을 preempt하지 않고 `409`다. Candidate ID mismatch는 `404 candidate_not_found`, invalid bytes·identity는 `409 workspace_incompatible`, account not ready는 `409 account_not_ready`, Runtime/Broker start failure는 `503 runtime_unavailable`의 Browser-safe `{ code, displayMessage }`만 반환한다.
- Transition과 `bootstrap` state에서는 normal Chat을 시작하지 않는다. Transition 중에는 새 init Turn·candidate replacement도 시작하지 않는다. Init Turn terminal 뒤에도 state는 candidate를 가진 `bootstrap`이고, activation 성공 시에만 candidate를 제거한 `active`가 된다. Activation 실패 시 candidate와 durable old active pointer를 보존하고 hub Bootstrap Runtime을 다시 시작한다. 이 restart가 성공하면 `bootstrap`, 실패하면 `recovery_required/runtime_unavailable`이며 first workspace처럼 old pointer가 없으면 `activeWorkspace: null`이다. Agent text나 init Turn terminal outcome만으로 `active`를 만들지 않는다.

#### 6. Project MCP declaration과 executable

Config key와 static declaration은 다음으로 고정한다.

```toml
[mcp_servers.ay_ple_interaction]
command = "<SemesterWorkspace-root-relative path to hub/packages/interaction-mcp/dist/stdio.js>"
env_vars = [
  "AY_PLE_INTERACTION_BROKER_URL",
  "AY_PLE_INTERACTION_BROKER_TOKEN",
  "AY_PLE_INTERACTION_RUNTIME_BINDING"
]
enabled_tools = ["propose_state_patch"]
required = true
```

- Built executable filename은 `packages/interaction-mcp/dist/stdio.js`다. Build는 Node shebang과 executable mode를 보장한다.
- `command`는 `.codex/`가 아니라 exact SemesterWorkspace root에서 current `hub/` built entrypoint까지 계산한 relative path다. Absolute machine path, `npx`, global install, appData copy와 symlink를 사용하지 않는다.
- Declaration에 `cwd`, `tool_timeout_sec`, endpoint·token·binding value와 thread/native identity를 쓰지 않는다. `args`와 static `env`도 initial contract에는 없다.
- Current pinned launcher가 omitted `cwd`를 Workspace Runtime root로 fallback하고 default MCP tool timeout `300` seconds를 쓰는 동작을 actual regression으로 고정한다.
- Runtime의 sanitized child `PATH`에는 current AY-PLE Node executable directory를 explicit하게 포함해 `stdio.js` shebang이 ambient `PATH` 없이 같은 Node를 찾게 한다.
- `hub/` 또는 workspace root 이동으로 relative command가 stale하면 activation은 fail closed한다. User가 `semester-workspace-init`을 update mode로 다시 실행해 path와 selected Skill copy를 재계산하고 workspace diff·checkpoint를 남긴다.
- Bootstrap Skill은 global `~/.codex/config.toml` trust를 수정하지 않는다.

#### 7. Capability-neutral Runtime contract

`@ay-ple/codex-chat-runtime` production factory는 기존 controlled environment에 다음 generic seam을 추가한다.

```ts
type CodexChildEnvironment = Readonly<Record<string, string>>

type CodexProductPermissionProfile =
  | { readonly mode: 'read_only' }
  | {
      readonly mode: 'workspace_write'
      readonly writableRoots: readonly string[]
    }

interface CodexMcpReadinessPort {
  waitForMcpServerReady(input: {
    readonly serverName: string
    readonly expectedTools: readonly string[]
    readonly signal: AbortSignal
  }): Promise<void>
}
```

- `workspace_write`의 `writableRoots`는 native workspace root 외의 additional absolute root를 뜻하며 initial maximum은 하나다. Runtime은 `startProductTurn` 경계에서 각 root가 Server가 제공한 canonical realpath와 정확히 같고 existing non-symlink directory인지 native `turn/start` 전에 확인한 뒤 official `workspaceWrite.writableRoots`로 전달한다. `read_only`에는 roots를 넣을 수 없다.
- Normal Workspace Turn은 `writableRoots: []`다. Bootstrap init Turn만 Server-owned current candidate root 하나를 사용한다. 다른 Bootstrap Turn은 `read_only`이고 Browser request·prompt text에서 writable root를 만들 수 없다.
- `workspace_write` Turn은 pinned official `ApprovalMode.auto_review`, 즉 native `approvalPolicy: "on-request"`와 `approvalsReviewer: "auto_review"`를 유지한다. `.git`·`.agents`·`.codex` protected write는 AY가 native shell/unified-exec의 explicit per-call escalated permission을 요청하고 native guardian이 review한다. Server·Browser가 approval을 자동 합성하거나 별도 generic approval UI를 구현하지 않는다.
- Per-call approval은 해당 tool call에만 적용한다. Runtime public contract에 `danger_full_access`, arbitrary persistent write grant나 Browser-provided escalation을 추가하지 않는다. Guardian denial, reviewer unavailable 또는 admin constraint는 sandbox 우회 없이 Turn failure로 남는다.
- Factory caller가 공급하는 `childEnvironment`는 최대 `16` entries, key `^[A-Z_][A-Z0-9_]*$`, value당 `8 KiB`, aggregate `64 KiB`다.
- `HOME`, `CODEX_HOME`, `CODEX_SQLITE_HOME`, `TMPDIR`, `PATH`, `PYTHON*`, dynamic-loader와 Runtime이 이미 소유하는 key를 override하면 factory가 spawn 전 거절한다.
- Runtime은 key 의미를 해석하지 않고 sanitized Codex child environment와 `CodexConfig.env`로 전달한다. `@ay-ple/interaction-mcp`를 import하지 않는다.
- `waitForMcpServerReady`는 같은 persistent native generation의 official MCP startup/status evidence를 high-level `serverName + tool roster`로 축소한다. Raw App Server response, status notification, generated type와 error detail은 package 밖으로 내보내지 않는다.
- Workspace activation은 `ay_ple_interaction`이 ready이고 effective tool roster가 exactly `["propose_state_patch"]`인지 확인한다. 다른 user MCP server의 존재는 이 check가 소유하지 않는다.
- Current `StartThreadInput.mcp`, `CodexPrivateMcpServerInput`, literal `propose_state_patch` allowlist와 process-wide managed Skill root를 Runtime public/testing contract에서 제거한다.
- Generic built-in `request_user_input` answer/cancel과 native permission은 유지한다. InteractionCapability result로 대체하지 않는다.
- Persistent Runtime과 native-context observation은 fixed `project_root_markers=[]`를 제거하고 같은 exact Git root의 native project config·`AGENTS.md`·Skill discovery를 관측한다.

Workspace thread start는 exact root와 `workspace_write` permission을 사용한다. Current pinned App Server가 unset exact Git-root trust를 native user config에 기록하고 같은 start에서 project config를 reload하는 동작을 regression으로 고정한다. Explicit `untrusted`는 덮어쓰지 않으며 parent-only trust를 child repository trust로 간주하지 않는다.

#### 8. `propose_state_patch` MCP schema

Public MCP input은 additional field를 거절하는 다음 semantic contract다.

```ts
type TextQuoteEvidenceRef = {
  readonly relativePath: string
  readonly contentDigest: string
  readonly locator: {
    readonly type: 'text_quote'
    readonly quote: string
    readonly occurrence: number
  }
}

type ProposeStatePatchRequest = {
  readonly summary: string
  readonly question: string
  readonly changes: readonly {
    readonly label: string
    readonly description: string
    readonly before?: string
    readonly after?: string
    readonly evidence?: readonly TextQuoteEvidenceRef[]
  }[]
}

type ProposeStatePatchResult =
  | { readonly outcome: 'accept' }
  | { readonly outcome: 'revise'; readonly feedback: string }
  | { readonly outcome: 'reject'; readonly feedback?: string }
```

Input bounds와 invariant는 다음과 같다.

| Field | Contract |
| --- | --- |
| 전체 request | Compact JSON encoding 최대 `1 MiB` |
| `summary`, `question` | Trim 후 non-empty, 각각 최대 `2 KiB` UTF-8 |
| `changes` | `1..32`, array order가 UI order |
| `label` | Trim 후 non-empty, 최대 `256` UTF-8 bytes |
| `description` | Trim 후 non-empty, 최대 `2 KiB` UTF-8 |
| `before`, `after` | 각각 최대 `8 KiB` UTF-8; 둘 중 하나 이상 필수; 둘 다 있으면 exact same string 금지 |
| `evidence` | Change당 `1..8` when present, call 전체 최대 `16` refs |
| `relativePath` | POSIX-style workspace-relative path, 최대 `4 KiB`; absolute, empty segment, `.`, `..`, backslash와 NUL 금지 |
| `contentDigest` | Whole-file SHA-256 lowercase hex `^[0-9a-f]{64}$` |
| `locator.quote` | Newline·whitespace normalization 없는 non-empty exact text, 최대 `16 KiB` UTF-8 |
| `locator.occurrence` | Exact quote의 left-to-right 1-based occurrence, `1..1024` safe integer |
| `feedback` | `revise`에서는 trim 후 non-empty 필수, `reject`에서는 optional; 최대 `8 KiB` UTF-8 |

Input에는 `requestKey`, `workspaceId`, `courseId`, `baseRevision`, `patchId`, native `threadId`·`turnId`·request identity와 Browser interaction ID를 넣지 않는다. `changes`는 Assignment schema나 raw Git diff·file mutation command를 운반하지 않는다.

MCP normal success는 `structuredContent`에 exact `ProposeStatePatchResult`를 반환하고 사람이 읽을 수 있는 짧은 text content를 함께 제공한다. `busy`, invalid evidence, timeout, Turn interrupt, Browser disconnect, Runtime terminal과 transport loss는 이 union에 들어가지 않고 tool/MCP failure로 반환한다. Adapter는 capability call을 자동 retry하지 않는다.

#### 9. Evidence resolution

Broker는 Browser frame을 만들기 전에 모든 evidence를 atomic preflight한다.

- Authority root는 authenticated active Runtime binding의 exact SemesterWorkspace다. Caller path나 registry lookup으로 다른 workspace를 선택하지 않는다.
- 각 relative path를 normalize·resolve하고 realpath가 authority root 안에 남는지 확인한다. Escape하는 traversal·symlink, missing target와 non-regular file은 실패다.
- Unique file 하나의 maximum은 `1 MiB`, 한 call의 unique-file aggregate read maximum은 `8 MiB`다. 같은 file의 여러 locator는 bytes를 한번만 읽은 snapshot에서 검증한다.
- SHA-256은 BOM과 line ending을 포함한 exact whole-file bytes로 계산한다.
- Initial codec은 fatal UTF-8 text 하나만 지원한다. Locator matching은 decoded text에서 leading UTF-8 BOM 하나만 제외하고 newline·Unicode·whitespace normalization 없이 수행한다.
- `occurrence`가 가리키는 exact quote가 없거나 count가 다르면 stale/malformed evidence다.
- Browser projection은 `relativePath`, `contentDigest`, exact quote와 match 주위 UTF-8-safe context를 전달한다. Context는 ref당 before/after 각각 최대 `4 KiB`, 전체 evidence projection은 최대 `256 KiB`, complete `review.requested` NDJSON frame은 최대 `512 KiB`다.
- 모든 ref와 projection bound가 통과한 뒤 card 하나를 publish한다. 하나라도 invalid면 partial card, evidence drop과 evidence-free fallback 없이 call 전체를 실패시킨다.
- Validated preview는 current card의 transient payload다. Server-side `RawMaterial` registry, reusable cache·snapshot, durable evidence history를 만들지 않는다.

#### 10. Private Adapter↔Broker transport

Private transport는 Browser API와 같은 pre-bound `127.0.0.1` HTTP listener의 exact route를 사용한다.

| 항목 | Contract |
| --- | --- |
| Route | `POST /api/_private/interaction-mcp` |
| Token header | `Authorization: Bearer <AY_PLE_INTERACTION_BROKER_TOKEN>` |
| Binding header | `X-AY-PLE-Runtime-Binding: <AY_PLE_INTERACTION_RUNTIME_BINDING>` |
| Admission | Raw peer loopback, constant-time token equality, exact active binding을 모두 요구 |
| Token | Runtime generation마다 fresh random `32` bytes의 base64url value |
| Runtime binding | Runtime generation마다 fresh `runtime_[0-9a-f]{32}` |
| Protocol | Strict JSON `protocolVersion: 1`, additional field 거절, raw HTTP request/response body 각각 최대 `2 MiB` |
| Secret lifetime | Server memory와 Codex child env에만 존재; Browser, config, registry, log와 error에 없음 |

Server는 MCP caller가 보내지 않는 Turn correlation을 다음 host-owned lease로 보완한다.

- Workspace Runtime generation마다 accepted active Product Turn은 최대 하나다. Server는 `operation_[0-9a-f]{32}`를 발급하고 `runtimeBinding + operationId + internal thread identity` lease를 native `turn/start`를 보낼 수 있게 하기 전에 atomic claim한다. Native turn identity가 도착하면 같은 lease에 결합한다.
- Turn start가 실패하면 lease를 즉시 해제한다. Active lease가 있는 동안 새 Chat Turn, workspace init과 transition은 `409`이고 기존 Turn을 preempt하지 않는다.
- Broker는 authenticated Runtime binding에 active Workspace Product Turn lease가 있을 때만 capability call을 받는다. Slot은 host-owned `operationId`를 capture해 Browser frame·answer·interrupt를 같은 Turn에 결합한다. Caller-supplied operation/thread/turn identity는 계속 금지한다.
- Binding은 valid하지만 active lease가 없거나 lease가 terminal이면 safe `runtime_inactive`다. Native terminal·Turn interrupt·Browser disconnect·Runtime close는 새 Broker intake를 닫고 pending slot을 failure로 정산한 뒤 lease를 once-only 해제한다.
- Bootstrap init Turn도 product operation lease 하나를 사용하지만 Workspace project MCP가 없는 Bootstrap generation이므로 capability call을 받을 수 없다.

Startup handshake body는 exact `{ protocolVersion: 1, kind: "handshake", serverName: "ay_ple_interaction", capabilities: ["propose_state_patch"] }`다. Server는 active generation과 exact capability roster를 확인한 `{ protocolVersion: 1, kind: "handshake_accepted" }`만 반환한다. Adapter는 environment validation과 이 handshake를 끝낸 뒤 MCP initialize를 성공시킨다.

Capability call body는 exact `{ protocolVersion: 1, kind: "capability_call", capability: "propose_state_patch", request }`다. Broker는 normal result까지 같은 HTTP response를 pending으로 유지하고 `{ protocolVersion: 1, kind: "capability_result", capability: "propose_state_patch", result }`를 한번 반환한다.

Inner `request`의 compact JSON bound는 `1 MiB`이고 outer raw body의 `2 MiB` bound는 protocol wrapper와 UTF-8 JSON encoding overhead를 포함한다. Adapter와 Server는 각각 body를 완전히 decode하기 전에 raw byte bound를 적용한다.

Private error envelope는 `{ protocolVersion: 1, kind: "error", code, displayMessage }`이며 stable safe code는 `invalid_request | forbidden | busy | evidence_invalid | interaction_interrupted | runtime_inactive | broker_unavailable`로 닫는다. Raw exception, path, token, binding과 Browser identity는 포함하지 않는다.

- Runtime generation마다 pending capability slot은 하나다.
- Slot이 찬 동안 두 번째 authenticated call은 Browser frame 없이 즉시 `busy` error다. Queue, priority와 preemption을 만들지 않는다.
- Startup handshake 외에 capability call 하나는 Broker POST 하나다. `202`, poll, callback, WebSocket, Unix domain socket, durable outbox와 response replay를 만들지 않는다.
- Browser answer 뒤 Broker는 held Adapter response write를 먼저 시도하고 그 call의 terminal settlement와 Browser response를 once-only로 수렴한다.
- Adapter HTTP abort·STDIO EOF, Browser disconnect, Turn interrupt, Runtime replacement·terminal과 App shutdown은 pending call을 failure로 정산하고 token·binding을 폐기한다.
- Terminal delivery가 불명확하면 성공이나 workspace apply를 추정하지 않는다. Fresh MCP call만 새 card를 만든다.
- Project declaration은 `tool_timeout_sec`을 생략한다. Current native `300` second timeout 뒤 App countdown·연장·keepalive·자동 retry를 추가하지 않는다.

#### 11. Browser wire와 inline Review

Current product Turn NDJSON stream을 InteractionCapability의 Browser delivery channel로 재사용한다. 별도 socket이나 durable Review API를 만들지 않는다.

Browser-safe frame은 다음 의미로 hard cutover한다.

```ts
type BrowserSafeTextQuoteEvidence = {
  readonly relativePath: string
  readonly contentDigest: string
  readonly quote: string
  readonly occurrence: number
  readonly contextBefore: string
  readonly contextAfter: string
}

type BrowserSafeSemanticReview = {
  readonly summary: string
  readonly question: string
  readonly changes: readonly {
    readonly label: string
    readonly description: string
    readonly before?: string
    readonly after?: string
    readonly evidence?: readonly BrowserSafeTextQuoteEvidence[]
  }[]
}

type ProductReviewResult =
  | { readonly outcome: 'accept' }
  | { readonly outcome: 'revise'; readonly feedback: string }
  | { readonly outcome: 'reject'; readonly feedback?: string }

type ProductReviewFrame =
  | {
      readonly type: 'review.requested'
      readonly operationId: string
      readonly interactionId: string
      readonly review: BrowserSafeSemanticReview
    }
  | {
      readonly type: 'review.resolved'
      readonly operationId: string
      readonly interactionId: string
      readonly result: ProductReviewResult
    }
  | {
      readonly type: 'review.failed'
      readonly operationId: string
      readonly interactionId: string
      readonly reason:
        | 'turn_interrupted'
        | 'timed_out'
        | 'runtime_terminated'
        | 'transport_failed'
    }
```

- `BrowserSafeSemanticReview`는 validated MCP request의 순서와 optional-field presence를 보존한다. Evidence는 whole-file bytes나 absolute path가 아니라 validated locator와 bounded exact context만 담는다. 모든 object codec은 additional field를 거절하고 앞 절의 text/cardinality bound와 evidence projection·frame bound를 그대로 적용한다.
- `interactionId`는 App이 발급하는 `interaction_[0-9a-f]{32}`이고 Browser answer와 현재 pending slot만 결합한다.
- Browser answer endpoint는 current `/api/product/reviews/:interactionId`를 hard-cutover한다. Body는 exact `ProductReviewResult`이고 `patchId`, `decisionKey`, revision과 continuation을 받지 않는다. `review.resolved.result`도 같은 discriminated codec을 사용하므로 `revise`에는 non-empty feedback이 필수이고 `reject`에만 optional이며 `accept`에는 feedback이 존재할 수 없다.
- Duplicate·late·wrong answer는 conflict이고 두 번째 Broker result를 만들지 않는다.
- `review.requested`가 transcript 아래에 card 하나를 append한다. `revise` 뒤 AY가 fresh MCP call을 보내면 새 `interactionId`와 새 card를 append하고 previous card payload를 replace·reopen하지 않는다.
- Pending card는 `accept | revise | reject`와 conditional inline feedback만 제공한다. Modal, drawer, 별도 approval page, dismiss와 fourth `cancel` action을 만들지 않는다.
- Pending 동안 free-form composer, 새 Turn과 steer를 disable한다. 전체 Turn interrupt는 계속 활성화하고 Review result로 변환하지 않는다.
- Normal result나 failure 뒤 해당 card는 control 없는 read-only outcome으로 남는다. Settled card와 request/result를 workspace store나 App Review ledger에 persist하지 않는다.
- Evidence preflight가 card publish 전에 실패한 call은 `review.requested` frame을 만들지 않는다. 이미 publish된 card의 continuity failure만 `review.failed`로 settle한다.
- Browser disconnect는 pending Review를 MCP failure로 만들고 해당 Turn을 unattended continuation으로 유지하지 않는다. 연결이 이미 사라졌으므로 별도 failure frame delivery를 성공 조건으로 요구하지 않으며, reload 뒤 pending/settled transcript를 App store에서 복원하지 않는다.

Target Browser bootstrap은 Account Readiness, active workspace·candidate lifecycle, current operation과 AY Chat을 제공한다. Registry의 known list는 initial Browser contract가 아니다. Course creation, material refresh/selection/preview, First Assignment action/retry, durable Run·patch·confirmation history와 replacement-specific UI는 public product contract에서 제거한다. General built-in `request_user_input` clarification은 separate ephemeral interaction UI로 계속 지원할 수 있지만 같은 Review 결정을 custom MCP와 이중으로 묻지 않는다.

#### 12. AY-owned file mutation과 Git

- `propose_state_patch`가 필요한 작업에서는 AY가 Review 전에 proposed mutation을 actual file에 적용하지 않는다.
- `accept` 뒤 AY가 일반 file tool로 SemesterWorkspace의 실제 file을 변경한다.
- `revise`는 current call을 정상 정산하지만 mutation authority가 아니다. AY가 feedback을 반영해 새 proposal을 만들면 fresh MCP call을 사용한다.
- `reject`는 proposed mutation을 적용하지 않는다.
- App은 result를 `workspace-state.json`이나 다른 file에 대신 적용하지 않고 Git command도 실행하지 않는다.
- AY는 `AGENTS.md`의 간단한 지침과 작업 의미에 따라 자연스러운 checkpoint에서 commit한다. App hook, auto-commit, exhaustive condition table과 clean-working-tree prerequisite를 만들지 않는다.
- Git checkpoint가 protected `.git` write를 요구하므로 AY는 exact workspace `cwd`와 explicit pathspec의 Git command에 per-call native escalation을 요청한다. Native `auto_review` 승인 없이 commit 성공을 합성하거나 broader Turn permission으로 fallback하지 않는다.
- Existing unrelated dirty changes를 발견하면 AY는 일반 Git 안전 원칙으로 범위를 구분하고, App은 이를 product error로 승격하지 않는다.
- Native command·file·network approval은 Codex execution permission이다. `accept`는 그 permission을 대신하지 않고, native approval도 Review result를 대신하지 않는다.

### Data and State Flow

#### First launch와 activation

1. Root host가 canonical appData·Runtime preflight를 수행하고 loopback listener를 503 delegate 상태로 먼저 bind한다.
2. Registry가 valid active workspace를 가리키면 그 root identity를 fresh 확인한다. Active entry가 없으면 `hub/` cwd의 Bootstrap Runtime·thread를 시작한다.
3. Runtime은 effective global Codex account readiness를 읽는다. Not ready면 workspace bytes를 바꾸지 않고 연결 안내를 보여준다.
4. 사용자가 semester identity와 directory chooser로 candidate를 선택한다. Active Workspace Runtime이 있었다면 durable pointer는 보존한 채 그 Runtime·Broker를 닫고 hub-rooted Bootstrap Runtime으로 전환한다. Init command에서 Server는 Bootstrap operation lease를 claim하고 candidate root 하나만 additional writable root로 둔 visible Turn에서 `semester-workspace-init` Skill을 실행한다.
5. Init Turn이 terminal된 뒤 User가 activation을 요청하면 App은 candidate/root v4 identity를 fresh read하고 Bootstrap Runtime·thread를 bounded close한다. Agent final text는 이 검증을 대체하지 않는다.
6. Server가 Interaction Broker route에 fresh token·binding과 empty slot을 준비한다. 이 단계가 실패하면 Workspace Runtime child는 0이다.
7. Workspace Runtime을 exact candidate root, `workspace_write`와 three-value child environment로 시작한다.
8. Native project config가 STDIO Adapter를 시작하고 Adapter가 authenticated handshake를 완료한 뒤 MCP initialize를 성공시킨다.
9. Runtime의 `waitForMcpServerReady`가 `ay_ple_interaction`과 exact tool roster를 확인한다.
10. App이 fresh Workspace thread의 recorded `cwd`와 root identity를 확인한 뒤 registry known entry와 active pointer를 atomic commit한다.
11. Browser가 active workspace Chat으로 전환한다. Bootstrap thread identity와 transcript는 target workspace에 이어 붙이지 않는다.

#### Review round trip

1. User가 AY Chat에서 작업을 요청하면 Server가 operation lease를 먼저 claim하고 native Turn을 시작한다. AY는 actual workspace file을 읽는다.
2. AY가 mutation 전에 `propose_state_patch`를 호출한다. Broker는 Runtime binding의 active lease에서 `operationId`를 capture한다.
3. STDIO Adapter가 request codec을 검증하고 authenticated Broker POST 하나를 연다.
4. Broker가 empty generation slot을 claim하고 optional evidence 전체를 exact workspace에서 preflight한다.
5. App이 opaque interaction ID를 만들고 current Turn NDJSON에 `review.requested`를 append한다.
6. User가 inline card에서 응답한다.
7. Broker가 duplicate·late answer를 차단하고 held response에 exact normal result를 한번 쓴다. Card는 `review.resolved`로 read-only가 된다.
8. STDIO Adapter가 같은 MCP call의 structured result를 AY에 반환한다.
9. AY가 result를 해석한다. Accept면 actual file을 바꾸고 checkpoint를 commit한다. Revise면 필요한 경우 fresh proposal을 보낸다. Reject면 적용하지 않는다.
10. Native terminal이 current Turn을 정산한다. App은 별도 `ModelingRun`이나 academic receipt를 만들지 않는다.

### Failure Behaviour

| Failure | Required observable behavior |
| --- | --- |
| Global Codex account not ready | Bootstrap 또는 active workspace bytes를 바꾸지 않고 Chat mutation을 닫는다. In-app credential store를 만들지 않는다. |
| Registry malformed/future | Original registry bytes를 보존하고 workspace activation mutation을 닫는다. Empty registry로 합성하지 않는다. |
| Known root missing/identity mismatch | Runtime을 시작하지 않고 explicit reselect를 요구한다. Registry path를 다른 directory로 자동 retarget하지 않는다. |
| Candidate가 foreign Git descendant이거나 Git marker·valid v4 state가 없음 | Init 또는 activation을 실패시키고 BootstrapCandidate와 user bytes를 보존한다. App이 scaffold를 대신 만들지 않는다. |
| Existing `workspace-state.json` conflict | Init·activation 모두 overwrite하지 않고 manual resolution을 요구한다. |
| Existing Skill tree·MCP config conflict | Unrelated bytes를 보존하고 exact diff·manual resolution을 요구한다. Partial tree replacement, malformed TOML reset과 fallback config를 만들지 않는다. |
| New-repo baseline 승인 없음 | Scaffold checkpoint까지만 남기고 pre-existing file을 stage하지 않는다. App activation이 clean tree를 강제하거나 몰래 baseline하지 않는다. |
| Protected metadata escalation denied/unavailable | `.git`·`.agents`·`.codex` write와 Git checkpoint를 실패로 남긴다. `dangerFullAccess`, App-side write와 silent no-commit success로 fallback하지 않는다. |
| Workspace command/Turn overlap | Existing operation을 preempt하지 않는 `409`; wrong candidate ID는 다른 candidate에 영향을 주지 않는다. |
| Listener/Broker preparation failure | Workspace Runtime child 0, registry active pointer unchanged |
| Missing/stale MCP executable | Required project MCP start 실패, no active commit; package-local/global fallback 없음 |
| Explicit `untrusted` 또는 ignored project config | Global trust를 덮어쓰지 않고 expected MCP readiness 부재로 activation 실패 |
| Broker env missing·invalid | STDIO Adapter initialize 실패, no degraded Workspace Runtime |
| Invalid/stale token or binding | Safe `forbidden`, no Browser projection, no credential detail |
| Capability mismatch | Handshake/activation 실패, no active registry commit |
| Active Product Turn lease 없음 | Safe `runtime_inactive`, no Browser projection; caller identity로 lease를 합성하지 않음 |
| Second concurrent call | Immediate `busy` MCP failure, existing card unchanged, no queue |
| Evidence escape·missing·oversize·digest/locator drift | Whole-call failure before `review.requested`; no partial preview |
| Duplicate·late Browser answer | Conflict, no second MCP result, no card reopen |
| Turn interrupt | Pending card failure settlement, held MCP call failure, matching native Turn terminal을 authority로 사용 |
| Browser disconnect | Pending Broker call failure와 Turn interruption; App ledger·response replay 없음 |
| Native 300-second timeout | MCP failure, no fourth result·App timer·extension·automatic retry |
| Runtime terminal/replacement/App shutdown | New intake close, pending call failure, credential revoke, bounded process cleanup |
| Terminal response delivery ambiguity | Success·workspace mutation을 App이 추정하지 않음; AY가 계속하면 fresh call |
| AY file/Git operation failure after accept | Native Turn의 honest failure로 남고 App이 file을 대신 적용하거나 commit success를 합성하지 않음 |
| Dirty working tree | App admission 성공 여부와 무관하다. AY가 일반 Git 안전 원칙으로 작업 범위를 판단한다. |

Activation 실패 뒤 App은 registry active pointer를 바꾸지 않는다. Hub Bootstrap Runtime 복구가 성공하면 candidate retry를 유지한다. 그 복구도 실패한 workspace change는 old pointer를 authority로 보존하고 사용자가 candidate cancel 뒤 old workspace restart 또는 candidate retry를 명시적으로 선택하게 한다. First workspace에는 old pointer가 없으므로 recovery state의 `activeWorkspace`가 null일 수 있다. Candidate를 active로 성공한 것처럼 표시하지 않는다.

### Compatibility and Migration

전환은 expand → prove → contract 순서를 따른다.

1. Current First Assignment round trip의 observable donor behavior를 characterization test로 고정한다. Durable patch/apply, replacement와 built-in double confirmation은 target assertion으로 고정하지 않는다.
2. New v4 codec, registry, Interaction MCP package·Broker와 capability-neutral Runtime seam을 current graph 옆에 추가한다.
3. Fresh temporary Git workspace에서 Bootstrap→required MCP activation→inline Review→AY-owned file edit·commit vertical을 green으로 만든다.
4. Deterministic Browser, built STDIO process, exact native/project config와 exact local-provider gate를 모두 통과한 뒤 product public contract를 new Chat/Review surface로 hard cutover한다.
5. App-owned Course·`RawMaterial`, First Assignment action/retry, `ModelingRecipe`·`ModelingInvocation`·durable `ModelingRun`, durable `StatePatch`·`UserConfirmation`, academic apply·guard·recovery와 current MCP override를 compatibility alias 없이 제거한다.
6. `@ay-ple/semester-workspace`는 v4 identity envelope의 small codec으로 contraction하고 v3 admission/setup/bundle/context kernel과 managed resource bundle을 target capability로 남기지 않는다.
7. Current `<SemesterWorkspace>/.ay-ple/workspace-state.json`과 historical v3 bytes는 읽기·쓰기 owner에서 분리하되 자동 delete·move·rewrite하지 않는다. Fresh Git init에서는 root `/.ay-ple/`을 baseline staging에서 제외하고, existing Git repository의 tracked/ignore 상태는 바꾸지 않는다. 별도 user-approved cleanup 전까지 rollback evidence로 보존한다.
8. Canonical `../.ay-ple/` Runtime, global Codex account, registry reopen, active workspace와 InteractionCapability smoke가 모두 green인 뒤에만 `../.ay-ple-dogfood/`, `../.ay-ple-dev-workspaces/`와 package-local Runtime `.artifacts/`를 exact scoped cleanup한다. Install·start·App runtime이 이 deletion을 수행하지 않는다.

Rollback 전에는 current source와 matching package-local Runtime artifact, old appData와 current-v2 bytes를 한 단위로 사용할 수 있다. New v4 workspace file과 Git commits는 user-owned data이므로 rollback이 삭제하지 않는다. Scoped legacy cleanup 뒤에는 mixed old graph를 recovery target으로 삼지 않고 matching known-good target source·Runtime을 복구한다.

## Implementation Decisions

| Decision | Rationale |
| --- | --- |
| Workspace state `formatVersion: 4` | Current v2 durable baseline과 historical app-owned v3의 의미를 같은 version에서 바꾸지 않고 explicit semantic cutover를 표현한다. |
| App은 v4 envelope identity만 이해하고 `snapshot`은 opaque로 둠 | App이 학업 schema·workflow authority를 되가져오지 않으면서 workspace-local structured data의 확장 공간을 남긴다. |
| Process-local BootstrapCandidate + explicit activation button | Agent final text를 activation proof로 parse하지 않고, App-owned root transition과 Skill-owned setup을 분리한다. |
| Init Skill, not scaffold script | Personal scope에서 file·Git 작업은 AY가 충분히 수행할 수 있고 기존 bytes·dirty state에 문맥적으로 대응해야 한다. Deterministic need가 확인되기 전 code subsystem을 늘리지 않는다. |
| Candidate root 하나를 Turn-scoped `writableRoots`로 전달 | Bootstrap `cwd`·native Skill discovery를 `hub/`에 유지하면서 사용자가 고른 disjoint directory만 init Turn의 명시적 write scope로 연다. |
| Protected metadata는 per-call native `auto_review` escalation | Pinned sandbox의 `.git`·`.agents`·`.codex` 보호를 제거하지 않고 init·checkpoint에 필요한 exact call만 native reviewer가 판단하게 한다. |
| Scaffold commit 뒤 explicit material baseline | 실제 원본을 Git authority에 넣되 legacy state·credential 가능 file과 unrelated dirty change를 무차별 stage하지 않는다. |
| Root `.git` marker만 Git-lifecycle activation boundary로 사용 | V4 identity·Runtime/MCP readiness와 별개로 한 학기 one-repository invariant만 확인하며, App이 status·cleanliness·remote·commit workflow를 소유하지 않게 한다. |
| Browser에는 active/candidate만 투영 | Registry는 recovery pointer를 소유하지만 initial UI에 recent-workspace catalog와 one-click switch를 함께 만들지 않는다. |
| `@ay-ple/interaction-mcp` private package | Stable STDIO executable·typed contract와 Server application lifecycle을 분리하고 Runtime package의 product coupling을 제거한다. |
| Shared loopback listener의 held POST | 한 MCP call의 continuation을 그대로 표현하고 별도 port, daemon, poll cursor와 replay state를 피한다. |
| Runtime-generation single pending slot | Ordering·priority·preemption을 App workflow로 만들지 않고 AY가 fresh request 여부를 판단하게 한다. |
| Host-owned one-active-Turn lease | MCP payload에 native·Browser identity를 노출하지 않고 Runtime binding만으로 current operation에 안전하게 correlation한다. |
| Current Turn NDJSON을 Browser delivery로 재사용 | Existing transcript ordering·disconnect seam과 inline card를 재사용하고 별도 ephemeral channel을 만들지 않는다. |
| Text quote evidence codec 하나 | Current exact TXT prior art를 재사용해 path·digest·locator honesty를 닫고 PDF/page locator를 추측하지 않는다. |
| File `1 MiB`, aggregate `8 MiB`, projection `256 KiB` | Current file/preview prior art 안에서 deterministic bounded read와 useful quote context를 함께 제공한다. |
| Normal result는 `accept | revise | reject` | User decision과 interrupt·busy·timeout·continuity failure를 명확히 분리한다. |
| Revise는 fresh call·new card | Once-only settlement와 transcript chronology를 보존하고 replacement-specific binding을 제거한다. |
| AY-owned apply와 manual checkpoint commit | Actual file과 Git을 single durable authority로 두고 App event ledger·auto-commit hook을 만들지 않는다. |
| Native default 300초 | 실제 5분 초과 필요가 확인되지 않은 상태에서 App timer·keepalive·extension을 추가하지 않는다. |
| No degraded Workspace Runtime | InteractionCapability가 AY-PLE의 핵심 seam이므로 Broker handshake나 required MCP가 없으면 정상 제품 상태로 열지 않는다. |

## Testing Decisions

### Highest practical seam

가장 높은 반복 가능한 contract seam은 **real `@ay-ple/interaction-mcp` request/result codec + real Server Interaction Broker + in-memory UI Adapter**다. 이 seam은 Runtime, academic store와 Browser 없이 다음 한 문장을 증명해야 한다.

> Empty generation slot의 valid request가 atomic evidence preflight 뒤 UI projection 하나를 만들고, one user action이 같은 held Adapter request의 exact `accept | revise | reject` result로 돌아가며, busy·interrupt·disconnect·terminal은 normal result 없이 failure로 끝난다.

그 위의 product seam은 **real Chromium → Vite → shared Express listener → deterministic Workspace Runtime/Broker → temporary Git SemesterWorkspace**다. Exact native/project config와 AY file/Git behavior는 별도 actual/local-provider gate가 보완한다.

### Required automated proof

| Layer | Required proof |
| --- | --- |
| Workspace codec | V4 exact top-level codec, bounds, stable identity, opaque snapshot preservation, v2/v3/malformed no-rewrite |
| Registry | Missing→empty, strict read, unique path/ID, active membership, compare-before-rename, malformed byte preservation, reselect recovery |
| Bootstrap Skill | Fresh directory Git init·v4 state·minimal AGENTS·Skill copy·relative MCP config·scaffold commit와 approved material baseline; protected metadata per-call escalation, legacy `.ay-ple/` exclusion, existing dirty repository no-clobber·no unrelated staging, repeated no-op과 Skill/TOML conflict |
| Interaction contract | Exact schema, all field/cardinality/byte bounds, closed result union, forbidden host fields |
| Evidence | Root containment, internal/external symlink, regular file, one-time read, SHA-256, fatal UTF-8, quote occurrence, all size bounds와 all-or-nothing projection |
| Broker unit/integration | Handshake, loopback/token/binding, active-Turn lease correlation, no-lease rejection, single slot, held response, once-only answer, busy, late answer, abort, Browser disconnect, Runtime replace/close |
| Built STDIO actual | Executable/shebang/mode, env validation, real STDIO initialize, private handshake, one call→one POST→one result, safe error mapping과 process exit |
| Runtime unit/actual | Generic child env allowlist, protected-key rejection, Node PATH, exact workspace cwd, candidate-only additional writable root, native Git project discovery, no managed Skill/MCP override, MCP ready/failure status |
| Protected metadata actual | Current pin의 `on-request + auto_review + workspaceWrite`에서 exact candidate init/update와 normal workspace Git checkpoint가 승인 시 성공하고 denial 시 fail closed함; client approval UI·Turn-wide `dangerFullAccess`·unrelated sentinel mutation 없음 |
| Trust regression | Unset exact-root trust write+same-start config reload, explicit untrusted preservation, parent-only trust non-inheritance, missing required MCP failure |
| Workspace lifecycle | Bootstrap/candidate/active/transitioning/recovery/registry-incompatible exact codec, chooser cancel, init rerun, command conflict, stale delete, activation receipt와 restart recovery |
| Activation | Bind→Broker→Runtime→handshake→status→registry ordering, every pre-commit failure leaves pointer unchanged, chooser-based workspace change fresh generation |
| Product contract | Browser-safe Review/evidence와 requested/resolved/failed exact decode, result conditionality, no patch/revision/decision key, general clarification separation |
| Browser unit | Pending card append, composer/new Turn/steer lock, interrupt enabled, once-only action, settled read-only card, revise→fresh append without mutation |
| Browser Playwright | Bootstrap/active state, inline evidence, accept/revise/reject, invalid evidence no card, busy no hidden queue, disconnect/interrupt failure와 desktop behavior |
| AY-owned apply actual | Proposal before mutation, accept 뒤 actual file change와 Git commit, revise/reject no proposed mutation, dirty-tree non-blocking, App store/file apply 0 |
| Contraction | Removed routes/types/store fields/package kernels have no production consumer·compat alias; Browser bundle contains no raw MCP/private credential |
| Root cleanup | New canonical paths green before exact scoped legacy deletion; unrelated path와 user workspace bytes untouched |

### Representative traces

1. Fresh candidate → candidate-only writable init Turn → protected metadata exact-call native review → scaffold commit + approved original-material baseline → explicit activation → required MCP ready → registry active.
2. Existing dirty Git workspace → init/update without unrelated staging; conflicting Skill/TOML bytes는 보존 → activation succeeds after resolution without clean-tree gate.
3. Actual source quote → valid semantic Review → accept → AY edits actual file → checkpoint commit.
4. Review → revise → first card settles read-only → fresh call appends second card → accept.
5. Review → reject → no proposed file mutation and no App apply.
6. Path escape, external symlink, missing/oversized file, digest drift, quote occurrence drift → no card and whole-call failure.
7. Pending call 중 second call → immediate `busy`; first card unchanged.
8. Pending card 중 Turn interrupt, Browser disconnect, native timeout와 Runtime terminal → failure, no fourth result·replay·false apply.
9. Explicit untrusted project와 stale relative MCP command → activation failure, registry pointer unchanged.
10. App restart → registry active root identity fresh verification → new Runtime/thread same exact cwd; transcript는 복원하지 않음.
11. Directory chooser로 different SemesterWorkspace를 다시 선택·activate → old generation fully closes, new credential/thread/cwd, no cross-workspace interaction; recent-workspace list는 없음.
12. First activation Runtime failure → candidate 보존 + hub Bootstrap restart; restart도 실패하면 null active reference의 recovery state. Existing active restart는 candidate DELETE 전 `409`.

### Verification commands

Implementation 완료 시 최소 다음 gate를 통과한다.

- `npm test`
- `npm run typecheck`
- `npm run build`
- `npm run lint -w @ay-ple/chat-shell`
- `npm run test:e2e`
- `npm run check:docs-links`
- `npm run validate:exact-sdk -w @ay-ple/codex-chat-runtime`
- `npm run validate:production-runtime -w @ay-ple/codex-chat-runtime`
- `npm run validate:node-runtime -w @ay-ple/codex-chat-runtime`
- Target InteractionCapability exact local-provider Server trace

Manual verification은 1440×900과 1920px-class desktop에서 Bootstrap, workspace switch, inline evidence hierarchy, pending lock, interrupt와 settled-card chronology를 확인한다. External credential을 쓰는 live-provider trace는 mandatory gate가 아니며 deterministic·exact local-provider coverage를 대신하지 않는다.

## Out of Scope

- Public `npx`, Landing, Runtime publication, clean-machine distribution과 packaged `.app`·`.dmg`
- In-app Codex login·logout, multiple account와 app-owned credential store
- Public-release v3 scaffold·admission·SetupJourney·bundle drift recovery의 복구
- Existing current-v2/v3 aggregate의 automatic v4 migration 또는 academic history import
- App-owned file explorer, whole-workspace `RawMaterial` registry, source archive·copy와 reusable preview cache
- App-owned `Course`, Assignment transaction, `ModelingRecipe`, `ModelingRun`, durable patch·confirmation와 generic workflow engine
- Git status/history/commit UI, auto-commit hook, clean-tree gate, remote sync와 conflict-resolution subsystem
- Registry known-workspace list, recent-workspace catalog와 one-click switch UI. Initial workspace change는 directory chooser 재선택을 사용한다.
- Multiple simultaneous Review, Broker queue·priority·preemption과 response replay
- Review modal·dedicated approval page, arbitrary JSON-schema renderer와 generic App event bus
- Settled Review hydration을 위한 App ledger, transcript persistence, thread list/read/resume와 multi-client synchronization
- `turn/steer` 자체의 신규 제품 구현. Pending Review에서 disable할 future control 의미만 계약한다.
- PDF/page, image, HWP/HWPX, Office와 audio evidence codec
- Generic user-facing native command·file·network approval center. Pinned native `auto_review`의 per-call protected-metadata review는 이 제외에 포함되지 않는다.
- Calendar/LMS/cloud sync, automatic submission, exam answer generation
- Mobile·small-screen responsive layout과 Windows·Linux 지원

## Open Questions

None.

## Further Notes

이 spec은 하나의 large vertical을 다음 tracer-bullet blocking order로 ticketing할 수 있게 의도했다.

| Slice | Observable outcome | Blocks |
| --- | --- | --- |
| S0 Characterization | Current round trip donor와 target에서 버릴 durable coupling을 test로 구분 | S1, S6 |
| S1 Contract foundations | V4 workspace/registry codec, Interaction request/result·Browser projection contract | S2, S3, S4 |
| S2 Interaction Module | Built STDIO Adapter, private codec, Broker와 in-memory Adapter green | S5, S6 |
| S3 Runtime neutrality | Generic child env, native project discovery와 MCP readiness green | S5 |
| S4 Bootstrap workspace | Canonical roots, BootstrapCandidate, init Skill·built-in catalog와 Git output green | S5 |
| S5 Activation lifecycle | Bind-first Broker→Workspace Runtime→handshake/status→registry transition green | S6 |
| S6 Product vertical | General Chat inline Review, evidence, accept/revise/reject와 AY-owned apply·Git trace green | S7 |
| S7 Contraction | Old academic workflow/store/routes, v3 kernel과 managed Skill/MCP override 제거 | S8 |
| S8 Canonical cleanup | Full gates 뒤 legacy appData/dev workspace/package artifact exact cleanup | 완료 판단 |

`/to-tickets`는 fresh-context agent가 각 slice를 독립 검증할 수 있도록 필요하면 위 slice를 더 작은 tracer bullet로 나누되, activation commit ordering과 one-call InteractionCapability vertical을 horizontal layer ticket으로 분해해서는 안 된다.
