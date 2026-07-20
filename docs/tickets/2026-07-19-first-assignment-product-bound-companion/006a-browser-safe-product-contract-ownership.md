# 006a — Browser-safe product contract의 단일 owner를 만든다

## Agent triage

- State: completed
- Surface: local-ticket
- Next actor: none

## Parent Spec

[First Assignment Product-bound Codex Companion](../../specs/2026-07-19-first-assignment-product-bound-companion.md)

## What It Delivers

Server가 만드는 product response·activity와 Browser가 strict decode하는 같은 wire contract를 dependency-free TypeScript Module 하나가 소유한다. 007은 이 contract만 소비해 Assignment action, product Chat, Review와 일반 Plan interaction을 표시하며 Server·Browser에 세 번째 수동 schema를 만들지 않는다.

## Spec Traceability

- User stories: 4, 5, 6, 10, 11, 12
- Implementation contract: Module Responsibilities and Seams — Browser-safe local application; Browser-safe product operations and activity; Testing Decisions — Server integration and Browser Playwright

## Slice-Specific Constraints

- Product wire contract는 `@ay-ple/codex-chat-runtime`이나 한 app 내부가 아니라 `packages/product-contract/`의 dependency-free `@ay-ple/product-contract` package에 둔다. Server와 Chat Shell 어느 쪽도 상대 app source를 import하지 않는다.
- Bootstrap·Account Readiness·workspace·settled history·material preview, current product mutation response, public error envelope와 closed `ProductOperationFrame`을 exact types와 pure decoder로 소유한다.
- 007이 사용할 Assignment action, product Chat, Review, general interaction answer/cancel과 interrupt request literal도 같은 owner가 소유한다. Public Recipe version·arguments는 포함할 수 있지만 managed Skill path·digest·private MCP binding은 Server에 남긴다.
- Server producer는 domain object를 public projection으로 변환하고 shared contract를 만족시킨다. Browser fetch/NDJSON adapter는 shared decoder를 사용하되 HTTP fetch, byte framing, React state와 cross-frame lifecycle reducer는 contract package에 넣지 않는다.
- Absolute path, credential, store format/version, pending native correlation, raw JSON-RPC request ID, MCP token·complete payload와 traceback은 contract에 추가하지 않는다.
- Existing `/api/product/*` URL, status, JSON·NDJSON bytes, ordering, 16 KiB JSON envelope의 effective bound와 operation semantics를 바꾸지 않는다. 특히 current HTTP envelope보다 넓은 Chat text bound를 public request contract로 잘못 광고하지 않는다.
- OpenAPI, schema generator, generic event bus, product database abstraction과 007 UI를 만들지 않는다. Legacy `/api/codex-chat/*` surface도 이번 ticket에서 변경하지 않는다.

## Acceptance Criteria

- [x] Bootstrap·workspace·history·material preview와 current mutation response의 중복된 Server·Browser type roster가 shared owner로 이동한다.
- [x] 모든 006 product activity family와 Assignment/Chat terminal variant를 closed `ProductOperationFrame`과 exact decoder가 표현한다.
- [x] Current `/api/product/*` request·response literal을 one owner가 Server admission과 Browser caller에 연결하며 missing·extra·unknown field를 fail closed한다.
- [x] Shared decoder가 store metadata, absolute path, private native/MCP/request identity와 unsettled history variant를 거절한다.
- [x] 대표 Server output을 shared decoder에 통과시키는 producer conformance test와 pure contract valid/invalid table이 있다.
- [x] Browser production bundle이 Node·Express·Server domain module을 포함하지 않고 Server도 Browser code를 import하지 않는다.
- [x] Current source workbench, product Server behavior와 legacy Chat UI의 observable output이 extraction 전과 동일하다.
- [x] Package README와 Codex Chat implementation map이 contract owner, consumer와 Browser-safe boundary를 current fact로 기록한다.

## Verification

- Targeted checks: `npm run test -w @ay-ple/product-contract`, `npm run typecheck -w @ay-ple/product-contract`, `npm run build -w @ay-ple/product-contract`, focused Server product contract tests, `npm run test -w @ay-ple/chat-shell` 모두 통과.
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run check:docs-links`, `git diff --check` 모두 통과.
- Bundle boundary: Chat Shell production bundle에 Server domain identifier와 Node·Express import가 없고 `@ay-ple/product-contract`는 runtime import와 dependency가 없음을 확인.
- Code review: `26ac1ebd16abc78cd4c2ef9059d5757cee3adad1...480f2284`를 Standards·Spec 두 축으로 검토했으며 hard standard violation과 concrete spec finding이 없음을 확인.
- Post-review corrective: `npm run test -w @ay-ple/product-contract`, Server·Chat Shell workspace test, `npm test`, `npm run typecheck`, `npm run build`, Chat Shell lint, docs link, diff check와 production bundle import boundary를 재실행해 모두 통과.
- Corrective code review: `7183eb01949f766557a633601630c2590dffcca8...454bbf07`의 Standards·Spec actionable finding은 각각 0건.
- Manual or live smoke: 실행하지 않음. 이 slice는 behavior-preserving contract ownership이며 existing deterministic Server/Browser test가 authority다.

## Result

`@ay-ple/product-contract`가 Browser-safe product bootstrap·workspace·settled history·preview, current mutation request·response·error와 closed operation frame의 단일 owner가 되었다. Server admission·producer와 Chat Shell caller·NDJSON adapter는 같은 exact decoder를 사용하며, HTTP fetch·byte framing·domain projection·React state와 private runtime identity는 해당 package 밖에 남았다.

Post-review corrective로 `assignment-recipe.ts`의 public contract constant compatibility re-export를 제거하고 Server consumer가 actual owner인 `@ay-ple/product-contract`에서 직접 import하게 했다. `product-contract/src/index.ts`의 private internal split은 현재 family간 shared exactness·ID·byte-bound helper를 여러 import seam으로 나누는 churn에 비해 public interface leverage나 locality 개선이 작아 다음 실제 contract 확장 시점으로 defer했다. Public package root와 wire behavior는 변경하지 않았다.

- Implementation commit: `480f2284` (`feat: centralize browser-safe product contract`)
- Corrective commit: `454bbf07` (`refactor: import assignment contract constants directly`)

## Blocked By

- [006-first-assignment-action-stream.md](006-first-assignment-action-stream.md) — First Assignment action stream의 complete public projection을 고정한다

## Starting Points

- `apps/server/src/product-http.ts`
- `apps/server/src/assignment-action.ts`
- `apps/server/src/product-bootstrap.test.ts`
- `apps/server/src/assignment-action.test.ts`
- `apps/server/src/product-chat-action.test.ts`
- `apps/chat-shell/src/product-api.ts`
- `apps/chat-shell/src/product-api.test.ts`
- `packages/codex-chat-runtime/src/contract.ts` — Browser-safe packaging pattern only; product contract owner로 확장하지 않는다
- `package.json` workspace build·test·typecheck order
