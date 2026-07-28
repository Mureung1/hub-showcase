# 003 — Source workbench `organize_sources` action

## Agent triage

- State: completed
- Surface: local-ticket
- Next actor: none

## Parent Spec

`docs/specs/2026-07-28-organize-sources-action-invocation.md`

## What It Delivers

학생이 source explorer에서 preview와 독립적으로 text 자료를 여러 개 선택하고 `선택한 자료 정리하기`를 명시적으로 실행할 수 있다. Action 시점의 ordered paths와 current Codex settings가 immutable request와 action transcript entry로 동결되고, 기존 Chat dock의 NDJSON reducer·Review·clarification·interrupt·terminal UI가 같은 Product operation을 표시한다.

## Spec Traceability

- User stories: 1, 2, 3, 4, 5, 7
- Implementation contract: `Public ActionInvocation request`, `Product operation lifecycle`, `Browser interaction and presentation`, `Failure and security behavior`

## Slice-Specific Constraints

- Preview focus `selectedSource`와 action selection `selectedActionPaths`는 별도 transient state다. Initial action selection은 empty이고 preview click·evidence navigation·checkbox toggle만으로 action request나 Turn을 시작하지 않는다.
- Text row만 selectable하다. PDF·unsupported row는 preview를 유지하지만 action checkbox를 disable하고 text-only 이유를 accessible label이나 설명으로 제공한다.
- Selection은 fresh source-list order의 ordered unique path 최대 16개다. Limit에서는 새 선택만 닫고, explicit reload는 current list에 남아 있으며 여전히 text인 path와의 교집합만 보존한다.
- Action control은 selected count를 표시하고 selection이 empty이면 disabled다.
- Browser adapter는 shared product-contract decoder를 통과한 exact `organize_sources` body를 `/api/product/actions`에 보내고 existing Browser-safe NDJSON frame decoder를 재사용한다.
- Chat과 action은 request 시작 전 transcript entry만 다르다. Action entry는 `kind: "action"`, 사용자 label과 frozen relative paths를 표시하며 typed user Chat message로 가장하지 않는다.
- Action click은 paths와 current optional Codex settings를 defensive copy한다. 이후 source reload·selection 변화가 in-flight body나 transcript entry를 바꾸지 않는다.
- Action 시작 시 Chat dock을 연다. Dock hide/show는 mounted controller, active fetch stream, pending Review와 transcript를 unmount하거나 재시작하지 않는다.
- Workspace/account/settings가 unavailable하거나 local/remote Product operation이 active하고 Review·clarification response가 pending이면 새 action과 Chat submit을 닫는다. Active 중 checkbox mutation은 막지만 preview와 evidence navigation은 유지한다.
- Preflight JSON failure와 streamed failure는 같은 controller에서 표시한다. Terminal 뒤 selection은 자동으로 지우지 않으며 explicit retry는 fresh request다.
- Browser reload는 selection·action transcript·pending response를 복원하지 않고 existing disconnect/interrupt semantics를 따른다.
- Normal Chat에 explorer selection을 암묵적으로 붙이지 않고 별도 Browser stream state machine, durable action ledger와 mobile layout을 만들지 않는다.
- Browser README는 action selection·stream reuse·text-only 지원과 transient state를 current behavior로 기록한다.

## Acceptance Criteria

- [x] Initial action selection이 empty이며 preview click과 checkbox toggle만으로 `/api/product/actions` 요청이 0회다. Preview click은 checkbox state를, checkbox click은 preview focus를 바꾸지 않는다.
- [x] Action button이 selected count를 표시하고 empty selection에서는 disabled다.
- [x] Text checkbox만 활성화되고 PDF·unsupported와 16개 limit의 disabled reason이 keyboard·screen-reader 사용자를 포함해 식별 가능하다.
- [x] Selection이 source-list order, uniqueness와 최대 16개를 지키고 reload 뒤 current text intersection만 보존한다.
- [x] Action click이 exact ordered paths와 Codex settings를 한 request로 freeze하고 이후 UI state 변경이 request body를 바꾸지 않는다.
- [x] Action transcript entry가 label과 frozen refs를 user Chat message와 구분해 표시한다.
- [x] 닫힌 Chat dock이 action 시작 시 열리고 hide/show 뒤에도 stream·Review·clarification·interrupt 상태가 이어진다.
- [x] Active operation 동안 checkbox·새 action·Chat submit은 닫히고 source preview와 evidence navigation은 계속 동작한다.
- [x] Preflight JSON failure, streamed error, interrupt와 terminal 뒤 selection이 남으며 explicit 재실행만 fresh action을 시작한다.
- [x] Action-started stream의 Review accept·revise·reject와 general clarification이 기존 reducer·settlement path를 사용한다.
- [x] Normal Chat request는 selected paths를 포함하지 않고 기존 settings·transcript·terminal behavior를 유지한다.
- [x] 1440×900과 1920×1080 Chromium에서 explorer action control, central preview와 Chat dock이 겹치지 않는다.

## Verification

- Targeted: `npm test -w @ay-ple/chat-shell` — 20 tests green.
- Targeted Browser: `npm run test:e2e -w @ay-ple/chat-shell -- --grep "organize_sources|prepared"` — real Server composition과 deterministic Runtime의 2 tests green.
- Workspace gates: `npm run lint -w @ay-ple/chat-shell`, `npm run typecheck -w @ay-ple/chat-shell`, `npm run build -w @ay-ple/chat-shell` — green.
- Repository gates: `npm test`, `npm run typecheck`, `npm run build` — green.
- Extended gates: `npm run test:e2e -w @ay-ple/chat-shell` — 3 tests green; `npm run test:prepared-workspace-product-actual` — 1 test green; `npm run check:docs-links` — active 28·historical 2 green; `git diff --check` — green.
- Desktop fixture: default 1440×900과 explicit 1920×1080 Chromium에서 explorer action control·preview·Chat dock geometry가 green이다. Live provider와 mobile smoke는 범위 밖이라 실행하지 않았다.
- Review: fixed point `dcd6ae2aabd566b152a753b575b3e2d888167adf` 이후 Standards 0건, Spec 1건의 settings-failure fallback 우려를 확인했다. Existing explicit test·UI와 parent spec의 optional settings·normal Chat compatibility에 따라 `failed`는 Runtime default fallback, `idle | loading`은 unavailable로 판정해 코드 변경 없이 해소했다.

## Blocked By

- `./002-validated-organize-sources-product-operation.md` — 검증된 `organize_sources` Product operation

## Starting Points

- `apps/chat-shell/src/prepared-product-api.ts`
- `apps/chat-shell/src/prepared-product-api.test.ts`
- `apps/chat-shell/src/use-prepared-product-chat.ts`
- `apps/chat-shell/src/use-prepared-product-chat.test.ts`
- `apps/chat-shell/src/prepared-source-workbench.tsx`
- `apps/chat-shell/src/prepared-product-chat.tsx`
- `apps/chat-shell/src/prepared-workspace-app.tsx`
- `apps/chat-shell/src/App.css`
- `apps/chat-shell/e2e/prepared-public-cutover.spec.ts`
- `apps/chat-shell/README.md`

## Result

- Preview focus와 독립적인 transient text selection을 source-list order·최대 16개로 추가했다. PDF·unsupported·limit·active-operation 제한은 focus 가능한 checkbox의 accessible reason으로 표시하고 successful reload에서는 current text intersection만 보존한다.
- `선택한 자료 정리하기`가 ordered refs와 current optional Codex settings를 defensive copy해 exact `/api/product/actions` request와 별도 action transcript entry로 동결한다. Chat과 action은 같은 NDJSON reducer·Review·clarification·interrupt·terminal controller를 사용하며 normal Chat에는 selection을 붙이지 않는다.
- Action은 닫힌 Chat dock을 열고 active operation 동안 selection mutation·새 action·Chat submit만 잠근다. Preview·evidence navigation은 유지하고 preflight·stream failure·interrupt·terminal 뒤 selection은 explicit retry를 위해 남긴다.
- Browser README와 current implementation owners는 구현된 Browser action과 아직 남은 exact local-provider/actual prepared-workspace closeout을 분리해 기록했다.
- 구현 commit: `f897affb3` (`feat: add organize sources workbench action`), `07bba883d` (`docs: record source workbench action state`).
