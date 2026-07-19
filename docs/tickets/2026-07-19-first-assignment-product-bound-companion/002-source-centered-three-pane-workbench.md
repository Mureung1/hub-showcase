# 002 — 자료 중심 3-pane workbench를 연다

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

[First Assignment Product-bound Codex Companion](../../specs/2026-07-19-first-assignment-product-bound-companion.md)

## What It Delivers

Local Server가 활성 `SemesterWorkspace`의 eligible TXT를 stable `RawMaterial` registry와 bounded preview로 제공하고, 학생이 왼쪽에서 두 개를 선택하며 중앙에서 실제 원문을 탭으로 읽고 오른쪽에서 현재 AY Chat을 열고 닫을 수 있는 desktop 3-pane workbench를 제공한다. Assignment action과 Review는 아직 시작하지 않지만 source selection의 complete Server→Browser vertical과 이후 기능이 들어갈 실제 제품 공간 구조를 확정한다.

## Spec Traceability

- User stories: 1, 2, 9
- Implementation contract: Workspace activation and material admission; Browser-safe product operations and activity; Desktop workbench

## Slice-Specific Constraints

- `artifacts/camp-demo/product-flow/`는 layout·copy donor일 뿐 production component나 state owner가 아니다.
- `npm run materialize:dev-workspace`는 workspace를 준비할 뿐 canonical root `npm run dev`에 product controller를 구성하지 않는다. 이 ticket은 explicit `packageRoot`·`appDataRoot`와 Server-owned chooser/materialized workspace를 `createServerApplication({ semesterWorkspace })`에 결합하는 repository-owned product development bootstrap과 Browser activation operation을 함께 소유한다.
- Product bootstrap은 `appDataRoot`를 caller-owned layout input으로 명시적으로 받아야 한다. Current Chat의 `CODEX_CHAT_*_HOME`, 공통 parent 또는 `process.cwd()`에서 default를 추론하지 않고 입력이 없으면 fail closed한다.
- `RawMaterial` registry와 selection state는 001의 기존 workspace-local versioned store를 additive하게 확장한다. 별도 product store나 병렬 authority를 만들지 않는다.
- 1440–1920px desktop workspace와 light-first academic visual direction을 validation target으로 삼는다. Mobile·small-screen 최적화는 하지 않는다.
- Material refresh는 workspace 안의 eligible regular UTF-8 `.txt`만 bounded scan한다. App-owned subtree, symlink, escape, unreadable·unsupported·oversized file은 제외한다.
- Registry는 stable opaque material ID, canonical relative path, byte digest, media type과 size를 보존한다. Unchanged path는 refresh/reopen 뒤 identity를 유지하고 changed bytes는 active action이 없을 때 digest를 갱신한다.
- Preview는 material ID와 current registry digest를 다시 검증해 bounded text를 no-store로 반환한다. 사용자 원본을 이동·rename·rewrite하지 않는다.
- 왼쪽 pane은 opaque material ID와 relative display path만 사용하고 exactly two selected state를 명확하게 보여준다.
- 중앙 pane은 selected TXT tab과 bounded source preview를 표시한다. 가짜 IDE, editor persistence 또는 filesystem direct access를 만들지 않는다.
- 오른쪽 AY Chat은 current native Chat behavior를 유지한 채 sidebar로 배치한다. Hide/show는 Chat owner, transcript reducer와 active controller를 unmount·abort하지 않고 visibility만 바꾼다.
- Assignment proposal, evidence와 Review가 아직 없을 때 placeholder result를 꾸며내지 않는다.
- Loading, empty workspace, no Course, invalid material과 Server failure를 학생용 copy로 구분하고 raw runtime/path 정보를 노출하지 않는다.
- 이 ticket은 current text Chat route를 제거하거나 product action API를 미리 발명하지 않는다.

## Acceptance Criteria

- [ ] Repository-owned product development bootstrap이 explicit `packageRoot`·`appDataRoot`와 materialized/chooser-selected workspace를 같은 `SemesterWorkspaceController`에 연결하고 선택된 정규 path를 보고한다.
- [ ] Product bootstrap에 `appDataRoot`가 없으면 current Chat root나 `process.cwd()`를 대신 쓰지 않고 fail closed하며, Chat-only `test:dev-entrypoint`와 product activation 증거를 구분한다.
- [ ] 1440×900 이상에서 왼쪽 자료 pane, 중앙 source preview와 오른쪽 AY Chat sidebar가 동시에 사용 가능한 3-pane layout으로 렌더링된다.
- [ ] Workspace·Course snapshot과 material registry가 Browser에 hydrate되고 loading·empty·error 상태가 구분된다.
- [ ] Representative 세 TXT가 stable ID·relative path·digest metadata로 등록되고 refresh/reopen 뒤 unchanged identity를 유지한다.
- [ ] Symlink, workspace escape, unreadable·unsupported·oversized file과 app-owned subtree가 registry에 들어오지 않는다.
- [ ] 학생이 exactly two TXT를 선택하고 선택 수와 대상이 reload 전 app lifecycle 안에서 일관되게 표시된다.
- [ ] Unselected negative control은 registry에는 보이지만 선택하지 않은 상태로 유지된다.
- [ ] Selected tab을 바꾸면 같은 registered material의 bounded 원문 preview가 중앙 pane에 나타난다.
- [ ] Preview가 stale material ID·digest와 workspace escape를 fail closed로 거절하고 no-store response를 사용한다.
- [ ] Browser DOM, network-visible copy와 error에 absolute local path가 나타나지 않는다.
- [ ] Sidebar hide/show 중 current Chat component와 active stream controller가 유지되며 interrupt나 transcript reset이 발생하지 않는다.
- [ ] Current Chat streaming·interrupt·same-thread follow-up regression이 새 outer layout에서도 green이다.
- [ ] Desktop keyboard navigation, visible focus, readable contrast와 primary pane landmark를 자동화 또는 직접 QA로 확인한다.

## Verification

- Targeted test or command: focused Server material registry/preview tests, `npm run test -w @ay-ple/chat-shell`, focused Playwright source-workbench scenarios
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run check:docs-links`, `git diff --check`
- Manual or live smoke: 1440×900과 1920px-class viewport에서 material selection, tab preview, current Chat turn과 sidebar hide/show를 직접 확인한다.

## Blocked By

- [001-repeatable-semester-workspace-foundation.md](001-repeatable-semester-workspace-foundation.md) — 반복 가능한 SemesterWorkspace 기반을 연다

## Starting Points

- `apps/chat-shell/src/App.tsx`
- `apps/chat-shell/src/App.css`
- `apps/chat-shell/src/use-chat-shell.ts`
- `apps/chat-shell/src/chat-api.ts`
- `apps/chat-shell/e2e/chat-shell-harness.ts`
- `apps/server/src/server.ts`
- `apps/server/src/semester-workspace.ts`
- `apps/server/src/semester-workspace.test.ts`
- `scripts/semester-workspace-materializer.mts`
- `scripts/test-dev-entrypoint.mts`
- `package.json`
- `artifacts/camp-demo/product-flow/`
- `docs/product/ay-ple-review-workspace-scenario.md`
- `docs/product/ay-ple-design-system.md`
