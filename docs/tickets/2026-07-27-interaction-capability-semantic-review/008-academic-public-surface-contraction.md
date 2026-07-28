# 008 — Academic public surface contraction

## Agent triage

- State: completed
- Surface: local-ticket
- Next actor: none

## Post-completion scope correction — 2026-07-28

기존 ticket은 App-owned academic authority 제거를 source explorer·preview 제거까지 확장했다. User-owned Git SemesterWorkspace 전환의 의도는 App의 자료 복사·registry·mutation authority를 없애는 것이며, 사용자가 실제 자료를 읽는 UI를 없애는 것이 아니다.

따라서 기존 `3a676c2b`·`b4300ca7`·`11f00f42` 구현 중 Course·`RawMaterial`·durable workflow 제거는 유지하되, Chat-only contraction은 교정한다. Active prepared root의 bounded read-only source list와 text·PDF preview를 Browser-safe contract, Server projection과 3-pane Chat Shell에 복구한다. 과거 “자료 UI 없음” smoke는 superseded evidence다.

## Parent Spec

`docs/specs/2026-07-27-interaction-capability-semantic-review.md`

## What It Delivers

Joint cutover 뒤 더 이상 public authority가 아닌 Course, material registry·copy·snapshot·refresh mutation·durable selection, First Assignment action·retry와 patch-bound Review surface를 Browser, Server route와 shared product contract에서 제거한다. Public AY-PLE은 workspace lifecycle, active root의 read-only source explorer·preview, normal AY Chat과 inline Semantic Review를 표현하며 old academic workflow로 돌아가는 hidden compatibility path를 남기지 않는다.

## Spec Traceability

- User stories: 7, 8, 11
- Implementation contract: `Compatibility and Migration`, `Module Responsibilities and Seams`, `AY-owned mutation boundary`, `Read-only workspace source projection`

## Slice-Specific Constraints

- 이 ticket은 contract 단계다. Ticket 007에서 target public composition이 green인 상태를 유지하며 old surface를 다시 expand하거나 target과 병행 노출하지 않는다.
- Wide removal은 현재 `codex/...` working branch에서 Chat Shell consumers → Server public routes/action adapters → `@ay-ple/product-contract` academic exports 순으로 진행한다. 각 package-bounded checkpoint는 자체 tests와 typecheck를 통과해야 한다.
- Chat Shell에서 Course creation, registry-backed material refresh·durable selection, First Assignment action·retry, durable Assignment/Run/patch/confirmation history와 replacement Review UI를 제거한다. Active root를 읽는 source explorer·preview와 target inline Review는 보존한다.
- Server에서 대응 academic mutation endpoints와 request/response projection을 제거한다. 대신 exact active root만 대상으로 하는 bounded read-only list·text/PDF preview route를 별도 authority 없이 제공한다. Removed mutation route에 compatibility alias, redirect, tombstone success와 hidden feature flag를 만들지 않는다.
- Product contract에서 더 이상 consumer가 없는 Course/material mutation/action/retry, `ProductStatePatch`, patch-bound Review request/response와 academic history frame을 제거한다. Browser-safe source list·text preview contract는 domain-neutral projection으로 유지한다.
- Normal AY Chat, built-in general clarification, operation interrupt, target workspace lifecycle와 `ProductReviewFrame`/`ProductReviewResult`는 보존한다.
- Underlying legacy academic persistence와 old Runtime MCP override의 physical 제거는 ticket 009가 소유한다. 이 ticket에서 legacy on-disk bytes를 rewrite·delete하지 않는다.
- Removed surface를 generic event bus, raw Git diff UI 또는 arbitrary schema renderer로 대체하지 않는다.
- Source projection은 hidden·managed·secret-like file과 symlink를 제외하고 root containment·regular file·entry/content bound를 매 read에 검증한다. App은 watcher, copy, reusable cache·snapshot, durable source selection이나 file mutation을 만들지 않는다.

## Acceptance Criteria

- [x] Chat Shell이 1440px·1920px desktop에서 source explorer, selected preview와 mounted AY Chat을 한 3-pane workbench에 표시한다.
- [x] Actual active-root file은 folder-relative label로 보이고 UTF-8 text와 PDF는 inline preview된다. Unsupported file은 목록과 명시적 미지원 상태를 제공한다.
- [x] Server source projection은 active exact root 밖 path, symlink, hidden·managed·secret-like target, non-regular file와 size/entry bound 초과를 fail closed하고 absolute path를 Browser에 노출하지 않는다.
- [x] App이 Course, `RawMaterial`, copy·snapshot, registry-backed refresh/rebaseline, durable selection 또는 file/Git mutation authority를 다시 만들지 않는다.
- [x] Removed academic mutation/action/retry 및 old patch Review endpoints가 public router에 mount되지 않고 request가 success나 compatibility response를 받지 않는다.
- [x] `@ay-ple/product-contract` public root가 workspace lifecycle, source projection, normal Chat/interaction와 Semantic Review에 필요한 Browser-safe contract만 export한다.
- [x] General clarification, Turn interrupt, target workspace recovery와 accept/revise/reject inline Review regression tests가 계속 통과한다.
- [x] Browser bundle과 public network trace에 private Broker contract, credential, native identity, absolute workspace path 또는 removed store revision identity가 없다.

## Verification

- Targeted test or command: `npm test -w @ay-ple/product-contract && npm test -w @ay-ple/server && npm test -w @ay-ple/chat-shell`
- Repository checks: `npm run lint -w @ay-ple/chat-shell && npm run typecheck && npm run build && npm test && npm run test:e2e`
- Manual or live smoke: Target desktop App에서 실제 SemesterWorkspace 자료 explorer·text/PDF preview, general Chat와 Semantic Review가 공존하고 old academic controls·mutation routes가 없는지 Browser network panel과 UI로 확인한다.

## Superseded original verification result

| 구분 | 결과 |
| --- | --- |
| Package checkpoint | Chat Shell consumer 제거 뒤 test/typecheck/lint/build, Server public route/action adapter 제거 뒤 147개 test와 typecheck/build, product-contract export 제거 뒤 11개 test와 typecheck/build를 각 checkpoint에서 통과 |
| Targeted gate | `npm test -w @ay-ple/product-contract && npm test -w @ay-ple/server && npm test -w @ay-ple/chat-shell` 통과. Public root exact inventory와 old academic ID/frame 거절도 포함 |
| Desktop Browser smoke | Chromium desktop에서 prepared lifecycle, normal Chat, general clarification, one public operation binding, Turn interrupt와 inline Review accept·revise·reject를 확인했다. 이 smoke가 source explorer·preview 부재를 성공으로 판정한 부분은 위 correction으로 supersede됐다. |
| Browser exclusion | Production bundle에서 private Broker env/credential, native thread·Turn identity, `confirmedRevision`, `ProductStatePatch`, RawMaterial·First Assignment와 removed academic route 문자열이 0건 |
| Repository gate | `npm run lint -w @ay-ple/chat-shell && npm run typecheck && npm run build && npm test && npm run test:e2e` 최종 통과. Chat Shell E2E 3개와 camp demo E2E 8개 통과 |
| Documentation | `npm run check:docs-links` 통과. Root README, package README와 implementation map을 target-only public surface와 I-009 physical boundary에 맞춤 |
| Code review | Fixed point `f49a1b75ad018403a5e4de7848936729f10bbf3d` 기준 Standards·Spec 병렬 review에서 문서 drift와 split operation binding을 수정했고, 재검토 결과 남은 finding 0건 |

## Superseded original result

Default Chat Shell에서 source workbench까지 제거하고 prepared lifecycle, normal AY Chat, general clarification·interrupt와 inline Semantic Review만 남겼다. Course/material authority와 academic workflow 제거는 유효하지만 source UI 제거는 과잉 contraction이므로 현재 correction에서 복구한다. Public operation ID 통합과 legacy persistence·Runtime 경계는 그대로 유지한다.

## Corrected verification result

| 구분 | 결과 |
| --- | --- |
| Product contract | Source list·text preview의 strict path·size·preview kind·digest contract를 추가하고 15개 unit, typecheck와 build를 통과했다. |
| Server projection | Loopback/local-host source read admission, active exact root의 bounded scan·read, hidden/managed/secret exclusion, symlink ancestor·root replacement·path escape·size/depth/entry failure를 Server 127-pass suite와 typecheck에서 검증했다. |
| Broker evidence | Workspace root dev/ino를 pin하고 evidence read 전후 identity, ancestor/final symlink, open inode, regular-file와 `maxBytes + 1` bound를 검증해 root 교체·inode swap·성장 파일을 whole-call `evidence_invalid`로 차단했다. |
| Browser | 3-pane explorer·preview·AY Chat, text/PDF/unsupported·error state, Chat hide/show, CSP-sandboxed 단일 검증 응답 PDF 렌더링·same-path 실패/복구, fresh source reconciliation, evidence digest·exact occurrence highlight와 기존 Review·clarification·interrupt를 Chat Shell unit 17개와 E2E 3개에서 검증했다. |
| Actual workspace | `year-2-semester-1`의 37개 PDF, 7개 PPTX와 1개 Pages가 folder-relative 목록에 나타났고 실제 63-page PDF가 중앙 pane에서 렌더링됐다. Unsupported Pages 안내와 280px explorer·1220px preview·420px Chat의 1920px 배치도 확인했다. 실행 전후 Git 상태는 동일했다. |
| Repository gate | `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run test:e2e`, `npm run check:docs-links`를 모두 통과했다. |

## Corrected result

Prepared Chat Shell은 active SemesterWorkspace actual file을 읽는 source explorer, text·PDF preview와 기존 AY Chat·inline Semantic Review를 한 desktop workbench에 다시 제공한다. SourceProjection은 Browser에 relative path·bounded content만 내보내며 App-owned Course·`RawMaterial`, source copy·snapshot·watcher·durable selection과 file/Git mutation을 만들지 않는다. AY-owned actual file action, Git checkpoint, current Runtime·Interaction MCP와 removed academic mutation route 경계는 그대로 유지된다.

교정 구현 commit:

- `7ffb1b6b1` — `feat: add read-only workspace source projection`
- `14eea71c0` — `feat: restore semester source workbench`
- `4ccc6018c` — `fix: harden workspace source preview reads`
- `8949dbe2b` — `fix: harden semester source workbench`
- `479ea5682` — `fix: render validated workspace PDFs`
- `85494ed6f` — `fix: close source workbench review gaps`
- `0de385620` — `fix: close source preview security gaps`

구현 commit:

- `3a676c2bdad9b36a2ffa8828a8adee2c35939dfc` — `refactor: remove academic chat shell surface`
- `b4300ca7957a2720ac36ce84f32679b815c103e7` — `refactor: remove academic server routes`
- `11f00f42f61e25aebfedbdcd5110b52a483e8f8f` — `refactor: contract product browser surface`
- `cf54aec987be5dfacaf74c7db91c3cdbac59c7e4` — `fix: emit target product operation ids`
- `39cceac17f4ae4cbc300d0179b61dc8540ae5aee` — `test: preserve clarification and interrupt flow`
- `55fdd8af4fc77ab1447d4032bdd5a4b2ab7e2798` — `fix: unify product operation binding`
- `9a2aaa17e9fbc725ad2e672dc4ef1a10498dd55a` — `refactor: address contraction review`

## Blocked By

- `./007-joint-public-cutover.md` — Joint public cutover

## Corrected starting points

- `packages/product-contract/src/workspace-sources.ts`
- `apps/server/src/workspace-source-projection.ts`
- `apps/server/src/prepared-product-http.ts`
- `apps/chat-shell/src/prepared-source-workbench.tsx`
- `apps/chat-shell/src/prepared-product-api.ts`
- `apps/chat-shell/src/prepared-workspace-app.tsx`
- `apps/chat-shell/src/prepared-product-chat.tsx`
- `apps/chat-shell/e2e/prepared-public-cutover.spec.ts`

## Superseded original starting points

- `apps/chat-shell/src/App.tsx`
- `apps/chat-shell/src/use-source-workbench.ts`
- `apps/chat-shell/src/product-api.ts`
- `apps/chat-shell/src/product-chat-model.ts`
- `apps/chat-shell/src/product-chat-presentation.tsx`
- `apps/chat-shell/src/App.css`
- `apps/chat-shell/e2e/source-workbench.spec.ts`
- `apps/chat-shell/e2e/chat-shell.spec.ts`
- `apps/server/src/product-http.ts`
- `apps/server/src/product-operation-coordinator.ts`
- `apps/server/src/product-bootstrap.test.ts`
- `apps/server/src/semester-materials.test.ts`
- `apps/server/src/assignment-action.test.ts`
- `packages/product-contract/src/request.ts`
- `packages/product-contract/src/workspace.ts`
- `packages/product-contract/src/review.ts`
- `packages/product-contract/src/operation-frame.ts`
- `packages/product-contract/src/index.ts`
- `packages/product-contract/src/index.test.ts`
