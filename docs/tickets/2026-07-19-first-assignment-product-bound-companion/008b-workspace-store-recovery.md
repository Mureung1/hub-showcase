# 008b — Workspace source·store recovery를 닫는다

## Agent triage

- State: completed
- Surface: local-ticket
- Next actor: none

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

- [x] Registered RawMaterial drift가 action을 interrupt하고 recovery-required로 열리며 original bytes를 자동으로 수정하지 않는다.
- [x] Settled cleanup 뒤 사용자가 선택한 explicit material refresh만 current bytes를 새 baseline으로 채택하고 fresh action을 허용한다.
- [x] Invalid·unsupported product store가 original bytes unchanged인 `incompatible/readOnly`로 열리고 automatic restore/reset을 수행하지 않는다.
- [x] Active authority/guard와 persisted store bytes가 다르면 mutation을 중단하고 bytes를 overwrite하지 않으며, cold-open valid store의 외부 provenance를 감지했다고 주장하지 않는다.
- [x] Explicit workspace reactivation 뒤 valid canonical store의 confirmed model·history를 다시 열며 pending native interaction은 복원하지 않는다.
- [x] Stale guard와 app-managed scratch가 next open에서 bounded하게 reconcile되고 cleanup failure는 새 action을 차단한다.
- [x] 두 fresh E2E run 사이 workspace, product state, scratch와 native session이 겹치지 않고 tracked seed digest가 그대로다.
- [x] Source conflict→explicit refresh와 invalid store→read-only Browser traces가 shared contract를 통과한다.

## Verification

- Targeted test or command:
  - `NODE_OPTIONS=--conditions=development npx tsx --test apps/server/src/semester-workspace-action.test.ts`: Product Chat scratch authority 분리, source/store drift, bounded cleanup과 reopen을 포함해 22/22 passed
  - `npm run test:e2e -w @ay-ple/chat-shell -- e2e/workspace-recovery.spec.ts`: source conflict adoption, invalid cold store와 fresh-run isolation의 Chromium desktop 3/3 passed
  - `npm run test:e2e -w @ay-ple/chat-shell -- --grep "material mutation detects store drift|Assignment admission detects store drift|Chat admission detects store drift"`: 세 public mutation 경로의 authoritative recovery hydration과 original error 보존을 Chromium desktop 3/3 passed
- Repository checks:
  - `npm test`: passed; workspace materializer 7/7, product contract 12/12, Runtime 65/65, Server 133/133, Chat Shell 53/53, camp artifact 16/16
  - `npm run typecheck`: passed
  - `npm run build`: passed
  - `npm run lint -w @ay-ple/chat-shell`: passed
  - `npm run test:e2e -w @ay-ple/chat-shell`: Chromium desktop 29/29 passed
  - `npm run check:docs-links`: active 28개와 historical banner 2개 모두 green
  - `git diff --check`: passed
- Manual or live smoke: in-app desktop Browser에서 registered TXT 두 개를 선택해 source drift를 일으킨 뒤 recovery alert와 mutation 차단, teacher-added 원본 bytes 보존, explicit `현재 TXT를 새 기준으로 채택`, digest 변경과 fresh action 재활성화를 확인했다. 별도 fresh invalid-store harness에서는 read-only alert, product action 부재와 폴더 재선택 CTA를 확인했다.
- Code review: `8ba64cd418a586b1dd5fec2832fb2dee281f2558...4723d105`를 Standards와 Spec 두 축으로 독립 검토했다. 첫 검토의 Standards 3건·Spec 3건과 재검토의 Standards 2건·Spec 1건을 shared contract 재사용, activation 문서·format 수정, Chat scratch authority 분리, 모든 Browser mutation/operation 실패 뒤 recovery hydration과 회귀 trace로 닫았다. Compare 직후 rename 사이의 non-cooperative external writer race는 backup/journal/signature 금지와 parent spec의 observable before/after·non-adversarial physical boundary에 따라 이 ticket의 구현 결함이 아닌 명시된 보장 경계로 판정했다. 최종 재검토는 Standards 0건·Spec 0건으로 종료했다.

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

## Result

- Shared product contract에 exact `cleanup_required | source_conflict | store_conflict` workspace recovery와 `refreshed | source_rebaselined` material refresh response를 추가하고 Server·Browser·E2E가 같은 타입과 decoder를 사용하게 했다.
- Server persistence boundary는 cold-open current v2의 원본 serialized bytes를 authority로 보존하고 모든 mutation에서 compare-before-rename을 수행한다. Active store drift는 external bytes를 덮어쓰지 않고 `store_conflict`로 닫으며, invalid·unsupported store는 bytes-preserving `incompatible/readOnly`로 연다. Explicit reactivation만 valid current store와 settled history를 다시 채택한다.
- Registered source drift는 MCP·Review를 포함한 product path에서 matching native Turn을 한 번 interrupt하고 baseline과 original TXT를 보존한다. Bounded cleanup이 끝난 뒤 explicit material refresh만 stable material ID로 current digest를 채택하고 fresh action을 다시 연다.
- Product Chat의 source/store authority 손상과 app-managed scratch artifact 손상을 분리했다. Missing scratch는 source rebaseline 권한을 만들지 않고, unsafe scratch cleanup은 `cleanup_required`만 노출한다.
- Browser는 recovery 중 자료 선택·Assignment·Chat mutation을 닫고 source conflict에는 explicit rebaseline, cleanup/store conflict에는 workspace reactivation CTA를 제공한다. Material, Assignment와 Chat mutation 실패 뒤 settled bootstrap을 다시 읽되 original operation error를 유지한다.
- Real Vite/Express Chromium traces가 source conflict→interrupt→bytes 보존→explicit adoption→fresh action, invalid cold store→read-only/no native work와 두 fresh harness의 workspace·state·scratch·native identity isolation을 검증한다. Tracked seed digest는 `ffbe1d713e1f6cbaefd12b650e597a068dd88259dc675447633640b8a3b24f55`로 유지됐다.
- Runtime isolation, implementation map, Server·Chat Shell·product contract 문서를 current recovery authority와 explicit action semantics에 맞췄다.
- 구현 커밋: `e565590c`, `e68ade71`, `64a0bfce`, `a27aeb9f`, `ec71fa4e`, `3cb4eeda`, `24866ad9`, `b1da75c9`, `4723d105`
- Exact Runtime actual-child/local/live-provider conformance는 [009-exact-runtime-product-conformance.md](009-exact-runtime-product-conformance.md)가 계속 소유한다.
