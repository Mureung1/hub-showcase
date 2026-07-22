# Codex Runtime 격리 기술 메모

작성일: 2026-07-07

최근 갱신: 2026-07-22

분류: 활성

성숙도: 채택

관련 문서: [Codex App Server 우선 사용 ADR](../adr/0005-use-codex-app-server-as-first-class-mvp-runtime.md), [제품 실행 경로 분리 ADR](../adr/0006-separate-package-app-data-and-semester-workspace-roots.md), [app-owned SemesterWorkspace ADR](../adr/0014-create-app-owned-normalized-semester-workspaces.md), [Official Codex Python SDK ADR](../adr/0011-reuse-official-codex-python-sdk-for-chat-shell.md), [single Runtime graph ADR](../adr/0012-adopt-codex-chat-only-and-remove-legacy-runtime-surfaces.md), [product-only cutover·durable v2 ADR](../adr/0013-adopt-product-only-public-surface-and-v2-store-compatibility-baseline.md), [macOS-first 제품 경로 ADR](../adr/0009-use-a-macos-first-local-web-app-product-path.md), [public npx distribution ADR](../adr/0016-distribute-public-preview-with-an-exact-npx-launcher-and-verified-runtime-release.md), [Codex Chat 구현 지도](codex-chat-implementation-map.md), [개발 백로그](../product/ay-ple-development-backlog.md)

## 목적

AY-PLE가 Codex App Server를 built-in local agent engine으로 사용할 때 runtime artifact, process environment, native state와 사용자 `SemesterWorkspace`를 어떻게 분리하는지 설명한다. [ADR 0006](../adr/0006-separate-package-app-data-and-semester-workspace-roots.md)이 root 소유권을, [ADR 0014](../adr/0014-create-app-owned-normalized-semester-workspaces.md)가 workspace admission·identity authority를, [ADR 0013](../adr/0013-adopt-product-only-public-surface-and-v2-store-compatibility-baseline.md)이 canonical product cutover와 durable current v2 보존 정책을, [ADR 0016](../adr/0016-distribute-public-preview-with-an-exact-npx-launcher-and-verified-runtime-release.md)이 public application↔Runtime binding·delivery authority를 결정한다.

Transport, 상태 격리, sandbox, 인증 저장소와 packaging risk 같은 저수준 기술 경계는 이 문서가 소유한다. 제품 문제와 작업 조합, package의 exact 동작, 작업 순서는 각각 Product Brief·composition, 구현 지도·package README, Development Backlog를 따른다.

## 현재 구현, 제품 목표와 후속

| 영역 | 현재 product 구현 | 채택한 목표 | 후속 |
| --- | --- | --- | --- |
| Runtime stack | `@ay-ple/codex-chat-runtime`이 exact official source, generated SDK, standalone CPython과 native `0.144.4`를 canonical manifest로 검증한 뒤 package-local bundle만 시작한다. | Exact application package의 embedded descriptor가 immutable Runtime release와 canonical manifest를 pin하고, single `RuntimeResolver`가 `appDataRoot`의 verified generation을 `runtimeRoot`로 반환한다. | 다른 platform, Desktop signing·notarization과 automatic updater |
| Runtime state | Canonical composition이 explicit `appDataRoot` 아래 app-managed `HOME`, `CODEX_HOME`, `CODEX_SQLITE_HOME`, temp/runtime state를 계산·준비하고 root 비중첩을 검증한다. | Runtime-home pair와 기기별 state를 workspace 밖에 두고 caller wiring에서 분리한다. | macOS 기본 app data path, account/auth UX, rollover 정책 |
| 작업 `cwd` | Root startup·Browser activation이 chooser·development override로 연 current-v2 directory를 internal `ready`로 판정해 product thread의 exact native `cwd`로 사용한다. `CODEX_CHAT_WORKSPACE`는 manual-development selection override다. | App이 생성하고 `WorkspaceManifest` validation을 통과한 active `SemesterWorkspace`만 `cwd`가 된다. 사용자는 학기 정보와 생성 위치를 고르며 identity는 `WorkspaceManifest`가 소유한다. | Scaffold·admission 전환과 durable active workspace registry |
| 학기 제품 상태 | Workspace current canonical v2 store가 stable workspace ID·한 Course, confirmed state·settled history·execution guard를 original-byte authority와 compare-before-rename으로 보존한다. Invalid·unsupported bytes는 `incompatible/readOnly`로 연다. | `WorkspaceManifest`가 workspace·Course identity와 관계를 단독 소유하고, app data 손실·Server restart·rollback에도 workspace만으로 확인된 상태를 다시 연다. | Current v2 identity의 explicit version transition, backup/restore·signature 정책 |
| Native context | Controlled environment와 fixed `PATH`만 child에 전달하고 workspace native instructions·Skills는 Codex가 발견한다. | Native instruction·Skills를 따르고 Memory는 명시적 설정과 eligibility 확인 뒤 비권위적 맥락으로만 사용한다. | Memory 활성화·consent·rollover UX |
| Transport·policy | Local companion이 detached Node→Python→App Server tree를 supervise한다. First Assignment product Turn은 `auto_review + workspace_write`를 explicit하게 보낸다. | Codex execution permission은 AY-PLE Review·`UserConfirmation`과 분리하고 Browser에는 allowlisted product activity만 전달한다. | Interactive native approval UX과 cloud threat model |

Current product startup·install·Runtime command는 legacy env, repository `.ay-ple`, ambient auth/provider, system Python, source checkout이나 `process.cwd()`를 fallback으로 사용하지 않는다. Legacy local data를 탐색·이관·삭제하지 않고 다른 clone·external root의 상태를 추론하지 않는다. 다만 current chooser·materializer에는 app-owned scaffold, `WorkspaceManifest`, first-run setup과 durable registry가 없으므로 current internal `ready`를 adopted `Semester Ready`로 해석하지 않는다. Public application package, embedded release binding, GitHub Runtime asset과 resolver-owned cache도 아직 구현되지 않았다.

## 격리 레이어

| 레이어 | 채택한 경계 | 보장하지 않는 것 |
| --- | --- | --- |
| Runtime/version | Exact application descriptor가 선택하고 complete-tree verifier를 통과한 immutable Python·SDK·native `runtimeRoot`만 사용 | Codex state, auth와 session 분리 |
| Runtime environment | Inherited environment 대신 explicit `HOME`, Codex homes, temp와 fixed executable path를 전달 | Container, VM 또는 별도 OS user 수준 격리 |
| Runtime-home pair | `appDataRoot` 아래 app-managed `CODEX_HOME`과 `CODEX_SQLITE_HOME`을 함께 배치 | 학기별 memory 격리와 사용자 자료 보존 |
| Workspace | App-owned admission과 `WorkspaceManifest` validation을 통과한 active `SemesterWorkspace`를 exact native `cwd`로 전달 | Auth·Runtime state 저장소 격리, 외부 `ImportSource` 분석·반입 방식 |
| Native context | Codex의 `AGENTS.md`, Skills와 opt-in Memories를 native 방식으로 사용 | 학업 사실의 정확성, 모든 작업의 memory 생성 |
| Sandbox·approval | Product Turn의 `auto_review + workspace_write`를 exact native profile로 전달하고 AY-PLE `UserConfirmation`과 별도 state로 유지 | OS process 보안 경계, path-level filesystem immutability, generic approval center |
| Transport | Local companion이 private Node↔Python NDJSON과 `stdio://` App Server process를 소유 | Protocol 변경과 packaging risk 제거 |

## Canonical product layout seam

### 현재 개발 composition

Root `npm run dev -- --app-data-root <absolute-path>`는 세 root와 Runtime artifact를 직접 조합한다. Caller가 여섯 legacy path를 맞추거나 environment에서 root model을 다시 만들지 않는다. 다만 현재 구현은 chooser·development materializer가 넘긴 directory와 current-v2 store를 사용하며, workspace registry, app-created `WorkspaceManifest`와 public admission은 아직 구현하지 않았다.

### 채택한 public target

아래 표는 public setup·relaunch가 구현해야 할 target 불변 조건이다. 현재 development override가 이 조건을 충족했다는 뜻이 아니다.

| 입력·결과 | 불변 조건 |
| --- | --- |
| `packageRoot` | Product state를 쓰지 않으며 exact application code와 embedded Runtime descriptor·canonical manifest를 찾는다. Runtime payload cache나 moving remote catalog를 authority로 두지 않는다. |
| `appDataRoot` | Explicit absolute non-symlink directory다. Workspace 밖에 있고 verified immutable Runtime generation·retained archive, app-managed `HOME`·`CODEX_HOME`·`CODEX_SQLITE_HOME`·temp/runtime state와 workspace registry를 분리해 계산한다. Registry는 pointer이지 workspace identity authority가 아니다. |
| Resolver result | Single `RuntimeResolver`가 exact binding과 complete tree를 확인한 immutable `runtimeRoot`·Runtime identity만 production host에 반환한다. Missing·corrupt state는 scoped repair하거나 fail closed하며 다른 version으로 fallback하지 않는다. |
| `workspaceRoot` | 사용자가 고른 위치에 app code가 생성하고 `WorkspaceManifest` validation을 통과한 root다. Active 상태에서 native thread `cwd`와 일치한다. Current development override는 이 target의 admission을 대신하지 않는다. |
| Root relation | Package, app data, workspace와 controlled child root의 의미를 섞지 않고 unsafe overlap과 symlink를 거절한다. |
| Manual override | `CODEX_CHAT_WORKSPACE`는 current development materializer의 caller-owned selection input일 뿐 public workspace admission, Runtime root, app data 또는 별도 `cwd` authority가 아니다. |
| Data loss | `appDataRoot`가 사라져도 `RawMaterial`과 confirmed·settled product state를 workspace에서 다시 열 수 있다. |

Current product factory는 Runtime spawn 전과 factory 내부에서 package-local artifact·path를 다시 검증해 TOCTOU drift를 fail closed한다. Public target은 resolver 결과를 소비하되 spawn 경계에서 exact descriptor binding과 complete tree를 다시 확인한다. Child environment는 controlled root와 필수 OS directory만으로 재구성하며 ambient credential·provider·`PYTHONPATH`·dynamic loader variable를 계승하지 않는다.

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
    codex-home/               # CODEX_HOME
    codex-sqlite-home/        # CODEX_SQLITE_HOME
    temp/                     # temporary/runtime state

chooser-selected-directory/
  AGENTS.md                  # 선택 사항, native instruction
  .agents/skills/             # 선택 사항, native Skills
  .ay-ple/
    workspace-state.json      # current durable v2 authority
    runtime-scratch/          # Run-bound transient workspace writes
```

채택한 target의 논리 seam은 아래와 같다. `<WorkspaceManifest>`는 authority 이름이며 exact file name·encoding을 뜻하지 않는다. Physical roster와 current v2 transition은 구현 spec이 고정한다.

```text
user-app-data/
  <runtime-cache>/           # versioned verified Runtime generation·retained archive
  <workspace-registry>/       # active·recent pointer, identity authority가 아님

semester-workspace/
  <WorkspaceManifest>         # workspace·Course identity와 format authority
  <material-inbox>/           # 검토 전후 자료 반입의 논리 seam
  <course-projections>/       # human-readable Course projection의 논리 seam
  <app-owned-state>/          # confirmed state와 recovery data
  AGENTS.md                   # 선택 사항, native instruction
  .agents/skills/             # 선택 사항, native Skills
```

기존 자료 폴더는 이 tree의 변형이 아니라 workspace 밖의 `ImportSource`다. App-owned import가 검토·승인을 거쳐 반입하기 전에는 `RawMaterial`, active workspace 또는 native `cwd`로 취급하지 않는다. Codex-managed state의 내부 file roster도 product contract로 고정하지 않는다.

## Durable store와 rollback

Workspace-local store는 app data나 native session과 다른 durable authority다. 따라서 Server lifecycle과 public-surface cutover는 confirmed state의 삭제 권한을 갖지 않고, store를 안전하게 이해하지 못하는 Runtime은 product mutation authority를 얻지 못한다. Current v2가 가진 stable workspace ID·Course identity와 새 `WorkspaceManifest`를 동시에 authoritative하게 두지 않는다. Physical 통합 또는 비중첩 분리는 explicit version·migration으로 결정하고, 지원하지 않는 current bytes는 자동 scaffold·adopt·reset하지 않는다. Baseline과 이후 schema 변경 정책은 [ADR 0013](../adr/0013-adopt-product-only-public-surface-and-v2-store-compatibility-baseline.md), workspace authority는 [ADR 0014](../adr/0014-create-app-owned-normalized-semester-workspaces.md), exact current codec·I/O 동작은 [Server README](../../apps/server/README.md#workspace-local-durable-store)가 소유한다.

## 리스크와 대응

| 리스크 | 설명 | 대응 |
| --- | --- | --- |
| Artifact drift | Current bundle 또는 public descriptor가 선택한 release byte가 바뀌면 검토한 Runtime과 달라진다. | Current canonical manifest와 public exact binding·complete tree를 resolve·spawn 경계에서 fail closed로 검증한다. |
| Silent Runtime fallback | 손상·unavailable release에서 다른 cached Runtime을 고르면 application contract가 바뀐다. | Resolver는 exact release만 repair·검증하고 실패 시 닫는다. Rollback은 still-supported 이전 exact application pair를 명시적으로 실행한다. |
| Runtime-home pair 분리 | Custom home을 잘못 조합하면 auth·SQLite 수명과 복구 책임이 갈라진다. | Product composition이 explicit appDataRoot 아래 pair와 controlled roots를 함께 계산한다. |
| Workspace 오선택 | Registry나 development override가 사용자 의도와 다른 root를 가리킬 수 있다. | `WorkspaceManifest` identity·schema를 재검증하고 thread 재사용 전 sticky `cwd`를 확인한다. Registry는 pointer로만 사용한다. |
| Workspace authority 분열 | Current v2와 새 `WorkspaceManifest`가 같은 workspace·Course identity를 각각 소유하면 migration과 rollback 결과가 달라진다. | 하나의 authority만 남기는 explicit version transition 또는 비중첩 state split을 사용하고, 지원하지 않는 bytes는 보존한 채 fail closed한다. |
| `ImportSource` 오인 | 기존 자료 폴더를 곧바로 workspace로 열면 외부 tree의 우연한 구조가 schema가 된다. | App-owned scaffold만 활성화하고 import 분석·mapping·apply를 별도 검토 흐름으로 둔다. |
| Workspace authority drift | Registered TXT나 store가 Turn·Server 수명 중 바뀌면 stale authority로 덮어쓸 수 있다. | Source drift는 interrupt·explicit rebaseline, store drift는 compare-before-rename·explicit reactivation으로 원본을 보존한다. |
| 민감 상태 혼입 | `CODEX_HOME`을 workspace에 두면 auth·session·log가 사용자 자료와 섞인다. | App data에 runtime-home pair를 두고 workspace와 분리한다. |
| Host context 혼입 | Custom home만으로 ambient provider·environment가 모두 차단된다고 볼 수 없다. | Child environment를 allowlist로 재구성하고 exact local-provider에서 effective state를 검증한다. |
| Sandbox 과신 | Codex sandbox와 approval은 OS process 격리가 아니다. | Local personal-device 경계로 한정하고 cloud 전환 시 별도 threat model을 작성한다. |
| 권한 경계 혼동 | Native permission은 Codex execution을, `UserConfirmation`은 academic apply를 제어한다. | 어느 결정도 다른 결정을 암묵적으로 승인하지 않고 별도 identity·state로 다룬다. |

## 구현과 계획 연결

현재 횡단 topology와 검증 표면은 [Codex Chat 구현 지도](codex-chat-implementation-map.md), Runtime artifact·process의 package 동작은 [codex-chat-runtime README](../../packages/codex-chat-runtime/README.md), Server startup·store behavior는 [Server README](../../apps/server/README.md)가 소유한다. Public application↔Runtime distribution 불변 조건은 [ADR 0016](../adr/0016-distribute-public-preview-with-an-exact-npx-launcher-and-verified-runtime-release.md), 후속 작업 순서와 완료 조건은 [개발 백로그](../product/ay-ple-development-backlog.md)에서만 관리한다.

## 근거 링크

| 주제 | 공식/확인 출처 |
| --- | --- |
| Codex App Server 용도, protocol, transport, schema generation | [Codex App Server](https://developers.openai.com/codex/app-server) |
| `CODEX_HOME`, `CODEX_SQLITE_HOME`, installer/auth environment variables | [Environment variables](https://developers.openai.com/codex/environment-variables) |
| `CODEX_HOME`의 config/auth/history/log 위치, project config 제한 | [Advanced configuration](https://developers.openai.com/codex/config-advanced) |
| `codex app-server` maturity와 CLI flags | [Command line options](https://developers.openai.com/codex/cli/reference) |
| Sandbox mode와 approval policy | [Sandbox](https://developers.openai.com/codex/concepts/sandboxing) |
