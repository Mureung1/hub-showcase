# Codex Runtime 격리 기술 메모

작성일: 2026-07-07  
상태: 초안
관련 문서: [AY-PLE Product Brief](../product/ay-ple-product-brief.md), [4주 제품의 Codex App Server 우선 사용 ADR](../adr/0005-use-codex-app-server-as-first-class-mvp-runtime.md), [제품 실행 경로 분리 ADR](../adr/0006-separate-package-app-data-and-semester-workspace-roots.md)

## 목적

AY-PLE가 일반적인 Codex 사용 위에 얇은 제품 계층을 두고 Codex App Server를 MVP의 built-in local agent engine으로 사용할 때, 사용자의 전역 Codex 설치와 설정을 오염시키지 않는 실행 구조를 정리한다. 학기 작업공간의 `cwd`, Codex가 native로 읽는 `AGENTS.md`와 Skills, app-managed `CODEX_HOME`·`CODEX_SQLITE_HOME` pair의 built-in Memories를 함께 다루되 Codex 내부 상태를 학업 상태의 source of truth로 만들지 않는다.

이 문서는 제품 기획 문서가 아니라 기술 조사/결정 메모다. 제품 기획서는 사용자가 경험하는 학기 작업공간과 Codex-native 작업 조합을 설명하고, transport, 상태 격리, sandbox, 인증 저장소와 패키징 리스크 같은 저수준 세부사항은 이 문서에서 관리한다.

## 결론

| 질문 | 현재 판단 |
| --- | --- |
| Codex를 전역 설치 없이 앱 내부에서 실행할 수 있는가? | 가능성이 높다. 현재 `@openai/codex` npm 패키지는 `codex` bin entry를 제공하며, 앱 dependency로 고정한 뒤 명시적 경로로 실행할 수 있다. |
| 로컬 설치만으로 전역 환경과 완전히 분리되는가? | 아니다. 로컬 설치는 binary/version 격리만 해결한다. 설정, 인증, session, log와 memory state는 app-managed `CODEX_HOME`·`CODEX_SQLITE_HOME` pair로 분리한다. 다만 host `HOME`을 통한 native Skill·plugin discovery까지 자동으로 격리된다고 가정하지 않는다. |
| `CODEX_HOME`을 학기 workspace 안에 두면 되는가? | 기본값으로는 피한다. `auth.json` 같은 민감 상태가 섞일 수 있으므로 앱 전용 데이터 디렉터리에 둔다. |
| MVP에서 Codex가 마주하는 작업 범위는 어디인가? | 사용자가 선택한 `N학년 N학기` 폴더 전체를 `cwd`로 사용한다. 과목별 runtime home이나 고정 thread topology를 만들지 않는다. |
| `AGENTS.md`, Skills와 Memories를 앱 모델로 다시 구현하는가? | 아니다. Codex의 native 로딩과 built-in Memories를 사용한다. memory는 편의 맥락이며 확인된 학업 사실의 source of truth가 아니다. |
| 하나의 app-managed runtime-home pair가 학기끼리도 격리하는가? | 아니다. 전역 Codex와 AY-PLE를 분리할 뿐이다. MVP는 현재 학기 하나를 주로 사용하고, 학기 rollover 시 `CODEX_HOME`과 `CODEX_SQLITE_HOME`을 함께 다루는 memory 초기화·보관 정책은 후속으로 둔다. |
| Codex sandbox가 OS 수준 격리까지 보장하는가? | 아니다. sandbox/approval은 Codex가 수행하는 작업의 경계를 줄이는 장치지만, 다중 사용자 cloud runtime 격리는 container, VM, 별도 OS user 같은 별도 경계가 필요하다. |
| MVP에서 app-server transport는 무엇이 적절한가? | `stdio`를 기본으로 둔다. WebSocket transport는 공식 문서상 experimental/unsupported이므로 MVP에서 외부 포트로 노출하지 않는다. |

## 확인한 근거

| 항목 | 확인 내용 |
| --- | --- |
| 2026-07-07 조사 당시 전역 Codex | 전역 Codex는 `codex-cli 0.142.5`였고, 사용자 홈 아래의 전역 실행 연결 파일을 통해 실행되고 있었다. 이 값은 당시 관찰값이며 앱의 고정 버전이 아니다. |
| 2026-07-07 조사 당시 npm 패키지 정보 | `@openai/codex@0.142.5`, `bin.codex = bin/codex.js` |
| 현재 Runtime Harness 고정 버전 | `packages/runtime-codex`는 `@openai/codex@0.144.0`을 정확히 고정하고 같은 실행 파일에서 프로토콜 형식을 생성한다. |
| native package 구조 | optional dependency로 OS/architecture별 `@openai/codex-*-*` package를 사용한다. |
| 공식 manual 상태 | `openai-docs` helper 기준 local manual이 current 상태였다. |

## 현재 구현과 제품 목표의 차이

현재 경로는 제품 경로의 미완성 구현이 아니라 Runtime Harness를 위한 개발 기본값이다. 따라서 지금 저장소의 `.ay-ple/` 전체를 사용자 홈으로 옮기거나 기존 데이터를 이전할 필요는 없다. 제품 실행에서는 수명이 다른 세 루트를 명시적으로 분리한다. 아래 표에서 첫 행은 유지할 개발 경로이고, 나머지 세 행이 제품 실행 루트다.

| 루트 | 현재 또는 목표 역할 | 현재 판단 |
| --- | --- | --- |
| 저장소 작업공간의 `.ay-ple/runtime-*` | Runtime Harness의 Codex 상태와 Runtime Diagnostic History | 개발·테스트 전용 기본값으로 유지한다. |
| 패키지 설치 위치 | AY-PLE 코드와 버전을 고정한 Codex 실행 파일 | 제품 상태를 쓰지 않는 읽기 전용 또는 일시적 영역으로 취급한다. |
| 운영체제 앱 데이터 디렉터리 | 하나의 제품용 `CODEX_HOME`, `CODEX_SQLITE_HOME`, 인증·native session·log·memory 상태와 기기별 runtime 연결 정보 | 제품 진입점을 구현할 때 경로 배치 모듈이 계산한다. |
| 사용자가 선택한 학기 작업공간 | 사용자의 기존 학업 자료와 확인된 AY-PLE 학업 상태, Codex 작업 `cwd` | 사용자가 소유하고 백업·이동할 수 있는 제품 데이터 루트로 유지한다. 고정 `sources/` 구조를 강제하지 않는다. |

첫 제품 vertical은 테스트나 명시적 설정으로 주입한 세 root를 분리하는 최소 seam만 요구한다. `npx ay-ple` 배포 흐름에서 운영체제 기본 경로 resolver, override와 migration을 추가하며 환경 변수가 경로 구조 자체를 대신하지는 않는다. 결정 근거는 [ADR 0006](../adr/0006-separate-package-app-data-and-semester-workspace-roots.md)에 둔다.

## 격리 레이어 모델

| 레이어 | 수단 | 해결하는 문제 | 해결하지 못하는 문제 | MVP 방침 |
| --- | --- | --- | --- | --- |
| Binary/version | 앱 dependency의 `@openai/codex` exact pin, 명시적 bin path spawn | 사용자의 전역 `codex` 버전 변화와 분리 | Codex 상태, 인증, 세션 분리 | 필수 |
| Codex file state root | app-managed `CODEX_HOME` | `config.toml`, `auth.json`, logs, sessions, consolidated memory files와 package metadata를 사용자의 일반 Codex 환경에서 분리 | SQLite-backed state, OS process/file 권한, 학기별 상태 격리, host-level Skill·plugin discovery | 필수 pair의 첫 root |
| Codex SQLite state root | app-managed `CODEX_SQLITE_HOME` 또는 `sqlite_home` config | session DB와 memory Phase 1·job·usage state 위치를 분리 | 일반 파일 log·인증·consolidated memory file 분리 | 필수 pair의 둘째 root |
| Workspace | app-server turn의 `cwd`, 사용자가 선택한 학기 workspace path | 에이전트가 한 학기의 여러 과목 자료를 일반적인 repository처럼 읽고 작업하게 함 | 인증/앱 설정 저장소 격리 | `N학년 N학기` 폴더와 runtime home을 분리 |
| Instructions | Codex의 native `AGENTS.md` 탐색 | home과 project root에서 active `cwd`까지의 지시문을 Codex 방식으로 제공 | 학업 사실 저장, 결정적 정책 집행, `cwd` 아래 descendant 지시문의 자동 로딩 | 별도 상속기를 만들지 않고 실제 active cwd 기준을 문서화 |
| Project config | workspace의 `.codex/config.toml` | workspace별 sandbox, MCP, skill 설정 일부 조정 | provider/auth/profile 같은 민감 설정 override | 필요할 때 native 설정으로 추가 |
| Skills | app-managed home과 workspace의 native Skill 경로 | 반복 가능한 학업 작업 절차를 Codex가 읽게 함 | 구조화 argument 전달, 학업 상태 저장, inherited host `HOME`의 Skill·plugin discovery 격리 | native 로딩을 사용하되 실제 discovery 범위를 smoke로 확인 |
| Built-in Memories | app-managed `CODEX_HOME`·`CODEX_SQLITE_HOME` pair의 feature/config와 Codex-managed 상태 | eligibility를 만족하는 과거 작업에서 생성한 장기 맥락을 재사용 | 모든 작업의 memory 생성, `SemesterModel` 정확성, 학기별 격리, rollover 정책 | MVP에서 세 설정을 명시하고 live smoke 뒤 opt-in하되 source of truth로 사용하지 않음 |
| Sandbox/approval | `workspace-write`, `read-only`, `on-request` 등 | Codex가 실행하는 명령과 파일 변경 경계 설정 | 악성 workspace에 대한 OS 수준 격리 | 기본은 `workspace-write + on-request` 검토 |
| Transport | `stdio://` app-server | 외부 포트 없이 local companion과 통신 | protocol 변경 리스크 | MVP 기본값 |
| OS/process 격리 | container, VM, 별도 OS user, 제한된 `HOME`/`PATH` | multi-user 또는 untrusted workspace의 강한 격리 | 제품 UX와 배포 복잡도 | MVP 범위 밖, cloud 전환 시 재검토 |

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

학기 작업공간의 하위 폴더 이름은 예시일 뿐이다. AY-PLE는 기존 학기 폴더를 열어 사용하는 경험을 우선하며 위 구조로 자료 이동을 요구하지 않는다. Codex가 관리하는 memory 파일의 구체적인 내부 배치에도 제품 계약을 두지 않는다.

중요한 원칙:

| 원칙 | 이유 |
| --- | --- |
| 패키지 설치 위치에는 사용자 상태를 쓰지 않는다. | `npx` 캐시나 재설치로 패키지 경로가 바뀌어도 제품 데이터가 사라지지 않게 한다. |
| `CODEX_HOME`은 학기 workspace 밖에 둔다. | `auth.json`과 세션 로그가 사용자가 백업/공유하는 학기 자료에 섞이지 않게 한다. |
| 학기 workspace는 사용자가 이해할 수 있는 자료와 상태만 담는다. | AY-PLE를 삭제해도 학기 자료가 의미 있게 남아야 한다. |
| 학기 workspace 루트를 Codex `cwd`로 사용한다. | 여러 과목을 한 번에 조회하는 일반적인 Codex 사용을 보존하고 과목별 환경 전환 오버헤드를 만들지 않는다. |
| `AGENTS.md`, Skills와 Memories는 Codex native 동작을 사용한다. | 앱이 별도 agent framework와 context inheritance를 만들어 Codex 업데이트 경로를 가로막지 않게 한다. Semester root `cwd` 아래의 nested `AGENTS.md`가 자동 로드된다고 가정하지 않는다. |
| memory를 제품 source of truth로 사용하지 않는다. | memory 생성·검색은 Codex가 소유하는 비결정적 편의 기능이며 사용자 확인과 학업 상태 계약을 대신하지 않는다. |
| 앱이 Codex bin path를 직접 계산한다. | 전역 `PATH`의 `codex`가 우연히 호출되는 일을 막는다. |
| Codex config는 app-managed 영역과 user-editable 영역을 나눈다. | 사용자가 고급 설정을 바꾸더라도 인증/provider 설정이 섞이지 않게 한다. |
| 앱 데이터가 사라져도 학기 상태를 다시 열 수 있어야 한다. | Codex 세션과 `thread` 참조를 SemesterModel 또는 WorkspaceHistory의 source of truth로 만들지 않는다. |

## app-server 실행 초안

아래 코드는 현재 API가 아니라 제품 진입점이 가져야 할 경계의 초안이다. `resolveProductRuntimeLayout`이 운영체제 기본값과 재정의를 한곳에서 처리하고, `selectedWorkspaceRoot`는 UI 또는 `--workspace`로 명시적으로 선택한다.

```ts
import { spawn } from 'node:child_process'
import { resolvePackagedCodexBin } from './codex-binary.js'
import { resolveProductRuntimeLayout } from './runtime-layout.js'

const layout = resolveProductRuntimeLayout({
  workspaceRoot: selectedWorkspaceRoot,
  appDataRootOverride: process.env.AY_PLE_DATA_DIR,
})

const child = spawn(resolvePackagedCodexBin(), ['app-server', '--listen', 'stdio://'], {
  cwd: layout.workspaceRoot,
  stdio: ['pipe', 'pipe', 'inherit'],
  env: {
    ...process.env,
    CODEX_HOME: layout.codexHome,
    CODEX_SQLITE_HOME: layout.codexSqliteHome,
  },
})
```

현재 Runtime Harness는 저장소 작업공간을 기준으로 명시적인 개발 경로를 계속 사용한다. 첫 제품 vertical은 테스트나 명시적 설정이 주입한 세 root를 받는 최소 layout seam부터 추가한다. 운영체제 기본값, override·migration과 `npx ay-ple` 패키징 resolver는 그 뒤에 구현하며, 단순히 환경 변수 몇 개로 기존 경로를 전역 치환하지 않는다.

## Runtime policy 초안

| 항목 | MVP 기본값 | 이유 |
| --- | --- | --- |
| Codex package version | exact pin | app-server protocol과 native package 포함 여부를 고정한다. |
| app-server transport | `stdio://` | localhost port 노출 없이 local companion이 직접 통신한다. |
| WebSocket transport | 사용하지 않음 | 공식 문서상 experimental/unsupported이며 인증 설정 실수가 위험하다. |
| Schema generation | pinned version마다 `generate-ts` 또는 `generate-json-schema` 실행 | app-server protocol 변경을 빌드 타임에 드러낸다. |
| Sandbox | `workspace-write` 후보 | 학기 workspace 안의 파일 반영은 허용하되 경계를 유지한다. |
| Approval policy | `on-request` 후보 | 파일 대량 변경, 외부 연동, sandbox 초과 행동을 사용자 승인으로 묶는다. |
| Auth storage | app-managed `CODEX_HOME` | 전역 `~/.codex`와 섞이지 않게 한다. |
| Semester workspace | 사용자 선택 폴더 | 자료 소유권과 장기 보존성을 유지한다. |
| Codex `cwd` | 선택한 학기 workspace root | 전공·교양·과목을 가로지르는 작업과 기존 폴더 사용 방식을 유지한다. |
| Instructions / Skills | native `AGENTS.md`와 Skill 로딩 | Codex의 기존 context composition과 업데이트 이점을 유지한다. |
| Built-in Memories | `[features] memories = true`와 `[memories]`의 생성·사용을 명시한 뒤 eligibility·auth smoke | 조건을 만족하는 작업의 맥락을 한 학기 동안 재사용하되 정확성 계약으로 삼지 않는다. 현재 launcher에는 아직 미구현이다. |
| Thread topology | 고정하지 않음 | 작업마다 native thread를 시작하거나 필요할 때 재개하며 학기·과목·run과 일대일 대응시키지 않는다. |

## 제품 문서와의 경계

| 제품 기획서에 남길 것 | 이 기술 메모가 소유할 것 |
| --- | --- |
| Codex App Server를 4주 우선 지원 에이전트 실행 엔진으로 사용한다. | App Server 실행 방식, 전송 방식, 프로토콜 스키마, 업그레이드 관리 |
| 사용자의 학기 자료는 로컬 workspace에 남는다. | `CODEX_HOME`과 학기 workspace 분리 |
| 선택한 학기 workspace를 Codex가 일반적인 작업 폴더처럼 사용한다. | `cwd`, app-managed runtime home, native instructions·Skills·memory 설정의 배치 |
| 사용자는 GUI에서 자료와 반복 작업을 선택하고 결과를 검토한다. | local companion이 선택 자료를 mention으로, recipe를 Skill·rendered prompt·`outputSchema`로 조합하는 방식 |
| ACP, Claude Code와 OSS 실행 엔진 중립화는 캠프 이후 실제 두 번째 엔진 요구가 생길 때 검토한다. | 현재 Codex 실행 상태 격리와 향후 어댑터가 지켜야 할 격리 조건 |

## 리스크와 대응

| 리스크 | 설명 | 대응 |
| --- | --- | --- |
| app-server maturity | CLI reference에서 `codex app-server`는 experimental로 표시된다. | exact pin, schema generation, smoke test, release note 확인을 필수화한다. |
| global Codex 호출 | `spawn('codex')`를 쓰면 전역 shim이 호출될 수 있다. | 앱 dependency의 bin path를 직접 resolve한다. |
| 민감 정보가 workspace에 섞임 | `CODEX_HOME`을 학기 폴더 안에 두면 auth/session이 자료 폴더에 들어갈 수 있다. | app data directory에 `CODEX_HOME`을 둔다. |
| optional native binary 누락 | Electron/Tauri/pkg 패키징에서 OS별 optional dependency가 빠질 수 있다. | 패키징 smoke test와 플랫폼별 bundle 검사를 추가한다. |
| sandbox 과신 | `CODEX_HOME`과 Codex sandbox는 container 수준 격리가 아니다. | local-first MVP는 개인 디바이스 전제로 두고, cloud/multi-user는 별도 threat model을 작성한다. |
| project config 오해 | `.codex/config.toml`은 일부 민감 설정을 override하지 못한다. | provider/auth/profile 설정은 app-managed `CODEX_HOME`에서 관리한다. |
| host Skill·plugin 혼입 | app-managed `CODEX_HOME`을 사용해도 inherited host `HOME`의 개인 Skill이나 plugin이 발견될 수 있다. | child environment와 native discovery 결과를 smoke로 고정하고, 필요한 격리 정책은 그 근거 위에서 결정한다. |
| 학기 사이 memory 혼입 | 하나의 app-managed runtime-home pair를 여러 학기에 계속 쓰면 이전 학기 memory가 검색될 수 있다. | MVP는 현재 학기 하나를 주 사용 범위로 두고, 학기 전환 기능을 만들 때 두 root의 초기화·보관·분류 정책과 UX를 함께 결정한다. memory를 학업 상태의 source of truth로 사용하지 않는다. |
| native context를 앱 모델로 중복 구현 | 별도 instructions/Skills/memory 계층을 만들면 Codex 로딩 규칙과 어긋나고 유지 비용이 생긴다. | native `AGENTS.md`, Skills와 built-in Memories를 사용하고 제품은 실행 조합과 검토 상태만 소유한다. |
| Harness 저장 위치를 제품 기본값으로 오해 | 현재 작업공간 내부 `.ay-ple/runtime-codex/*`는 저장소 개발용이며 제품용 Codex 상태 경로가 아니다. | 현재 경로는 유지한다. `npx ay-ple` 또는 실제 학기 작업공간 활성화 시 경로 배치 모듈, 재정의 정책과 경로 검증을 함께 구현한다. |

## 격리 조사/구현 상태

| 우선순위 | 상태 | 과제 | 산출물 |
| --- | --- | --- | --- |
| P0 | 후속 | app-managed runtime-home pair 로그인/session UX 확인 | 전역 `~/.codex`와 분리된 로그인 플로우와 paired SQLite state |
| P0 | 후속 | 학기 workspace activation과 native context smoke | 선택한 학기 root가 `cwd`가 되고 native `AGENTS.md`·Skill discovery와 opt-in Memories eligibility를 확인한 제품 실행 증거 |
| P0 | 완료 | app-server stdio smoke와 parity gate | Package smoke가 `initialize`/`initialized`를, server parity gate가 `thread/start`, `turn/start`, prompt completion과 cancellation을 검증 |
| P1 | 완료 | pinned version schema generation | `@openai/codex@0.144.0` exact pin, `generate:codex-types`, generated internal TypeScript contract |
| P1 | 후속 | packaging 조사 | macOS desktop packaging 시 native Codex package 포함 확인 |
| P1 | 후속 | native Skill·plugin discovery smoke | app-managed `CODEX_HOME`과 inherited host `HOME`에서 실제로 발견되는 Skill·plugin 범위를 기록하고 제품 격리 주장을 고정 |
| P1 | 후속 | security note | local-first MVP와 cloud/multi-user 전환 시 필요한 격리 경계 비교 |
| P2 | 후속 | 패키징용 OS 기본 경로 resolver와 migration | `npx ay-ple` 또는 desktop packaging 시 app data 기본값, 패키지가 소유한 Codex 실행 파일 경로, `AY_PLE_DATA_DIR`, 기존 상태 migration과 사용자 경로 진단 |
| P2 | 후속 | 학기 rollover memory 정책 | 새 학기 시작 시 `CODEX_HOME`과 `CODEX_SQLITE_HOME`의 memory 초기화·보관·분류 중 어떤 UX를 제공할지 결정 |

## 근거 링크

| 주제 | 공식/확인 출처 |
| --- | --- |
| Codex app-server 용도, protocol, transport, schema generation | [Codex App Server](https://developers.openai.com/codex/app-server) |
| `CODEX_HOME`, `CODEX_SQLITE_HOME`, installer/auth environment variables | [Environment variables](https://developers.openai.com/codex/environment-variables) |
| `CODEX_HOME`의 config/auth/history/log 위치, project config 제한 | [Advanced configuration](https://developers.openai.com/codex/config-advanced) |
| `codex app-server` maturity와 CLI flags | [Command line options](https://developers.openai.com/codex/cli/reference) |
| sandbox mode와 approval policy | [Sandbox](https://developers.openai.com/codex/concepts/sandboxing) |
| npm package metadata | `npm view @openai/codex version bin optionalDependencies --json` 실행 결과 |
