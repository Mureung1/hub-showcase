# Codex Runtime 격리 기술 메모

작성일: 2026-07-07

최근 갱신: 2026-07-18

분류: 활성

성숙도: 채택

관련 문서: [Codex App Server 우선 사용 ADR](../adr/0005-use-codex-app-server-as-first-class-mvp-runtime.md), [제품 실행 경로 분리 ADR](../adr/0006-separate-package-app-data-and-semester-workspace-roots.md), [Official Codex Python SDK Chat Shell ADR](../adr/0011-reuse-official-codex-python-sdk-for-chat-shell.md), [Codex Chat-only cutover ADR](../adr/0012-adopt-codex-chat-only-and-remove-legacy-runtime-surfaces.md), [macOS-first 제품 경로 ADR](../adr/0009-use-a-macos-first-local-web-app-product-path.md), [Codex Chat 구현 지도](codex-chat-implementation-map.md), [개발 백로그](../product/ay-ple-development-backlog.md)

## 목적

AY-PLE가 Codex App Server를 built-in local agent engine으로 사용할 때 runtime artifact, process environment, native state와 사용자 SemesterWorkspace를 어떻게 분리하는지 설명한다. [ADR 0006](../adr/0006-separate-package-app-data-and-semester-workspace-roots.md)이 root 소유권을 결정하고, 이 문서는 현재 Codex Chat 구현, 채택한 제품 목표와 아직 결정·구현하지 않은 후속 항목을 구분한다.

Transport, 상태 격리, sandbox, 인증 저장소와 packaging risk 같은 저수준 기술 경계는 이 문서가 소유한다. 제품 문제와 작업 조합, 현재 package 동작, 우선순위는 각각 Product Brief, 구현 지도·package README, Development Backlog를 따른다.

## 현재 구현, 제품 목표와 후속

| 영역 | 현재 Codex Chat 구현 | 채택한 제품 목표 | 후속 |
| --- | --- | --- | --- |
| Runtime stack | `@ay-ple/codex-chat-runtime`이 exact official source, generated SDK, standalone CPython과 native `0.144.4`를 canonical manifest로 검증한 뒤 package-local bundle만 시작한다. | App package가 exact Python·SDK·native runtime과 provenance를 함께 소유한다. | 지원 platform별 artifact, signing·notarization과 atomic update/rollback |
| Runtime state | Server가 explicit `CODEX_CHAT_RUNTIME_HOME`, `CODEX_CHAT_CODEX_HOME`, `CODEX_CHAT_SQLITE_HOME`, `CODEX_CHAT_TEMP_DIR`을 서로 다른 writable non-symlink directory로 검증한다. | `appDataRoot` 아래 하나의 app-managed runtime-home pair와 관련 runtime state를 배치한다. | macOS 기본 app data 경로, account/auth UX, override·migration과 학기 rollover 정책 |
| 작업 `cwd` | `CODEX_CHAT_WORKSPACE`로 받은 explicit absolute non-symlink directory를 native thread의 workspace로 사용한다. | 사용자가 명시적으로 선택한 `workspaceRoot`를 새 thread의 `cwd`로 사용한다. | Workspace chooser·registry와 재열기 UX |
| 학기 제품 상태 | 아직 구현하지 않았다. Browser transcript는 tab memory에만 있고 native session은 Codex-owned state다. | RawMaterial과 확인된 학기 상태를 사용자 소유 `workspaceRoot`에서 다시 열 수 있게 한다. | 저장 schema와 workspace-local app state 경로 |
| Native context | Controlled homes와 fixed `PATH`만 child에 전달한다. Workspace의 native `AGENTS.md`·Skills는 Codex가 발견하며 ambient host credential/provider로 fallback하지 않는다. | Native instruction·Skills를 따르고 Memory는 명시적 설정과 eligibility 확인 뒤 비권위적 맥락으로만 사용한다. | 실제 discovery 범위, Memory 활성화와 rollover UX |
| Transport·policy | Local companion이 detached Node→Python→App Server process tree를 supervise하고 thread/turn마다 `deny_all + read_only`를 보낸다. Exact local-provider gate가 effective `never + readOnly`, network disabled를 확인한다. | 기능에 필요한 최소 policy를 명시하고 제품 UI에는 browser-safe event만 전달한다. | Interactive approval UX, unexpected request defense와 cloud threat model |

현재 Chat은 legacy env, repository `.ay-ple`, `process.cwd()`, system Python, source checkout과 ambient `PATH`를 runtime fallback으로 사용하지 않는다. Current canonical clone에서는 [ADR 0012](../adr/0012-adopt-codex-chat-only-and-remove-legacy-runtime-surfaces.md)의 exact seven-root residue를 별도 precheck 뒤 migration이나 data rollback 없이 영구 삭제했다. 이 handoff는 다른 clone·external root를 정리하지 않으며 install·start·runtime command에 자동 cleanup 책임을 추가하지 않는다.

## 격리 레이어 모델

| 레이어 | 채택한 경계 | 보장하지 않는 것 |
| --- | --- | --- |
| Runtime/version | Canonical manifest로 검증한 package-owned Python·SDK·native runtime artifact만 사용 | Codex state, 인증과 session 분리 |
| Runtime environment | Inherited environment 대신 explicit `HOME`, Codex homes, temp와 fixed executable path를 전달 | Container, VM 또는 별도 OS user 수준 격리 |
| Runtime-home pair | App-managed `CODEX_HOME`과 `CODEX_SQLITE_HOME`을 함께 배치 | 학기별 memory 격리와 사용자 자료 보존 |
| Workspace | 사용자가 선택한 SemesterWorkspace를 명시적 native `cwd`로 전달 | 인증·runtime state 저장소 격리 |
| Native context | Codex의 `AGENTS.md`, Skills와 opt-in Memories를 native 방식으로 사용 | 학업 사실의 정확성, 모든 작업의 memory 생성, descendant instruction 자동 로딩 |
| Sandbox·approval | Current Chat은 `deny_all + read_only`를 explicit하게 보내고 effective state를 provider-free gate로 검증 | OS process 보안 경계와 interactive approval UX |
| Transport | Local companion이 private Node↔Python NDJSON과 `stdio://` App Server process를 소유 | Protocol 변경과 packaging risk 제거 |

## 현재 Chat configuration seam

| 입력 | 현재 불변 조건 |
| --- | --- |
| `CODEX_CHAT_RUNTIME_ROOT` | Canonical manifest와 complete bundle tree를 검증할 explicit absolute root다. Missing·extra·digest drift는 repair하지 않고 실패한다. |
| `CODEX_CHAT_WORKSPACE` | Readable/executable absolute non-symlink directory이며 native thread workspace다. |
| `CODEX_CHAT_RUNTIME_HOME` | Isolated child `HOME`으로 사용할 writable absolute non-symlink directory다. |
| `CODEX_CHAT_CODEX_HOME` | Isolated `CODEX_HOME`으로 사용할 writable absolute non-symlink directory다. |
| `CODEX_CHAT_SQLITE_HOME` | Isolated `CODEX_SQLITE_HOME`으로 사용할 writable absolute non-symlink directory다. |
| `CODEX_CHAT_TEMP_DIR` | Isolated temporary directory로 사용할 writable absolute non-symlink directory다. |

네 controlled directory는 서로 distinct해야 한다. Complete configuration은 process spawn 전에 한 번 preflight하고 runtime factory가 TOCTOU drift를 막기 위해 bundle과 path를 다시 검증한다. Server entrypoint는 caller environment를 local `.env`보다 우선하며 `PORT` 미지정 시 `3000`을 사용하지만, 이는 여섯 runtime path 자체의 fallback을 만들지 않는다.

## 제품용 디렉터리 구조

아래 구조는 [ADR 0006](../adr/0006-separate-package-app-data-and-semester-workspace-roots.md)이 채택한 제품 실행의 소유권 경계를 나타낸다. macOS의 실제 app data 경로와 작업공간 등록 정보의 저장 형식은 제품 진입점을 구현할 때 확정한다.

```text
package-root/
  dist/
  runtime/
    python/
    openai-codex-sdk/
    codex/

user-app-data/
  ay-ple/
    workspace-registry/
    codex/
      home/
        config.toml
        auth.json
        logs/
        sessions/
        skills/
        <Codex-managed memory state>/
      sqlite/
    runtime-logs/

semester-workspace/
  AGENTS.md                    # 선택 사항, Codex native instruction
  전공/                        # 사용자의 기존 분류 예시
    과목-A/
  교양/
    과목-B/
  .agents/
    skills/                    # 선택 사항, workspace-local native Skills
  .ay-ple/
    <app-managed product state> # 저장 형식과 경로는 구현 PRD에서 결정
```

이 구조는 채택한 소유권을 보여주는 예시이며 현재 여섯 environment path의 default layout을 선언하지 않는다. AY-PLE는 기존 학기 폴더를 위 구조로 재배치하도록 요구하지 않고 Codex-managed state의 내부 파일 배치에도 제품 계약을 두지 않는다.

## 제품 layout seam

제품 진입점은 아래 불변 조건을 한곳에서 검증해야 한다. 구체적인 함수명과 packaging API는 구현 시 정한다.

| 입력·결과 | 불변 조건 |
| --- | --- |
| `packageRoot` | 제품 상태를 쓰지 않으며 exact Python·SDK·Codex runtime artifact를 명시적으로 찾을 수 있다. |
| `appDataRoot` | `workspaceRoot` 밖에 있고 `CODEX_HOME`·`CODEX_SQLITE_HOME` pair를 함께 계산한다. |
| `workspaceRoot` | 사용자가 명시적으로 선택하며 새 thread의 `cwd`와 일치한다. |
| override | 계산된 layout을 명시적으로 바꾸는 수단이며 root 모델 자체를 대신하지 않는다. |
| data loss | `appDataRoot`가 사라져도 RawMaterial과 확인된 학기 상태를 `workspaceRoot`에서 다시 열 수 있다. |

[ADR 0009](../adr/0009-use-a-macos-first-local-web-app-product-path.md)에 따라 공용 bridge protocol은 운영체제 지원 guard를 소유하지 않는다. 실제 제품 local companion entrypoint 한곳에서 macOS 실행 경계와 bundled Python·SDK·native runtime artifact를 검증하며, current package에 다른 운영체제용 launcher 분기를 두지 않는다.

## 리스크와 대응

| 리스크 | 설명 | 대응 |
| --- | --- | --- |
| Artifact drift | Bundle의 일부 file이나 native executable이 바뀌면 검토한 runtime과 달라진다. | Spawn 전에 canonical manifest와 complete tree digest를 fail closed로 검증한다. |
| Runtime-home pair 분리 | Custom home을 잘못 조합하면 auth·SQLite 수명과 복구 책임이 갈라진다. | Current config는 각 directory를 distinct하게 검증하고 제품 layout seam은 pair를 함께 계산한다. |
| Workspace 오선택 | Environment가 explicit해도 사용자가 의도하지 않은 workspace를 지정할 수 있다. | 제품에서는 chooser·registry가 선택을 소유하고 기존 thread 재사용 전 sticky `cwd`를 검증한다. |
| 민감 상태 혼입 | `CODEX_HOME`을 학기 폴더에 두면 auth/session/log가 사용자 자료와 섞인다. | OS app data directory에 runtime-home pair를 두고 workspace와 분리한다. |
| Python 또는 native artifact 누락 | Local companion 배포에서 interpreter·SDK·Codex runtime 중 하나가 빠질 수 있다. | Production verifier와 macOS packaging smoke, provenance 검사를 사용한다. |
| Host context 혼입 | Custom `CODEX_HOME`만으로 inherited environment나 provider 설정이 모두 차단된다고 볼 수 없다. | Child environment를 allowlist로 재구성하고 exact local-provider에서 effective state를 검증한다. |
| 학기 사이 memory 혼입 | 하나의 runtime-home pair는 학기별 memory 격리를 자동 보장하지 않는다. | Memory를 학업 source of truth로 쓰지 않고 활성화·rollover UX를 별도로 결정한다. |
| Sandbox 과신 | Codex sandbox와 approval은 OS process 격리가 아니다. | Local personal-device 경계로 한정하고 cloud 전환 시 별도 threat model을 작성한다. |
| Local residue 오해 | Current clone의 completed deletion을 다른 clone·external root의 정리나 자동 migration으로 일반화할 수 있다. | Install·start·runtime command는 cleanup을 수행하지 않는다. 다른 위치는 clone-specific inventory와 별도 승인 없이는 건드리지 않는다. |

## 구현과 계획 연결

현재 횡단 topology와 검증 표면은 [Codex Chat 구현 지도](codex-chat-implementation-map.md), runtime artifact와 process의 package 동작은 [codex-chat-runtime README](../../packages/codex-chat-runtime/README.md), Server configuration은 [server README](../../apps/server/README.md)가 소유한다. 후속 항목의 작업 순서, 상태와 완료 조건은 [개발 백로그](../product/ay-ple-development-backlog.md)에서만 관리한다.

## 근거 링크

| 주제 | 공식/확인 출처 |
| --- | --- |
| Codex App Server 용도, protocol, transport, schema generation | [Codex App Server](https://developers.openai.com/codex/app-server) |
| `CODEX_HOME`, `CODEX_SQLITE_HOME`, installer/auth environment variables | [Environment variables](https://developers.openai.com/codex/environment-variables) |
| `CODEX_HOME`의 config/auth/history/log 위치, project config 제한 | [Advanced configuration](https://developers.openai.com/codex/config-advanced) |
| `codex app-server` maturity와 CLI flags | [Command line options](https://developers.openai.com/codex/cli/reference) |
| Sandbox mode와 approval policy | [Sandbox](https://developers.openai.com/codex/concepts/sandboxing) |
