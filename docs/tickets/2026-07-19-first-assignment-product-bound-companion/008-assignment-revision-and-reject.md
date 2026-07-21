# 008 — Assignment 수정 요청과 거절을 닫는다

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

[First Assignment Product-bound Codex Companion](../../specs/2026-07-19-first-assignment-product-bound-companion.md)

## What It Delivers

학생이 pending Assignment 제안에 자연어 수정을 요청해 같은 native Turn에서 replacement proposal을 다시 검토하거나, 제안을 거절해 confirmed model을 바꾸지 않는 Chat-first correction vertical을 완성한다.

## Spec Traceability

- User stories: 5, 6, 7, 8, 9, 11
- Implementation contract: StatePatch lifecycle; Durable state and atomic apply; Plan `request_user_input` adaptation; Data and State Flow

## Slice-Specific Constraints

- 수정 요청은 `UserConfirmation`이 아니라 same-Turn feedback이다. App은 fresh request key와 bounded feedback을 native answer로 보내고 valid replacement proposal을 기다린다.
- Replacement 성공은 old `pending → superseded`와 new patch creation `→ pending`을 one product transaction으로 처리하고 active Review를 새 patch 하나로 바꾼다.
- Replacement 전에 terminal·continuity loss·validation failure가 발생하면 old patch를 `interrupted`로 끝내고 confirmation·apply를 만들지 않는다.
- Reject는 settled no-apply `UserConfirmation`이며 Codex continuation 성공 여부와 관계없이 confirmed `SemesterModel`을 바꾸지 않는다.
- 같은 decision의 retry는 existing outcome을 반환하고 wrong patch/interaction/decision key, conflicting·late decision과 stale base는 second confirmation/apply 없이 fail closed한다.
- Browser는 007의 accept와 함께 working `AY에게 수정 요청 | 거절` option을 추가한다. Dead·disabled control, direct canonical field editor와 별도 workflow page를 만들지 않는다.
- Revise+feedback request, replacement·resolved frame과 reject outcome은 006a shared product contract를 확장해 Server와 Browser가 함께 사용한다. Local duplicate schema나 Browser-only lifecycle variant를 만들지 않는다.
- 일반 Plan clarification은 product Review가 아니며 current answer/cancel behavior를 유지한다.
- Runtime/process recovery, source rebaseline, invalid store handling, explicit action retry와 new persistence journal은 이번 ticket에 포함하지 않는다.

## Acceptance Criteria

- [ ] Revision feedback이 same Turn으로 전달되고 fresh request key의 replacement proposal을 기다린다.
- [ ] Valid replacement가 old patch를 supersede하고 new pending patch 하나를 active Review에 표시한다.
- [ ] Replacement 전 terminal·loss·validation failure가 old patch를 interrupted로 끝내고 no confirmation·no apply를 증명한다.
- [ ] Reject가 settled no-apply confirmation으로 남고 reload 뒤 confirmed model과 revision이 unchanged다.
- [ ] 같은 decision의 retry, conflicting·late response, wrong binding과 stale base가 second confirmation/apply를 만들지 않는다.
- [ ] Browser Review의 accept·revise·reject가 모두 working control이며 direct field editor나 별도 approval center가 없다.
- [ ] Revise→replacement→accept와 reject→reload Chromium traces가 real Vite/Express와 deterministic Runtime/product store를 통과한다.

## Verification

- Targeted test or command: focused StatePatch/Review coordinator and product action tests, `npm run test -w @ay-ple/chat-shell`, revise/reject Playwright traces
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run test:e2e -w @ay-ple/chat-shell`, `npm run check:docs-links`, `git diff --check`
- Manual or live smoke: desktop Browser에서 revise→replacement→accept와 reject→reload를 확인한다.

## Blocked By

- [007a-product-store-persistence-boundary.md](007a-product-store-persistence-boundary.md) — revision transaction 전에 store persistence owner를 분리한다
- [007b-product-operation-coordinator-boundary.md](007b-product-operation-coordinator-boundary.md) — revision 전에 product operation state와 Review routing 경계를 정리한다

## Starting Points

- Parent spec `StatePatch lifecycle`, `Plan request_user_input adaptation` and `Data and State Flow`
- `apps/server/src/state-patch-review.ts`
- `apps/server/src/semester-workspace.ts`
- `apps/server/src/product-operation-coordinator.ts`
- `apps/server/src/product-http.ts`
- `apps/chat-shell/src/product-api.ts`
- `packages/product-contract/` — 006a에서 생성한 shared Browser-safe contract owner
- 007 product transcript/reducer and Playwright nominal trace
