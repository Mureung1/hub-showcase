# 사용자가 선택한 Git working tree를 SemesterWorkspace로 채택한다

분류: 활성

성숙도: 채택

대체한 결정: [ADR 0014 — SemesterWorkspace를 app-owned normalized scaffold로 생성한다](0014-create-app-owned-normalized-semester-workspaces.md)

관련 interaction 결정: [ADR 0019 — MCP InteractionCapability를 AY와 App의 seam으로 사용한다](0019-use-mcp-interaction-capabilities-as-the-ay-app-seam.md)

## 맥락

ADR 0014는 public preview에서 임의의 사용자 자료를 보호하고 first-run identity·migration을 통제하기 위해 app-owned 새 directory를 만들고 기존 자료를 `ImportSource`로 복사하는 경계를 채택했다. Current product는 public distribution이 아니라 소유자 한 명의 personal local use를 목표로 하며, 학생은 이미 Git으로 관리하는 실제 학기 파일을 AY와 같은 working tree에서 직접 다루기를 원한다. 별도 scaffold와 복사 기반 반입은 이 경우 자료의 실제 위치와 AY-PLE 작업공간을 다시 분리해 일상적인 file operation을 방해한다.

## 결정

- 사용자가 명시적으로 선택한 기존 Git working tree root, 또는 init Skill이 독립 Git root로 준비한 새 directory를 그 자리에서 `SemesterWorkspace`, Codex project root와 작업 `cwd`로 채택한다.
- 하나의 `SemesterWorkspace`는 하나의 Git repository이자 하나의 학기다. 여러 학기를 한 SemesterWorkspace 또는 한 Git repository의 하위 경로로 나누지 않고, 학기 전환은 `WorkspaceRegistry`의 active repository 전환으로 표현한다.
- 하나의 Codex thread는 생성·재개되는 동안 하나의 canonical SemesterWorkspace root에 고정된다. 강의·과제 같은 하위 directory는 작업 대상일 뿐 별도 project identity나 thread `cwd`가 아니며, Turn마다 descendant `cwd`로 바꾸지 않는다. 다른 학기로 전환하면 그 Git root와 일치하는 thread를 새로 만들거나 재개하고, 기존 thread를 다른 SemesterWorkspace로 이동시키지 않는다.
- 정상 workspace Runtime은 root의 `.git`을 Codex의 native project marker로 사용한다. App은 `project_root_markers=[]`로 project-root discovery를 덮어쓰거나 broad CLI config로 workspace context를 재정의하지 않는다. 이 target에서는 root부터 `cwd`까지의 native project config·instruction·Skill discovery가 곧 SemesterWorkspace context다.
- AY-PLE은 채택을 위해 별도 app-owned workspace copy나 normalized child leaf를 만들지 않고, repository 안의 실제 사용자 파일을 작업 대상으로 삼는다.
- Current `<SemesterWorkspace>/.ay-ple/workspace-state.json`의 aggregate model을 `<SemesterWorkspace>/workspace-state.json`으로 옮겨 학기 identity와 학업 상태를 담는 plain workspace-local JSON authority로 삼는다. SemesterWorkspace root에는 `AGENTS.md`, `workspace-state.json`과 실제 학기 자료를 일반 Git-tracked file로 나란히 배치하며 별도 hidden product directory를 두지 않는다.
- `workspace-state.json`은 학기 identity와 현재 구조화된 학업 snapshot을 담는다. Git commit history가 장기 변경 이력과 rollback을 맡으므로 `statePatches`, `userConfirmations`, `modelingRuns` event 배열을 workspace SSOT에 누적하지 않는다. Exact academic field와 file format은 이 ADR이 고정하지 않는다.
- 구조화된 학기 snapshot이 `EvidenceRef`를 사용할 때는 `relativePath`, exact `contentDigest`와 문서 내부 `locator`로 근거 byte와 위치를 식별한다. `workspace-state.json`이 포함되는 commit의 SHA를 같은 파일에 넣는 self-reference는 만들지 않으며, Git history는 digest가 가리키는 과거 content를 찾고 비교하는 이력 수단이다.
- `StatePatch`와 `UserConfirmation`은 ADR 0019의 transient interaction request/result이고 `ModelingRun`은 native Codex Turn으로 대체한다. App이 이 객체를 academic event로 저장하거나 수락 결과를 대신 적용하지 않으며, AY가 interaction 결과에 따라 실제 workspace file을 바꾸고 Git checkpoint를 남긴다.
- Current aggregate의 `executionGuard`, `sourceRecovery`와 이후 같은 수명의 실행 중 상태는 Git-tracked `workspace-state.json`에서 제거하고 `../.ay-ple/state/workspaces/<workspaceId>/runtime-state.json`에 비추적으로 둔다. 이 operation state는 confirmed 학기 상태의 authority가 아니며 appData 손실 뒤 workspace의 confirmed state를 바꾸거나 복구 대상으로 추측하지 않는다.
- 앱은 workspace와 독립된 appData에서 Codex account 연결을 먼저 완료할 수 있다. 연결 뒤 사용자가 새 폴더 또는 기존 학기 폴더를 선택하면 그 canonical path를 active workspace로 기록하고, 선택한 root를 exact `cwd`로 사용하는 workspace Runtime으로 전환한다.
- 앱은 appData에 known SemesterWorkspace 목록과 현재 active workspace pointer만 보존한다. 새 학기 추가·기존 학기 전환은 이 목록과 명시적 directory selection으로 수행하며, workspace 내부 구조나 Git lifecycle을 registry가 소유하지 않는다.
- 처음 여는 workspace에서는 AY의 instruction-based init Skill을 실행한다. 이 Skill이 일반 file·Git 도구로 Git 초기화, 최소 `AGENTS.md`, 필요한 학기 scaffold와 첫 checkpoint를 준비한다. Exact deterministic generation이 실제로 필요해지기 전에는 별도 scaffold script를 두지 않는다.
- `hub/.agents/skills/`는 AY-PLE repository 자체를 개발하는 Agent harness이고 SemesterWorkspace에 배포할 제품 Skill source가 아니다. AY-PLE 제품 Skill의 tracked authoring·distribution source는 `hub/skills/`에 둔다.
- Init·Update Skill은 선택한 `hub/skills/<skill>/` directory를 `<SemesterWorkspace>/.agents/skills/<skill>/`로 복사한다. Workspace copy가 정상 thread에서 Codex가 native discovery하는 실행 authority이며 SemesterWorkspace Git history가 실제 사용한 Skill byte와 변경 시점을 보존한다.
- Workspace Skill은 `hub/skills/`를 가리키는 symlink로 설치하지 않고, App Runtime도 process-wide `skills/extraRoots/set`이나 equivalent CLI override로 source catalog를 주입하지 않는다. Source 변경은 workspace를 암묵적으로 바꾸지 않으며 명시적인 Update 작업과 review 가능한 Git diff를 거쳐 반영한다. Exact update conflict policy는 후속 init/update spec이 소유한다.
- Git repository가 사용자 자료와 변경 이력의 소유 경계다. Git 초기화, `.gitignore` 준비와 이후 checkpoint commit은 앱 기능이나 별도 product API가 아니라 명시적으로 호출된 workspace setup Skill과 AY의 일반 file·Git 작업으로 수행한다.
- 앱은 Git repository를 생성·검사·동기화하거나 clean working tree를 요구하는 Git UI·상태 기계를 두지 않는다. 앱의 경계는 사용자가 선택한 workspace root를 Codex의 exact project `cwd`와 쓰기 권한 범위로 전달하고, thread를 그 root와 일치시키는 데 그친다.
- `AGENTS.md`에는 AY가 자연스러운 작업 checkpoint마다 자주 commit한다는 간단한 지침을 둔다. App code, hook 또는 세분화된 조건표로 commit 시점을 자동 판정하지 않고, 현재 작업의 의미와 상태를 이해하는 AY에게 판단 여지를 남긴다.
- AY는 기존 Git repository와 dirty working tree를 존중한다. 이를 exhaustive policy engine으로 만들지 않으며 일반적인 Git 안전 원칙과 workspace 지침을 따른다.
- `process.cwd()`나 상위 repository를 암묵적으로 채택하지 않는다. 사용자가 선택한 canonical Git worktree root만 workspace authority가 될 수 있다.
- `packageRoot`, `appDataRoot`, `workspaceRoot`는 계속 분리한다. Source checkout인 `hub/`에는 tracked source와 재생성 가능한 `node_modules`·`dist`만 두고, canonical `appDataRoot`는 sibling `../.ay-ple/`, 학기 repository parent는 sibling `../workspace/`로 정한다. 전역 Codex account·config·session authority는 `~/.codex`를 그대로 사용한다.
- Sibling appData `../.ay-ple/`은 여러 SemesterWorkspace를 가로지르는 운영 metadata와 config, Runtime payload, `WorkspaceRegistry`, cache와 temp를 소유한다. 학기 identity·Course·자료·학업 상태나 Skill copy를 저장하지 않는다. AY-PLE Skill source는 `hub/skills/`, 실행 copy는 각 SemesterWorkspace의 `.agents/skills/`가 소유하며, mutable Runtime payload를 package-local `.artifacts/`에 두는 현재 구현은 전환 대상이다.
- Canonical path 전환은 legacy appData를 통째로 복사하지 않는다. Runtime은 `../.ay-ple/runtime/`에 새로 materialize·검증하고, generated ModelingRecipe, assignment staging, isolated Codex home과 managed development workspace는 재사용하지 않는다. 사용자가 소유한 실제 SemesterWorkspace만 보존한다.
- 새 canonical layout에서 Runtime 검증, 전역 Codex 연결, active SemesterWorkspace open과 기본 smoke가 모두 성공한 뒤에만 `../.ay-ple-dogfood/`, `../.ay-ple-dev-workspaces/`와 package-local Runtime `.artifacts/`를 scoped residue로 제거한다.
- ADR 0014의 v3 scaffold·setup journey·복사 기반 `ImportSource` 경계와 이를 위한 package primitive는 current product target이 아니다. Existing code는 별도 contraction 전까지 구현 흔적으로 남을 수 있지만 adopted capability로 해석하지 않는다.

## 결과

현재 개발 실행의 hardcoded `../workspace/year-2-semester-2`, launch-time environment 전달과 process-local active selection은 sibling appData의 durable registry를 쓰는 account-first lifecycle로 교체한다. Legacy execution state는 migration source가 아니라 검증 뒤 삭제할 residue이며 rollback은 기존 directory를 cleanup 전까지 그대로 보존하는 방식으로 확보한다. 기존 app-owned admission·scaffold·bundle verification 코드와 Runtime의 fixed `project_root_markers=[]`·managed Skill override는 current target과 충돌하므로 후속 contraction 대상이다. Commit 동작을 위한 별도 app subsystem과 auto-commit hook은 만들지 않는다. App과 AY의 Review·file mutation 경계는 ADR 0019가 소유하며, `workspace-state.json`의 exact academic schema는 후속 spec에서 별도로 고정한다.
