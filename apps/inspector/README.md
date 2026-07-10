# Runtime Inspector Starter

React + TypeScript + Vite inspector app for early runtime harness exploration.

```bash
npm run dev -w @ay-ple/inspector
npm run build -w @ay-ple/inspector
npm run typecheck -w @ay-ple/inspector
npm run test:e2e
```

The Vite dev server proxies `/api` requests to the Express server at `http://localhost:3000`. The Inspector distinguishes a persistence-degraded runtime from an unavailable API, displays the last persistence error, and keeps history, transcript, events, and full-log reads available while Start, Cancel, and terminal-history clear remain disabled. The History header provides an icon-only terminal-history clear control; clearing terminal records refreshes from the server while preserving a selected active run and its live SSE stream.

`npm run test:e2e` starts a real Express server process and Inspector on test-owned ports, runs the deterministic FakeRuntimeAdapter lifecycle and terminal-clear gates, then restarts the server on the same port and history directory. A test-only server entry also injects a checkpoint save failure after partial output so browser coverage can verify the normalized emergency `failed` event, non-durable `persistence_error` evidence, degraded health, mutation rejection, and continuing diagnostic reads. The suite also verifies completed history, active-run continuity through clear on the same SSE connection, and an interrupted stream recovered as `failed` with its checkpointed partial output intact. All harness processes use test-owned Codex paths and temporary state; they do not require live Codex authentication or a network model.
