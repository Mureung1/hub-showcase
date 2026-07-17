# @ay-ple/inspector

Runtime Harness의 단일 run lifecycle과 진단 이력을 살펴보는 개발자용 React·TypeScript·Vite app이다. `/api/runtime/*`와 legacy `packages/runtime-codex@0.144.0` 기반 status/capability surface만 소비하며, official SDK 기반 `/api/codex-chat/*`나 학생용 conversation transcript를 소유하지 않는다. Codex-native 대화 흐름은 별도 [Chat Shell](../chat-shell/README.md)이 담당한다.

```bash
npm run dev -w @ay-ple/inspector
npm run build -w @ay-ple/inspector
npm run typecheck -w @ay-ple/inspector
npm run test:e2e -w @ay-ple/inspector
```

정적 [camp demo](../../artifacts/camp-demo/README.md)는 artifact-local Vite·Playwright config와 root command를 소유하며 Inspector workspace를 실행하거나 import하지 않는다. Inspector의 script, typecheck와 browser suite는 Runtime Harness만 대상으로 한다.

Vite dev server는 `/api` request를 `http://localhost:3000`의 Express server로 proxy한다. Inspector는 persistence가 degraded된 runtime과 사용할 수 없는 API를 구분하고 마지막 persistence error를 표시한다. Degraded 상태에서도 history, transcript, events와 full-log read는 유지하지만 Start, Cancel과 terminal-history clear는 비활성화한다. History header의 icon-only control은 terminal record만 지우며, 선택된 active run과 기존 SSE stream은 유지한 채 server 결과를 다시 불러온다.

`npm run test:e2e`는 test-owned port에서 실제 Express server process와 Inspector를 시작하고 deterministic `FakeRuntimeAdapter` lifecycle과 terminal-clear gate를 실행한 뒤 같은 port와 history directory로 server를 재시작한다. Test-only server entry는 partial output 뒤 checkpoint save failure도 주입한다. Browser coverage는 normalized emergency `failed` event, non-durable `persistence_error` evidence, degraded health, mutation 거부, 계속 가능한 diagnostic read, completed history, 같은 SSE connection에서 clear 뒤 active-run 연속성과 checkpointed partial output을 보존한 interrupted-run recovery를 검증한다. 모든 Harness process는 test-owned Codex path와 temporary state를 사용하며 live Codex 인증이나 network model을 요구하지 않는다.
