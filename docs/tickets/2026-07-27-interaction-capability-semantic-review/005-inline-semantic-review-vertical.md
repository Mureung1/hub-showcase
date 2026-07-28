# 005 — Inline Semantic Review vertical

## Agent triage

- State: completed
- Surface: local-ticket
- Next actor: none

## Parent Spec

`docs/specs/2026-07-27-interaction-capability-semantic-review.md`

## What It Delivers

Broker가 preflight한 Semantic Review를 current product Turn NDJSON transcript의 inline card로 보여주고, 사용자의 `accept | revise | reject`를 exact pending interaction에 돌려주는 internal target vertical을 제공한다. Pending 동안 새 입력은 닫히고 전체 Turn interrupt만 남으며, 정상 result와 failure 뒤 card는 chronology를 보존한 read-only outcome이 된다.

## Spec Traceability

- User stories: 1, 3, 4, 5, 10
- Implementation contract: `Browser wire와 inline Review`, `Review round trip`, `Failure Behaviour`

## Slice-Specific Constraints

- Current Product Turn NDJSON을 delivery channel로 재사용하고 별도 socket, Review event store와 hydration ledger를 만들지 않는다.
- Browser는 ticket 001의 `ProductReviewFrame`과 `ProductReviewResult`만 안다. Raw MCP request·response, private credential, absolute path와 native identity를 받지 않는다.
- `POST /api/product/reviews/:interactionId`는 exact result body만 받고 valid pending answer가 held Adapter response에 전달되면 body 없는 `204 No Content`를 반환한다. Duplicate·late·wrong answer와 delivery 전 close는 Browser-safe `409`다.
- `review.resolved` frame이 UI settlement authority다. HTTP success, local optimistic state, patch revision·replay·continuation response로 settled 결과를 합성하지 않는다.
- Pending card는 inline `accept | revise | reject`와 conditional feedback만 제공한다. Modal, drawer, dedicated page, dismiss와 fourth cancel을 만들지 않는다.
- Pending 동안 composer, 새 Turn과 steer를 disable하고 전체 Turn interrupt만 유지한다. Interrupt와 continuity loss는 Review result가 아니라 `review.failed`다.
- `revise` 뒤 fresh MCP call은 새 `interactionId`와 card를 append한다. 이전 card를 replace·reopen하지 않는다.
- 이 slice는 internal target composition에서 완결한다. Current public First Assignment route와 old Review wire의 atomic 전환은 ticket 007 전까지 수행하지 않는다.
- Desktop 1440×900과 1920px-class만 검증하며 mobile layout을 추가하지 않는다.

## Acceptance Criteria

- [x] Valid requested frame이 summary, question, ordered semantic changes와 bounded evidence context를 한 inline card에 exact 투영한다.
- [x] Accept, non-empty-feedback revise와 reject가 한 `204` answer 및 한 `review.resolved` frame으로 same held call을 정산한다.
- [x] Revise 후 fresh call이 previous read-only card 아래 새 card를 append하고 old interaction에 다시 답할 수 없다.
- [x] Duplicate·late·wrong answer, invalid feedback와 delivery 전 close가 `409` 또는 failure frame으로 끝나며 두 번째 result를 만들지 않는다.
- [x] Pending 동안 composer·새 Turn·steer가 disabled이고 Turn interrupt만 동작하며, interrupt·disconnect·runtime failure 뒤 control 없는 failure card가 남는다.
- [x] Reload가 App store에서 settled Review를 복원하지 않고, Browser bundle과 network payload에 private credential·native identity가 없다.
- [x] Current public composition의 기존 behavior는 internal target vertical 추가 뒤에도 green이다.

## Verification

- Targeted: `npm test -w @ay-ple/product-contract && npm test -w @ay-ple/server && npm test -w @ay-ple/chat-shell` — 각각 21/21, 167/167, 47/47 green.
- Browser: `npm run test:e2e -w @ay-ple/chat-shell -- --grep 'internal inline Semantic Review target'` — Chromium desktop 1/1 green. 1440×900에서 exact change·evidence digest, disabled composer·interrupt와 accept autofocus를, 1920×1080에서 revise→fresh append·accept·reject·interrupt failure와 single native interrupt를 검증했다.
- Repository: `npm run lint -w @ay-ple/chat-shell && npm run typecheck && npm run build && npm test`와 `npm run check:docs-links` — 최종 코드 기준 전체 green.
- Additional Browser regression: 전체 33개 Playwright trace에서 32개가 green이었고 기존 same-root restart scenario가 store-authority race로 한 번 실패했다. 같은 scenario의 즉시 isolated 재실행은 1/1 green이었다.
- Review: Fixed point `cd6bc5d94776e2d724cfa460a5ffa3235978d570` 기준 Standards·Spec 병렬 review에서 stale pending mirror, Runtime terminal 미연결과 evidence digest 비표시를 수정했다. 재검토에서 normal Turn terminal과 Runtime-generation terminal의 credential lifecycle을 분리했고, 최종 두 축 모두 actionable finding 0건이었다.

## Result

Opt-in `internalInteractionTarget`을 같은 Server listener에 composition해 authenticated Broker call을 current Product Turn NDJSON의 inline Semantic Review card로 전달하고, exact `accept | revise | reject`를 bodyless `204`와 한 `review.resolved` frame으로 held call에 정산한다. Card는 ordered before/after change, relative evidence path·occurrence·whole-file SHA-256·bounded quote context를 표시하며 settled·failed chronology를 read-only로 보존한다. Turn interrupt·disconnect·Turn terminal·Runtime failure와 shutdown은 normal result 없이 `review.failed`로 닫히고, normal Turn terminal은 Runtime-generation credential을 revoke하지 않는다. Current public First Assignment route와 old Review wire는 변경하지 않았다.

Implementation commits:

- `547952d25` — `feat: add inline semantic review vertical`
- `8e2491071` — `fix: close semantic reviews on turn loss`

## Blocked By

- `./002-broker-evidence-held-round-trip.md` — Broker·Evidence held round trip

## Starting Points

- `packages/product-contract/src/review.ts`
- `packages/product-contract/src/operation-frame.ts`
- `packages/product-contract/src/index.test.ts`
- `apps/server/src/product-http.ts`
- `apps/server/src/http-ndjson.ts`
- `apps/server/src/product-chat-action.test.ts`
- `apps/chat-shell/src/product-api.ts`
- `apps/chat-shell/src/product-api.test.ts`
- `apps/chat-shell/src/product-chat-model.ts`
- `apps/chat-shell/src/product-chat-model.test.ts`
- `apps/chat-shell/src/use-product-chat.ts`
- `apps/chat-shell/src/product-chat-presentation.tsx`
- `apps/chat-shell/e2e/chat-shell.spec.ts`
