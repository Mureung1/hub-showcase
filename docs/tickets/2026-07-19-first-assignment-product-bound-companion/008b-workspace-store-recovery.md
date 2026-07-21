# 008b — Workspace source·store recovery를 닫는다

## Agent triage

- State: claimed
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

[First Assignment Product-bound Codex Companion](../../specs/2026-07-19-first-assignment-product-bound-companion.md)

## What It Delivers

Registered source drift, invalid product store와 stale scratch가 있어도 사용자 bytes를 덮어쓰거나 존재하지 않는 revision을 복구한 것처럼 표시하지 않는다. Explicit workspace reactivation은 recovery 상태와 valid current store를 다시 열고, settled cleanup 뒤의 explicit material refresh만 current source bytes를 새 registry baseline으로 채택한다.

## Spec Traceability

- User stories: 1, 2, 8, 10, 11, 12
- Implementation contract: Workspace activation and material admission; Protected execution guard; Failure Behaviour; Testing Decisions — Workspace/guard and isolation traces

## Slice-Specific Constraints

- Registered `RawMaterial` digest drift는 active Turn을 interrupt하고 source-conflict/recovery-required로 전환한다. Original bytes를 overwrite하거나 drift 원인을 추정하지 않는다.
- Settled native work와 scratch cleanup 뒤 학생이 explicit material refresh를 선택한 경우에만 current user-owned TXT bytes를 새 registry baseline으로 채택하고 source guard를 clear한다. Silent rebaseline은 허용하지 않는다.
- Product store가 current canonical format으로 exact decode되지 않으면 original bytes를 보존한 `incompatible/readOnly`로 연다. Active in-memory authority 또는 execution guard가 있는 동안 persisted bytes가 불일치하면 mutation을 중단하고 current bytes를 overwrite하지 않는다. Last-commit restore, backup/journal, automatic reset·migration을 만들지 않는다.
- Cold restart 뒤 exact current format으로 decode되는 store는 durable provenance mechanism이 없는 current authority로 취급한다. App은 valid bytes의 외부 변경 여부를 추측하거나 이 ticket에서 signature·snapshot·journal을 추가하지 않는다.
- Valid canonical store의 confirmed state와 settled history는 사용자가 workspace를 explicit reactivation/selection한 뒤 다시 연다. Recent-workspace registry, automatic selection, transcript와 unanswered native prompt hydration을 추가하지 않는다.
- Next open은 execution guard에 연결된 pending patch와 app-managed source staging·workspace scratch를 reconcile한 뒤에만 fresh action을 허용한다.
- Recovery status, explicit refresh/rebaseline response와 incompatible outcome은 006a shared product contract를 확장해 Server와 Browser가 함께 사용한다. Local duplicate schema를 만들지 않는다.

## Acceptance Criteria

- [ ] Registered RawMaterial drift가 action을 interrupt하고 recovery-required로 열리며 original bytes를 자동으로 수정하지 않는다.
- [ ] Settled cleanup 뒤 사용자가 선택한 explicit material refresh만 current bytes를 새 baseline으로 채택하고 fresh action을 허용한다.
- [ ] Invalid·unsupported product store가 original bytes unchanged인 `incompatible/readOnly`로 열리고 automatic restore/reset을 수행하지 않는다.
- [ ] Active authority/guard와 persisted store bytes가 다르면 mutation을 중단하고 bytes를 overwrite하지 않으며, cold-open valid store의 외부 provenance를 감지했다고 주장하지 않는다.
- [ ] Explicit workspace reactivation 뒤 valid canonical store의 confirmed model·history를 다시 열며 pending native interaction은 복원하지 않는다.
- [ ] Stale guard와 app-managed scratch가 next open에서 bounded하게 reconcile되고 cleanup failure는 새 action을 차단한다.
- [ ] 두 fresh E2E run 사이 workspace, product state, scratch와 native session이 겹치지 않고 tracked seed digest가 그대로다.
- [ ] Source conflict→explicit refresh와 invalid store→read-only Browser traces가 shared contract를 통과한다.

## Verification

- Targeted test or command: focused workspace store/guard reopen and fault-injection suites, Browser source/store recovery Playwright traces
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run test:e2e -w @ay-ple/chat-shell`, `npm run check:docs-links`, `git diff --check`
- Manual or live smoke: desktop Browser에서 source drift→explicit refresh와 invalid store→read-only outcome을 확인한다.

## Blocked By

- [008a-continuity-loss-and-explicit-retry.md](008a-continuity-loss-and-explicit-retry.md) — operation continuity settlement과 retry identity를 먼저 고정한다

## Starting Points

- Parent spec `Workspace activation and material admission`, `Protected execution guard` and Browser isolation traces
- `packages/product-contract/` — public recovery projection owner
- Product store persistence boundary extracted by 007a
- `apps/server/src/semester-workspace.ts`
- `apps/server/src/semester-workspace-action.test.ts`
- `apps/server/src/product-bootstrap.test.ts`
- Product Browser workspace reducer and Playwright harness from 007–008a
