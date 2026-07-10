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

Completed runs survive server restart and remain available through the existing history and full-log APIs. Streaming checkpoints and non-terminal recovery, retention and history clear, and degraded persistence health remain in Runtime Harness Hardening Issues 003–005.
