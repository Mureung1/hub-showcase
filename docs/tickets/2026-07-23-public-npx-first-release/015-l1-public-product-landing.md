# 015 — L1 — Public product Landing이 release truth를 렌더링한다

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

[AY-PLE public npx 첫 출시](../../specs/2026-07-23-public-npx-first-release.md)

## What It Delivers

AY-PLE의 public homepage가 `한 학기를 함께 관리하는 AY`라는 제품 약속과 exact-command release card를 같은 first fold에 보여 준다. Landing은 release-generated display input의 valid fixture만 read-only로 렌더링하고, 값이 없거나 서로 불일치하면 publishable output을 만들지 않아 이후 G1이 실제 release truth를 안전하게 주입할 수 있다.

## Spec Traceability

- User stories: 1–4, 15–17
- Implementation contract: Module Responsibilities and Seams — `apps/landing`; Production host와 root의 compatibility descriptor
- Implementation decisions: UI와 Landing; Public source, license와 publication
- Testing decisions: Landing render/link/visual tests와 UI, live와 public acceptance

## Slice-Specific Constraints

- Adopted prototype verdict는 C Open field guide의 editorial hierarchy와 B exact release card·execution path·trust adjacency다. Prototype source, CSS, copy와 fixture version·size·URL을 production fallback으로 port하지 않는다.
- Landing source는 command, version, download/installed size, free-space bound, Browser minimum, public URL와 rollback을 독립적으로 hard-code하지 않는다. S1의 read-only display fixture를 소비하며 final value는 G1만 생성한다.
- Display input이 missing·invalid·mismatch면 `<release-version>`, `@latest`, bare package, fixture watermark 제거 같은 fallback으로 publishable output을 만들지 않는다.
- Hero 뒤 command는 exact `npx ay-ple@<version>`이고 `--yes`를 포함하지 않는다. Copy action은 byte를 바꾸거나 자동 실행·deep link를 시도하지 않는다.
- `AVAILABLE`은 exact npx, verified Runtime, managed Codex 연결, 새 SemesterWorkspace, Ready와 same-version relaunch만 포함한다. Import, Course, 학업 action, LMS·Calendar와 `.app`·`.dmg`는 `COMING NEXT` 또는 scope 밖이다.
- Landing에서 OAuth callback, setup picker, product mutation이나 telemetry를 구현하지 않는다.
- Public links는 fixture의 verified destination이 있을 때만 active하다. Unreviewed remote font·asset·analytics dependency를 추가하지 않는다.
- Writer는 fixed `handoffSha`에서만 작업하고 sibling branch merge·cherry-pick, package manifest/lockfile와 shared contract 수정, deploy·publish를 하지 않는다. Shared delta는 C가 직렬 소유하며 active writer는 최대 3명이다.

## Acceptance Criteria

- [ ] 1440×900 first fold 안에 한 개의 `h1` `한 학기를 함께 관리하는 AY`, current preview boundary와 valid fixture의 exact command·copy action이 함께 보인다.
- [ ] Valid release-display fixture가 command, compatibility, Runtime download/installed bytes, conservative free-space bound, cache와 public trust links를 owner field와 다르게 재해석하지 않고 렌더링한다.
- [ ] Missing·extra·unknown·mismatched display input에서 build 또는 publishable-output gate가 fail closed하고 placeholder·moving tag를 출력하지 않는다.
- [ ] First-run field guide가 Landing→exact npx→preflight/verified Runtime→managed Browser OAuth→Guided Setup→Compact Ready를 설명하며 Landing 자체는 mutation하지 않는다.
- [ ] `AVAILABLE`과 `COMING NEXT`가 현재 preview와 future academic capability를 명확히 분리한다.
- [ ] Compatibility·trust surface가 Apple Silicon/macOS/Node/npm/Chrome·Chromium/network/ChatGPT account와 local-first data/network boundary를 정확히 설명한다.
- [ ] Docs, GitHub, release evidence, Privacy, Security, Apache-2.0, NOTICE와 third-party notice link가 fixture의 실제 destination과 일치하고 missing destination을 active link로 합성하지 않는다.
- [ ] Copy feedback은 keyboard reachable하고 `aria-live`로 전달되며 한 개의 `h1`, meaningful alt, reduced motion와 horizontal overflow 0을 만족한다.
- [ ] 1440×900과 1920×1080에서 body 16–18px, helper/status 13–14px 이상과 first-fold hierarchy가 유지된다.

## Verification

- Targeted test or command: S0가 정의한 Landing workspace test·typecheck·build와 valid/missing/mismatch release-display render/link tests
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run check:docs-links`, `git diff --check`
- Manual or live smoke: Valid fixture와 주요 failure fixture를 actual built Landing에서 1440×900, 1920×1080으로 열어 first fold, copy, keyboard, trust links와 overflow를 visual review한다. Deploy는 하지 않는다.

## Blocked By

- [003-spine-s2-server-composition-stabilization.md](003-spine-s2-server-composition-stabilization.md) — Spine S2 — Server composition을 분리하고 Browser fail-closed oracle을 닫는다

## Starting Points

- `apps/landing/src/**`와 S0 scaffold가 제공한 test/build seam
- `apps/landing/src/testing/**`의 S1 release-display valid/missing/mismatch fixture
- `docs/wayfinding/public-npx-first-release/assets/public-landing-prototype.md`
- `docs/wayfinding/public-npx-first-release/assets/npx-production-composition-research.md`
- `docs/wayfinding/public-npx-first-release/assets/runtime-release-delivery-research.md`
- Immutable prototype commit `2790a7f1402469c0030dc2e9b5d1fd2e924ee7a9`는 verdict 확인용 read-only evidence

## Delivery Handoff

| Field | Contract |
| --- | --- |
| node | `L1` |
| owner | `L` — Landing |
| branch | `codex/public-preview-l1-landing` |
| worktree | `/Users/swh/Desktop/code/ai-agent-challenge/hub-public-preview-worktrees/l1-landing` |
| handoffSha | Claim 시 coordinator가 003의 fixed reviewed `spineTipSha`와 required integration gates가 green임을 확인한 뒤 exact integration HEAD를 기록한다. Placeholder·branch name·가짜 SHA를 쓰지 않는다. |
| writablePaths | `apps/landing/src/**`; `apps/landing/public/**`; `docs/tickets/2026-07-23-public-npx-first-release/015-l1-public-product-landing.md`. `apps/landing/package.json`, root manifest/lock와 deployment surface는 제외한다. |
| consumedContracts | S1 Landing release-display fixture and decoder; package compatibility and Runtime descriptor display fields; C+B prototype verdict; ADR 0015 trust-link boundary |
| predecessorEvidence | 003 fixed reviewed SHA와 `spineTipSha`, S1 display fixture conformance, root four-gate receipt |
| requiredChecks | Landing valid/missing/mismatch render/link tests; workspace typecheck/build; accessibility checks; 1440×900·1920×1080 visual review; root four gates; docs links; `git diff --check` |
| reviewOwner | L author가 아닌 visual reviewer와 release-truth reviewer |
| handoffArtifact | Fixed reviewed L1 SHA, fixture adapter path/digest, render/link matrix와 two-viewport visual acceptance receipt consumed by G0 |
