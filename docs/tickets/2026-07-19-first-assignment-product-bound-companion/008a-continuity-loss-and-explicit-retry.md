# 008a — Continuity loss와 explicit retry를 닫는다

## Agent triage

- State: ready-for-agent
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

- [ ] Review answer 전 Browser·Server·Runtime loss가 interrupted·no-apply와 explicit retry CTA로 수렴하고 unanswered prompt를 복원하지 않는다.
- [ ] Explicit retry가 새 Run·Turn·keys를 만들고 이전 unknown/interrupted receipt를 보존한다.
- [ ] Apply commit 뒤 continuation loss가 confirmed revision을 유지하고 no-reapply를 증명한다.
- [ ] Duplicate·late response와 retry race가 second confirmation, apply나 native Turn을 만들지 않는다.
- [ ] Valid canonical store를 explicit workspace reactivation으로 다시 연 뒤 settled outcome을 표시하고 transient prompt는 복원하지 않는다.
- [ ] Sidebar hide/show와 ordinary Chat clarification이 product decision, recovery나 interrupt를 합성하지 않는다.
- [ ] Continuity loss와 explicit retry Browser traces가 real Vite/Express와 deterministic Runtime/product store를 통과한다.

## Verification

- Targeted test or command: focused product operation loss/fault-injection tests, Browser continuity/retry Playwright traces
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run test:e2e -w @ay-ple/chat-shell`, `npm run check:docs-links`, `git diff --check`
- Manual or live smoke: desktop Browser에서 answer 전 loss 표시와 한 번의 explicit retry를 확인한다. Process-loss branch는 deterministic automation을 authority로 삼는다.

## Blocked By

- [008-assignment-revision-and-reject.md](008-assignment-revision-and-reject.md) — Review의 모든 decision lifecycle을 먼저 닫는다

## Starting Points

- Parent spec `Durable state and atomic apply`, `Failure Behaviour` and Browser continuity traces
- `packages/product-contract/` — public recovery/retry projection owner
- `apps/server/src/assignment-action-faults.test.ts`
- `apps/server/src/codex-chat-disconnect.test.ts`
- `apps/server/src/codex-chat-lifecycle.test.ts`
- 007–008 product Browser reducer and Playwright harness
