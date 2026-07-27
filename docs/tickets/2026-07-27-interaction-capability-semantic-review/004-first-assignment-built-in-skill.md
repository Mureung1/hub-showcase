# 004 — First Assignment built-in Skill

## Agent triage

- State: claimed
- Surface: local-ticket
- Next actor: /implement (current session)

## Parent Spec

`docs/specs/2026-07-27-interaction-capability-semantic-review.md`

## What It Delivers

Tracked `hub/skills/ay-ple-first-assignment/` source가 AY에게 actual workspace file을 읽고 mutation 전에 Semantic Review를 요청하며, structured result에 따라 actual file mutation 또는 fresh proposal을 수행하도록 가르친다. App-owned academic state나 built-in `request_user_input`에 기대지 않고 AY-owned apply boundary를 contract test로 고정한다.

## Spec Traceability

- User stories: 3, 4, 6, 7
- Implementation contract: `AY-owned mutation boundary`, `Module Responsibilities and Seams`, `Review round trip`

## Slice-Specific Constraints

- Skill source authority는 `hub/skills/ay-ple-first-assignment/`다. App 실행 전 native client가 수행하는 Bootstrap의 workspace copy·merge, config 설치와 checkpoint lifecycle은 sibling Workspace Spec이 소유한다.
- AY는 active SemesterWorkspace의 actual file을 읽고 Review가 필요한 mutation을 MCP call 전에 적용하지 않는다. App snapshot, `RawMaterial` ID, Course·revision과 scratch-only workflow를 요구하지 않는다.
- `accept` 뒤 actual file을 변경하고, `revise`는 feedback을 반영한 fresh `propose_state_patch` call과 새 card로 이어지며, `reject`는 proposed mutation을 적용하지 않는다.
- 같은 결정을 built-in `request_user_input`으로 다시 묻지 않는다. General clarification과 native execution approval은 별도 Codex interaction으로 남긴다.
- Skill은 App이 `workspace-state.json`이나 다른 file에 result를 대신 apply하거나 Git command를 실행한다고 가정하지 않는다.
- Meaningful Git checkpoint는 Workspace-owned `AGENTS.md` 지침과 permission policy를 따른다. Clean-tree 선행 조건, auto-commit hook, unrelated dirty file staging과 broad permission fallback을 추가하지 않는다.
- Semantic Review request는 ticket 001의 exact domain-neutral contract만 사용하고 Assignment upsert schema, private endpoint·token, Browser identity와 host correlation을 언급하지 않는다.

## Acceptance Criteria

- [ ] Tracked built-in Skill이 actual file read → proposal-before-mutation → result 해석 → actual file mutation/checkpoint 순서를 명시한다.
- [ ] `accept`, `revise`, `reject` 각각에서 file mutation authority와 fresh-call behavior가 Parent Spec과 일치한다.
- [ ] Skill bytes에 `requestKey`, workspace·Course ID, revision-bound apply, `RawMaterial`, durable `StatePatch`·`UserConfirmation`, managed scratch-only mutation과 duplicate `request_user_input` 지침이 없다.
- [ ] Contract test가 proposal 전 actual file unchanged, accept 뒤 mutation, revise/reject no mutation과 revise의 fresh call을 검증한다.
- [ ] App apply·Git 실행 0과 native permission·Interaction result의 독립성이 test fixture에서 관찰된다.
- [ ] Workspace 설치가 아직 없는 상태에서도 tracked source와 contract tests가 독립적으로 green이다.

## Verification

- Targeted test or command: Built-in Skill contract test와 관련 workspace/package test를 실행한다.
- Repository checks: `npm run typecheck && npm run build && npm test && npm run check:docs-links`
- Manual or live smoke: Temporary files와 scripted result 세 가지로 Skill instruction을 실행해 pre-proposal bytes와 result별 mutation을 비교한다.

## Blocked By

- `./001-interaction-contract-and-built-adapter-foundation.md` — Interaction contract와 Built Adapter foundation

## Starting Points

- `apps/server/src/assignment-recipe.ts`
- `apps/server/src/assignment-recipe.test.ts`
- `packages/semester-workspace/resources/workspace/AGENTS.md`
- `packages/semester-workspace/src/workspace-bundle.ts`
- `packages/semester-workspace/src/workspace-bundle.test.ts`
- `docs/adr/0020-bootstrap-semester-workspaces-before-app-startup.md`
- `docs/adr/0019-use-mcp-interaction-capabilities-as-the-ay-app-seam.md`
