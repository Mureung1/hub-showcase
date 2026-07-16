# @ay-ple/server

Express companion server for the Runtime Harness. App construction is async: persistence settings, Runtime Diagnostic History hydration, restart recovery, and retention all finish before an Express app is created or a listener can bind. Invalid settings, an unavailable history directory, and corrupt canonical records fail startup instead of falling back to memory.

## Runtime history

| Item | Behavior |
| --- | --- |
| Default directory | `.ay-ple/runtime-harness/runs` under the repository workspace root, independent of launch CWD |
| Override | `RUNTIME_HISTORY_DIR` points directly at the runs directory |
| Terminal run limit | `RUNTIME_HISTORY_MAX_RUNS`, default `100` |
| Terminal byte limit | `RUNTIME_HISTORY_MAX_BYTES`, default `104857600` bytes |
| Record | One schema version 1 JSON envelope per UUID run ID |
| Replacement | Same-directory temporary write, file sync/close, then rename; write, sync, and rename failure tests preserve the previous canonical record and best-effort clean the temporary file |
| Retention | Terminal envelopes only, oldest first by terminal completion time, started time, then run ID; active `running` and `cancelling` records are excluded |
| Clear API | `DELETE /api/runtime/runs` removes terminal records from disk and kernel memory and returns `{ clearedRunIds }` |

`RUNTIME_FAKE_DELAY_MS` is a non-negative millisecond override used by the deterministic browser harness. It does not change persistence semantics.

Completed runs survive server restart and remain available through the existing history and full-log APIs. Streaming output and debug evidence are periodically checkpointed without delaying their live in-memory view. During hydration, stored `running` and `cancelling` records preserve their partial evidence and are saved as normalized `failed` runs before the app becomes ready.

Retention uses the canonical envelope's actual UTF-8 byte size. A terminal envelope that exceeds the configured byte limit fails before replacing its active snapshot. Terminal clear preserves active adapter execution, checkpoints, subscribers, and SSE streams.

## Persistence health

`GET /api/health` returns HTTP `200` with `{ ok: true, persistence: { status: "ready" } }` while persistence is available. A save or remove failure makes the kernel sticky `degraded`; health then returns HTTP `503` with the last persistence error. Start, cancel, and terminal-history clear return HTTP `503` with code `runtime_persistence_unavailable`, while history, full-log, subscription, and adapter-inventory reads remain available from current memory.

Checkpoint or transition failure aborts the affected adapter and closes its in-memory lifecycle with a normalized non-durable `failed` event plus kernel `persistence_error` evidence. The emergency transition is not saved, so a later process restart reads the last valid canonical snapshot and applies normal interrupted-run recovery.

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

필수 여섯 path 값이 모두 없으면 `not_configured`, 일부·empty·relative·unusable 값이면 `invalid_configuration`, controlled directory는 준비됐지만 bundle을 검증할 수 없으면 `runtime_missing`이다. Complete config는 첫 status 또는 mutation에서 한 번 preflight하지만 runtime process는 첫 mutation까지 lazy하게 시작한다. Verified status에는 path 대신 exact `sourceCommit`과 `runtimeVersion`만 포함된다.

Root `npm run dev:chat-shell`은 기존 `npm run dev`와 별도로 Server와 `@ay-ple/chat-shell`을 시작하고 `CODEX_CHAT_ORIGIN=http://127.0.0.1:4173`을 exact하게 설정한다. 실제 runtime을 활성화하려면 위 여섯 absolute path를 caller environment 또는 local `.env`에 함께 준비해야 한다. Chat Shell 구현·검증 범위는 [app README](../chat-shell/README.md)가 소유한다.

| Endpoint | 동작 |
| --- | --- |
| `GET /api/codex-chat/status` | `unavailable | configured | starting | ready | failed` closed union과 fixed `deny_all + read_only` policy를 반환한다. |
| `POST /api/codex-chat/threads` | 현재 idle transient thread를 release한 뒤 새 native thread를 만들고 `{ threadId }`를 반환한다. |
| `POST /api/codex-chat/threads/:threadId/turns` | Exact `{ text }`만 받고 native turn response 뒤 acceptance-first NDJSON event stream을 연다. |
| `POST /api/codex-chat/threads/:threadId/turns/:turnId/interrupt` | Matching active turn의 native interrupt acknowledgement 뒤 `202`를 반환한다. Stream terminal이 최종 상태다. |

Mutation은 raw socket이 loopback이고 Origin이 없거나 configured local Origin과 exact match할 때만 허용한다. Chat router의 isolated JSON parser는 기존 global parser보다 먼저 실행하며 original text를 유지한 채 `text`에 exact 131,072 UTF-8 byte limit을 적용한다. NDJSON writer는 `res.write()` backpressure와 response close를 함께 관찰한다. Browser disconnect는 dispatch phase에 따라 local pre-dispatch reservation 취소, late thread release 또는 accepted turn interrupt·bounded drain으로 정산하고, outcome을 알 수 없거나 drain이 끝나지 않으면 shared runtime을 닫는다. Autonomous cleanup에서 runtime close 자체가 실패하면 status는 path나 child error를 노출하지 않는 stable `runtime_cleanup_failed`로 바뀐다.

`createServerApplication()`은 listener와 Chat composition을 함께 소유한다. `close()`는 새 Chat work와 listener 재시작을 먼저 막고 listener close를 시작한 뒤 runtime `close()`를 한 promise로 수렴한다. Express만 반환하는 compatibility `createServerApp()`은 persistent child lifecycle을 소유할 수 없으므로 ambient 또는 injected Chat config를 관측하지 않고 항상 Chat-disabled composition을 mount한다. Chat runtime을 사용하는 caller는 반드시 application factory를 사용한다. 구현은 path/source preparation, native conversation lifecycle, Express/NDJSON transport와 composition facade로 분리돼 있으며 lifecycle service는 Express를 import하지 않는다. Server contract tests와 Chat Shell Playwright는 `@ay-ple/codex-chat-runtime/testing`의 public runtime interface를 주입하며 live provider를 사용하지 않는다.

`npm run test:codex-chat-actual -w @ay-ple/server`는 materialized macOS arm64 production runtime을 요구하는 명시적 actual-child gate다. 실제 HTTP mutation으로 verified Python worker와 provider-free fake native App Server child를 시작하고, Server shutdown이 새 TCP intake를 먼저 거부한 뒤 runtime close와 전체 process-group reap을 마치기 전에는 resolve하지 않는지 검증한다. Ignored bundle을 요구하므로 일반 `npm test`에는 포함하지 않는다.
