# Runtime Inspector Starter

React + TypeScript + Vite inspector app for early runtime harness exploration.

```bash
npm run dev -w @ay-ple/inspector
npm run build -w @ay-ple/inspector
npm run typecheck -w @ay-ple/inspector
npm run test:e2e
```

The Vite dev server proxies `/api` requests to the Express server at `http://localhost:3000`. The History header provides an icon-only terminal-history clear control; clearing terminal records refreshes from the server while preserving a selected active run and its live SSE stream.

`npm run test:e2e` starts a real Express server process and Inspector on test-owned ports, runs the deterministic FakeRuntimeAdapter lifecycle and terminal-clear gates, then restarts the server on the same port and history directory. Browser coverage verifies completed history, active-run continuity through clear on the same SSE connection, and an interrupted stream recovered as `failed` with its checkpointed partial output, normalized events, and debug evidence intact. The harness cleans up its temporary state after each test.
