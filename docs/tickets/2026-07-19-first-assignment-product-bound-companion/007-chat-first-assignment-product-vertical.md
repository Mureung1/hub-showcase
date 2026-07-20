# 007 — Chat-first Assignment nominal product vertical을 닫는다

## Agent triage

- State: completed
- Surface: local-ticket
- Next actor: none

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

- [x] 학생이 대표 workspace를 활성화하고 3-pane workbench에서 Course와 정확히 두 TXT source를 선택할 수 있다.
- [x] `선택한 자료 정리하기`가 one product action을 시작하고 preparing→accepted→Skill/Plan/MCP/Agent activity를 shared decoder와 transcript ordering대로 표시한다.
- [x] Valid pending Assignment proposal이 title, dueAt, submissionMethod와 각 field의 selected-source evidence를 학생용 Review에 보여준다.
- [x] Evidence interaction이 중앙 pane의 matching material/quote로 이동하고 unselected control은 나타나지 않는다.
- [x] Accept가 exact active interaction·patch·decision binding으로 제출되고 authoritative bootstrap reload 뒤 `반영됨`과 confirmed Assignment를 표시한다.
- [x] Reload가 confirmed revision, Assignment, settled confirmation과 apply outcome을 다시 열며 transcript/pending prompt를 거짓 복원하지 않는다.
- [x] Account `not_ready | unavailable`을 구분해 표시하고 action·Chat mutation을 열지 않으며, workspace·material read 상태는 독립적으로 유지한다.
- [x] Free-form composer가 `/api/product/chat/messages`를 사용하고 일반 Plan clarification을 answer/cancel한 뒤 같은 product stream을 이어간다.
- [x] Product Review와 general clarification이 서로의 response route를 사용하지 않으며 active Turn 중 conflicting send/action은 busy로 거절된다.
- [x] Sidebar를 running 또는 pending Review 중 hide/show해도 same Turn, stream과 transcript가 유지된다.
- [x] 1440×900 이상에서 source selection, evidence navigation, accept·clarification controls, focus order와 status copy가 usable하다.
- [x] Nominal Playwright trace가 실제 Vite/Express와 deterministic Runtime/product store를 통과한다.

## Verification

- Targeted test or command: `npm run test -w @ay-ple/chat-shell`, focused Server product stream tests, `npm run test:e2e -w @ay-ple/chat-shell`
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run check:docs-links`, `git diff --check`
- Manual or live smoke: 1440×900과 wider desktop에서 nominal action, evidence navigation, accept, reload, 일반 clarification과 sidebar hide/show를 직접 확인한다.

검증 결과:

- Chat Shell unit 37개와 Server 115개 test가 통과했고, full Playwright desktop suite 11개가 실제 Vite→Express→deterministic Runtime/product store seam에서 통과했다. Nominal action ordering, Agent·terminal, exact Review binding, evidence navigation, accept 뒤 authoritative bootstrap, reload, 일반 Plan clarification, interrupt, mounted hide/show와 legacy product transcript 미사용을 포함한다.
- 최종 tree에서 `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run check:docs-links`, `git diff --check`가 모두 exit 0으로 통과했다.
- 1440×900과 1920×1080 viewport에서 pending Review, exact evidence 이동, accept와 authoritative settled state를 capture해 직접 확인했다. 임시 visual QA spec과 screenshot은 검증 뒤 제거했다. Clarification answer/cancel, keyboard focus order와 sidebar hide/show는 full Browser trace로 추가 확인했다.
- Fixed point `5acc408f43a7d65bc4d8cba3b35cea8fdb75839e` 이후 diff를 Standards와 Spec 두 축으로 병렬 review했다. CSS state naming, clarification response 중복, unused history surface, E2E helper 중복, cross-family activity ID collision과 Browser keyboard·Agent·interrupt trace findings를 regression과 함께 닫았다. Corrective range `a49a6805...93a84c34`의 두 축 follow-up은 finding 0건으로 통과했다.
- Lifecycle corrective는 reducer public seam에서 먼저 red를 확인했다. Pre-accept `completed`, post-accept `not_accepted | acceptance_unknown`, interrupt 중 clarification·Review resolution이 각각 기존 false success와 `running` 회귀를 재현했고, exact matrix와 stopping-preserving implementation 뒤 37개 Chat Shell unit이 green으로 전환됐다. Live Server producer를 함께 대조해 Assignment pre-accept의 honest `not_accepted | acceptance_unknown | failed | unknown`과 Chat의 `not_accepted | unknown`을 보존했다.
- Corrective fixed point `20e76500fbf9c1f028de5515693e43d0eab3b0da` 이후 diff를 Standards와 Spec 두 축의 독립 agent가 병렬 review했다. Matrix의 operation-kind·public acceptance stage semantics, interaction·Review stopping race, unchanged `operation.control-failed` recovery와 downstream non-change를 확인했고 두 축 모두 finding 0건으로 통과했다.

## Result

Chat Shell의 오른쪽 AY Chat을 product-only mounted companion으로 연결했다. 대표 workspace와 정확히 두 TXT 선택에서 시작한 Assignment action은 preparing·accepted·Skill·Plan·MCP·Agent·Review·interrupt·terminal을 하나의 cumulative transcript로 줄이고, raw engine protocol이나 legacy `/api/codex-chat/*` transcript를 섞지 않는다. Account readiness, workspace와 settled history는 같은 bootstrap application state에 보존되며 `not_ready`, `unavailable`과 busy guard는 mutation만 fail closed하고 읽기 가능한 workspace를 유지한다.

Pending Review는 Assignment의 title, dueAt, submissionMethod와 field-level selected-source evidence를 표시한다. Evidence control은 중앙 pane의 정확한 material과 quote로 이동하고, accept는 exact interaction·patch·decision binding을 제출한 뒤 authoritative bootstrap을 다시 읽어 `반영됨`, confirmed Assignment, confirmation과 apply outcome을 표시한다. Reload는 settled snapshot만 복원하고 이전 transcript나 native prompt를 거짓 복원하지 않는다.

Free-form composer와 일반 Plan clarification의 answer/cancel은 product operation seam을 사용하며 Review response route와 분리된다. Sidebar hide/show는 controller를 unmount하거나 active Turn을 interrupt하지 않는다. Deterministic E2E harness는 Browser request를 실제 Vite proxy와 Express product route, workspace store와 private hosted MCP까지 통과시켜 nominal journey와 interrupt·clarification·focus behavior를 검증한다.

Lifecycle corrective에서는 Browser가 관찰한 public acceptance stage와 operation kind에 따라 terminal status를 fail closed한다. Assignment pre-accept의 current authority-loss 결과인 `not_accepted | acceptance_unknown | failed | unknown`과 Chat의 `not_accepted | unknown`은 정직하게 정산하고, accepted 이후 공통 `not_accepted`와 Assignment `acceptance_unknown`은 성공·불명으로 오인하지 않는다. Interrupt 중 interaction 또는 Review resolution은 binding과 transcript resolution만 정리하고 matching terminal이나 honest `unknown`까지 `stopping`을 유지한다.

Implementation commits:

- `64b3f180` — `feat: add product chat operation reducer`
- `11387f45` — `feat: connect product chat companion`
- `7c5ffa6d` — `fix: serialize product interaction responses`
- `b0f0ce72` — `fix: preserve cancelled workspace activation`
- `76730637` — `test: cover product companion vertical`
- `874934c2` — `fix: surface authoritative review settlement`
- `a49a6805` — `docs: describe product companion vertical`
- `93a84c34` — `fix: close product companion review findings`
- `18a395d3` — `fix: enforce product chat lifecycle settlement`

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
