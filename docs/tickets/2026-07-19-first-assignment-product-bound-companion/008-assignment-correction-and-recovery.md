# 008 — Assignment correction과 recovery를 닫는다

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

[First Assignment Product-bound Codex Companion](../../specs/2026-07-19-first-assignment-product-bound-companion.md)

## What It Delivers

학생이 pending Assignment 제안을 수정 요청하거나 거절할 수 있고, Browser·Server·runtime loss, stale·duplicate decision, source/state drift와 cleanup failure가 발생해도 원본과 confirmed state를 손상하지 않은 채 중단·복구·명시적 retry로 수렴하는 전체 correction/recovery vertical을 완성한다.

## Spec Traceability

- User stories: 6, 7, 8, 9, 10, 11, 12
- Implementation contract: Protected execution guard; Durable state and atomic apply; Plan `request_user_input` adaptation; Failure Behaviour; Testing Decisions — Browser Playwright negative traces

## Slice-Specific Constraints

- 수정 요청은 `UserConfirmation`이 아니라 same-Turn feedback이다. Fresh request key로 valid replacement proposal이 올 때까지 old patch를 apply하지 않는다.
- Replacement 성공은 old pending→superseded와 new pending creation을 atomic하게 처리하고 active Review를 새 patch 하나로 바꾼다.
- Reject는 settled no-apply `UserConfirmation`이며 Codex answer와 관계없이 confirmed model을 바꾸지 않는다.
- Answer 전 Browser·Server/runtime continuity loss는 pending patch를 historical interrupted record로 남기고 no confirmation·no apply로 정산한다. Original call hydration이나 auto-resume을 만들지 않는다.
- Explicit retry만 새 `ModelingInvocation`, `ModelingRun`, native Turn과 proposal keys를 만든다.
- Atomic apply 뒤 native answer/response loss가 발생하면 confirmed revision을 유지하고 continuation loss만 표시한다. Same patch를 다시 적용하지 않는다.
- Duplicate·late answer, wrong patch/interaction/decision key와 stale base는 deterministic conflict이며 second apply를 만들지 않는다.
- `RawMaterial` digest drift는 active Turn을 interrupt하고 source-conflict/recovery-required로 전환한다. Original path를 자동 overwrite하거나 drift 원인을 추정하지 않는다.
- Confirmed-state drift는 last committed revision에서 복구하고 실패하면 recovery-blocked read-only로 연다. Unresolved recovery 중 새 native action을 시작하지 않는다.
- Terminal·interrupt·unknown 뒤 scratch·lease cleanup과 next-open journal reconciliation을 검증한다.
- Sidebar hide/show는 recovery event가 아니며 lifecycle을 바꾸지 않는다.

## Acceptance Criteria

- [ ] Revision feedback이 같은 Turn으로 전달되고 replacement proposal이 old patch를 supersede한 뒤 새 Review로 나타난다.
- [ ] Replacement 전 terminal/loss/validation failure가 old patch를 interrupted로 끝내고 confirmation·apply를 만들지 않는다.
- [ ] Reject가 settled no-apply outcome으로 남고 reload 뒤에도 confirmed model이 unchanged다.
- [ ] Duplicate same decision은 existing outcome을 반환하고 conflicting·late decision은 second confirmation/apply 없이 거절된다.
- [ ] Answer 전 Browser·Server/runtime loss가 interrupted·no-apply와 explicit retry CTA로 수렴하며 unanswered prompt를 복원하지 않는다.
- [ ] Explicit retry가 새 Run·Turn·keys를 만들고 prior unknown/interrupted receipt를 덮어쓰지 않는다.
- [ ] Apply commit 뒤 continuation loss가 confirmed revision을 유지하고 no-reapply를 증명한다.
- [ ] Selected 또는 registered RawMaterial drift가 action을 interrupt하고 recovery-required로 열리며 original bytes를 자동 복구·수정하지 않는다.
- [ ] Confirmed product-state drift가 last commit에서 복구되거나 recovery-blocked read-only가 되고 새 action을 차단한다.
- [ ] Two fresh E2E runs 사이 workspace, product state, scratch와 native session이 겹치지 않고 tracked seed digest가 그대로다.
- [ ] Sidebar hide/show와 ordinary Chat clarification이 product decision이나 interrupt를 합성하지 않는다.

## Verification

- Targeted test or command: focused Server fault-injection suite, `npm run test:e2e -w @ay-ple/chat-shell` negative matrix
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run check:docs-links`, `git diff --check`
- Manual or live smoke: revise→replacement→accept, reject, sidebar hide/show와 one explicit retry를 desktop Browser에서 확인한다. Process-loss branches는 deterministic automation을 authority로 삼는다.

## Blocked By

- [007-chat-first-assignment-product-vertical.md](007-chat-first-assignment-product-vertical.md) — Chat-first Assignment product vertical을 닫는다

## Starting Points

- Parent spec `Failure Behaviour` and Browser Playwright traces
- Product store and guard journal introduced by tickets 001, 005 and 006
- `apps/server/src/codex-chat-disconnect.test.ts`
- `apps/server/src/codex-chat-lifecycle.test.ts`
- `apps/chat-shell/src/chat-model.test.ts`
- `apps/chat-shell/e2e/chat-shell.spec.ts`
