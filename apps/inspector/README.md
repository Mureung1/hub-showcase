# Runtime Inspector Starter

React + TypeScript + Vite inspector app for early runtime harness exploration.

```bash
npm run dev -w @ay-ple/inspector
npm run build -w @ay-ple/inspector
npm run typecheck -w @ay-ple/inspector
npm run test:e2e
```

The Vite dev server proxies `/api` requests to the Express server at `http://localhost:3000`. `npm run test:e2e` starts a real Express server process and Inspector on test-owned ports, runs the deterministic FakeRuntimeAdapter lifecycle gate, then restarts the server on the same port and history directory. Browser reload coverage verifies both completed history and an interrupted stream recovered as `failed` with its checkpointed partial output, normalized events, and debug evidence intact. The harness cleans up its temporary state after each test.
