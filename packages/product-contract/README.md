# @ay-ple/product-contract

Canonical product Server가 만드는 `/api/product/*` JSON·NDJSON과 Browser가 읽고 보내는 같은 wire contract를 소유하는 dependency-free TypeScript package다. `apps/server`와 `apps/chat-shell`은 서로의 source를 import하지 않고 이 package의 public module만 공유한다. Product-only cutover 후 Browser production source가 사용하는 shared public contract는 이 package 하나다.

## 책임

| 소유하는 내용 | 소유하지 않는 내용 |
| --- | --- |
| Account Readiness, coarse `operationStatus(active | idle)`, workspace·Course·RawMaterial, workspace recovery, settled history와 material preview·refresh outcome의 exact public type·decoder | workspace store format/version, physical path, migration과 domain transaction |
| User-owned Git lifecycle용으로 확장된 `TargetProductBootstrap`, `ProductWorkspaceLifecycle`, Browser-safe workspace/candidate summary와 `activeOperation` exact decoder | Candidate path, registry bytes, transition execution과 Runtime lease. Candidate/bootstrap branch는 ADR 0020 이후 correction residue |
| Current Assignment action·explicit retry, product Chat, Browser-safe Codex model catalog·Turn 설정, old 세 갈래 Review 옆의 semantic Review request/result/frame, 일반 interaction answer/cancel과 interrupt request·response literal | Express route composition, Origin guard, HTTP status와 byte framing |
| Closed `ProductOperationFrame`, public `StatePatch`·question, Review replacement·resolution·recovery projection과 pure exact decoder | native App Server event, raw JSON-RPC identity, MCP credential·complete payload와 cross-frame lifecycle reducer |
| First Assignment의 public Recipe version·arguments, advertised model·reasoning·`default`/`fast` Turn 선택과 `16 KiB` JSON envelope bound | managed `SKILL.md` path·digest, raw model provider/config와 private MCP binding |

Decoder는 missing·extra·unknown field와 Review decision/outcome·continuation의 잘못된 조합을 거절한다. Material refresh response는 복구가 끝난 ready workspace와 `refreshed | source_rebaselined` outcome을 함께 요구하며, 여전히 recovery 상태인 성공 응답은 거절한다. `FirstAssignmentRetryRequest`는 canonical Assignment 입력과 prior `retryOfRunId`를 exact하게 요구한다. Settled `ModelingRun`은 retry ancestry와 optional recovery를, `operation.recovery`는 `interrupted | unknown`의 retry 가능 여부 또는 apply 뒤 `continuation_lost`의 confirmed revision을 표현한다. 수정 feedback은 non-empty `8 KiB` UTF-8 bound를 가지며 전체 request는 Express의 effective `16 KiB` JSON envelope 안에 있어야 한다. Store metadata, absolute path, credential, Server-private replacement proposal key, native/MCP/request identity, traceback과 unsettled history variant는 public type에 포함하지 않는다. Product text frame은 Server의 current bounded projection만 표현한다.

새 semantic Review codec은 domain-neutral before/after change와 bounded evidence preview의 optional-field presence·array order를 보존한다. `review.requested | review.resolved | review.failed`만 받고 token·Runtime binding, native identity, patch·revision과 raw MCP locator를 거절한다. 이 expand contract는 current public operation frame과 old Review contract를 제거하거나 전환하지 않는다.

User-owned Git lifecycle을 위해 `decodeTargetProductBootstrap`을 current public bootstrap 옆에 expand한 구현이 있다. `ProductWorkspaceLifecycle`은 `bootstrap | active | transitioning | recovery_required | registry_incompatible`를 exact-key union으로 구분하고 v4와 같은 workspace·semester identity bound, path 없는 safe label, candidate/init operation binding과 transition target cross-field invariant를 검증한다. [ADR 0020](../../docs/adr/0020-bootstrap-semester-workspaces-before-app-startup.md)은 App-owned candidate/init lifecycle을 폐기했으므로 이 candidate branch는 adopted target이 아니며 후속 contract 대상이다. Current `ProductBootstrap`은 `CurrentProductBootstrap`의 compatibility alias이고 `decodeProductBootstrap`·`isProductOperationId`의 action/chat 의미는 joint cutover 전까지 바뀌지 않는다.

## 소비 경계

| Consumer | 사용 방식 |
| --- | --- |
| `apps/server` | HTTP admission에서 request decoder를 사용하고 domain object를 shared response·frame type으로 projection한다. |
| `apps/chat-shell` | JSON response와 NDJSON line마다 shared decoder를 사용한다. Fetch, byte framing과 React state는 app이 소유한다. |

이 package는 product wire contract만 소유하며 Runtime protocol, native identity, Server domain module을 재노출하지 않는다. Native Runtime contract와 private Node↔Python transport는 `@ay-ple/codex-chat-runtime`과 Server 내부에 남고 Browser bundle의 compatibility surface가 아니다.

## 검증

```bash
npm run test -w @ay-ple/product-contract
npm run typecheck -w @ay-ple/product-contract
npm run build -w @ay-ple/product-contract
```

Unit table은 세 갈래 Review request·response와 continuation, replacement·operation recovery activity, workspace recovery·material refresh outcome, retry ancestry, target lifecycle 전체 variant와 active operation binding을 포함한 valid public projection과 private·unsettled·malformed binding invalid family를 함께 검증한다. `types: []`와 DOM lib로 production module을 typecheck하므로 Node global이나 Express type에 의존하지 않는다. 실제 Server producer conformance와 Browser fetch/NDJSON adapter regression은 각 app test가 소유한다.
