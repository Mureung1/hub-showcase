# 008a — Continuity loss와 explicit retry를 닫는다

## Agent triage

- State: completed
- Surface: local-ticket
- Next actor: none

## Parent Spec

[First Assignment Product-bound Codex Companion](../../specs/2026-07-19-first-assignment-product-bound-companion.md)

## What It Delivers

Browser·Server·Runtime continuity loss가 Review 전이나 atomic apply 뒤에 발생해도 성공·실패를 합성하지 않고 interrupted·confirmed outcome과 explicit retry로 수렴하는 product lifecycle을 완성한다.

## Spec Traceability

- User stories: 8, 9, 10, 11, 12
- Implementation contract: Durable state and atomic apply; Plan `request_user_input` adaptation; Failure Behaviour; Testing Decisions — Browser continuity traces

## Slice-Specific Constraints

- Review answer 전 Browser·Server·Runtime continuity loss는 pending patch를 historical `interrupted` record로 남기고 no confirmation·no apply로 정산한다. Original call hydration이나 auto-resume을 만들지 않는다.
- Explicit retry만 새 `ModelingInvocation`, `ModelingRun`, native Turn과 proposal/decision keys를 만든다. Prior unknown/interrupted receipt를 덮어쓰거나 자동 retry하지 않는다.
- Atomic apply 뒤 native answer/response loss가 발생하면 confirmed revision을 유지하고 continuation loss만 표시한다. Same patch를 다시 적용하지 않는다.
- Terminal·interrupt·unknown 뒤 operation lease와 current app-managed transient artifact cleanup을 bounded하게 정산한다. Workspace source/store recovery는 008b가 소유한다.
- Browser는 interrupted, continuation-lost, retry 가능 여부를 학생용 copy와 action으로 표시한다. Transcript나 unanswered native prompt를 복원하지 않는다.
- Recovery·retry frame과 public action은 006a shared product contract를 확장해 Server와 Browser가 함께 사용한다. Local duplicate schema를 만들지 않는다.
- Sidebar hide/show는 continuity loss나 retry event가 아니며 lifecycle을 바꾸지 않는다.

## Acceptance Criteria

- [x] Review answer 전 Browser·Server·Runtime loss가 interrupted·no-apply와 explicit retry CTA로 수렴하고 unanswered prompt를 복원하지 않는다.
- [x] Explicit retry가 새 Run·Turn·keys를 만들고 이전 unknown/interrupted receipt를 보존한다.
- [x] Apply commit 뒤 continuation loss가 confirmed revision을 유지하고 no-reapply를 증명한다.
- [x] Duplicate·late response와 retry race가 second confirmation, apply나 native Turn을 만들지 않는다.
- [x] Valid canonical store를 explicit workspace reactivation으로 다시 연 뒤 settled outcome을 표시하고 transient prompt는 복원하지 않는다.
- [x] Sidebar hide/show와 ordinary Chat clarification이 product decision, recovery나 interrupt를 합성하지 않는다.
- [x] Review accept/reject ACK 뒤 one-shot hydration이 pending·failure여도 same-Turn ordinary clarification의 answer/cancel과 explicit interrupt를 막지 않으며 decision·apply를 다시 실행하지 않는다.
- [x] 먼저 시작한 one-shot `active` snapshot이 terminal settled hydration보다 늦게 도착해도 최신 `idle` history와 recovery 표시를 덮어쓰지 않는다.
- [x] Continuity loss와 explicit retry Browser traces가 real Vite/Express와 deterministic Runtime/product store를 통과한다.

## Verification

- Targeted test or command:
  - `npm run test -w @ay-ple/product-contract`: 11/11 passed
  - `npm run test -w @ay-ple/server`: 127/127 passed
  - `npm run test -w @ay-ple/chat-shell`: 52/52 passed
  - `NODE_OPTIONS=--conditions=development npx tsx --test apps/server/src/semester-workspace-action.test.ts`: accept·reject atomic decision의 first·second reopen을 포함해 18/18 passed
  - `npm run test:e2e -w @ay-ple/chat-shell -- --grep "polls coarse operation status|does not restore the pending Review"`: default 5초 drain의 final read와 실제 reload delayed settlement를 Chromium desktop 2/2 passed
  - `npm run test:e2e -w @ay-ple/chat-shell -- --project=chromium-desktop --grep "post-Review same-Turn ordinary clarification"`: lost Accept response 뒤 answer, Reject ACK 뒤 failing hydration 중 cancel, delayed `active` hydration 중 nonterminal interrupt의 Chromium desktop 3/3 passed
- Repository checks:
  - `npm test`: passed; workspace materializer 7/7, product contract 11/11, Runtime 65/65, Server 127/127, Chat Shell 52/52, camp artifact 16/16
  - `npm run typecheck`: passed
  - `npm run build`: passed
  - `npm run lint -w @ay-ple/chat-shell`: passed
  - `npm run test:e2e -w @ay-ple/chat-shell`: Chromium desktop 23/23 passed
  - `npm run check:docs-links`: active 28개와 historical banner 2개 모두 green
  - `git diff --check`: passed
- Manual or live smoke: real Vite/Express와 deterministic Runtime/product store를 통과하는 `1440x900` Chromium trace에서 answer 전 stream loss→interrupted/no-apply→한 번의 explicit retry, default disconnect drain 뒤 final `idle` read, pending Review 중 실제 reload→settled recovery, finite Review HTTP response loss 뒤 native completed 유지, Review ACK 뒤 hydration pending·failure 중 same-Turn clarification control, delayed one-shot `active` response 뒤 최신 continuation-loss 유지와 apply 뒤 no-reapply를 확인했다. 별도 provider live smoke는 이 deterministic loss slice의 authority가 아니므로 실행하지 않았다.
- Code review: `ab27cc495aec8481a2750ca48e531556df3b9180...360bb3c5a8d3018448b2a98188b0550b29aec080`를 Standards와 Spec 두 축으로 독립 검토했다. 첫 검토의 Standards 2건·Spec 2건을 response authority 문서, ACK 직후 identity-safe control release와 pending/failure Browser oracle로 수정했다. 재검토에서 발견한 Spec 1건은 shared read-generation guard와 held stale-`active` ordering trace로 수정했고, 최종 재검토는 Standards 0건·Spec 0건으로 종료했다.

## Blocked By

- [008-assignment-revision-and-reject.md](008-assignment-revision-and-reject.md) — Review의 모든 decision lifecycle을 먼저 닫는다

## Starting Points

- Parent spec `Durable state and atomic apply`, `Failure Behaviour` and Browser continuity traces
- `packages/product-contract/` — public recovery/retry projection owner
- `apps/server/src/assignment-action-faults.test.ts`
- `apps/server/src/codex-chat-disconnect.test.ts`
- `apps/server/src/codex-chat-lifecycle.test.ts`
- 007–008 product Browser reducer and Playwright harness

## Result

- Shared product contract에 exact `FirstAssignmentRetryRequest`, `operation.recovery`, settled Run retry ancestry·recovery와 Review continuation outcome을 추가했다.
- Server는 prior `interrupted | unknown` receipt의 canonical Course·Recipe·arguments·source snapshot과 one-child ancestry를 serialized admission에서 검증하고, explicit retry만 새 `ModelingRun`·native Turn·proposal key를 만든다. Duplicate·late retry와 Review response는 second Turn·confirmation·apply 없이 fail closed한다.
- Review apply/no-apply atomic commit 직후 process가 끊겨도 first·second reopen 모두 confirmed revision을 유지한 `continuation_lost`로 수렴하고 same patch·confirmation·Assignment를 다시 만들지 않는다.
- Browser는 finite Review HTTP response loss만으로 native recovery를 합성하지 않는다. Coarse `operationStatus(active | idle)`를 따라 Server drain 상수를 복사하지 않고 final `idle` bootstrap을 읽으며, 실제 reload도 unanswered Review를 복원하지 않은 채 settled recovery와 explicit retry CTA로 자동 수렴한다. Authoritative terminal 뒤 hydration failure는 operation lifecycle을 덮어쓰지 않는다.
- 정상 Review accept/reject exact response는 response control을 one-shot hydration보다 먼저 해제한다. Response-loss confirmation용 one-shot read와 reload·disconnect·terminal recovery용 `active → idle` settled polling을 분리해 같은 Turn의 일반 clarification answer/cancel·interrupt를 유지한다.
- Shared bootstrap read generation은 먼저 시작한 one-shot `active` response가 나중에 끝나도 더 최신 terminal settled history·failure·refreshing 상태를 되돌리지 않으며, decision confirmation과 apply는 한 번만 유지한다.
- Real Vite/Express Chromium trace가 answer 전 loss→retry→accept, default drain, pending Review 실제 reload, response-only loss와 apply 뒤 no-reapply를 검증한다. Sidebar와 ordinary Chat clarification의 기존 lifecycle은 유지했다.
- Post-Review corrective Chromium trace는 lost Accept response 뒤 answer, Reject 뒤 failing hydration 중 cancel, clarification interrupt의 nonterminal ACK와 delayed stale `active` response 무시를 검증한다.
- 구현 커밋: `48e12239`, `af0e719b`, `65928d18`, `d92bfa97`, `17671388`, `26eca716`, `b8b18e02`, `645da39b`, `a08c742e`, `3144be35`, `cb76b123`, `8e26362b`, `360bb3c5`
- Workspace source/store recovery는 008b, exact actual-child/local/live-provider conformance는 009가 계속 소유한다.
