# @ay-ple/product-contract

Canonical Product Server와 Browser가 공유하는 target-only JSON·NDJSON contract를 소유하는 dependency-free TypeScript package다. `apps/server`와 `apps/chat-shell`은 서로의 source를 import하지 않고 이 package의 public root만 공유한다.

## 책임

| 소유하는 내용 | 소유하지 않는 내용 |
| --- | --- |
| Account Readiness, prepared workspace의 `starting | active | recovery_required` lifecycle, path 없는 workspace summary와 normal `product_turn` binding | Absolute root, registry bytes, workspace store·revision, Runtime lease와 private startup detail |
| Material selection이 없는 normal Chat request, closed `organize_sources` ActionInvocation, 일반 clarification answer, empty mutation request와 safe error envelope | Dynamic action manifest, raw Skill·native input, Course, RawMaterial registry, action retry와 academic history |
| User-owned SemesterWorkspace 파일의 bounded source list·text preview와 ordered relative file ref projection | Absolute root, selected content·digest, app-owned material copy·revision, filesystem read·Git write authority와 PDF byte transport |
| Browser-safe Codex model catalog·Turn 설정, target operation/activity·interaction·interrupt·terminal frame | Express route composition, HTTP status·NDJSON framing, native App Server event와 raw JSON-RPC identity |
| Domain-neutral `ProductReviewFrame`·`ProductReviewResult`, ordered semantic before/after change와 bounded evidence preview | Raw MCP contract, Broker credential·binding, native identity, durable Review ledger와 filesystem apply authority |

Public `.` root는 위 target contract만 export한다. User-owned SemesterWorkspace의 source explorer를 위해 relative path·size·preview capability 목록과 content digest를 포함한 bounded text preview를 제공한다. `organize_sources` request는 ordered unique POSIX relative file ref `1..16`개와 optional `codexSettings`만 허용하며 workspace root, file content·digest, Skill·permission·native identity를 노출하지 않는다. 이는 app-owned `Course`·material registry를 복구하지 않으며 PDF byte transport, current file·Skill 검증과 action 실행은 Server가 소유한다. 기존 named First Assignment action/retry, `ProductStatePatch`, revision-bound Review request/response와 settled history type·decoder는 compatibility alias나 hidden export 없이 제거됐다.

Decoder는 missing·extra·unknown field를 거절하고 JSON envelope, text, identifier와 evidence byte bound를 적용한다. ActionInvocation은 unknown action, duplicate·empty·17개 이상 file ref, unsafe path, native field와 `16 KiB` 초과 envelope를 거절하고 request order를 보존한다. Chat decoder는 `action`, `files`, material field를 계속 거절한다. Workspace source projection은 absolute path, traversal, control character, duplicate relative path, unknown preview kind와 uppercase/non-SHA-256 digest를 거절한다. Public operation ID는 `operation_<32 hex>` 하나이며 old `chat_*`·`action_*` ID를 받지 않는다. Semantic Review는 `review.requested | review.resolved | review.failed`만 허용하고 token, Runtime binding, native identity, patch·revision과 raw MCP locator를 거절한다.

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

Unit suite는 public root의 exact export inventory, target operation ID, material-free Chat, closed ActionInvocation, 일반 clarification, workspace lifecycle, source list·text preview와 Semantic Review의 valid·invalid family를 검증한다. `types: []`와 DOM lib로 production module을 typecheck하므로 Node global이나 Express type에 의존하지 않는다.
