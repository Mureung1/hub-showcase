# @ay-ple/product-contract

Server가 만드는 `/api/product/*` JSON·NDJSON과 Browser가 읽고 보내는 같은 wire contract를 소유하는 dependency-free TypeScript package다. `apps/server`와 `apps/chat-shell`은 서로의 source를 import하지 않고 이 package의 public module만 공유한다.

## 책임

| 소유하는 내용 | 소유하지 않는 내용 |
| --- | --- |
| Account Readiness, workspace·Course·RawMaterial, settled history와 material preview의 exact public type·decoder | workspace store format/version, physical path, migration과 domain transaction |
| Current Assignment action·explicit retry, product Chat, 세 갈래 Review, 일반 interaction answer/cancel과 interrupt request·response literal | Express route composition, Origin guard, HTTP status와 byte framing |
| Closed `ProductOperationFrame`, public `StatePatch`·question, Review replacement·resolution·recovery projection과 pure exact decoder | native App Server event, raw JSON-RPC identity, MCP credential·complete payload와 cross-frame lifecycle reducer |
| First Assignment의 public Recipe version·arguments와 `16 KiB` JSON envelope bound | managed `SKILL.md` path·digest, model/reasoning choice와 private MCP binding |

Decoder는 missing·extra·unknown field와 Review decision/outcome·continuation의 잘못된 조합을 거절한다. `FirstAssignmentRetryRequest`는 canonical Assignment 입력과 prior `retryOfRunId`를 exact하게 요구한다. Settled `ModelingRun`은 retry ancestry와 optional recovery를, `operation.recovery`는 `interrupted | unknown`의 retry 가능 여부 또는 apply 뒤 `continuation_lost`의 confirmed revision을 표현한다. 수정 feedback은 non-empty `8 KiB` UTF-8 bound를 가지며 전체 request는 Express의 effective `16 KiB` JSON envelope 안에 있어야 한다. Store metadata, absolute path, credential, Server-private replacement proposal key, native/MCP/request identity, traceback과 unsettled history variant는 public type에 포함하지 않는다. Product text frame은 Server의 current bounded projection만 표현한다.

## 소비 경계

| Consumer | 사용 방식 |
| --- | --- |
| `apps/server` | HTTP admission에서 request decoder를 사용하고 domain object를 shared response·frame type으로 projection한다. |
| `apps/chat-shell` | JSON response와 NDJSON line마다 shared decoder를 사용한다. Fetch, byte framing과 React state는 app이 소유한다. |

`@ay-ple/codex-chat-runtime`의 browser-safe `./contract`는 native Chat tracer contract를 계속 소유한다. 이 package는 product wire contract만 소유하며 Runtime protocol이나 Server domain module을 재노출하지 않는다.

## 검증

```bash
npm run test -w @ay-ple/product-contract
npm run typecheck -w @ay-ple/product-contract
npm run build -w @ay-ple/product-contract
```

Unit table은 세 갈래 Review request·response와 continuation, replacement·recovery activity, retry ancestry를 포함한 valid public projection과 private·unsettled·malformed binding invalid family를 함께 검증한다. `types: []`와 DOM lib로 production module을 typecheck하므로 Node global이나 Express type에 의존하지 않는다. 실제 Server producer conformance와 Browser fetch/NDJSON adapter regression은 각 app test가 소유한다.
