# 007 — Chat-first Assignment product vertical을 닫는다

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

[First Assignment Product-bound Codex Companion](../../specs/2026-07-19-first-assignment-product-bound-companion.md)

## What It Delivers

학생이 3-pane workbench에서 두 TXT를 선택해 `선택한 자료 정리하기`를 실행하고, 오른쪽 AY Chat의 cumulative stream에서 Skill·Plan·MCP와 evidence-linked pending Review를 본 뒤 수락하여 confirmed Assignment를 만들고 Browser reload 뒤 다시 여는 nominal product journey를 완성한다.

## Spec Traceability

- User stories: 2, 3, 4, 5, 6, 8, 9, 11
- Implementation contract: Desktop workbench; Browser-safe product operations and activity; Data and State Flow; Testing Decisions — Highest practical seam and Browser Playwright nominal trace

## Slice-Specific Constraints

- Action, Skill activity, Agent response, proposal, Review와 terminal을 오른쪽 AY Chat의 한 transcript에서 보여준다. 별도 job page, action bar, progress dashboard나 approval center를 만들지 않는다.
- 학생용 copy는 자료, 선택한 자료, 변경 제안, 검토 대기, 반영됨을 사용하고 `ModelingRun`, raw Codex IDs와 protocol 용어를 기본 UI에 노출하지 않는다.
- Pending Review는 Assignment values와 field-level evidence를 표시하고 evidence 선택 시 중앙 pane의 exact source quote로 이동한다.
- Review option은 `수락 | AY에게 수정 요청 | 거절`을 모두 렌더링하되 이 nominal ticket의 full E2E completion은 accept path와 reload reopen에 집중한다. Revision·reject와 loss matrix는 다음 ticket이 소유한다.
- Accept는 Browser optimistic success를 만들지 않고 product transaction result를 기다린다. Native response보다 confirmed `SemesterModel`이 authority다.
- Sidebar hide/show는 active controller와 transcript를 유지하며 Turn을 interrupt하지 않는다.
- Reload는 settled product snapshot과 confirmed Assignment를 다시 열지만 previous transcript나 unanswered native prompt를 복원한 것처럼 표시하지 않는다.
- Free-form Chat composer는 같은 active Thread와 transcript를 유지한다. Active Turn 중 second mutation은 busy로 닫는다.
- Browser는 opaque product/native correlation만 echo하고 absolute path, secret, raw MCP payload와 private request ID를 보지 않는다.
- Deterministic runtime fake를 사용하는 real Chromium→Vite→Express→product store seam이 nominal acceptance의 authority다.

## Acceptance Criteria

- [ ] Student can activate the representative workspace, select a Course and exactly two TXT sources in the 3-pane workbench.
- [ ] `선택한 자료 정리하기`가 one action을 시작하고 preparing→accepted→Skill/Plan/MCP/Agent activity를 오른쪽 Chat에 ordering대로 표시한다.
- [ ] Valid pending Assignment proposal이 title, dueAt, submissionMethod와 각 field의 selected-source evidence를 학생용 Review로 보여준다.
- [ ] Evidence interaction이 중앙 pane의 matching material/quote로 이동하고 unselected control은 나타나지 않는다.
- [ ] Accept가 exact active interaction·patch·decision binding으로 제출되고 transaction success 뒤 `반영됨`과 confirmed Assignment를 표시한다.
- [ ] Reload가 confirmed revision, Assignment, settled confirmation과 apply outcome을 다시 열며 transcript/pending prompt를 거짓 복원하지 않는다.
- [ ] Sidebar를 running 또는 pending Review 중 hide/show해도 same Turn, stream과 transcript가 유지된다.
- [ ] Existing free-form Chat가 같은 panel에서 계속 동작하고 active Turn 중 conflicting send/action은 busy로 거절된다.
- [ ] 1440×900 이상에서 source selection, evidence navigation, Review controls, focus order와 status copy가 usable하다.
- [ ] Nominal Playwright trace가 real Vite/Express와 deterministic Runtime/product store를 통과한다.

## Verification

- Targeted test or command: `npm run test -w @ay-ple/chat-shell`, `npm run test:e2e -w @ay-ple/chat-shell`
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run check:docs-links`, `git diff --check`
- Manual or live smoke: 1440×900과 wider desktop에서 full nominal action, evidence navigation, accept, reload와 sidebar hide/show를 직접 확인한다.

## Blocked By

- [002-source-centered-three-pane-workbench.md](002-source-centered-three-pane-workbench.md) — 자료 중심 3-pane workbench를 연다
- [006-first-assignment-action-stream.md](006-first-assignment-action-stream.md) — First Assignment action stream을 연다

## Starting Points

- `apps/chat-shell/src/App.tsx`
- `apps/chat-shell/src/use-chat-shell.ts`
- `apps/chat-shell/src/chat-api.ts`
- `apps/chat-shell/src/chat-model.ts`
- `apps/chat-shell/src/chat-presentation.tsx`
- `apps/chat-shell/src/product-api.ts`
- `apps/chat-shell/src/use-source-workbench.ts`
- `apps/chat-shell/e2e/source-workbench.spec.ts`
- `apps/chat-shell/e2e/chat-shell.spec.ts`
- `apps/chat-shell/e2e/chat-shell-harness.ts`
- `docs/product/ay-ple-review-workspace-scenario.md`
