# 007b — Product operation coordinator의 책임 경계를 정리한다

## Agent triage

- State: completed
- Surface: local-ticket
- Next actor: none

## Parent Spec

[First Assignment Product-bound Codex Companion](../../specs/2026-07-19-first-assignment-product-bound-companion.md)

## What It Delivers

Assignment action, free-form product Chat, general Plan clarification와 bound Review를 조정하는 current owner의 이름과 state shape를 실제 책임에 맞춘다. 008은 optional-field operation bag을 더 키우지 않고 revision lifecycle을 명시적인 operation variant에 추가할 수 있다.

## Spec Traceability

- User stories: 6, 7, 9, 10, 12
- Implementation contract: Module Responsibilities and Seams — Academic action coordinator and Review coordinator; Plan `request_user_input` adaptation

## Slice-Specific Constraints

- Assignment-only 이름을 실제 product operation 책임이 드러나는 이름으로 바꾸고 active operation을 Assignment/Chat discriminated state로 표현한다.
- General Plan interaction과 bound Review의 identity·response route·settlement는 계속 별도 state로 유지한다.
- One active product operation lease, stream ordering, interrupt·disconnect·terminal, Review commit ordering과 free-form Chat behavior를 변경하지 않는다.
- Public `/api/product/*` contract, persistence schema, product copy와 Browser behavior를 변경하지 않는다.
- Workflow engine, generic coordinator hierarchy, raw event bus나 recovery state를 추가하지 않는다.

## Acceptance Criteria

- [x] Product operation coordinator 이름이 Assignment-only가 아닌 실제 책임을 나타낸다.
- [x] Assignment-only field와 Chat-only field가 discriminated state에서 compiler로 좁혀지고 invalid optional-field combination을 표현하지 않는다.
- [x] General Plan interaction과 bound Review가 서로의 identity·response route를 사용하지 않는다.
- [x] Interrupt·disconnect·terminal과 one active operation behavior가 regression 없이 유지된다.
- [x] Public contract, store bytes와 Browser output이 바뀌지 않는다.

## Verification

- Targeted checks: product action·Chat·general interaction·Review와 Codex service의 focused Server test 49개, Server typecheck와 Assignment 중 Chat admission을 거부하는 cross-kind busy regression이 통과했다.
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run check:docs-links`, `git diff --check`가 모두 통과했다.
- Browser regression: `npm run test:e2e -w @ay-ple/chat-shell`의 desktop Chromium 13개 test가 통과했다.
- Code review: fixed point `a5b3f293b325d004db51720ebdfcb3051baa9f71` 이후 diff를 Standards·Spec 두 축으로 병렬 검토했다. Standards finding은 0건이었다. Spec review의 Runtime README coordinator 명칭 finding을 수정했고 최종 follow-up finding은 0건이었다.
- Manual or live smoke: 실행하지 않음. Behavior-preserving refactor이며 deterministic Server/Browser regression이 authority다.

## Result

Assignment와 free-form product Chat을 함께 조정하던 owner를 `ProductOperationCoordinator`와 `product-operation-coordinator`로 명명했다. Active state는 shared lease·Review binding을 가진 base와 `assignment`·`chat` discriminant variant로 나뉘어 각 operation 전용 field를 compiler가 좁히며, 두 kind는 하나의 active slot을 계속 공유한다.

General Plan interaction은 operation의 optional interaction으로, bound Review는 별도 `reviewBindings` identity와 settlement route로 유지된다. Interrupt·disconnect·terminal, Review commit-first ordering, public `/api/product/*` contract, persistence schema·bytes와 Browser output은 바뀌지 않았다. Parent spec은 sibling tickets가 남아 있어 완료 처리하지 않았다.

- Implementation commit: `84e1cc61` (`refactor: clarify product operation coordinator`)
- Corrective commit: `f0b97706` (`docs: align product operation coordinator naming`)

## Blocked By

- [007-chat-first-assignment-product-vertical.md](007-chat-first-assignment-product-vertical.md) — current product Browser behavior와 operation contract를 먼저 고정한다

## Starting Points

- `apps/server/src/assignment-action.ts`
- `apps/server/src/assignment-action.test.ts`
- `apps/server/src/assignment-action-faults.test.ts`
- `apps/server/src/product-chat-action.test.ts`
- `apps/server/src/state-patch-review.ts`
