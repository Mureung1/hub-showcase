# Codex Runtime Ownership Spike

이 디렉터리는 AY-PLE가 Codex 실행환경을 전역 설치와 분리해서 소유할 수 있는지 확인하는 throwaway PoC입니다.

## 실행

```bash
cd spikes/codex-runtime-ownership
npm install
npm run spike
```

`npm run spike`는 다음을 확인합니다.

| 항목 | 확인 방식 |
| --- | --- |
| local binary | `node_modules/.bin/codex` absolute path를 직접 실행 |
| fake global guard | `runtime/fake-bin/codex`를 `PATH` 앞에 두고 bare `codex` 호출이 실패하는지 확인 |
| exact version | `@openai/codex@0.142.5` pin과 실제 `codex --version` 비교 |
| isolated state | `runtime/codex-home`을 `CODEX_HOME`으로 지정 |
| file auth store | `cli_auth_credentials_store = "file"` 강제 |
| subscription auth proof | `runtime/codex-home/auth.json` 존재 여부만 확인 |
| app-server smoke | `codex app-server --listen stdio://`로 `initialize` handshake만 확인 |

## 재실행

`runtime/codex-home/auth.json`이 이미 있으면 `npm run spike`는 login을 다시 실행하지 않고 verify와 report만 진행합니다.

| 명령 | 용도 |
| --- | --- |
| `npm run spike` | auth가 없으면 login 후 verify, auth가 있으면 login skip 후 verify |
| `npm run spike -- --force-login` | auth 존재 여부와 무관하게 login 후 verify |
| `npm run login` | 명시적으로 브라우저 기반 login 실행 |
| `npm run login:device` | 명시적으로 device auth login 실행 |
| `npm run verify` | login 없이 현재 runtime 상태 검증 |
| `npm run report` | 마지막 검증 결과로 `spike-report.md` 재작성 |

## 민감정보 규칙

- `runtime/`은 git에 올리지 않습니다.
- `auth.json` 내용, access token, refresh token, OAuth URL, raw login log는 저장하거나 보고서에 쓰지 않습니다.
- 전역 `~/.codex`는 rename, delete, chmod, reset하지 않고 metadata snapshot만 관찰합니다.
