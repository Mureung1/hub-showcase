# @ay-ple/server

Express companion server for the Runtime Harness. App construction is async: `createServerApp()` hydrates Runtime Diagnostic History before it returns an app that can listen or answer health and runtime requests.

## Runtime history

| Item | Behavior |
| --- | --- |
| Default directory | `.ay-ple/runtime-harness/runs` under the repository workspace root, independent of launch CWD |
| Override | `RUNTIME_HISTORY_DIR` points directly at the runs directory |
| Record | One schema version 1 JSON envelope per UUID run ID |
| Replacement | Same-directory temporary write, file sync/close, then rename; stale store-owned temporary files are cleaned during hydration |

`RUNTIME_FAKE_DELAY_MS` is a non-negative millisecond override used by the deterministic browser harness. It does not change persistence semantics.

Completed runs survive server restart and remain available through the existing history and full-log APIs. Streaming output and debug evidence are periodically checkpointed without delaying their live in-memory view. During hydration, stored `running` and `cancelling` records preserve their partial evidence and are saved as normalized `failed` runs before the app becomes ready.

Retention and history clear remain in Runtime Harness Hardening Issue 004. Degraded persistence health and its HTTP/UI contract remain in Issue 005.
