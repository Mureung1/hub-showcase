# Codex Runtime 격리 기술 메모

작성일: 2026-07-07

최근 갱신: 2026-07-22

분류: 활성

성숙도: 채택

관련 문서: [Codex App Server 우선 사용 ADR](../adr/0005-use-codex-app-server-as-first-class-mvp-runtime.md), [제품 실행 경로 분리 ADR](../adr/0006-separate-package-app-data-and-semester-workspace-roots.md), [Official Codex Python SDK ADR](../adr/0011-reuse-official-codex-python-sdk-for-chat-shell.md), [single Runtime graph ADR](../adr/0012-adopt-codex-chat-only-and-remove-legacy-runtime-surfaces.md), [product-only cutover·durable v2 ADR](../adr/0013-adopt-product-only-public-surface-and-v2-store-compatibility-baseline.md), [macOS-first 제품 경로 ADR](../adr/0009-use-a-macos-first-local-web-app-product-path.md), [Codex Chat 구현 지도](codex-chat-implementation-map.md), [개발 백로그](../product/ay-ple-development-backlog.md)

## 목적

AY-PLE가 Codex App Server를 built-in local agent engine으로 사용할 때 runtime artifact, process environment, native state와 사용자 `SemesterWorkspace`를 어떻게 분리하는지 설명한다. [ADR 0006](../adr/0006-separate-package-app-data-and-semester-workspace-roots.md)이 root 소유권을, [ADR 0013](../adr/0013-adopt-product-only-public-surface-and-v2-store-compatibility-baseline.md)이 canonical product cutover와 durable store 정책을 결정한다.

Transport, 상태 격리, sandbox, 인증 저장소와 packaging risk 같은 저수준 기술 경계는 이 문서가 소유한다. 제품 문제와 작업 조합, package의 exact 동작, 작업 순서는 각각 Product Brief·composition, 구현 지도·package README, Development Backlog를 따른다.

## 현재 구현, 제품 목표와 후속

| 영역 | 현재 product 구현 | 채택한 목표 | 후속 |
| --- | --- | --- | --- |
| Runtime stack | `@ay-ple/codex-chat-runtime`이 exact official source, generated SDK, standalone CPython과 native `0.144.4`를 canonical manifest로 검증한 뒤 package-local bundle만 시작한다. | App package가 exact Python·SDK·native Runtime과 provenance를 함께 소유한다. | 지원 platform별 artifact, signing·notarization과 atomic update/rollback |
| Runtime state | Canonical composition이 explicit `appDataRoot` 아래 app-managed `HOME`, `CODEX_HOME`, `CODEX_SQLITE_HOME`, temp/runtime state를 계산·준비하고 root 비중첩을 검증한다. | Runtime-home pair와 기기별 state를 workspace 밖에 두고 caller wiring에서 분리한다. | macOS 기본 app data path, account/auth UX, rollover 정책 |
| 작업 `cwd` | Root startup·Browser activation이 선택한 active ready `SemesterWorkspace`를 product thread의 exact native `cwd`로 사용한다. `CODEX_CHAT_WORKSPACE`는 manual-development selection override다. | User selection이 workspace identity와 `cwd`를 단독 소유한다. | 최근 workspace registry |
| 학기 제품 상태 | Workspace current canonical v2 store가 confirmed state·settled history·execution guard를 original-byte authority와 compare-before-rename으로 보존한다. Invalid·unsupported bytes는 `incompatible/readOnly`로 연다. | App data 손실·Server restart·rollback에도 workspace만으로 confirmed state를 다시 열고 source/store conflict를 원본 보존 방식으로 복구한다. | Future version migration, backup/restore·signature 정책 |
| Native context | Controlled environment와 fixed `PATH`만 child에 전달하고 workspace native instructions·Skills는 Codex가 발견한다. | Native instruction·Skills를 따르고 Memory는 명시적 설정과 eligibility 확인 뒤 비권위적 맥락으로만 사용한다. | Memory 활성화·consent·rollover UX |
| Transport·policy | Local companion이 detached Node→Python→App Server tree를 supervise한다. First Assignment product Turn은 `auto_review + workspace_write`를 explicit하게 보낸다. | Codex execution permission은 AY-PLE Review·`UserConfirmation`과 분리하고 Browser에는 allowlisted product activity만 전달한다. | Interactive native approval UX과 cloud threat model |

Current product startup·install·Runtime command는 legacy env, repository `.ay-ple`, ambient auth/provider, system Python, source checkout이나 `process.cwd()`를 fallback으로 사용하지 않는다. Legacy local data를 탐색·이관·삭제하지 않고 다른 clone·external root의 상태를 추론하지 않는다.

## 격리 레이어

| 레이어 | 채택한 경계 | 보장하지 않는 것 |
| --- | --- | --- |
| Runtime/version | Canonical manifest로 검증한 package-owned Python·SDK·native Runtime artifact만 사용 | Codex state, auth와 session 분리 |
| Runtime environment | Inherited environment 대신 explicit `HOME`, Codex homes, temp와 fixed executable path를 전달 | Container, VM 또는 별도 OS user 수준 격리 |
| Runtime-home pair | `appDataRoot` 아래 app-managed `CODEX_HOME`과 `CODEX_SQLITE_HOME`을 함께 배치 | 학기별 memory 격리와 사용자 자료 보존 |
| Workspace | 사용자가 선택한 `SemesterWorkspace`를 exact native `cwd`로 전달 | Auth·Runtime state 저장소 격리 |
| Native context | Codex의 `AGENTS.md`, Skills와 opt-in Memories를 native 방식으로 사용 | 학업 사실의 정확성, 모든 작업의 memory 생성 |
| Sandbox·approval | Product Turn의 `auto_review + workspace_write`를 exact native profile로 전달하고 AY-PLE `UserConfirmation`과 별도 state로 유지 | OS process 보안 경계, path-level filesystem immutability, generic approval center |
| Transport | Local companion이 private Node↔Python NDJSON과 `stdio://` App Server process를 소유 | Protocol 변경과 packaging risk 제거 |

## Canonical product layout seam

Root `npm run dev -- --app-data-root <absolute-path>`는 세 root와 Runtime artifact를 직접 조합한다. Caller가 여섯 legacy path를 맞추거나 environment에서 root model을 다시 만들지 않는다.

| 입력·결과 | 불변 조건 |
| --- | --- |
| `packageRoot` | Product state를 쓰지 않으며 exact Runtime artifact와 canonical manifest를 찾는다. Missing·extra·digest drift를 repair하지 않고 fail closed한다. |
| `appDataRoot` | Explicit absolute non-symlink directory다. Workspace 밖에 있고 app-managed `HOME`·`CODEX_HOME`·`CODEX_SQLITE_HOME`·temp/runtime state를 함께 계산한다. |
| `workspaceRoot` | Explicit selection으로만 정하며 active ready 상태에서 native thread `cwd`와 일치한다. |
| Root relation | Package, app data, workspace와 controlled child root의 의미를 섞지 않고 unsafe overlap과 symlink를 거절한다. |
| Manual override | `CODEX_CHAT_WORKSPACE`는 development materializer의 caller-owned selection input일 뿐 Runtime root, app data 또는 별도 `cwd` authority가 아니다. |
| Data loss | `appDataRoot`가 사라져도 `RawMaterial`과 confirmed·settled product state를 workspace에서 다시 열 수 있다. |

Product factory는 Runtime spawn 전과 factory 내부에서 artifact·path를 다시 검증해 TOCTOU drift를 fail closed한다. Child environment는 controlled root와 필수 OS directory만으로 재구성하며 ambient credential·provider·`PYTHONPATH`·dynamic loader variable를 계승하지 않는다.

## 제품용 directory 구조

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

semester-workspace/
  AGENTS.md                  # 선택 사항, native instruction
  전공/
  교양/
  .agents/skills/             # 선택 사항, native Skills
  .ay-ple/
    workspace-state.json      # current durable v2 authority
    runtime-scratch/          # Run-bound transient workspace writes
```

이 tree는 소유권을 설명하는 layout이며 Codex-managed state의 내부 file roster를 product contract로 고정하지 않는다. AY-PLE는 기존 학기 폴더를 위 예시와 같이 재배치하도록 요구하지 않는다.

## Durable store와 rollback

Cutover 시점의 exact current `formatVersion: 2`는 첫 durable compatibility baseline이다. Server restart·public-surface cutover·app version rollback은 workspace-local confirmed state와 settled history를 삭제하지 않는다. Exact-decodable current v2는 original serialized bytes를 authority로 열고 startup에서 rewrite하지 않는다.

Unsupported·invalid bytes는 original entry를 보존한 `incompatible/readOnly`로 열고 empty state로 reset하지 않는다. Baseline 후 physical schema를 바꾸려면 explicit version bump와 migration을 제공하거나, 지원하지 않는 version을 bytes-preserving read-only로 거절한다. Generic migration·backup·signature framework는 실제 compatibility need 앞에서 만들지 않는다.

## 리스크와 대응

| 리스크 | 설명 | 대응 |
| --- | --- | --- |
| Artifact drift | Bundle file이 바뀌면 검토한 Runtime과 달라진다. | Spawn 전 canonical manifest와 complete tree digest를 fail closed로 검증한다. |
| Runtime-home pair 분리 | Custom home을 잘못 조합하면 auth·SQLite 수명과 복구 책임이 갈라진다. | Product composition이 explicit appDataRoot 아래 pair와 controlled roots를 함께 계산한다. |
| Workspace 오선택 | Environment가 explicit해도 사용자 의도와 다른 root를 고를 수 있다. | Server-owned chooser·development materializer가 selection을 소유하고 thread 재사용 전 sticky `cwd`를 검증한다. |
| Workspace authority drift | Registered TXT나 store가 Turn·Server 수명 중 바뀌면 stale authority로 덮어쓸 수 있다. | Source drift는 interrupt·explicit rebaseline, store drift는 compare-before-rename·explicit reactivation으로 원본을 보존한다. |
| 민감 상태 혼입 | `CODEX_HOME`을 workspace에 두면 auth·session·log가 사용자 자료와 섞인다. | App data에 runtime-home pair를 두고 workspace와 분리한다. |
| Host context 혼입 | Custom home만으로 ambient provider·environment가 모두 차단된다고 볼 수 없다. | Child environment를 allowlist로 재구성하고 exact local-provider에서 effective state를 검증한다. |
| Sandbox 과신 | Codex sandbox와 approval은 OS process 격리가 아니다. | Local personal-device 경계로 한정하고 cloud 전환 시 별도 threat model을 작성한다. |
| 권한 경계 혼동 | Native permission은 Codex execution을, `UserConfirmation`은 academic apply를 제어한다. | 어느 결정도 다른 결정을 암묵적으로 승인하지 않고 별도 identity·state로 다룬다. |

## 구현과 계획 연결

현재 횡단 topology와 검증 표면은 [Codex Chat 구현 지도](codex-chat-implementation-map.md), Runtime artifact·process의 package 동작은 [codex-chat-runtime README](../../packages/codex-chat-runtime/README.md), Server startup·store behavior는 [Server README](../../apps/server/README.md)가 소유한다. 후속 작업 순서와 완료 조건은 [개발 백로그](../product/ay-ple-development-backlog.md)에서만 관리한다.

## 근거 링크

| 주제 | 공식/확인 출처 |
| --- | --- |
| Codex App Server 용도, protocol, transport, schema generation | [Codex App Server](https://developers.openai.com/codex/app-server) |
| `CODEX_HOME`, `CODEX_SQLITE_HOME`, installer/auth environment variables | [Environment variables](https://developers.openai.com/codex/environment-variables) |
| `CODEX_HOME`의 config/auth/history/log 위치, project config 제한 | [Advanced configuration](https://developers.openai.com/codex/config-advanced) |
| `codex app-server` maturity와 CLI flags | [Command line options](https://developers.openai.com/codex/cli/reference) |
| Sandbox mode와 approval policy | [Sandbox](https://developers.openai.com/codex/concepts/sandboxing) |
