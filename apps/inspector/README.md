# Runtime Inspector Starter

React + TypeScript + Vite inspector app for early runtime harness exploration.

```bash
npm run dev -w @ay-ple/inspector
npm run build -w @ay-ple/inspector
npm run typecheck -w @ay-ple/inspector
npm run test:e2e
```

The Vite dev server proxies `/api` requests to the Express server at `http://localhost:3000`. `npm run test:e2e` starts a real Express server and Inspector on test-owned ports, runs the deterministic FakeRuntimeAdapter lifecycle gate in desktop Chromium, and cleans up its temporary state. Keep this layer minimal until the project direction is decided.
