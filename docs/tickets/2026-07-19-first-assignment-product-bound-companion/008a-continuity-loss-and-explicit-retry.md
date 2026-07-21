# 008a — Continuity loss와 explicit retry를 닫는다

## Agent triage

- State: claimed
- Surface: local-ticket
- Next actor: /implement

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
- [x] Continuity loss와 explicit retry Browser traces가 real Vite/Express와 deterministic Runtime/product store를 통과한다.

## Verification

- Targeted test or command:
  - `npm run test -w @ay-ple/product-contract`: 11/11 passed
  - `npm run test -w @ay-ple/server`: 127/127 passed
  - `npm run test -w @ay-ple/chat-shell`: 51/51 passed
  - `NODE_OPTIONS=--conditions=development npx tsx --test apps/server/src/semester-workspace-action.test.ts`: accept·reject atomic decision의 first·second reopen을 포함해 18/18 passed
  - `npm run test:e2e -w @ay-ple/chat-shell -- --grep "polls coarse operation status|does not restore the pending Review"`: default 5초 drain의 final read와 실제 reload delayed settlement를 Chromium desktop 2/2 passed
- Repository checks:
  - `npm test`: passed; workspace materializer 7/7, product contract 11/11, Runtime 65/65, Server 127/127, Chat Shell 51/51, camp artifact 16/16
  - `npm run typecheck`: passed
  - `npm run build`: passed
  - `npm run lint -w @ay-ple/chat-shell`: passed
  - `npm run test:e2e -w @ay-ple/chat-shell`: Chromium desktop 20/20 passed
  - `npm run check:docs-links`: active 28개와 historical banner 2개 모두 green
  - `git diff --check`: passed
- Manual or live smoke: real Vite/Express와 deterministic Runtime/product store를 통과하는 `1440x900` Chromium trace에서 answer 전 stream loss→interrupted/no-apply→한 번의 explicit retry, default disconnect drain 뒤 final `idle` read, pending Review 중 실제 reload→settled recovery, finite Review HTTP response loss 뒤 native completed 유지, authoritative terminal 뒤 bootstrap failure 격리와 apply 뒤 no-reapply를 확인했다. 별도 provider live smoke는 이 deterministic loss slice의 authority가 아니므로 실행하지 않았다.
- Code review: `35fe16f49086f7e8ee8ecaa35cae4772111b498a...3144be35e3f6020fd53fda960914cfd562a07842`를 Standards와 Spec 두 축으로 독립 검토했다. Corrective 구현 뒤 Standards 2건과 Spec 0건을 확인해 post-terminal recovery fail-closed와 settled-decision predicate 중복을 수정했고, 새 fixed point diff의 양축 재검토에서 Standards 0건·Spec 0건으로 종료했다.

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
- Real Vite/Express Chromium trace가 answer 전 loss→retry→accept, default drain, pending Review 실제 reload, response-only loss와 apply 뒤 no-reapply를 검증한다. Sidebar와 ordinary Chat clarification의 기존 lifecycle은 유지했다.
- 구현 커밋: `48e12239`, `af0e719b`, `65928d18`, `d92bfa97`, `17671388`, `26eca716`, `b8b18e02`, `645da39b`, `a08c742e`, `3144be35`
- Workspace source/store recovery는 008b, exact actual-child/local/live-provider conformance는 009가 계속 소유한다.
