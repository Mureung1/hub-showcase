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
