# @ay-ple/runtime-codex

Codex App Server 통합 실험을 담당하는 runtime package다. raw Codex protocol을 이 package 안에 가두어 `runtime-core`, server와 제품 코드가 Codex-specific message shape에 의존하지 않게 한다.

## 고정 계약

| 항목 | 값 |
| --- | --- |
| Codex package | `@openai/codex@0.144.0` |
| Model 선택 | Codex 기본값; AY-PLE는 아직 model을 고정하지 않음 |
| Transport | `stdio` JSONL |
| 시작 명령 | `codex app-server --listen stdio://` |
| 생성 protocol 경로 | `src/internal/codex-app-server-protocol/generated/` |

내부 Codex App Server TypeScript protocol 파일은 다음 명령으로 다시 생성한다.

```bash
npm run generate:codex-types -w @ay-ple/runtime-codex
```

Generator는 package-owned Codex binary를 실행하고, `NodeNext` ESM compile을 위해 생성된 relative import에 `.js` 확장자를 붙인다. 생성 파일은 internal이며 AY-PLE 제품 계약으로 다시 export하지 않는다.

Package pin은 App Server binary와 생성 protocol 계약을 고정한다. `gpt-5.6-sol` 같은 model까지 고정하지 않으며 thread 생성은 현재 Codex 기본 model 설정을 따른다.

## 현재 Harness 범위

현재 Adapter는 단일 실행 Runtime Harness 통합이며 AY-PLE 제품 전체의 상호작용 호스트가 아니다.

- 기본 binary는 이 package에서 시작해 가장 가까운 조상 `node_modules/.bin/codex`를 찾는다. `CODEX_BIN_PATH` override의 version 일치는 status에서 관측하고 live parity gate에서 검증한다.
- 각 실행은 새 `app-server` process와 fresh persistent `thread`·`turn`을 시작한다.
- 실행 종료 시 `CodexRawClient.close()`는 process를 닫지만 `thread/archive`, `thread/delete` 또는 `thread/unsubscribe`를 보내지 않는다. 생성된 thread와 rollout은 Codex state에 남을 수 있다.
- `thread/start`에는 `cwd`를 보내고, 반환된 필수 `threadId`와 text input으로 `turn/start`를 호출한다. `CodexRawClient`의 기본 `cwd`는 `process.cwd()`이며 server는 `CODEX_RUNTIME_CWD`로 바꿀 수 있다.
- 공개 raw wrapper의 `CodexRawTurnInput`은 현재 text만 지원한다. 생성 protocol에 존재하는 `skill`, `mention`, `outputSchema`는 아직 wrapper와 제품 composer에 연결되지 않았다.
- 정규화한 Adapter 출력은 세부 작업 활동이 아니라 text와 실행 종료 lifecycle을 다룬다.
- `turn/steer`는 raw 호출만 가능하며 제품의 target·conflict 정책은 아직 없다.
- `CodexRawClient`는 App Server가 시작한 `request`를 아직 전달하거나 typed `response`로 응답하지 못한다.
- repository `.ay-ple/runtime-codex/*` 기본 경로는 developer-only Harness용이다. `CODEX_HOME`과 `CODEX_SQLITE_HOME`은 현재 각각 독립 override되며 product runtime-home pair validation은 없다.
- Runtime-home 초기화는 `CODEX_HOME`과 `CODEX_SQLITE_HOME` directory를 만든다. File auth config는 기본 workspace-local pair 또는 `ensureFileAuthConfig: true`를 명시한 경우에만 보장하며, built-in Memories는 켜지 않는다.

현재 package는 ModelingInvocation을 Skill·text·mention·`outputSchema`로 번역하거나 ModelingRun을 생성하지 않는다. 현재 구현 gap은 [Runtime Harness 구현 지도](../../docs/architecture/runtime-harness-implementation-map.md), 채택한 mapping과 product runtime layout은 각각 [Codex-native 제품 작업 조합](../../docs/architecture/codex-native-product-composition.md)과 [Codex Runtime 격리](../../docs/architecture/codex-runtime-isolation.md)를 따른다.

## Raw initialize smoke

App Server initialize smoke는 명시적으로 실행한다.

```bash
npm run smoke:codex -w @ay-ple/runtime-codex
```

Override가 없으면 developer-only runtime home은 workspace-local 경로를 사용한다.

| 경로 | 역할 |
| --- | --- |
| `.ay-ple/runtime-codex/codex-home` | file auth config를 포함한 app-managed `CODEX_HOME` |
| `.ay-ple/runtime-codex/sqlite` | app-managed `CODEX_SQLITE_HOME` |

지원하는 환경 변수:

| 변수 | 역할 |
| --- | --- |
| `CODEX_BIN_PATH` | package-owned binary 대신 지정한 Codex binary 사용 |
| `CODEX_HOME` | 지정한 app-managed Codex home 사용 |
| `CODEX_SQLITE_HOME` | 지정한 app-managed SQLite home 사용 |
| `CODEX_SMOKE_CWD` | App Server child process의 working directory |
| `CODEX_SMOKE_TIMEOUT_MS` | initialize timeout milliseconds |

Smoke 명령은 `initialize`를 보내 matching response를 기다린 뒤 generated-contract `initialized` notification을 보낸다. `codex login`이나 OAuth를 시작하지 않는다. 인증이 없거나 Codex가 로그인을 요구하면 중단하고 인증을 명시적으로 처리한 뒤 다시 실행한다.

## Live HTTP/SSE parity

Runtime Inspector와 같은 server API를 통과하는 opt-in prompt/cancellation gate는 다음 명령으로 실행한다.

```bash
npm run verify:codex-parity -w @ay-ple/server
```

이 명령은 ephemeral loopback port에서 Express server를 시작하고, 실행 binary가 package pin과 같은지 확인한 뒤 HTTP/SSE를 통한 prompt 완료와 adapter-confirmed cancellation을 검증한다. 위 runtime-home·binary 환경 변수와 `CODEX_RUNTIME_CWD`를 사용하며, 전체 60초 timeout은 `CODEX_PARITY_TIMEOUT_MS`의 positive integer로 바꿀 수 있다. Login이나 OAuth를 시작하지 않고 raw debug log 내용도 출력하지 않는다.

Local ownership spike auth를 재사용할 때는 credential 내용을 읽거나 복사하지 않고 spike-owned runtime directory를 지정한다.

```bash
CODEX_HOME="$PWD/spikes/codex-runtime-ownership/runtime/codex-home" \
CODEX_SQLITE_HOME="$PWD/spikes/codex-runtime-ownership/runtime/sqlite" \
npm run smoke:codex -w @ay-ple/runtime-codex
```
