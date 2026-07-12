# Codex Runtime 격리 기술 메모

작성일: 2026-07-07  
분류: 활성

성숙도: 채택

관련 문서: [Codex App Server 우선 사용 ADR](../adr/0005-use-codex-app-server-as-first-class-mvp-runtime.md), [제품 실행 경로 분리 ADR](../adr/0006-separate-package-app-data-and-semester-workspace-roots.md), [Runtime Harness 구현 지도](runtime-harness-implementation-map.md), [4주 개발 백로그](../product/ay-ple-development-backlog.md)

## 목적

AY-PLE가 Codex App Server를 built-in local agent engine으로 사용할 때 적용할 실행 격리 구조를 설명한다. [ADR 0006](../adr/0006-separate-package-app-data-and-semester-workspace-roots.md)이 root 소유권을 결정하고, 이 문서는 현재 Harness, 채택한 제품 목표와 아직 결정·구현하지 않은 후속 항목을 구분한다.

이 문서는 transport, 상태 격리, sandbox, 인증 저장소와 packaging risk 같은 저수준 기술 경계를 소유한다. 제품 문제와 작업 조합, 현재 package 동작, 우선순위는 각각 Product Brief, 구현 지도·package README, Development Backlog를 따른다.

## 현재, 제품 목표와 후속

| 영역 | 현재 Runtime Harness | 채택한 제품 목표 | 후속 |
| --- | --- | --- | --- |
| Codex binary | `@openai/codex@0.144.0` exact dependency의 조상 `node_modules/.bin/codex`를 찾는다. | `packageRoot`가 pinned Codex binary를 소유하고 전역 `PATH`를 사용하지 않는다. | packaged binary resolver와 플랫폼별 native dependency 포함 검증 |
| Codex state | repository `.ay-ple/runtime-codex/{codex-home,sqlite}`를 사용한다. 두 root는 독립 override가 가능하다. | OS `appDataRoot` 아래 하나의 `CODEX_HOME`·`CODEX_SQLITE_HOME` pair를 배치하고 함께 검증한다. | OS 기본 경로, override·migration과 학기 rollover 정책 |
| 작업 `cwd` | `CODEX_RUNTIME_CWD`가 없으면 server process의 `process.cwd()`를 사용한다. npm workspace 실행에서는 보통 `apps/server`다. | 사용자가 명시적으로 선택한 `workspaceRoot`를 새 thread의 `cwd`로 사용한다. | workspace chooser·registry와 재열기 UX |
| 학기 제품 상태 | 아직 구현하지 않았다. | RawMaterial과 확인된 학기 상태를 사용자 소유 `workspaceRoot`에서 다시 열 수 있게 한다. | 저장 schema와 workspace-local app state 경로 |
| Runtime history | repository `.ay-ple/runtime-harness/runs`에 developer-only 진단 기록을 저장한다. | 제품 상태나 WorkspaceHistory와 분리한다. | 제품 기록으로 재사용하기 전 allowlist·redaction 정책 |
| Native context | 기본 developer home에 file auth config를 보장한다. built-in Memories는 활성화하지 않았다. | native `AGENTS.md`·Skills discovery를 따르고, Memory는 명시적 설정과 실제 eligibility 확인 뒤 비권위적 맥락으로만 사용한다. | 실제 discovery 범위, auth UX, Memory 활성화와 rollover UX |
| Transport·sandbox | app-server `stdio`를 사용한다. 현재 Harness는 제품 sandbox·approval 정책을 고정하지 않는다. | local companion이 외부 port 없이 app-server를 소유한다. | 제품 기능에 맞춘 sandbox·approval과 cloud threat model |

현재 repository `.ay-ple/runtime-*`는 제품 경로의 미완성 구현이 아니라 developer-only Harness 기본값이다. 제품 layout을 도입해도 기존 Harness data를 미리 이전하지 않는다.

## 격리 레이어 모델

| 레이어 | 채택한 경계 | 보장하지 않는 것 |
| --- | --- | --- |
| Binary/version | 앱 dependency의 exact pin과 명시적 bin path로 전역 Codex 변화와 분리 | Codex state, 인증과 session 분리 |
| Runtime-home pair | app-managed `CODEX_HOME`과 `CODEX_SQLITE_HOME`을 함께 배치 | OS 권한 격리, 학기별 memory 격리, inherited host discovery 차단 |
| Workspace | 사용자가 선택한 SemesterWorkspace를 명시적 `cwd`로 전달 | 인증·runtime state 저장소 격리 |
| Native context | Codex의 `AGENTS.md`, Skills와 built-in Memories를 native 방식으로 사용 | 학업 사실의 정확성, 모든 작업의 memory 생성, descendant instruction 자동 로딩 |
| Sandbox·approval | Codex 동작 범위를 제품 기능에 맞게 제한 | container, VM 또는 별도 OS user 수준 보안 경계 |
| Transport | local companion이 `stdio://` app-server process를 소유 | protocol 변경과 packaging risk 제거 |

## 제품용 디렉터리 구조

아래 구조는 제품 실행의 소유권 경계를 나타낸다. 운영체제별 실제 앱 데이터 경로와 작업공간 등록 정보의 저장 형식은 제품 진입점을 구현할 때 확정한다.

```text
package-root/
  dist/
  node_modules/
    @openai/codex/

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

이 구조는 채택한 소유권을 보여주는 예시이며 실제 OS 경로와 workspace-local app state 이름은 아직 정하지 않았다. AY-PLE는 기존 학기 폴더를 위 구조로 재배치하도록 요구하지 않고 Codex-managed state의 내부 파일 배치에도 제품 계약을 두지 않는다.

## 제품 layout seam

제품 진입점은 아래 불변 조건을 한곳에서 검증해야 한다. 구체적인 함수명과 packaging API는 구현 시 정한다.

| 입력·결과 | 불변 조건 |
| --- | --- |
| `packageRoot` | 제품 상태를 쓰지 않으며 pinned Codex binary를 명시적으로 찾을 수 있다. |
| `appDataRoot` | `workspaceRoot` 밖에 있고 `CODEX_HOME`·`CODEX_SQLITE_HOME` pair를 함께 계산한다. |
| `workspaceRoot` | 사용자가 명시적으로 선택하며 새 thread의 `cwd`와 일치한다. |
| override | 계산된 layout을 명시적으로 바꾸는 수단이며 root 모델 자체를 대신하지 않는다. |
| data loss | `appDataRoot`가 사라져도 RawMaterial과 확인된 학기 상태를 `workspaceRoot`에서 다시 열 수 있다. |

## 리스크와 대응

| 리스크 | 설명 | 대응 |
| --- | --- | --- |
| global Codex 호출 | 전역 shim을 호출하면 앱이 검증한 version과 달라질 수 있다. | package-owned bin path를 명시적으로 resolve하고 version을 관측한다. |
| runtime-home pair 분리 | 현재 override는 두 root를 독립적으로 받아 custom/default hybrid가 가능하다. | 제품 layout seam에서 두 root를 함께 계산하고 검증한다. |
| 암묵적 `cwd` | 현재 기본값은 실행 위치에 따라 `apps/server`처럼 달라질 수 있다. | 제품에서는 명시적으로 선택한 `workspaceRoot`만 사용한다. |
| 민감 상태 혼입 | `CODEX_HOME`을 학기 폴더에 두면 auth/session/log가 사용자 자료와 섞인다. | OS app data directory에 runtime-home pair를 둔다. |
| optional native binary 누락 | desktop 또는 `npx` packaging에서 플랫폼별 dependency가 빠질 수 있다. | packaging smoke와 플랫폼별 bundle 검사를 추가한다. |
| host Skill·plugin 혼입 | custom `CODEX_HOME`만으로 inherited host `HOME` discovery가 모두 차단되지는 않는다. | 실제 child environment와 discovery 결과를 검증한 뒤 정책을 정한다. |
| 학기 사이 memory 혼입 | 하나의 runtime-home pair는 학기별 memory 격리를 자동 보장하지 않는다. | Memory를 학업 source of truth로 쓰지 않고 rollover UX를 별도로 결정한다. |
| sandbox 과신 | Codex sandbox와 approval은 OS process 격리가 아니다. | local personal-device 경계로 한정하고 cloud 전환 시 별도 threat model을 작성한다. |
| Harness 경로 오해 | repository `.ay-ple/runtime-*`는 제품 app data 배치가 아니다. | 구현 문서에서 developer-only임을 유지하고 제품 layout과 migration을 분리한다. |

## 구현과 계획 연결

현재 package 동작과 검증 명령은 [Runtime Harness 구현 지도](runtime-harness-implementation-map.md)와 [runtime-codex README](../../packages/runtime-codex/README.md)가 소유한다. 위 표의 후속 항목에 대한 우선순위, acceptance criteria와 일정은 [4주 개발 백로그](../product/ay-ple-development-backlog.md)에서만 관리한다.

## 근거 링크

| 주제 | 공식/확인 출처 |
| --- | --- |
| Codex app-server 용도, protocol, transport, schema generation | [Codex App Server](https://developers.openai.com/codex/app-server) |
| `CODEX_HOME`, `CODEX_SQLITE_HOME`, installer/auth environment variables | [Environment variables](https://developers.openai.com/codex/environment-variables) |
| `CODEX_HOME`의 config/auth/history/log 위치, project config 제한 | [Advanced configuration](https://developers.openai.com/codex/config-advanced) |
| `codex app-server` maturity와 CLI flags | [Command line options](https://developers.openai.com/codex/cli/reference) |
| sandbox mode와 approval policy | [Sandbox](https://developers.openai.com/codex/concepts/sandboxing) |
| npm package metadata | `npm view @openai/codex version bin optionalDependencies --json` 실행 결과 |
