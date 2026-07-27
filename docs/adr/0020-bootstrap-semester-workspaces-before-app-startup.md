# SemesterWorkspace를 App 실행 전에 native Bootstrap으로 준비한다

분류: 활성

성숙도: 채택

부분 대체·보완하는 결정: [ADR 0018 — 사용자가 선택한 Git working tree를 SemesterWorkspace로 채택한다](0018-adopt-user-owned-git-semester-workspaces.md)

관련 interaction 결정: [ADR 0019 — MCP InteractionCapability를 AY와 App의 seam으로 사용한다](0019-use-mcp-interaction-capabilities-as-the-ay-app-seam.md)

## 맥락

ADR 0018은 user-owned Git working tree, actual-file 작업과 AY-owned Git checkpoint를 채택했지만 초기 lifecycle은 App이 `hub/` cwd의 Bootstrap Runtime·thread를 열고, Browser가 `BootstrapCandidate`를 만든 뒤 App Product Turn으로 init Skill을 실행하고 명시적으로 activation하는 흐름을 전제했다.

AY-PLE은 소유자 한 명이 native 권한을 열어 둔 개발 checkout에서 사용한다. 사용자는 App을 시작하기 전에 Codex CLI 같은 native client로 setup Skill을 직접 실행할 수 있다. 이 조건에서 App이 candidate selection, Bootstrap Runtime, 추가 쓰기 root와 init Turn을 소유하면 native Agent가 이미 할 수 있는 준비 작업을 제품 lifecycle과 official SDK contract에 중복시킨다. 특히 `hub/` cwd의 App Runtime이 sibling candidate를 수정하려면 high-level SDK에 additional `writableRoots`를 새로 노출해야 하는데, 이 patch는 App이 Bootstrap을 실행한다는 잘못된 소유권 때문에만 필요하다.

## 결정

- `semester-workspace-init`은 **AY-PLE App을 시작하기 전에** 사용자가 `hub/`를 연 Codex CLI 또는 다른 native Codex client에서 직접 실행한다. Skill source는 repository 개발 harness와 함께 `hub/.agents/skills/semester-workspace-init/`에 둔다.
- Native Bootstrap은 사용자가 지정한 directory를 독립 Git root로 준비하고 root `workspace-state.json`, 최소 `AGENTS.md`, 선택한 `hub/skills/` source의 workspace-local `.agents/skills/` copy, 정적인 `.codex/config.toml`과 review 가능한 Git checkpoint를 만든다. Existing repository의 history, remote, user bytes와 dirty working tree를 존중한다.
- Native client의 일반 file·Git tool과 사용자 승인·권한이 Bootstrap write scope를 소유한다. AY-PLE App Runtime, Product Turn permission profile 또는 official SDK의 additional `writableRoots`가 이 scope를 대신 운반하지 않는다.
- App은 Bootstrap Skill을 실행하거나 진행 상태를 관찰하지 않는다. `Bootstrap Runtime`, `BootstrapCandidate`, `workspace_init` Product Turn, candidate select/init/activate API와 Browser chooser·retry UI를 제품 surface로 만들지 않는다.
- Bootstrap 성공 뒤 사용자가 App을 시작한다. 첫 open과 학기 변경은 launch-time `--workspace <absolute-prepared-git-root>`로 exact root를 전달한다. 이후 인자 없는 실행은 `WorkspaceRegistry.activeWorkspaceId`가 가리키는 root를 fresh reopen한다. 다른 학기로 바꾸려면 native Bootstrap을 먼저 완료하고 App을 중지한 뒤 새 prepared root로 다시 실행한다.
- Explicit root도 valid registry active root도 없으면 App은 Workspace Runtime과 Browser product surface를 열지 않고, native Bootstrap과 `--workspace`가 필요하다는 actionable error로 fail closed한다. Browser 안에서 미준비 directory를 고르거나 초기화하는 fallback은 두지 않는다.
- App startup은 전달받은 root가 canonical existing directory, exact Git root와 valid v4 `workspace-state.json`인지 read-only로 fresh 검증한다. Dirty working tree는 admission failure가 아니다.
- Shared loopback listener와 Interaction Broker binding을 먼저 준비하고, exact Git root를 고정 `cwd`로 쓰는 fresh Workspace Runtime·thread를 표준 `workspace-write`로 시작한다. Native project config·`AGENTS.md`·workspace Skill discovery와 exact-root trust를 사용하며 hostile ancestor context를 상속하거나 `project_root_markers=[]`로 native boundary를 덮어쓰지 않는다.
- Current pinned App Server가 trust 미지정 exact Git root를 native user config에 기록하고 같은 start에서 project config를 reload하는 동작은 native startup seam으로 사용한다. 명시적인 `untrusted`는 덮어쓰지 않으며 Bootstrap Skill은 parent directory trust를 대신 기록하지 않는다.
- Authenticated Interaction MCP handshake와 required server·tool readiness가 성공한 뒤에만 root를 `WorkspaceRegistry`의 known entry와 active pointer로 commit한다. 실패하면 기존 registry pointer를 보존하고 degraded AY-PLE mode로 계속하지 않는다.
- Workspace Runtime과 thread는 수명 동안 exact SemesterWorkspace root에 고정한다. 학기 변경은 fresh App process·Runtime generation으로 열며 기존 thread의 `cwd`를 바꾸거나 다른 학기 thread를 resume하지 않는다.
- W-003에서 구현한 process-local non-preemptive operation coordinator와 terminal-only release authority는 normal Chat·Interaction Turn의 survivor다. Candidate/bootstrap Browser union과 `workspace_init` eligibility는 adopted target이 아니며 후속 contract 단계에서 제거한다.
- `0008-standalone-skill-extra-roots` patch는 workspace-local native Skill discovery가 green일 때 제거한다. 이를 `writableRoots` SDK patch로 대체하지 않고 exact SDK patch stack을 축소한다.

## 고려한 대안

| 대안 | 판정 | 이유 |
| --- | --- | --- |
| App이 hub-rooted Bootstrap Runtime에서 init Skill 실행 | 거절 | Setup write scope를 App lifecycle과 SDK에 결합하고 candidate·permission·retry 상태 기계를 만든다. |
| Browser chooser가 미준비 directory를 선택하고 App이 activation | 거절 | Bootstrap 성공 전에도 App을 시작해야 하며 native setup과 제품 UI가 같은 lifecycle을 중복 소유한다. |
| Hook 또는 App subsystem이 자동 commit | 거절 | 의미 있는 checkpoint는 작업 문맥을 아는 AY가 `AGENTS.md` 지침에 따라 판단한다. |
| Parent `../workspace/` trust를 global config에 기록 | 거절 | Exact child Git root의 project trust를 보장하지 않으며 개별 root startup의 native trust seam이 더 정확하다. |
| Additional `writableRoots`를 official Python SDK에 patch | 거절 | App-internal Bootstrap을 제거하면 정상 Workspace Runtime은 exact root 하나만 쓰므로 추가 root가 필요하지 않다. |
| App 실행 중 recent workspace chooser 제공 | 보류 | 반복 전환 필요가 확인되기 전에는 launch-time explicit root와 registry reopen이 더 작다. |

## 결과

AY-PLE의 startup input은 “초기화할 candidate”가 아니라 “native Bootstrap이 끝난 SemesterWorkspace”다. App은 prepared root의 validation, exact-root Workspace Runtime, required Interaction MCP와 registry commit만 소유한다. Bootstrap 진행·권한·Git mutation은 App contract와 Runtime SDK에서 빠지고, 기존 candidate lifecycle 구현은 generic coordinator survivor와 분리해 contract한다.
