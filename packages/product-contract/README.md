# @ay-ple/product-contract

Canonical Product Server와 Browser가 공유하는 target-only JSON·NDJSON contract를 소유하는 dependency-free TypeScript package다. `apps/server`와 `apps/chat-shell`은 서로의 source를 import하지 않고 이 package의 public root만 공유한다.

## 책임

| 소유하는 내용 | 소유하지 않는 내용 |
| --- | --- |
| Account Readiness, prepared workspace의 `starting | active | recovery_required` lifecycle, path 없는 workspace summary와 normal `product_turn` binding | Absolute root, registry bytes, workspace store·revision, Runtime lease와 private startup detail |
| Material selection이 없는 normal Chat request, 일반 clarification answer, empty mutation request와 safe error envelope | Course, RawMaterial, First Assignment action·retry, academic history와 patch-bound Review |
| Browser-safe Codex model catalog·Turn 설정, target operation/activity·interaction·interrupt·terminal frame | Express route composition, HTTP status·NDJSON framing, native App Server event와 raw JSON-RPC identity |
| Domain-neutral `ProductReviewFrame`·`ProductReviewResult`, ordered semantic before/after change와 bounded evidence preview | Raw MCP contract, Broker credential·binding, native identity, durable Review ledger와 filesystem apply authority |

Public `.` root는 위 target contract만 export한다. Academic `Course`·material registry/preview, action/retry, `ProductStatePatch`, revision-bound Review request/response와 settled history type·decoder는 compatibility alias나 hidden export 없이 제거됐다.

Decoder는 missing·extra·unknown field를 거절하고 JSON envelope, text, identifier와 evidence byte bound를 적용한다. Public operation ID는 `operation_<32 hex>` 하나이며 old `chat_*`·`action_*` ID를 받지 않는다. Semantic Review는 `review.requested | review.resolved | review.failed`만 허용하고 token, Runtime binding, native identity, patch·revision과 raw MCP locator를 거절한다.

## 소비 경계

| Consumer | 사용 방식 |
| --- | --- |
| `apps/server` | Target Product Router admission에서 request decoder를 사용하고 lifecycle·operation·Review를 shared public type으로 projection한다. |
| `apps/chat-shell` | JSON response와 NDJSON line마다 shared decoder를 사용한다. Fetch, byte framing과 React state는 app이 소유한다. |

Native Runtime contract와 private Node↔Python transport는 `@ay-ple/codex-chat-runtime`과 Server 내부에 남는다. Legacy academic persistence source는 이 package의 public 또는 private module에 의존하지 않는다.

## 검증

```bash
npm run test -w @ay-ple/product-contract
npm run typecheck -w @ay-ple/product-contract
npm run build -w @ay-ple/product-contract
```

Unit suite는 public root의 exact export inventory, target operation ID, material-free Chat, 일반 clarification, workspace lifecycle과 Semantic Review의 valid·invalid family를 검증한다. `types: []`와 DOM lib로 production module을 typecheck하므로 Node global이나 Express type에 의존하지 않는다.
