# 006 — Candidate lifecycle vertical

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

`docs/specs/2026-07-27-user-owned-semester-workspace-lifecycle.md`

## What It Delivers

Browser에서 semester metadata와 directory를 선택하면 AY-PLE이 path를 노출하지 않는 process-local candidate를 만들고 hub-rooted Bootstrap Runtime에서 init Skill을 visible Turn으로 실행한다. 사용자는 candidate 선택, 초기화 진행·terminal, retry와 cancel을 desktop UI에서 확인하며, 초기화가 끝나도 explicit activation 전에는 normal Chat이 열리지 않는다.

## Spec Traceability

- User stories: 1, 2, 3, 5
- Implementation contract: BootstrapCandidate와 init/update Skill, Browser workspace lifecycle, Data and State Flow

## Slice-Specific Constraints

- Browser request는 exact semester identity만 받고 native chooser가 반환한 directory를 Server가 canonicalize한다. Browser에는 `candidateId`, semester와 safe basename label만 보내고 absolute path를 보내지 않는다.
- Selection command는 transition lease를 먼저 claim한다. User cancel은 prior state와 `{status:"cancelled"}`로 돌아가고 candidate ID나 disk mutation을 만들지 않는다.
- Active workspace에서 새 selection이 확정되면 old Workspace Runtime과 lifecycle binding을 bounded close한 뒤 fresh hub-cwd Bootstrap Runtime을 만든다. Registry pointer는 유지한다.
- Candidate는 process-local이며 App restart와 DELETE가 binding만 버린다. Init Skill이 만든 file과 Git commit은 rollback하지 않는다.
- `initialize`는 exact `{}`와 existing Product Turn NDJSON transport를 사용하며 hub-rooted Skill discovery와 candidate-only `writableRoots`를 소비한다.
- Active init 또는 transition과 중복 operation은 existing work를 preempt하지 않는 `409`다. Terminal 뒤 fresh rerun은 허용한다.
- Init terminal outcome은 `completed | failed | interrupted`를 보존한다. Agent final text나 completed init은 activation proof가 아니며 lifecycle은 `bootstrap`에 남는다.
- Candidate DELETE는 matching binding만 제거하고 stale repeat도 `204`다. New candidate나 disk를 건드리지 않는다.
- Front-half Browser UI는 bootstrap, selection transition, candidate metadata, init progress·terminal, retry와 cancel만 실제 API에 연결한다. Activation·reopen·recovery UI 완성은 Tickets 007–008이 소유한다.

## Acceptance Criteria

- [ ] `GET /api/product/bootstrap`이 no-active, current active와 candidate 조합을 target lifecycle codec으로 fresh projection한다.
- [ ] `POST /api/product/workspace-candidates/select`가 chooser cancel과 selected candidate를 exact contract로 반환하며 path와 private Runtime detail을 노출하지 않는다.
- [ ] Active selection은 old Runtime close 완료 전 Bootstrap ready나 selected response를 만들지 않고 registry active pointer를 바꾸지 않는다.
- [ ] `initialize`가 candidate root 하나만 writable한 Bootstrap Product Turn을 NDJSON로 전달하고 `activeOperation`과 candidate init operation ID를 일치시킨다.
- [ ] Init overlap, transition overlap, candidate mismatch, account not ready와 Runtime unavailable가 각각 safe `409 | 404 | 503`으로 수렴한다.
- [ ] Delete, stale delete, failed/interrupted init과 terminal retry가 disk rollback이나 false active state 없이 수렴한다.
- [ ] Desktop UI가 1440×900과 1920px-class에서 selection, init, retry와 cancel을 실제 Server lifecycle과 일관되게 표시한다.

## Verification

- Targeted test or command:
  - `npm test -w @ay-ple/product-contract`
  - `npm test -w @ay-ple/server`
  - `npm test -w @ay-ple/chat-shell`
  - Candidate lifecycle focused Playwright spec
- Repository checks:
  - `npm test`
  - `npm run typecheck`
  - `npm run build`
  - `npm run lint -w @ay-ple/chat-shell`
  - `npm run check:docs-links`
- Manual or live smoke:
  - Temporary fresh candidate와 dirty existing Git candidate에서 select→init→retry/cancel을 실행하고 UI, Git status와 registry non-mutation을 확인한다.

## Blocked By

- `003-product-operation-coordinator-and-lifecycle-contract.md` — Product operation coordinator와 lifecycle contract
- `004-native-git-project-context-and-permission-trust.md` — Native Git project context와 permission·trust
- `005-semester-workspace-init-skill.md` — SemesterWorkspace init Skill

## Starting Points

- `apps/server/src/server-application.ts`
- `apps/server/src/product-http.ts`
- `apps/server/src/product-bootstrap.test.ts`
- `apps/server/src/product-operation-coordinator.ts`
- `apps/server/src/codex-chat-service.ts`
- `apps/server/src/semester-workspace.ts`
- `apps/server/src/semester-workspace.test.ts`
- `apps/chat-shell/src/product-api.ts`
- `apps/chat-shell/src/product-api.test.ts`
- `apps/chat-shell/src/use-source-workbench.ts`
- `apps/chat-shell/src/App.tsx`
- `apps/chat-shell/e2e/chat-shell-harness.ts`
