# @ay-ple/server

Express companion server for the Runtime Harness. App construction is async: `createServerApp()` hydrates Runtime Diagnostic History before it returns an app that can listen or answer health and runtime requests.

## Runtime history

| Item | Behavior |
| --- | --- |
| Default directory | `.ay-ple/runtime-harness/runs` under the repository workspace root, independent of launch CWD |
| Override | `RUNTIME_HISTORY_DIR` points directly at the runs directory |
| Terminal run limit | `RUNTIME_HISTORY_MAX_RUNS`, default `100` |
| Terminal byte limit | `RUNTIME_HISTORY_MAX_BYTES`, default `104857600` bytes |
| Record | One schema version 1 JSON envelope per UUID run ID |
| Replacement | Same-directory temporary write, file sync/close, then rename; stale store-owned temporary files are cleaned during hydration |
| Retention | Terminal envelopes only, oldest first by terminal completion time, started time, then run ID; active `running` and `cancelling` records are excluded |
| Clear API | `DELETE /api/runtime/runs` removes terminal records from disk and kernel memory and returns `{ clearedRunIds }` |

`RUNTIME_FAKE_DELAY_MS` is a non-negative millisecond override used by the deterministic browser harness. It does not change persistence semantics.

Completed runs survive server restart and remain available through the existing history and full-log APIs. Streaming output and debug evidence are periodically checkpointed without delaying their live in-memory view. During hydration, stored `running` and `cancelling` records preserve their partial evidence and are saved as normalized `failed` runs before the app becomes ready.

Retention uses the canonical envelope's actual UTF-8 byte size. A terminal envelope that exceeds the configured byte limit fails before replacing its active snapshot. Terminal clear preserves active adapter execution, checkpoints, subscribers, and SSE streams. Degraded persistence health and its HTTP/UI contract remain in Issue 005.
