# 사용자가 선택한 Git working tree를 SemesterWorkspace로 채택한다

분류: 활성

성숙도: 구현됨

대체한 결정: [ADR 0014 — SemesterWorkspace를 app-owned normalized scaffold로 생성한다](0014-create-app-owned-normalized-semester-workspaces.md)

관련 interaction 결정: [ADR 0021 — Protocol-driven AY–App Interaction Layer](0021-adopt-a-protocol-driven-ay-app-interaction-layer.md), [ADR 0019 — MCP InteractionCapability로 App UI round trip을 제공한다](0019-use-mcp-interaction-capabilities-as-the-ay-app-seam.md)

부분 대체·보완됨: [ADR 0020 — SemesterWorkspace를 App 실행 전에 native Bootstrap으로 준비한다](0020-bootstrap-semester-workspaces-before-app-startup.md)

> **Lifecycle 정정:** 이 ADR의 user-owned Git root, actual-file 작업, workspace-local Skill·config와 AY-owned checkpoint 결정은 계속 유효하다. App이 hub-rooted Bootstrap Runtime·candidate·activation을 소유한다는 문장은 ADR 0020이 대체하며 현재 결정으로 사용하지 않는다.

## 맥락

ADR 0014는 public preview에서 임의의 사용자 자료를 보호하고 first-run identity·migration을 통제하기 위해 app-owned 새 directory를 만들고 기존 자료를 `ImportSource`로 복사하는 경계를 채택했다. Current product는 public distribution이 아니라 소유자 한 명의 personal local use를 목표로 하며, 학생은 이미 Git으로 관리하는 실제 학기 파일을 AY와 같은 working tree에서 직접 다루기를 원한다. 별도 scaffold와 복사 기반 반입은 이 경우 자료의 실제 위치와 AY-PLE 작업공간을 다시 분리해 일상적인 file operation을 방해한다.

## 결정

- 사용자가 명시적으로 선택한 기존 Git working tree root, 또는 init Skill이 독립 Git root로 준비한 새 directory를 그 자리에서 `SemesterWorkspace`, Codex project root와 작업 `cwd`로 채택한다.
- 하나의 `SemesterWorkspace`는 하나의 Git repository이자 하나의 학기다. 여러 학기를 한 SemesterWorkspace 또는 한 Git repository의 하위 경로로 나누지 않고, 학기 전환은 `WorkspaceRegistry`의 active repository 전환으로 표현한다.
- 하나의 Codex thread는 생성·재개되는 동안 하나의 canonical SemesterWorkspace root에 고정된다. 강의·과제 같은 하위 directory는 작업 대상일 뿐 별도 project identity나 thread `cwd`가 아니며, Turn마다 descendant `cwd`로 바꾸지 않는다. Prepared startup에서 exact-root trust·config와 Adapter lifecycle을 검증한 startup thread를 정상 Product Turn에도 재사용한다. 다른 학기로 전환하면 그 Git root와 일치하는 thread를 새로 만들거나 재개하고, 기존 thread를 다른 SemesterWorkspace로 이동시키지 않는다.
- **ADR 0020으로 대체됨:** Active SemesterWorkspace가 없을 때 AY-PLE이 `hub/`를 exact `cwd`로 쓰는 Bootstrap Runtime·thread를 연다는 결정.
- **ADR 0020으로 대체됨:** Bootstrap candidate를 App이 보존하고 명시적인 activation transition을 시작한다는 결정.
- **ADR 0020으로 대체됨:** App이 Bootstrap Runtime을 종료해 candidate root의 Workspace Runtime으로 전환하고 두 Runtime phase를 소유한다는 결정. Current prepared-root startup은 listener·Broker→exact-root Runtime·thread→complete effective MCP declaration→held Adapter lifecycle→registry commit 순서를 사용한다.
- 정상 workspace Runtime은 root의 `.git`을 Codex의 native project marker로 사용한다. App은 `project_root_markers=[]`로 project-root discovery를 덮어쓰거나 broad CLI config로 workspace context를 재정의하지 않는다. 현재 제품에서는 root부터 `cwd`까지의 native project config·instruction·Skill discovery가 곧 SemesterWorkspace context다.
- AY-PLE은 채택을 위해 별도 app-owned workspace copy나 normalized child leaf를 만들지 않고, repository 안의 실제 사용자 파일을 작업 대상으로 삼는다.
- App이 active root의 actual file을 bounded read-only로 나열하거나 text·PDF preview를 제공하는 것은 workspace authority를 App으로 옮기지 않는다. Source explorer 선택은 transient presentation state이며 App-owned `Course`·`RawMaterial` registry, copy·snapshot·watcher·durable selection과 file/Git mutation을 만들지 않는다.
- Current `<SemesterWorkspace>/.ay-ple/workspace-state.json`의 aggregate model을 `<SemesterWorkspace>/workspace-state.json`으로 옮겨 학기 identity와 학업 상태를 담는 plain workspace-local JSON authority로 삼는다. SemesterWorkspace root에는 `AGENTS.md`, `workspace-state.json`, `.agents/skills/`, Codex 표준 project config인 `.codex/config.toml`과 실제 학기 자료를 Git-tracked file로 배치하며 별도 `.ay-ple/` product directory를 두지 않는다.
- `workspace-state.json`은 학기 identity와 현재 구조화된 학업 snapshot을 담는다. Git commit history가 장기 변경 이력과 rollback을 맡으므로 `statePatches`, `userConfirmations`, `modelingRuns` event 배열을 workspace SSOT에 누적하지 않는다. Exact academic field와 file format은 이 ADR이 고정하지 않는다.
- 구조화된 학기 snapshot이 `EvidenceRef`를 사용할 때는 `relativePath`, exact `contentDigest`와 문서 내부 `locator`로 근거 byte와 위치를 식별한다. `workspace-state.json`이 포함되는 commit의 SHA를 같은 파일에 넣는 self-reference는 만들지 않으며, Git history는 digest가 가리키는 과거 content를 찾고 비교하는 이력 수단이다.
- `StatePatch`와 `UserConfirmation`은 ADR 0019의 transient interaction request/result이고 `ModelingRun`은 native Codex Turn과 process-local operation으로 대체한다. ADR 0021의 ActionInvocation도 durable run을 만들지 않는다. App이 이 객체를 academic event로 저장하거나 수락 결과를 대신 적용하지 않으며, AY가 interaction 결과에 따라 실제 workspace file을 바꾸고 Git checkpoint를 남긴다.
- Historical aggregate의 `executionGuard`, `sourceRecovery` 같은 실행 중 필드는 Git-tracked `workspace-state.json`에서 제거한다. 현재 pending product operation, InteractionCapability와 Broker-owned Adapter lifecycle status는 해당 process의 Runtime generation memory에서만 유지하고 terminal event에서 정산한다. 별도 workspace별 recovery file을 만들지 않으며 restart 뒤 사라진 operation의 성공·결과를 추정하지 않는다.
- **ADR 0020으로 대체됨:** App이 account 연결 뒤 active workspace가 없으면 hub-rooted Bootstrap Runtime을 열고 초기화·activation을 수행한다는 결정.
- 앱은 appData에 known SemesterWorkspace 목록과 현재 active workspace pointer만 보존한다. 새 학기 추가·기존 학기 전환은 pre-App native Bootstrap 뒤 launch-time `--workspace`로 명시하고, 이후 재실행은 active pointer를 fresh reopen한다. Workspace 내부 구조나 Git lifecycle을 registry가 소유하지 않는다.
- 처음 여는 workspace에서는 App 실행 전 native Codex client에서 AY의 init Skill을 실행한다. 이 Skill은 사용자에게 입력·권한·충돌 해결을 확인하고 작업 순서를 안내하는 Bootstrap surface이고, Skill에 포함된 repository-owned deterministic script가 Git 초기화, 최소 `AGENTS.md`, `workspace-state.json`, built-in Skill copy, 정적인 `.codex/config.toml`과 명시적인 첫 checkpoint를 준비한다. Exact managed byte와 root-relative MCP command를 재현하고, 기존 repository의 dirty·unrelated byte를 보존하며, 충돌 시 no-clobber로 중단하고, 승인한 경로만 stage해야 하므로 instruction-only file 조작 대신 이 script를 채택한다. 이 script는 App-owned scaffold subsystem이 아니며 App Runtime이나 Product Turn에서 실행하지 않는다.
- `hub/.agents/skills/`에는 AY-PLE repository 개발 harness와 초기 Bootstrap Skill을 둔다. Bootstrap은 `hub`를 project root로 연 Codex가 native discovery할 수 있는 setup entrypoint이며 AY-PLE built-in Skill catalog 자체는 아니다.
- AY-PLE built-in Skill의 tracked authoring source는 `hub/skills/`에 둔다. Bootstrap은 선택한 `hub/skills/<skill>/` directory를 `<SemesterWorkspace>/.agents/skills/<skill>/`로 복사한다. Workspace copy가 정상 thread에서 Codex가 native discovery하는 실행 authority이며 SemesterWorkspace Git history가 실제 사용한 Skill byte와 변경 시점을 보존한다.
- Bootstrap은 `.codex/config.toml`에 hub-owned `@ay-ple/interaction-mcp` package의 built STDIO entrypoint, 전달할 env 이름·capability allowlist와 `required = true` 같은 정적 declaration만 설치한다. Entry point `command`는 exact SemesterWorkspace root에서 current `hub/` artifact까지 계산한 상대경로이며 MCP server `args`·`cwd`·`tool_timeout_sec`·static `env`·`disabled_tools`는 비워 둔다. Current pinned local STDIO launcher는 Workspace Runtime의 exact root `cwd`와 native MCP tool timeout 300초를 사용한다. App endpoint·token·Runtime binding은 기록하지 않으며 App이 Codex child environment로 공급한다. 정상 Runtime은 이 project config를 native loading하고 App은 MCP config를 CLI·thread override로 다시 주입하지 않는다. App startup은 effective declaration 전체가 Bootstrap contract와 일치하고 `disabled_tools=[]`인지 확인하며 actual Adapter의 authenticated held Broker lifecycle을 별도 readiness authority로 사용한다.
- Bootstrap은 전역 Codex config에 `../workspace/`나 개별 SemesterWorkspace trust를 쓰지 않는다. Parent trust는 child Git root에 상속되지 않으며 정상 Workspace thread start가 exact root의 native trust를 소유한다.
- Workspace Skill은 `hub/skills/`를 가리키는 symlink로 설치하지 않고, App Runtime도 process-wide `skills/extraRoots/set`이나 equivalent CLI override로 source catalog를 주입하지 않는다. Source 변경은 workspace를 암묵적으로 바꾸지 않으며 명시적인 Bootstrap·Update 작업과 review 가능한 Git diff를 거쳐 반영한다. `hub/` 또는 SemesterWorkspace root를 이동해 상대 MCP command가 달라지는 경우에도 Bootstrap Update가 config를 다시 계산하고 workspace에 checkpoint를 남긴다. Exact update conflict policy는 후속 init/update spec이 소유한다.
- Git repository가 사용자 자료와 변경 이력의 소유 경계다. Git 초기화, `.gitignore` 준비와 이후 checkpoint commit은 앱 기능이나 별도 product API가 아니라 명시적으로 호출된 workspace setup Skill과 AY의 일반 file·Git 작업으로 수행한다.
- 앱은 Git repository를 생성·수정·동기화하거나 clean working tree를 요구하는 Git UI·상태 기계를 두지 않는다. Startup admission에서 prepared directory가 exact Git root인지 read-only로 검증하고, 그 root를 Codex의 exact project `cwd`와 표준 쓰기 권한 범위로 전달해 thread를 일치시키는 데 그친다.
- `AGENTS.md`에는 AY가 자연스러운 작업 checkpoint마다 자주 commit한다는 간단한 지침을 둔다. App code, hook 또는 세분화된 조건표로 commit 시점을 자동 판정하지 않고, 현재 작업의 의미와 상태를 이해하는 AY에게 판단 여지를 남긴다.
- AY는 기존 Git repository와 dirty working tree를 존중한다. 이를 exhaustive policy engine으로 만들지 않으며 일반적인 Git 안전 원칙과 workspace 지침을 따른다.
- `process.cwd()`나 상위 repository를 암묵적으로 채택하지 않는다. 사용자가 선택한 canonical Git worktree root만 workspace authority가 될 수 있다.
- `packageRoot`, `appDataRoot`, `workspaceRoot`는 계속 분리한다. Source checkout인 `hub/`에는 tracked source와 재생성 가능한 `node_modules`·`dist`만 두고, canonical `appDataRoot`는 sibling `../.ay-ple/`, 학기 repository parent는 sibling `../workspace/`로 정한다. 전역 Codex account·config·session authority는 `~/.codex`를 그대로 사용한다.
- Sibling appData `../.ay-ple/`은 여러 SemesterWorkspace를 가로지르는 운영 metadata와 config, Runtime payload, `WorkspaceRegistry`, cache와 temp를 소유한다. 학기 identity·Course·자료·학업 상태나 Skill copy를 저장하지 않는다. Bootstrap source는 `hub/.agents/skills/`, AY-PLE built-in Skill source는 `hub/skills/`, 실행 copy는 각 SemesterWorkspace의 `.agents/skills/`가 소유하며 mutable Runtime payload와 재현 cache도 sibling appData에만 둔다.
- Canonical path 전환은 legacy appData를 통째로 복사하지 않는다. Runtime은 `../.ay-ple/runtime/`에 새로 materialize·검증하고, generated ModelingRecipe, assignment staging, isolated Codex home과 managed development workspace는 재사용하지 않는다. 사용자가 소유한 실제 SemesterWorkspace만 보존한다.
- 새 canonical layout에서 Runtime 검증, 전역 Codex 연결, active SemesterWorkspace open과 기본 smoke가 모두 성공한 뒤 ownership marker·canonical path·expected layout을 재검증한 exact legacy target만 one-shot cleanup한다. 이 cleanup은 normal install/start에 포함하지 않는다.
- ADR 0014의 v3 scaffold·setup journey·복사 기반 `ImportSource` 경계와 이를 위한 package primitive는 current product contract와 canonical graph에서 제거됐다. 당시 판단과 구현 증거는 ADR 0014와 완료 artifact에서만 역사 기록으로 보존한다.

## 결과

제품 실행은 explicit prepared-root launch와 sibling appData의 durable registry reopen을 사용한다. Legacy path selection, app-owned admission·scaffold·bundle verification, fixed `project_root_markers=[]`, managed Skill override와 package-local Runtime fallback은 이 architecture의 authority가 아니다. Commit 동작을 위한 별도 app subsystem과 auto-commit hook은 만들지 않는다. App과 AY의 양방향 interaction·file mutation 경계는 ADR 0021, MCP Review 상세는 ADR 0019가 소유하며, `workspace-state.json`의 exact academic schema는 후속 spec에서 별도로 고정한다.
