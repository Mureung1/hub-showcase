# SemesterOps Runtime Ownership Spike Plan

작성일: 2026-07-07
상태: Draft
브랜치: `codex/runtime-ownership-spike-plan`
실행 산출물: [Runtime Ownership Spike Report](../../../spikes/codex-runtime-ownership/spike-report.md)

## 목적

이번 spike는 SemesterOps의 학기관리 기능을 검증하지 않는다. 목표는 **SemesterOps가 Codex 실행환경을 전역 설치와 분리해서 소유할 수 있는지** 확인하는 것이다.

핵심 질문:

> 전역 `codex`와 전역 `~/.codex`에 의존하지 않고, spike-local `@openai/codex` binary, app-managed `CODEX_HOME`, ChatGPT subscription OAuth, stdio app-server handshake까지 제어할 수 있는가?

## 범위

| 구분 | 포함 여부 | 설명 |
| --- | --- | --- |
| spike-local `@openai/codex` 설치 | 포함 | exact pin으로 Codex version을 고정한다. |
| fake global `codex` 검증 | 포함 | `PATH` 앞에 가짜 `codex`를 둬도 local binary가 실행되어야 한다. |
| app-managed `CODEX_HOME` | 포함 | 전역 `~/.codex` 대신 spike runtime home을 사용한다. |
| file-based auth store | 포함 | `cli_auth_credentials_store = "file"`로 `auth.json` 생성 위치를 관찰한다. |
| ChatGPT subscription OAuth | 포함 | `codex login` 또는 필요 시 `codex login --device-auth`로 사용자가 직접 로그인한다. |
| app-server ping-pong smoke run | 포함 | 실제 작업 없이 `initialize` 수준의 protocol handshake를 확인한다. |
| 한국어 spike report | 포함 | 실행 결과와 남은 리스크를 `spike-report.md`에 기록한다. |
| 실제 학기 task 수행 | 제외 | agent 능력 검증은 다음 단계다. |
| GUI | 제외 | runtime ownership 이후 결정한다. |
| 파일 변경 workflow | 제외 | 이번 smoke run은 실제 작업을 시키지 않는다. |

## 성공 기준

| 기준 | 성공 조건 |
| --- | --- |
| Binary ownership | fake global `codex`가 `PATH` 앞에 있어도 spike-local Codex binary가 실행된다. |
| Version ownership | 실행된 Codex version이 spike `package.json`에 pin된 `@openai/codex` version과 일치한다. |
| State ownership | `CODEX_HOME`이 spike runtime 디렉터리로 지정되고, 필요한 config/log/auth 상태가 그 안에 생긴다. |
| Subscription auth proof | ChatGPT OAuth 이후 app-managed `CODEX_HOME/auth.json`이 생성된다. |
| Non-destructive global check | 전역 `~/.codex`는 rename, delete, chmod 없이 전후 snapshot만 관찰한다. |
| App-server lifecycle | local pinned binary로 `codex app-server --listen stdio://`를 시작하고, `initialize` handshake가 성공한다. |
| Report | `spike-report.md`에 실행 결과, 관찰 증거, 실패/잔여 리스크가 한국어로 기록된다. |

## 실패 기준

| 실패 조건 | 의미 |
| --- | --- |
| local `@openai/codex` binary를 안정적으로 찾지 못한다. | 앱이 runtime binary를 소유하지 못한다. |
| fake global `codex`가 호출된다. | 전역 설치에 의존한다. |
| pin된 version과 실행 version이 다르다. | version ownership이 없다. |
| `CODEX_HOME`을 지정하지 않으면 안 되거나, 지정해도 무시된다. | state ownership이 없다. |
| OAuth 결과가 app-managed `CODEX_HOME/auth.json`으로 남지 않는다. | subscription auth proof가 없다. |
| 인증 이후 app-server initialize가 실패한다. | built-in engine의 최소 lifecycle을 제어하지 못한다. |
| spike가 전역 `~/.codex`에 새 파일이나 변경을 만든다. | 비파괴적 격리 원칙을 위반한다. |

실제 agent가 학기 자료를 잘 정리하지 못하거나, 응답 품질이 낮거나, 파일 변경 workflow가 미완성인 것은 이번 spike의 실패가 아니다.

## 제안 디렉터리

```text
spikes/
  codex-runtime-ownership/
    package.json
    README.md
    spike-report.md
    .gitignore
    src/
      run-spike.ts
```

런타임 중 생성되는 민감/임시 파일은 commit하지 않는다.

```text
spikes/
  codex-runtime-ownership/
    runtime/
      codex-home/
        config.toml
        auth.json
        log/
        sessions/
      fake-bin/
        codex
      snapshots/
```

## Script 설계

| Script | 역할 |
| --- | --- |
| `npm run prepare` | runtime directory, fake global `codex`, app-managed `CODEX_HOME/config.toml`을 만든다. |
| `npm run login` | local pinned binary로 `codex login`을 실행한다. 필요 시 device auth 안내를 출력한다. |
| `npm run verify` | version, `auth.json`, 전역 snapshot, app-server initialize를 확인한다. |
| `npm run spike` | `prepare`, `login`, `verify`를 순서대로 수행하되 OAuth 단계에서 사용자 개입을 허용한다. |

## 검증 방식

| 검증 항목 | 방식 |
| --- | --- |
| local binary 사용 | `spawn`에 `codex` 문자열이 아니라 resolved local binary path를 넘긴다. |
| fake global 방어 | `runtime/fake-bin/codex`를 `PATH` 앞에 두고, 호출되면 즉시 실패하도록 만든다. |
| version 확인 | local binary의 `--version` 출력과 `package.json` pin을 비교한다. |
| auth 저장소 확인 | `config.toml`에 `cli_auth_credentials_store = "file"`을 기록하고 `CODEX_HOME/auth.json` 존재 여부만 확인한다. |
| 전역 상태 보호 | `~/.codex`의 파일 목록/mtime snapshot을 전후 비교하되 실제 파일은 변경하지 않는다. |
| app-server smoke | stdio app-server를 시작해 `initialize` request와 `initialized` notification을 주고받는다. |

## Spike Report 형식

`spike-report.md`는 한국어로 작성한다.

| 섹션 | 내용 |
| --- | --- |
| 실행 환경 | OS, Node version, Codex package version, 실행 일시 |
| 결과 요약 | 성공/실패, 실패 시 막힌 지점 |
| 관찰 증거 | local binary path, version match 여부, `auth.json` 존재 여부, app-server initialize 결과 |
| 전역 상태 확인 | `~/.codex` 전후 snapshot 변화 여부 |
| 남은 리스크 | package resolver, macOS desktop packaging, keychain 기반 운영 UX, app-server maturity |
| 다음 단계 | product runtime adapter 또는 2차 spike로 넘길 작업 |

민감 정보 금지:

- `auth.json` 내용
- access token
- full OAuth URL
- raw login log
- 사용자 계정/워크스페이스 식별자

## 구현 전제

| 전제 | 이유 |
| --- | --- |
| spike는 throwaway code다. | 결과만 제품 설계에 반영하고 코드는 폐기 가능해야 한다. |
| OAuth는 반자동이다. | ChatGPT browser/device login은 사용자가 직접 완료해야 한다. |
| 전역 Codex 상태는 건드리지 않는다. | 현재 작업도 전역 Codex 환경 위에서 진행 중이다. |
| API key auth는 이번 범위가 아니다. | 제품 방향은 사용자의 ChatGPT subscription 기반 Codex 사용이다. |
| 실제 agent turn은 다음 단계다. | 이번 목표는 runtime ownership이지 agent task success가 아니다. |

## 다음 단계

| 순서 | 작업 |
| --- | --- |
| 1 | 이 계획을 기준으로 `/handoff`를 만든다. |
| 2 | 별도 prototype 세션에서 `spikes/codex-runtime-ownership/`을 구현한다. |
| 3 | spike 실행 후 한국어 [`spike-report.md`](../../../spikes/codex-runtime-ownership/spike-report.md)를 작성한다. |
| 4 | 결과를 본 기획 세션으로 handoff back한다. |
| 5 | 성공 시 SemesterOps runtime adapter PRD로 넘어간다. 실패 시 Codex SDK, CLI wrapper, Claude Code adapter 등 대안을 검토한다. |
