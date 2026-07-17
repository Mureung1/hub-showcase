# @ay-ple/server

Codex-native Chat transport를 호스팅하는 Express local companion server다. `createServerApplication()`이 Chat composition, HTTP listener와 runtime shutdown을 함께 소유하는 유일한 application factory다. `CreateServerAppOptions`는 injected `codexChat` bootstrap과 `codexChatEnvironment`만 받는다.

## 시작과 환경

Server entrypoint는 이미 설정된 caller environment를 우선하고 실행 `cwd`의 local `.env`에서는 빠진 값만 읽는다. `PORT`가 없으면 `3000`을 사용한다. Root `npm run dev`는 Server와 Chat Shell을 함께 시작하면서 Server에 `CODEX_CHAT_ORIGIN=http://127.0.0.1:4173`을 전달한다.

```bash
npm run dev
```

Build 뒤 Server만 실행하려면 다음 명령을 사용한다. 이 경우 Chat Shell과 exact Origin은 caller가 별도로 준비해야 한다.

```bash
npm run build -w @ay-ple/server
npm run start -w @ay-ple/server
```

## Codex-native Chat 설정

Chat 설정이 없거나 일부이거나 검증할 수 없어도 Server listener는 시작한다. Status만 closed `unavailable` variant를 반환하고 mutation은 `503 codex_chat_unavailable`로 닫힌다. `CODEX_HOME`, `process.cwd()` 또는 ambient provider/auth로 fallback하지 않는다.

| 환경 변수 | 의미 |
| --- | --- |
| `CODEX_CHAT_RUNTIME_ROOT` | Canonical manifest와 complete roster를 검증할 materialized `@ay-ple/codex-chat-runtime` bundle의 absolute root |
| `CODEX_CHAT_WORKSPACE` | Native thread가 사용하는 explicit absolute workspace |
| `CODEX_CHAT_RUNTIME_HOME` | Isolated child `HOME` directory |
| `CODEX_CHAT_CODEX_HOME` | Isolated `CODEX_HOME` directory |
| `CODEX_CHAT_SQLITE_HOME` | Isolated `CODEX_SQLITE_HOME` directory |
| `CODEX_CHAT_TEMP_DIR` | Isolated temporary directory |
| `CODEX_CHAT_ORIGIN` | Optional exact local `http`/`https` Chat Shell Origin |

여섯 path와 optional Origin이 모두 없으면 `not_configured`다. Root `npm run dev`처럼 Origin만 있거나 path가 일부·empty·relative·unusable이면 `invalid_configuration`, controlled directory는 준비됐지만 bundle을 검증할 수 없으면 `runtime_missing`이다. Complete config는 첫 status 또는 mutation에서 한 번 preflight하지만 runtime process는 첫 mutation까지 lazy하게 시작한다. Verified status에는 path 대신 exact `sourceCommit`과 `runtimeVersion`만 포함된다.

Fresh clone에는 production bundle이 tracked되어 있지 않다. 먼저 [runtime package README](../../packages/codex-chat-runtime/README.md#standalone-production-bundle)의 전제와 검증법을 확인하고 macOS arm64 bundle을 명시적으로 materialize한다.

```bash
npm run materialize:production-runtime -w @ay-ple/codex-chat-runtime
npm run verify:production-runtime -w @ay-ple/codex-chat-runtime
```

그 뒤 repository root 기준 예시는 다음과 같다. 실제 provider 대화가 필요하면 `CODEX_CHAT_CODEX_HOME`에는 사용자가 명시적으로 선택한 auth/config만 준비해야 한다. Ambient home이나 다른 local auth/runtime state를 자동으로 복사하지 말고 secret은 git에 넣지 않는다.

```bash
export CODEX_CHAT_RUNTIME_ROOT="$PWD/packages/codex-chat-runtime/.artifacts/production-runtime-darwin-arm64"
export CODEX_CHAT_WORKSPACE="/absolute/path/to/workspace"
export CODEX_CHAT_RUNTIME_HOME="/absolute/path/to/isolated/home"
export CODEX_CHAT_CODEX_HOME="/absolute/path/to/isolated/codex-home"
export CODEX_CHAT_SQLITE_HOME="/absolute/path/to/isolated/sqlite-home"
export CODEX_CHAT_TEMP_DIR="/absolute/path/to/isolated/temp"
npm run dev
```

Provider credential 없이 exact native path만 검증하려면 위 개발 실행 대신 `npm run test:local-provider -w @ay-ple/codex-chat-runtime`을 사용한다.

Root `npm run dev`에서 실제 runtime을 활성화하려면 위 여섯 absolute path를 caller environment 또는 local `.env`에 함께 준비해야 한다. Chat Shell 구현·검증 범위는 [app README](../chat-shell/README.md)가 소유한다.

| Endpoint | 동작 |
| --- | --- |
| `GET /api/codex-chat/status` | `unavailable | configured | starting | ready | failed` closed union과 fixed `deny_all + read_only` policy를 반환한다. |
| `POST /api/codex-chat/threads` | 현재 idle transient thread를 release한 뒤 새 native thread를 만들고 `{ threadId }`를 반환한다. |
| `POST /api/codex-chat/threads/:threadId/turns` | Exact `{ text }`만 받고 native turn response 뒤 acceptance-first NDJSON event stream을 연다. |
| `POST /api/codex-chat/threads/:threadId/turns/:turnId/interrupt` | Matching active turn의 native interrupt acknowledgement 뒤 `202`를 반환한다. Stream terminal이 최종 상태다. |

이 네 route가 Server의 유일한 application API다. `/api/health`와 `/api/runtime/*`는 compatibility alias 없이 제거됐으며 Express `404`로 닫힌다.

현재 `CodexChatService`는 Server process 전체에서 current native thread 하나와 active turn 하나만 소유한다. 모든 browser tab과 HTTP client가 이 slot을 공유하며, 새 thread 생성은 idle current thread의 local handle을 release해 현재 Server instance의 Chat route가 이전 ID를 더 이상 active handle로 받지 않게 한다. Native thread 자체를 archive/delete하거나 identity를 무효화하지는 않는다. Active turn 중에는 새 thread를 만들 수 없다. 이는 첫 tracer의 의도적인 cardinality이며 browser session별 격리나 multi-client conversation service가 아니다.

Mutation은 raw socket이 loopback이고 Origin이 없거나 configured local Origin과 exact match할 때만 허용한다. Chat router의 isolated JSON parser는 generic global parser 없이 route scope 안에서만 실행하며 original text를 유지한 채 `text`에 exact 131,072 UTF-8 byte limit을 적용한다. NDJSON writer는 `res.write(false)`마다 최대 5초 동안 `drain` 또는 response close를 기다리고, deadline이 끝나면 listener와 timer를 정리한 뒤 response를 destroy해 disconnect로 분류한다. Accepted turn은 그 시점부터 별도의 최대 5초 native drain 동안 interrupt와 terminal 소비를 계속한다. Terminal이 오면 active-turn lease를 해제하고 runtime을 `ready`로 유지하며, 오지 않으면 `disconnect_drain_timeout`으로 shared runtime을 닫는다. 다른 browser disconnect도 dispatch phase에 따라 local pre-dispatch reservation 취소, late thread release 또는 같은 accepted-turn 정산을 사용한다. Outcome을 알 수 없거나 autonomous cleanup의 runtime close 자체가 실패하면 status는 path나 child error를 노출하지 않는 stable failure code로 닫히며 cleanup failure는 `runtime_cleanup_failed`로 승격한다.

`createServerApplication()`은 listener와 Chat composition을 함께 소유한다. Runtime factory가 resolve되면 service는 public `CodexChatRuntime.terminal`을 한 번 관찰하고, active stream이 없는 idle failure도 cached runtime identity를 확인해 status를 `failed`로 전환한 뒤 같은 close-once 경로로 정리한다. `close()`는 새 Chat work와 listener 재시작을 먼저 막고 listener close를 시작한 뒤 runtime `close()`를 한 promise로 수렴한다. 구현은 path/source preparation, native conversation lifecycle, Express/NDJSON transport와 composition facade로 분리돼 있으며 lifecycle service는 Express를 import하지 않는다. Server contract tests와 Chat Shell Playwright는 `@ay-ple/codex-chat-runtime/testing`의 public runtime interface를 주입하며 live provider를 사용하지 않는다.

`npm run test:codex-chat-actual -w @ay-ple/server`는 materialized macOS arm64 production runtime을 요구하는 명시적 actual-child gate다. 실제 HTTP mutation으로 verified Python worker와 provider-free fake native App Server child를 시작하고, Server shutdown이 새 TCP intake를 먼저 거부한 뒤 runtime close와 전체 process-group reap을 마치기 전에는 resolve하지 않는지 검증한다. Ignored bundle을 요구하므로 일반 `npm test`에는 포함하지 않는다.

일반 package 검증은 다음 명령으로 실행한다.

```bash
npm run test -w @ay-ple/server
npm run typecheck -w @ay-ple/server
npm run build -w @ay-ple/server
```
