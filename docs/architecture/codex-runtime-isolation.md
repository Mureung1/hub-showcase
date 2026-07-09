# Codex Runtime Isolation Technical Note

작성일: 2026-07-07  
상태: Draft  
관련 문서: [AY-PLE Product Brief](../product/ay-ple-product-brief.md)

## 목적

AY-PLE가 Codex app-server를 MVP의 built-in local agent engine으로 사용할 때, 사용자의 전역 Codex 설치와 설정을 오염시키지 않는 실행 구조를 정리한다.

이 문서는 제품 기획 문서가 아니라 기술 조사/결정 메모다. 제품 기획서에는 "Codex app-server를 MVP runtime으로 사용한다" 정도만 남기고, 설치 방식, 상태 격리, sandbox, 인증 저장소, 패키징 리스크는 이 문서에서 관리한다.

## 결론

| 질문 | 현재 판단 |
| --- | --- |
| Codex를 전역 설치 없이 앱 내부에서 실행할 수 있는가? | 가능성이 높다. 현재 `@openai/codex` npm 패키지는 `codex` bin entry를 제공하며, 앱 dependency로 고정한 뒤 명시적 경로로 실행할 수 있다. |
| 로컬 설치만으로 전역 환경과 완전히 분리되는가? | 아니다. 로컬 설치는 binary/version 격리만 해결한다. 설정, 인증, 세션, 로그, skills는 별도 `CODEX_HOME`으로 분리해야 한다. |
| `CODEX_HOME`을 학기 workspace 안에 두면 되는가? | 기본값으로는 피한다. `auth.json` 같은 민감 상태가 섞일 수 있으므로 앱 전용 데이터 디렉터리에 둔다. |
| Codex sandbox가 OS 수준 격리까지 보장하는가? | 아니다. sandbox/approval은 Codex가 수행하는 작업의 경계를 줄이는 장치지만, 다중 사용자 cloud runtime 격리는 container, VM, 별도 OS user 같은 별도 경계가 필요하다. |
| MVP에서 app-server transport는 무엇이 적절한가? | `stdio`를 기본으로 둔다. WebSocket transport는 공식 문서상 experimental/unsupported이므로 MVP에서 외부 포트로 노출하지 않는다. |

## 확인한 근거

| 항목 | 확인 내용 |
| --- | --- |
| 현재 로컬 Codex | 조사 시점의 전역 Codex는 `codex-cli 0.142.5`였고, 사용자 홈 아래의 전역 shim을 통해 실행되고 있었다. |
| 현재 npm package metadata | `@openai/codex@0.142.5`, `bin.codex = bin/codex.js` |
| native package 구조 | optional dependency로 OS/architecture별 `@openai/codex-*-*` package를 사용한다. |
| 공식 manual 상태 | `openai-docs` helper 기준 local manual이 current 상태였다. |

## 격리 레이어 모델

| 레이어 | 수단 | 해결하는 문제 | 해결하지 못하는 문제 | MVP 방침 |
| --- | --- | --- | --- | --- |
| Binary/version | 앱 dependency의 `@openai/codex` exact pin, 명시적 bin path spawn | 사용자의 전역 `codex` 버전 변화와 분리 | Codex 상태, 인증, 세션 분리 | 필수 |
| Codex state root | `CODEX_HOME` | `config.toml`, `auth.json`, logs, sessions, skills, package metadata 분리 | OS process/file 권한 격리 | 필수 |
| SQLite state | `CODEX_SQLITE_HOME` 또는 `sqlite_home` config | SQLite-backed state 위치 분리 | 일반 파일 로그/인증 분리 | 필요 시 `CODEX_HOME` 하위로 고정 |
| Workspace | app-server turn의 `cwd`, AY-PLE workspace path | 에이전트가 읽고 바꿀 학기 작업환경 지정 | 인증/앱 설정 저장소 격리 | 학기 폴더와 runtime home을 분리 |
| Project config | workspace의 `.codex/config.toml` | 과목/workspace별 sandbox, MCP, skill 설정 일부 조정 | provider/auth/profile 같은 민감 설정 override | 고급 옵션으로 제한 |
| Skills | `.ay-ple/skills/`, `.agents/skills/ay-ple-*` projection | AY-PLE 업무 매뉴얼을 Codex가 읽게 함 | 인증/권한 격리 | 앱이 생성하고 관리 |
| Sandbox/approval | `workspace-write`, `read-only`, `on-request` 등 | Codex가 실행하는 명령과 파일 변경 경계 설정 | 악성 workspace에 대한 OS 수준 격리 | 기본은 `workspace-write + on-request` 검토 |
| Transport | `stdio://` app-server | 외부 포트 없이 local companion과 통신 | protocol 변경 리스크 | MVP 기본값 |
| OS/process 격리 | container, VM, 별도 OS user, 제한된 `HOME`/`PATH` | multi-user 또는 untrusted workspace의 강한 격리 | 제품 UX와 배포 복잡도 | MVP 범위 밖, cloud 전환 시 재검토 |

## 제안 디렉터리 구조

MVP npm 기반 로컬 웹앱에서는 사용자가 선택한 학기 폴더와 앱 runtime 상태를 분리한다.

```text
user-app-data/
  ay-ple/
    codex-home/
      config.toml
      auth.json
      logs/
      sessions/
      skills/
    sqlite/
    runtime-logs/

semester-workspace/
  semester-overview.md
  notes.md
  courses/
  .ay-ple/
    semester.json
    course-index.json
    tasks.json
    events.jsonl
    runs/
  .agents/
    skills/
      ay-ple-*/
```

중요한 원칙:

| 원칙 | 이유 |
| --- | --- |
| `CODEX_HOME`은 학기 workspace 밖에 둔다. | `auth.json`과 세션 로그가 사용자가 백업/공유하는 학기 자료에 섞이지 않게 한다. |
| 학기 workspace는 사용자가 이해할 수 있는 자료와 상태만 담는다. | AY-PLE를 삭제해도 학기 자료가 의미 있게 남아야 한다. |
| 앱이 Codex bin path를 직접 계산한다. | 전역 `PATH`의 `codex`가 우연히 호출되는 일을 막는다. |
| Codex config는 app-managed 영역과 user-editable 영역을 나눈다. | 사용자가 고급 설정을 바꾸더라도 인증/provider 설정이 섞이지 않게 한다. |

## app-server 실행 초안

```ts
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import path from 'node:path'

const appRoot = process.cwd()
const codexBin = process.platform === 'win32'
  ? path.join(appRoot, 'node_modules', '.bin', 'codex.cmd')
  : path.join(appRoot, 'node_modules', '.bin', 'codex')

const codexHome = path.join(process.env.HOME ?? appRoot, '.ay-ple', 'codex-home')
const codexSqliteHome = path.join(process.env.HOME ?? appRoot, '.ay-ple', 'codex-sqlite')

mkdirSync(codexHome, { recursive: true })
mkdirSync(codexSqliteHome, { recursive: true })

const child = spawn(codexBin, ['app-server', '--listen', 'stdio://'], {
  cwd: appRoot,
  stdio: ['pipe', 'pipe', 'inherit'],
  env: {
    ...process.env,
    CODEX_HOME: codexHome,
    CODEX_SQLITE_HOME: codexSqliteHome,
  },
})
```

실제 구현에서는 `process.cwd()` 대신 패키지 내부의 Codex binary 위치를 안정적으로 찾는 resolver가 필요하다. `npx ay-ple` 환경에서는 실행 위치와 패키지 설치 위치가 다를 수 있기 때문이다.

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

## Week 1 parity gate demo 기준

CodexRuntimeAdapter parity gate는 AY-PLE product-specific SourceSelection, StatePatch, Review, TrustedState 구현으로 넘어가기 전 Runtime Inspector에서 확인해야 하는 최소 기준이다.

| 항목 | Demo 기준 |
| --- | --- |
| Prompt lifecycle | 같은 Runtime Inspector에서 Fake와 Codex adapter 모두 prompt run을 시작하고 normalized `started`, `output_delta`, `completed` event와 run log를 확인한다. |
| Cancellation | Inspector의 기존 cancel 경로가 Codex run에 `turn/interrupt`를 보내고, matching `turn/completed` `interrupted` 흐름 또는 interrupt completion을 normalized `cancelled` 상태로 닫는다. |
| Failure mapping | missing binary/spawn, initialize, `thread/start`, `turn/start`, failed turn completion, terminal 전 notification stream 종료가 normalized `failed` 상태와 debug log로 남는다. |
| Log parity | Fake와 Codex 모두 `RuntimeRunLog`의 `status`, `events`, `output`, `error`, `debugLog` 구조를 사용하며 Codex generated type은 runtime-core, server, inspector로 노출하지 않는다. |
| Inspector state | cancel 또는 failure 뒤 Runtime Inspector history/log가 terminal 상태를 표시하고 해당 run이 `running`으로 남지 않는다. |

## 제품 문서와의 경계

| 제품 기획서에 남길 것 | 이 기술 메모가 소유할 것 |
| --- | --- |
| Codex app-server를 MVP agent runtime으로 사용한다. | app-server spawn 방식, transport, protocol schema 관리 |
| 사용자의 학기 자료는 로컬 workspace에 남는다. | `CODEX_HOME`과 학기 workspace 분리 |
| 사용자는 GUI에서 자료 업로드와 AI 상호작용을 한다. | local companion이 파일 변경과 app-server 이벤트를 중재하는 방식 |
| Codex 이후 Claude Code와 OSS runtime을 고려한다. | runtime adapter interface와 runtime별 상태 격리 정책 |

## 리스크와 대응

| 리스크 | 설명 | 대응 |
| --- | --- | --- |
| app-server maturity | CLI reference에서 `codex app-server`는 experimental로 표시된다. | exact pin, schema generation, smoke test, release note 확인을 필수화한다. |
| global Codex 호출 | `spawn('codex')`를 쓰면 전역 shim이 호출될 수 있다. | 앱 dependency의 bin path를 직접 resolve한다. |
| 민감 정보가 workspace에 섞임 | `CODEX_HOME`을 학기 폴더 안에 두면 auth/session이 자료 폴더에 들어갈 수 있다. | app data directory에 `CODEX_HOME`을 둔다. |
| optional native binary 누락 | Electron/Tauri/pkg 패키징에서 OS별 optional dependency가 빠질 수 있다. | 패키징 smoke test와 플랫폼별 bundle 검사를 추가한다. |
| sandbox 과신 | `CODEX_HOME`과 Codex sandbox는 container 수준 격리가 아니다. | local-first MVP는 개인 디바이스 전제로 두고, cloud/multi-user는 별도 threat model을 작성한다. |
| project config 오해 | `.codex/config.toml`은 일부 민감 설정을 override하지 못한다. | provider/auth/profile 설정은 app-managed `CODEX_HOME`에서 관리한다. |

## 다음 조사/구현 과제

| 우선순위 | 과제 | 산출물 |
| --- | --- | --- |
| P0 | package-owned Codex binary resolver 검증 | `npx ay-ple` 환경에서 전역 `codex`를 호출하지 않는 proof |
| P0 | app-managed `CODEX_HOME` 로그인/세션 UX 확인 | 전역 `~/.codex`와 분리된 로그인 플로우 |
| P0 | app-server stdio smoke test | `initialize`, `thread/start`, `turn/start` 최소 왕복 테스트 |
| P1 | pinned version schema generation | generated schema와 runtime adapter type |
| P1 | packaging 조사 | macOS desktop packaging 시 native Codex package 포함 확인 |
| P1 | security note | local-first MVP와 cloud/multi-user 전환 시 필요한 격리 경계 비교 |

## 근거 링크

| 주제 | 공식/확인 출처 |
| --- | --- |
| Codex app-server 용도, protocol, transport, schema generation | [Codex App Server](https://developers.openai.com/codex/app-server) |
| `CODEX_HOME`, `CODEX_SQLITE_HOME`, installer/auth environment variables | [Environment variables](https://developers.openai.com/codex/environment-variables) |
| `CODEX_HOME`의 config/auth/history/log 위치, project config 제한 | [Advanced configuration](https://developers.openai.com/codex/config-advanced) |
| `codex app-server` maturity와 CLI flags | [Command line options](https://developers.openai.com/codex/cli/reference) |
| sandbox mode와 approval policy | [Sandbox](https://developers.openai.com/codex/concepts/sandboxing) |
| npm package metadata | `npm view @openai/codex version bin optionalDependencies --json` 실행 결과 |
