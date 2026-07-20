# 007 — Chat-first Assignment nominal product vertical을 닫는다

## Agent triage

- State: claimed
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

[First Assignment Product-bound Codex Companion](../../specs/2026-07-19-first-assignment-product-bound-companion.md)

## What It Delivers

학생이 3-pane workbench에서 두 TXT를 선택해 `선택한 자료 정리하기`를 실행하고, 오른쪽 AY Chat의 cumulative product stream에서 Skill·Plan·MCP·Agent activity와 evidence-linked pending Review를 본 뒤 수락하여 confirmed Assignment를 만들고 Browser reload 뒤 다시 여는 nominal journey를 완성한다. 같은 sidebar의 free-form composer와 일반 Plan clarification도 product path에서 동작한다.

## Spec Traceability

- User stories: 2, 3, 4, 5, 6 (accept path), 8, 9, 10, 11
- Implementation contract: Desktop workbench; Browser-safe product operations and activity; Data and State Flow; Testing Decisions — Highest practical seam and Browser Playwright nominal trace

## Slice-Specific Constraints

- Assignment action과 free-form composer는 `/api/product/*`와 006a shared contract만 사용한다. Legacy `/api/codex-chat/*` thread·frame·status를 같은 product transcript에 혼합하지 않는다.
- Product application state는 bootstrap의 Account Readiness, workspace와 settled history를 모두 보존한다. Current `useSourceWorkbench`처럼 workspace만 취하고 나머지를 버리지 않는다.
- Account가 `not_ready`이면 actionable 안내와 함께 action·Chat mutation을 비활성화하고 native start를 만들지 않는다. Readiness 조회가 `unavailable`이어도 workspace·material의 읽기 가능한 상태를 숨기거나 실패로 덮어쓰지 않는다.
- Action, requested Skill, Plan·Agent delta/completed, MCP proposal, Review, 일반 clarification, interrupt와 authoritative terminal을 오른쪽 AY Chat의 한 cumulative transcript에서 보여준다. 별도 job page, action bar, progress dashboard나 approval center를 만들지 않는다.
- 일반 Plan `interaction.requested`는 product Review와 다른 Chat clarification으로 표시하고 answer/cancel route를 same Turn에 연결한다. 이 응답은 `StatePatch`, `UserConfirmation`이나 apply를 만들지 않는다.
- 이 nominal slice는 working accept control만 제공한다. `AY에게 수정 요청`과 reject를 dead·disabled control로 미리 렌더링하지 않으며 두 working option은 008이 함께 추가한다.
- Accept는 Browser optimistic success를 만들지 않는다. Product transaction success 뒤 authoritative bootstrap을 다시 읽어 settled `UserConfirmation`, apply outcome와 confirmed Assignment를 표시한다.
- Pending Review는 Assignment values와 field-level evidence를 표시하고 evidence 선택 시 중앙 pane의 matching material과 exact quote로 이동한다.
- 학생용 copy는 자료, 선택한 자료, 변경 제안, 검토 대기, 반영됨을 사용하고 `ModelingRun`, raw Codex IDs와 protocol 용어를 기본 UI에 노출하지 않는다.
- Sidebar hide/show는 mounted product controller와 transcript를 유지하며 Turn을 interrupt하지 않는다. Reload는 settled product snapshot만 다시 열고 previous transcript나 unanswered native prompt를 복원한 것처럼 표시하지 않는다.
- Active product operation 중 second Chat/action mutation은 busy로 닫는다. Browser는 opaque public operation·interaction·patch·decision correlation만 echo한다.
- Deterministic Runtime fake를 사용하는 real Chromium→Vite→Express→product store seam이 nominal acceptance의 authority다.

## Acceptance Criteria

- [ ] 학생이 대표 workspace를 활성화하고 3-pane workbench에서 Course와 정확히 두 TXT source를 선택할 수 있다.
- [ ] `선택한 자료 정리하기`가 one product action을 시작하고 preparing→accepted→Skill/Plan/MCP/Agent activity를 shared decoder와 transcript ordering대로 표시한다.
- [ ] Valid pending Assignment proposal이 title, dueAt, submissionMethod와 각 field의 selected-source evidence를 학생용 Review에 보여준다.
- [ ] Evidence interaction이 중앙 pane의 matching material/quote로 이동하고 unselected control은 나타나지 않는다.
- [ ] Accept가 exact active interaction·patch·decision binding으로 제출되고 authoritative bootstrap reload 뒤 `반영됨`과 confirmed Assignment를 표시한다.
- [ ] Reload가 confirmed revision, Assignment, settled confirmation과 apply outcome을 다시 열며 transcript/pending prompt를 거짓 복원하지 않는다.
- [ ] Account `not_ready | unavailable`을 구분해 표시하고 action·Chat mutation을 열지 않으며, workspace·material read 상태는 독립적으로 유지한다.
- [ ] Free-form composer가 `/api/product/chat/messages`를 사용하고 일반 Plan clarification을 answer/cancel한 뒤 같은 product stream을 이어간다.
- [ ] Product Review와 general clarification이 서로의 response route를 사용하지 않으며 active Turn 중 conflicting send/action은 busy로 거절된다.
- [ ] Sidebar를 running 또는 pending Review 중 hide/show해도 same Turn, stream과 transcript가 유지된다.
- [ ] 1440×900 이상에서 source selection, evidence navigation, accept·clarification controls, focus order와 status copy가 usable하다.
- [ ] Nominal Playwright trace가 실제 Vite/Express와 deterministic Runtime/product store를 통과한다.

## Verification

- Targeted test or command: `npm run test -w @ay-ple/chat-shell`, focused Server product stream tests, `npm run test:e2e -w @ay-ple/chat-shell`
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run check:docs-links`, `git diff --check`
- Manual or live smoke: 1440×900과 wider desktop에서 nominal action, evidence navigation, accept, reload, 일반 clarification과 sidebar hide/show를 직접 확인한다.

## Blocked By

- [002-source-centered-three-pane-workbench.md](002-source-centered-three-pane-workbench.md) — 자료 중심 3-pane workbench를 연다
- [006-first-assignment-action-stream.md](006-first-assignment-action-stream.md) — First Assignment action stream을 연다
- [006a-browser-safe-product-contract-ownership.md](006a-browser-safe-product-contract-ownership.md) — Browser-safe product wire contract의 단일 owner를 만든다

## Starting Points

- `apps/chat-shell/src/App.tsx`
- `apps/chat-shell/src/product-api.ts`
- `apps/chat-shell/src/use-source-workbench.ts`
- `apps/chat-shell/src/use-chat-shell.ts` — legacy presentation donor only; product route와 transcript를 혼합하지 않는다
- `apps/chat-shell/src/chat-model.ts`
- `apps/chat-shell/src/chat-presentation.tsx`
- `apps/chat-shell/e2e/source-workbench.spec.ts`
- `apps/chat-shell/e2e/chat-shell-harness.ts`
- `apps/server/src/product-http.ts`
- `apps/server/src/assignment-action.ts`
- `docs/product/ay-ple-review-workspace-scenario.md`
