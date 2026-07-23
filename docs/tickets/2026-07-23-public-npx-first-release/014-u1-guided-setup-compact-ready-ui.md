# 014 — U1 — Guided Setup에서 Compact Ready UI로 전환한다

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

[AY-PLE public npx 첫 출시](../../specs/2026-07-23-public-npx-first-release.md)

## What It Delivers

S1의 frozen Browser fixture만으로 Account screen, A Guided Setup, working, recovery와 C Compact Ready를 한 product root에서 렌더링한다. 학생은 최종 승인 전 생성 범위와 위치를 확인하고, Ready 뒤에는 과목·자료·학업 action을 과장하지 않는 semester status center를 1440×900과 1920×1080 desktop에서 읽고 조작할 수 있다.

## Spec Traceability

- User stories: 5–14, 16
- Implementation contract: Browser-safe setup과 Ready projection; Data and State Flow — First run·Ready relaunch
- Implementation decisions: UI와 Landing — A Guided checkpoint → C Compact status center; `U1` 단일 UI ownership
- Testing decisions: UI, live와 public acceptance; S1 Browser Account/Setup/Ready fixture consumption

## Slice-Specific Constraints

- Adopted prototype verdict는 A의 `input_required | confirmation_required | working`과 C의 protected/Ready 상태 전환뿐이다. Prototype source, CSS, fixture version·path·count를 production으로 port하지 않는다.
- Browser는 `@ay-ple/product-contract` decoder와 fixture만 소비한다. Raw filesystem, OAuth/native protocol, receipt phase나 Ready invariant를 client가 재해석하지 않는다.
- Ready 전과 recovery에는 Ready checklist, next journey, current 3-pane workbench, 자료 pane과 Chat composer를 렌더링하지 않는다.
- `ready`는 Course·RawMaterial count나 학업 action availability를 합성하지 않는다. `첫 자료 가져오기`는 disabled `COMING NEXT`로만 보인다.
- `App.css` 전체 broad rewrite나 mobile breakpoint 작업은 하지 않는다. 새 root의 typography, button hierarchy와 desktop layout foundation을 같은 U1 ownership 안에서 먼저 만든다.
- Current Chat Shell에는 React render-test dependency가 없고 U는 package manifest·lockfile을 수정할 수 없다. S0가 render harness를 제공하지 않았다면 pure decoder/view-model tests와 existing Vite build를 사용하고 실제 Browser two-viewport visual review를 acceptance authority로 남긴다.
- `apps/chat-shell/e2e/**`는 I owner의 표면이다. U1은 E2E fixture를 수정해 rendering failure를 숨기지 않는다.
- Writer는 fixed `handoffSha`에서만 시작하며 sibling merge·cherry-pick을 하지 않는다. Shared contract나 dependency가 필요하면 C-owned serial delta를 요청하고 coordinator의 최대 3 writer 제한을 따른다.

## Acceptance Criteria

- [ ] Account `checking | login_required | login_starting | login_pending | verifying | connected | unsupported_account | unavailable`가 frozen fixture의 허용 action과 정확히 대응한다.
- [ ] A Guided Setup이 학년·학기, Server-projected parent 표시값, editable leaf와 최종 `학기 공간 만들기` 승인을 명확한 primary/secondary hierarchy로 보여 준다.
- [ ] Confirmation 화면은 승인 전 mutation을 성공처럼 표현하지 않고, working은 퍼센트나 durable phase 대신 coarse product progress만 보여 준다.
- [ ] C가 reauth, account unavailable, proven-safe resume, restart required, release mismatch와 recovery별 allowlisted action만 렌더링한다.
- [ ] Ready가 semester label, `Codex 연결됨`, 세 validation copy, leaf/safe display location, boundary copy와 disabled next journey를 보여 주고 Course·자료·action을 합성하지 않는다.
- [ ] DOM, URL, Browser storage와 client log에서 raw path, durable setup/recovery identity, receipt phase, digest, Runtime/native/account private identity가 0건이다.
- [ ] Keyboard focus, loading, empty, error와 recovery가 같은 semantic token을 사용하고 한 decision에 primary action 하나만 있다.
- [ ] Ready title 28–36px, body 16px, helper/status 13–14px 이상 원칙을 지키며 1440×900과 1920×1080에서 핵심 status/action이 clip·overlap되지 않는다.
- [ ] Existing post-Ready academic source/model code는 삭제하지 않지만 public first-run root에서 비활성 상태로 남는다.

## Verification

- Targeted test or command: `npm test -w @ay-ple/chat-shell`, `npm run typecheck -w @ay-ple/chat-shell`, `npm run build -w @ay-ple/chat-shell`, `npm run lint -w @ay-ple/chat-shell`
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run check:docs-links`, `git diff --check`
- Manual or live smoke: Frozen fixture로 actual built UI를 1440×900과 1920×1080에서 열어 Account, confirmation, working, recovery와 Ready의 typography·focus·button hierarchy·overflow를 visual review한다.

## Blocked By

- [003-spine-s2-server-composition-stabilization.md](003-spine-s2-server-composition-stabilization.md) — Spine S2 — Server composition을 분리하고 Browser fail-closed oracle을 닫는다

## Starting Points

- `apps/chat-shell/src/App.tsx`
- `apps/chat-shell/src/App.css`
- `apps/chat-shell/src/index.css`
- `apps/chat-shell/src/product-api.ts`
- `apps/chat-shell/src/product-chat-model.ts`
- `packages/product-contract`의 S1 Account/Setup/Ready decoder와 fixture
- `docs/wayfinding/public-npx-first-release/assets/semester-ready-surface-prototype.md`
- Immutable prototype commit `2abecefe3626a34704c552b14404ceeed960752e`는 verdict 확인용 read-only evidence

## Delivery Handoff

| Field | Contract |
| --- | --- |
| node | `U1` |
| owner | `U` — Product UI |
| branch | `codex/public-preview-u1-guided-ready-ui` |
| worktree | `/Users/swh/Desktop/code/ai-agent-challenge/hub-public-preview-worktrees/u1-guided-ready-ui` |
| handoffSha | Claim 시 coordinator가 003의 fixed reviewed `spineTipSha`와 required integration gates가 green임을 확인한 뒤 exact integration HEAD를 기록한다. Placeholder·branch name·가짜 SHA를 쓰지 않는다. |
| writablePaths | `apps/chat-shell/src/**`; `docs/tickets/2026-07-23-public-npx-first-release/014-u1-guided-setup-compact-ready-ui.md`. `apps/chat-shell/package.json`, root manifest/lock와 `apps/chat-shell/e2e/**`는 제외한다. |
| consumedContracts | S1 Browser-safe Account/Setup/Ready decoders와 stable fixture scenario roster; A→C prototype verdict; existing Chat Shell product API adapter |
| predecessorEvidence | 003 fixed reviewed SHA, `spineTipSha`, S1 producer-consumer fixture conformance와 private-field leak receipt, root four-gate receipt |
| requiredChecks | Pure decoder/view-model and colocated UI tests; Chat Shell typecheck/build/lint; 1440×900·1920×1080 actual visual review; root four gates; docs links; `git diff --check` |
| reviewOwner | U author가 아닌 visual reviewer와 product-contract reviewer |
| handoffArtifact | Fixed reviewed U1 SHA, consumed fixture roster digest, Account→Guided→Compact render matrix와 two-viewport visual acceptance receipt |
