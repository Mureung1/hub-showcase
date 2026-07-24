# 014 — U1 — Guided Setup에서 Compact Ready UI로 전환한다

## Agent triage

- State: completed
- Surface: local-ticket
- Next actor: coordinator

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

- [x] Account `checking | login_required | login_starting | login_pending | verifying | connected | unsupported_account | unavailable`가 frozen fixture의 허용 action과 정확히 대응한다.
- [x] A Guided Setup이 학년·학기, Server-projected parent 표시값, editable leaf와 최종 `학기 공간 만들기` 승인을 명확한 primary/secondary hierarchy로 보여 준다.
- [x] Confirmation 화면은 승인 전 mutation을 성공처럼 표현하지 않고, working은 퍼센트나 durable phase 대신 coarse product progress만 보여 준다.
- [x] C가 reauth, account unavailable, proven-safe resume, restart required, release mismatch와 recovery별 allowlisted action만 렌더링한다.
- [x] Ready가 semester label, `Codex 연결됨`, 세 validation copy, leaf/safe display location, boundary copy와 disabled next journey를 보여 주고 Course·자료·action을 합성하지 않는다.
- [x] DOM, URL, Browser storage와 client log에서 raw path, durable setup/recovery identity, receipt phase, digest, Runtime/native/account private identity가 0건이다.
- [x] Keyboard focus, loading, empty, error와 recovery가 같은 semantic token을 사용하고 한 decision에 primary action 하나만 있다.
- [x] Ready title 28–36px, body 16px, helper/status 13–14px 이상 원칙을 지키며 1440×900과 1920×1080에서 핵심 status/action이 clip·overlap되지 않는다.
- [x] Existing post-Ready academic source/model code는 삭제하지 않지만 public first-run root에서 비활성 상태로 남는다.

## Verification

| Gate | Result |
| --- | --- |
| Chat Shell tests | `npm test -w @ay-ple/chat-shell` — 54/54 pass |
| Chat Shell typecheck | `npm run typecheck -w @ay-ple/chat-shell` — pass |
| Chat Shell build | `npm run build -w @ay-ple/chat-shell` — pass |
| Chat Shell lint | `npm run lint -w @ay-ple/chat-shell` — pass |
| Documentation links | Repository `scripts/check-docs-links.mts` checker — active 28, historical cutover banner 2, pass |
| Candidate diff | `git diff --check` — pass |
| Independent focused rereview | Exact candidate `b1f20e07ab89e51ce656adfa149dddff3f900947` — PASS, blocker 0건 |
| Root integration gates | U1 branch에는 C1의 actual HTTP mount가 없으므로 합성하지 않았다. C1 integration 뒤 coordinator가 root test·typecheck·build·lint와 public journey E2E를 실행한다. |

## Claim Evidence

| Evidence | Result |
| --- | --- |
| Fixed handoff | `27b8b77d8d4b4bd16a0c1589e7accb8550954eb3` |
| Predecessor | Ticket 003은 `State: completed`이고 fixed reviewed `spineTipSha` `c2e95616d8ac2461844525c69a7e0d714da3e710`가 fixed handoff의 ancestor다. |
| Handoff integrity | Claim 직전 branch `codex/public-preview-u1-guided-ready-ui`의 clean `HEAD`가 coordinator가 지정한 fixed handoff와 exact match했다. |
| Claim scope | `apps/chat-shell/src/**`와 이 ticket만 수정한다. Shared contract·fixture, package/lock, E2E, mobile, sibling branch는 변경하지 않는다. |

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
| handoffSha | `27b8b77d8d4b4bd16a0c1589e7accb8550954eb3` — Ticket 003 fixed reviewed `spineTipSha` `c2e95616d8ac2461844525c69a7e0d714da3e710`와 required integration gate receipt를 포함해 coordinator가 W2에 발행한 clean integration HEAD다. |
| writablePaths | `apps/chat-shell/src/**`; `docs/tickets/2026-07-23-public-npx-first-release/014-u1-guided-setup-compact-ready-ui.md`. `apps/chat-shell/package.json`, root manifest/lock와 `apps/chat-shell/e2e/**`는 제외한다. |
| consumedContracts | S1 Browser-safe Account/Setup/Ready decoders와 stable fixture scenario roster; A→C prototype verdict; existing Chat Shell product API adapter |
| predecessorEvidence | 003 fixed reviewed SHA, `spineTipSha`, S1 producer-consumer fixture conformance와 private-field leak receipt, root four-gate receipt |
| requiredChecks | Pure decoder/view-model and colocated UI tests; Chat Shell typecheck/build/lint; 1440×900·1920×1080 actual visual review; root four gates; docs links; `git diff --check` |
| reviewOwner | U author가 아닌 visual reviewer와 product-contract reviewer |
| handoffArtifact | Fixed reviewed U1 SHA, consumed fixture roster digest, Account→Guided→Compact render matrix와 two-viewport visual acceptance receipt |

## Result

### Candidate와 contract evidence

| Evidence | Result |
| --- | --- |
| Initial implementation candidate | `db6ee4c79b33e8f027422f9dca6e209b903f767d` |
| Corrective candidate | `b1f20e07ab89e51ce656adfa149dddff3f900947` |
| Fixed reviewed candidate | `b1f20e07ab89e51ce656adfa149dddff3f900947` |
| Consumed fixture roster digest | `d7dc6e71b1ef3429f009420a5f644565616f5cda2d847fa185fb292c6714d5d1` |
| Browser API seam | GET `/api/product/public-preview`로 projection을 관찰하고 POST `/api/product/public-preview`로 exact command를 전달한다. Decoder는 허용되지 않은 response를 fail closed하며 기존 `/api/product/bootstrap` contract는 변경하지 않았다. |
| Existing academic surface | 기존 academic workbench는 `AcademicWorkbench`로 보존하되 public first-run root에서 비활성화했다. |

### Account → Guided → Compact render matrix

| Surface | Accepted states and actions |
| --- | --- |
| Account | `checking`, `login_required`, `login_starting`, `login_pending`, `verifying`, `connected`, `unsupported_account`, `unavailable`와 각 projection의 allowlisted action |
| Guided Setup | `input_required`의 학년·학기·parent·editable leaf, `confirmation_required`의 명시적 승인, `working`의 coarse progress |
| Protected and recovery | reauth, account unavailable, proven-safe resume, restart required, release mismatch, recovery별 allowlisted action |
| Compact Ready | semester label, `Codex 연결됨`, validation copy 세 개, leaf·safe display location, release boundary와 disabled `COMING NEXT` |

### Corrective review closure

| Prior finding | Closure evidence |
| --- | --- |
| `workspace.parent.select` 뒤 keyed remount 때문에 학기 draft가 사라졌다. | Controller가 semester draft를 소유하고 remount key를 제거했으며 projection을 pure reconciliation한다. 실제 1440×900에서 `4학년 / 2학기 / 내가 고른 학기`를 입력한 뒤 exact `workspace.parent.select` POST를 보냈고, parent가 Documents에서 School로, suggested leaf가 새 값으로 바뀐 뒤에도 draft가 보존됐다. |
| 상태 전환 뒤 deterministic accessible focus가 없었다. | Coarse public surface/stage focus key가 바뀔 때만 main `h1`으로 focus를 옮긴다. login start→starting, input→confirmation, approve→working, recovery→working, polling→Ready를 실제로 확인했고 같은 `login_pending` poll은 focus를 빼앗지 않았다. |
| Release command 복사 결과에 visible semantic success/failure가 없었다. | Keyboard Enter와 button focus 보존을 확인했고 `role="status"`·`aria-live="polite"` success가 보였다. 강제 rejection에서도 visible failure status가 나타났으며 pure test가 두 결과를 고정한다. |

### Desktop acceptance receipt

| Check | Independent result |
| --- | --- |
| Viewports | 1440×900과 1920×1080에서 horizontal/main overflow 0 |
| Typography | Ready title 32px, body 16px, helper/status 13–14px |
| Decision hierarchy | 각 decision에서 enabled primary action 하나 |
| Recovery truth | false-Ready 0건. Ready checklist, next journey, academic workbench와 Chat을 렌더링하지 않고 허용된 경우에만 safe discard를 제공한다. |
| Private-state boundary | DOM·URL private scan 0건, Browser storage writer/literal 0건 |
| Runtime hygiene | Console warning/error 0건 |

### Downstream obligations

- C1은 GET·POST `/api/product/public-preview`를 actual Server HTTP surface에 mount하고 exact command·response envelope를 연결해야 한다. U1은 Browser consumer만 소유하며 fixture나 server result를 하드코딩하지 않는다.
- Coordinator는 U1과 C1을 integration한 뒤 root four gates, docs links와 public journey E2E를 다시 실행한다.
- `apps/chat-shell/e2e/**` ownership은 I에 남는다. Existing academic surface는 post-Ready journey가 구현될 때까지 public root에서 비활성 상태를 유지한다.
- Parent Spec은 다른 release slice와 clean-machine evidence가 남아 있으므로 이 ticket 완료만으로 완료 처리하지 않는다.
