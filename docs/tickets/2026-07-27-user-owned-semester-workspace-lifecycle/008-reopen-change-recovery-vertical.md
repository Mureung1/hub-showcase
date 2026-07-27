# 008 — Reopen·change·recovery vertical

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

`docs/specs/2026-07-27-user-owned-semester-workspace-lifecycle.md`

## What It Delivers

AY-PLE 재시작은 registry의 active SemesterWorkspace를 fresh 검증해 같은 Git root에서 새 Runtime으로 다시 열고, 사용자는 다른 학기를 선택·활성화하거나 stopped Runtime을 명시적으로 restart할 수 있다. Missing workspace, incompatible registry와 Runtime failure는 path를 노출하지 않는 recovery UI로 수렴하며 cross-workspace thread를 만들지 않는다.

## Spec Traceability

- User stories: 2, 4, 5
- Implementation contract: WorkspaceRegistry, Browser workspace lifecycle, Data and State Flow, Failure Behaviour

## Slice-Specific Constraints

- Startup과 reopen은 registry entry의 canonical root에서 root v4 identity를 fresh read한다. Missing, moved, reused와 identity mismatch면 Workspace Runtime을 시작하지 않는다.
- Missing registry는 bootstrap으로 시작할 수 있지만 malformed/future bytes는 original bytes를 보존한 `registry_incompatible`다.
- Valid active pointer의 stopped Runtime은 explicit restart로 fresh start한다. Already-ready Runtime restart는 idempotent다.
- Current candidate가 non-null이면 active restart는 DELETE 전 `409`다. Candidate deletion은 disk나 registry pointer를 바꾸지 않는다.
- Active workspace에서 chooser selection이 확정되면 old Workspace Runtime을 닫고 Bootstrap으로 이동하지만 old registry pointer는 new activation 성공까지 유지한다.
- New activation 성공 뒤 old thread와 Runtime generation은 재사용하지 않는다. 이전 workspace의 Skill, MCP binding과 transcript가 새 workspace에 나타나면 fail이다.
- `workspace_unavailable` recovery는 non-null unavailable reference, `runtime_unavailable`은 valid available reference 또는 first activation의 null을 사용한다.
- Browser에는 active/candidate summary와 safe basename만 보낸다. Registry known list와 one-click switch는 deferred다.
- Desktop UI는 candidate front-half와 activation, restart, change, recovery를 한 lifecycle로 표시하고 transition 중 duplicate command를 비활성화한다.

## Acceptance Criteria

- [ ] App restart가 valid registry와 v4 identity를 사용해 same workspace의 fresh Runtime·thread를 열고 active lifecycle을 복구한다.
- [ ] Missing/moved/reused/mismatched root가 no Runtime start와 `workspace_unavailable` recovery로 수렴하며 path를 노출하지 않는다.
- [ ] Malformed/future registry가 byte-for-byte 보존되고 reset 또는 empty fallback 없이 `registry_incompatible`로 표시된다.
- [ ] Active restart의 candidate conflict, ready idempotency, stopped-runtime fresh start와 Runtime failure projection이 exact contract를 따른다.
- [ ] Workspace change가 old Runtime close→Bootstrap candidate→required activation 순서를 지키고 성공 전 old pointer를 보존한다.
- [ ] Restart와 workspace change 뒤 native thread cwd, Skill, MCP credential과 transcript가 previous workspace에서 교차하지 않는다.
- [ ] Browser E2E가 bootstrap, active, transitioning, 두 recovery variant, registry incompatible와 change/restart control을 desktop width에서 검증한다.

## Verification

- Targeted test or command:
  - `npm test -w @ay-ple/server`
  - `npm test -w @ay-ple/chat-shell`
  - `npm run test:e2e -w @ay-ple/chat-shell`
  - Registry reopen, restart와 cross-workspace deterministic Runtime focused tests
- Repository checks:
  - `npm test`
  - `npm run typecheck`
  - `npm run build`
  - `npm run lint -w @ay-ple/chat-shell`
  - `npm run check:docs-links`
- Manual or live smoke:
  - 두 temporary Git SemesterWorkspace 사이에서 activate→App restart→change→restart를 수행하고 registry, process tree, exact cwd와 UI recovery를 확인한다.

## Blocked By

- `007-required-interaction-activation.md` — Required Interaction activation

## Starting Points

- `apps/server/src/product-development.ts`
- `apps/server/src/server-application.ts`
- `apps/server/src/product-http.ts`
- `apps/server/src/product-bootstrap.test.ts`
- `apps/server/src/codex-chat-service.ts`
- `apps/server/src/server-process-lifecycle.ts`
- `apps/chat-shell/src/product-api.ts`
- `apps/chat-shell/src/use-source-workbench.ts`
- `apps/chat-shell/src/App.tsx`
- `apps/chat-shell/e2e/workspace-recovery.spec.ts`
- `apps/chat-shell/e2e/chat-shell-harness.ts`
- `scripts/test-product-entrypoint.mts`
