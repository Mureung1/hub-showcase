# @ay-ple/interaction-mcp

AY가 `propose_state_patch`로 요청한 transient Review를 AY-PLE Interaction Broker에 전달하고, 사용자의 닫힌 결과를 같은 MCP call에 돌려주는 private workspace package다. App 학업 객체나 Browser UI와 독립적인 public capability codec, private Adapter↔Broker wire와 built STDIO executable을 소유한다.

## 책임

| 소유하는 내용 | 소유하지 않는 내용 |
| --- | --- |
| Domain-neutral `propose_state_patch` request와 `accept \| revise \| reject` result의 exact codec | `Course`, `Assignment`, store revision, durable patch·apply |
| `protocolVersion: 1` handshake, held lifecycle channel, capability call/result와 safe error envelope | Browser route·frame, active workspace·Turn 선택 |
| `dist/stdio.js`의 environment validation, authenticated handshake·lifecycle과 one-call→one-held-POST mapping | Broker listener, pending slot, evidence resolution과 UI settlement |
| Broker·transport·cancellation failure의 bounded MCP `isError` mapping | Automatic retry, poll·callback, response replay와 success 추정 |

Runtime package를 import하지 않으며 Browser production contract도 재노출하지 않는다. Dynamic endpoint·token·binding은 process environment에서만 읽고 tracked config나 error에 쓰지 않는다.

## Environment

| 이름 | 값 |
| --- | --- |
| `AY_PLE_INTERACTION_BROKER_URL` | Exact loopback `http` URL의 `/api/_private/interaction-mcp` route |
| `AY_PLE_INTERACTION_BROKER_TOKEN` | Runtime generation의 random 32-byte base64url token |
| `AY_PLE_INTERACTION_RUNTIME_BINDING` | `runtime_[0-9a-f]{32}` binding |

세 값, authenticated handshake, 단일 held lifecycle channel이 유효하기 전에는 MCP initialize가 성공하지 않는다. Adapter는 lifecycle accepted prefix를 받은 뒤에도 해당 HTTP response를 열어 두며, Capability call마다 별도 HTTP POST 하나만 열어 terminal Broker response를 같은 tool call에 반환한다. STDIN EOF·error와 `SIGINT | SIGTERM`은 startup handshake와 lifecycle fetch를 공유하는 AbortController까지 닫아, 늦은 handshake가 새 lifecycle을 열거나 process가 외부 SIGKILL까지 남지 않게 한다.

## Build와 검증

```bash
npm run build -w @ay-ple/interaction-mcp
npm test -w @ay-ple/interaction-mcp
npm run typecheck -w @ay-ple/interaction-mcp
npm run verify:package-root -w @ay-ple/interaction-mcp
```

Build는 Node shebang을 가진 `dist/stdio.js`를 만들고 executable mode를 설정한다. Test는 real built process와 mock loopback Broker로 handshake → held lifecycle → initialize → tools/list → held call → structured result, handshake·lifecycle 거절, startup 중 STDIN EOF의 즉시 abort, Broker failure, transport loss와 cancellation을 검증한다. Package-root verification은 default-condition export, shebang과 mode를 반복 build 뒤 확인한다.
