# 004 — First Assignment built-in Skill

## Agent triage

- State: completed
- Surface: local-ticket
- Next actor: none

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

- [x] Tracked built-in Skill이 actual file read → proposal-before-mutation → result 해석 → actual file mutation/checkpoint 순서를 명시한다.
- [x] `accept`, `revise`, `reject` 각각에서 file mutation authority와 fresh-call behavior가 Parent Spec과 일치한다.
- [x] Skill bytes에 `requestKey`, workspace·Course ID, revision-bound apply, `RawMaterial`, durable `StatePatch`·`UserConfirmation`, managed scratch-only mutation과 duplicate `request_user_input` 지침이 없다.
- [x] Contract test가 proposal 전 actual file unchanged, accept 뒤 mutation, revise/reject no mutation과 revise의 fresh call을 검증한다.
- [x] App apply·Git 실행 0과 native permission·Interaction result의 독립성이 test fixture에서 관찰된다.
- [x] Workspace 설치가 아직 없는 상태에서도 tracked source와 contract tests가 독립적으로 green이다.

## Verification

- Targeted: `npm run test:first-assignment-skill` — 5/5 통과. `npm test -w @ay-ple/interaction-mcp` — 9/9 통과. `npm test -w @ay-ple/semester-workspace` — 170 tests 통과.
- Repository checks: review fix 뒤 `npm run typecheck`, `npm run build`, `npm test`, `npm run check:docs-links`, `npm run lint -w @ay-ple/chat-shell` 모두 통과.
- Scripted actual-file smoke: temporary file에서 `accept`, `revise → accept`, `reject`를 실행해 각 proposal 직전 byte, fresh Review ID, result별 native file write와 conditional Git checkpoint, App file/Git 0을 비교했다. Native permission을 거절한 `accept`도 no-mutation으로 통과했다.
- Skill validation: `python3 /Users/swh/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/ay-ple-first-assignment` — `Skill is valid!`.
- Review: `/code-review 1416d8b49732155a1cf4c1ab3311afdbe505bb6c`의 Standards와 Spec 재검토 모두 finding 0.

## Result

- `skills/ay-ple-first-assignment/SKILL.md`를 tracked authoring source로 추가해 actual-file read, proposal-before-mutation, closed Review result 해석과 AY-owned native apply/checkpoint 순서를 고정했다.
- `scripts/first-assignment-skill.contract.test.mts`와 root `test:first-assignment-skill` gate를 추가해 workspace 설치 없이 source contract와 temporary-file result behavior를 독립 검증한다.
- 구현 commit: `6777d7f1842e474ecd113dc1df19f8b59e567575` (`feat: add first assignment review skill`), `17cd68c2b90b45a2c575b244c599e0b49de34672` (`test: harden assignment skill contract`).

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
