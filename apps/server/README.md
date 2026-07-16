# @ay-ple/server

Runtime Harness와 별도 Codex-native Chat transport를 호스팅하는 Express local companion server다. App 생성은 비동기이며 persistence 설정, Runtime Diagnostic History hydration, 재시작 복구와 retention이 끝나기 전에는 Express app을 만들거나 listener를 bind하지 않는다. 잘못된 설정, 사용할 수 없는 history directory와 손상된 canonical record는 memory fallback 없이 startup을 실패시킨다.

## Runtime history

| 항목 | 동작 |
| --- | --- |
| 기본 directory | 실행 `cwd`와 무관하게 repository workspace root 아래 `.ay-ple/runtime-harness/runs` |
| Override | `RUNTIME_HISTORY_DIR`이 runs directory를 직접 지정한다. |
| Terminal run limit | `RUNTIME_HISTORY_MAX_RUNS`, 기본값 `100` |
| Terminal byte limit | `RUNTIME_HISTORY_MAX_BYTES`, 기본값 `104857600` bytes |
| Record | UUID run ID마다 schema version 1 JSON envelope 하나 |
| Replacement | 같은 directory에 임시 파일을 쓰고 file sync/close 뒤 rename한다. Write, sync, rename failure test는 이전 canonical record를 보존하고 임시 파일을 best-effort cleanup한다. |
| Retention | Terminal envelope만 terminal 완료 시각, 시작 시각, run ID 순서로 오래된 것부터 정리한다. Active `running`과 `cancelling` record는 제외한다. |
| Clear API | `DELETE /api/runtime/runs`가 disk와 kernel memory의 terminal record를 제거하고 `{ clearedRunIds }`를 반환한다. |

`RUNTIME_FAKE_DELAY_MS`는 deterministic browser Harness가 사용하는 0 이상의 millisecond override이며 persistence semantics는 바꾸지 않는다.

완료된 run은 Server 재시작 뒤에도 보존되어 기존 history와 full-log API로 읽을 수 있다. Streaming output과 debug evidence는 live in-memory view를 지연시키지 않고 주기적으로 checkpoint한다. Hydration 중 저장된 `running`과 `cancelling` record는 partial evidence를 보존하며 app이 ready가 되기 전에 normalized `failed` run으로 저장된다.

Retention은 canonical envelope의 실제 UTF-8 byte size를 사용한다. 설정한 byte limit을 넘는 terminal envelope는 active snapshot을 교체하기 전에 실패한다. Terminal clear는 active adapter execution, checkpoint, subscriber와 SSE stream을 보존한다.

## Persistence health

Persistence를 사용할 수 있으면 `GET /api/health`는 HTTP `200`과 `{ ok: true, persistence: { status: "ready" } }`를 반환한다. Save나 remove가 실패하면 kernel은 sticky `degraded` 상태가 되고 health는 마지막 persistence error와 HTTP `503`을 반환한다. Start, cancel과 terminal-history clear는 `runtime_persistence_unavailable` code로 HTTP `503`을 반환하지만 history, full-log, subscription과 adapter-inventory read는 현재 memory에서 계속 제공한다.

Checkpoint나 transition이 실패하면 영향을 받은 adapter를 abort하고 normalized non-durable `failed` event와 kernel `persistence_error` evidence로 in-memory lifecycle을 닫는다. 이 emergency transition은 저장하지 않으므로 이후 process 재시작은 마지막 valid canonical snapshot을 읽고 정상 interrupted-run recovery를 적용한다.

## Codex-native Chat transport

`/api/codex-chat/*`는 기존 Runtime Harness와 분리된 additive route다. 설정이 없거나 일부만 있거나 검증할 수 없어도 Server와 Inspector는 계속 시작하며, Chat status만 closed `unavailable` variant를 반환하고 mutation은 `503 codex_chat_unavailable`로 닫힌다. 이 경로는 legacy `HeadlessCodexClientHost`, 기존 `CODEX_HOME`, `CODEX_RUNTIME_CWD`, `process.cwd()` 또는 ambient provider/auth로 fallback하지 않는다.

| 환경 변수 | 의미 |
| --- | --- |
| `CODEX_CHAT_RUNTIME_ROOT` | Canonical manifest와 complete roster를 검증할 materialized `@ay-ple/codex-chat-runtime` bundle의 absolute root |
| `CODEX_CHAT_WORKSPACE` | Native thread가 사용하는 explicit absolute workspace |
| `CODEX_CHAT_RUNTIME_HOME` | Isolated child `HOME` directory |
| `CODEX_CHAT_CODEX_HOME` | Isolated `CODEX_HOME` directory |
| `CODEX_CHAT_SQLITE_HOME` | Isolated `CODEX_SQLITE_HOME` directory |
| `CODEX_CHAT_TEMP_DIR` | Isolated temporary directory |
| `CODEX_CHAT_ORIGIN` | Optional exact local `http`/`https` Chat Shell Origin |

여섯 path와 optional Origin이 모두 없으면 `not_configured`다. Origin만 있거나 path가 일부·empty·relative·unusable이면 `invalid_configuration`, controlled directory는 준비됐지만 bundle을 검증할 수 없으면 `runtime_missing`이다. 따라서 root `npm run dev:chat-shell`이 Origin을 설정한 상태에서 path를 준비하지 않으면 `invalid_configuration`이 정상 결과다. Complete config는 첫 status 또는 mutation에서 한 번 preflight하지만 runtime process는 첫 mutation까지 lazy하게 시작한다. Verified status에는 path 대신 exact `sourceCommit`과 `runtimeVersion`만 포함된다.

Fresh clone에는 production bundle이 tracked되어 있지 않다. 먼저 [runtime package README](../../packages/codex-chat-runtime/README.md#standalone-production-bundle)의 전제와 검증법을 확인하고 macOS arm64 bundle을 명시적으로 materialize한다.

```bash
npm run materialize:production-runtime -w @ay-ple/codex-chat-runtime
npm run verify:production-runtime -w @ay-ple/codex-chat-runtime
```

그 뒤 repository root 기준 예시는 다음과 같다. 실제 provider 대화가 필요하면 `CODEX_CHAT_CODEX_HOME`에는 사용자가 명시적으로 선택한 auth/config만 준비해야 한다. Ambient home이나 기존 Harness state를 자동으로 복사하지 말고 secret은 git에 넣지 않는다.

```bash
export CODEX_CHAT_RUNTIME_ROOT="$PWD/packages/codex-chat-runtime/.artifacts/production-runtime-darwin-arm64"
export CODEX_CHAT_WORKSPACE="/absolute/path/to/workspace"
export CODEX_CHAT_RUNTIME_HOME="/absolute/path/to/isolated/home"
export CODEX_CHAT_CODEX_HOME="/absolute/path/to/isolated/codex-home"
export CODEX_CHAT_SQLITE_HOME="/absolute/path/to/isolated/sqlite-home"
export CODEX_CHAT_TEMP_DIR="/absolute/path/to/isolated/temp"
npm run dev:chat-shell
```

Provider credential 없이 exact native path만 검증하려면 위 개발 실행 대신 `npm run test:local-provider -w @ay-ple/codex-chat-runtime`을 사용한다.

Root `npm run dev:chat-shell`은 기존 `npm run dev`와 별도로 Server와 `@ay-ple/chat-shell`을 시작하고 `CODEX_CHAT_ORIGIN=http://127.0.0.1:4173`을 exact하게 설정한다. 실제 runtime을 활성화하려면 위 여섯 absolute path를 caller environment 또는 local `.env`에 함께 준비해야 한다. Chat Shell 구현·검증 범위는 [app README](../chat-shell/README.md)가 소유한다.

| Endpoint | 동작 |
| --- | --- |
| `GET /api/codex-chat/status` | `unavailable | configured | starting | ready | failed` closed union과 fixed `deny_all + read_only` policy를 반환한다. |
| `POST /api/codex-chat/threads` | 현재 idle transient thread를 release한 뒤 새 native thread를 만들고 `{ threadId }`를 반환한다. |
| `POST /api/codex-chat/threads/:threadId/turns` | Exact `{ text }`만 받고 native turn response 뒤 acceptance-first NDJSON event stream을 연다. |
| `POST /api/codex-chat/threads/:threadId/turns/:turnId/interrupt` | Matching active turn의 native interrupt acknowledgement 뒤 `202`를 반환한다. Stream terminal이 최종 상태다. |

현재 `CodexChatService`는 Server process 전체에서 current native thread 하나와 active turn 하나만 소유한다. 모든 browser tab과 HTTP client가 이 slot을 공유하며, 새 thread 생성은 idle current thread의 local handle을 release해 현재 Server instance의 Chat route가 이전 ID를 더 이상 active handle로 받지 않게 한다. Native thread 자체를 archive/delete하거나 identity를 무효화하지는 않는다. Active turn 중에는 새 thread를 만들 수 없다. 이는 첫 tracer의 의도적인 cardinality이며 browser session별 격리나 multi-client conversation service가 아니다.

Mutation은 raw socket이 loopback이고 Origin이 없거나 configured local Origin과 exact match할 때만 허용한다. Chat router의 isolated JSON parser는 기존 global parser보다 먼저 실행하며 original text를 유지한 채 `text`에 exact 131,072 UTF-8 byte limit을 적용한다. NDJSON writer는 `res.write()` backpressure와 response close를 함께 관찰한다. Browser disconnect는 dispatch phase에 따라 local pre-dispatch reservation 취소, late thread release 또는 accepted turn interrupt·bounded drain으로 정산하고, outcome을 알 수 없거나 drain이 끝나지 않으면 shared runtime을 닫는다. Autonomous cleanup에서 runtime close 자체가 실패하면 status는 path나 child error를 노출하지 않는 stable `runtime_cleanup_failed`로 바뀐다.

`createServerApplication()`은 listener와 Chat composition을 함께 소유한다. `close()`는 새 Chat work와 listener 재시작을 먼저 막고 listener close를 시작한 뒤 runtime `close()`를 한 promise로 수렴한다. Express만 반환하는 compatibility `createServerApp()`은 persistent child lifecycle을 소유할 수 없으므로 ambient 또는 injected Chat config를 관측하지 않고 항상 Chat-disabled composition을 mount한다. Chat runtime을 사용하는 caller는 반드시 application factory를 사용한다. 구현은 path/source preparation, native conversation lifecycle, Express/NDJSON transport와 composition facade로 분리돼 있으며 lifecycle service는 Express를 import하지 않는다. Server contract tests와 Chat Shell Playwright는 `@ay-ple/codex-chat-runtime/testing`의 public runtime interface를 주입하며 live provider를 사용하지 않는다.

`npm run test:codex-chat-actual -w @ay-ple/server`는 materialized macOS arm64 production runtime을 요구하는 명시적 actual-child gate다. 실제 HTTP mutation으로 verified Python worker와 provider-free fake native App Server child를 시작하고, Server shutdown이 새 TCP intake를 먼저 거부한 뒤 runtime close와 전체 process-group reap을 마치기 전에는 resolve하지 않는지 검증한다. Ignored bundle을 요구하므로 일반 `npm test`에는 포함하지 않는다.
