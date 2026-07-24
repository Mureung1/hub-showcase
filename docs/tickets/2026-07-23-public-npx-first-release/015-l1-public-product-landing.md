# 015 — L1 — Public product Landing이 release truth를 렌더링한다

## Agent triage

- State: completed
- Surface: local-ticket
- Next actor: coordinator

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
- Landing source는 command, version, download/installed size, free-space bound, Browser minimum, public URL와 rollback을 독립적으로 hard-code하지 않는다. Handoff snapshot에는 예상했던 S1 Landing display decoder/fixture가 없었으므로 L1이 lane-local strict consumer decoder와 test-only fixture를 소유하고, production display artifact는 G0가 authoritative release input에서 생성한다.
- Display input이 missing·invalid·mismatch면 `<release-version>`, `@latest`, bare package, fixture watermark 제거 같은 fallback으로 publishable output을 만들지 않는다.
- Hero 뒤 command는 exact `npx ay-ple@<version>`이고 `--yes`를 포함하지 않는다. Copy action은 byte를 바꾸거나 자동 실행·deep link를 시도하지 않는다.
- `AVAILABLE`은 exact npx, verified Runtime, managed Codex 연결, 새 SemesterWorkspace, Ready와 same-version relaunch만 포함한다. Import, Course, 학업 action, LMS·Calendar와 `.app`·`.dmg`는 `COMING NEXT` 또는 scope 밖이다.
- Landing에서 OAuth callback, setup picker, product mutation이나 telemetry를 구현하지 않는다.
- Public links는 fixture의 verified destination이 있을 때만 active하다. Unreviewed remote font·asset·analytics dependency를 추가하지 않는다.
- Writer는 fixed `handoffSha`에서만 작업하고 sibling branch merge·cherry-pick, package manifest/lockfile와 shared contract 수정, deploy·publish를 하지 않는다. Shared delta는 C가 직렬 소유하며 active writer는 최대 3명이다.

## Acceptance Criteria

- [x] 1440×900 first fold 안에 한 개의 `h1` `한 학기를 함께 관리하는 AY`, current preview boundary와 valid fixture의 exact command·copy action이 함께 보인다.
- [x] Valid release-display fixture가 command, compatibility, Runtime download/installed bytes, conservative free-space bound, cache와 public trust links를 owner field와 다르게 재해석하지 않고 렌더링한다.
- [x] Missing·extra·unknown·mismatched display input에서 build 또는 publishable-output gate가 fail closed하고 placeholder·moving tag를 출력하지 않는다.
- [x] First-run field guide가 Landing→exact npx→preflight/verified Runtime→managed Browser OAuth→Guided Setup→Compact Ready를 설명하며 Landing 자체는 mutation하지 않는다.
- [x] `AVAILABLE`과 `COMING NEXT`가 현재 preview와 future academic capability를 명확히 분리한다.
- [x] Compatibility·trust surface가 Apple Silicon/macOS/Node/npm/Chrome·Chromium/network/ChatGPT account와 local-first data/network boundary를 정확히 설명한다.
- [x] Docs, GitHub, release evidence, Privacy, Security, Apache-2.0, NOTICE와 third-party notice link가 fixture의 실제 destination과 일치하고 missing destination을 active link로 합성하지 않는다.
- [x] Copy feedback은 keyboard reachable하고 `aria-live`로 전달되며 한 개의 `h1`, meaningful alt, reduced motion와 horizontal overflow 0을 만족한다.
- [x] 1440×900과 1920×1080에서 body 16–18px, helper/status 13–14px 이상과 first-fold hierarchy가 유지된다.

## Verification

- Targeted test or command: S0가 정의한 Landing workspace test·typecheck·build와 valid/missing/mismatch release-display render/link tests
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run check:docs-links`, `git diff --check`
- Manual or live smoke: Valid fixture와 주요 failure fixture를 actual built Landing에서 1440×900, 1920×1080으로 열어 first fold, copy, keyboard, trust links와 overflow를 visual review한다. Deploy는 하지 않는다.

## Ticket Result

### Delivery receipt

| Evidence | Result |
| --- | --- |
| Fixed handoff | `27b8b77d8d4b4bd16a0c1589e7accb8550954eb3` |
| Ticket claim | `1dc5c6994bf495c34c1c24008df812bc5bc7a0a1` |
| Feature implementation | `184e1abfc6cc6a0045a1b03716db392a9c880fd7` |
| Typography correction | `867ecbc2d37fe1b1ce0e92b287d17558fdb1a613` |
| P1 sentence-flow correction / fixed reviewed candidate | `96b36b2e24da9952e3b3fa09d196e0c5ba545c9c` |
| Independent review | Exact `867ecbc2d37fe1b1ce0e92b287d17558fdb1a613`의 release-truth와 나머지 visual criteria는 통과했다. Visual reviewer가 mixed inline `code`/`strong`를 direct grid child로 분절하는 P1 한 건을 발견했고, exact `96b36b2e24da9952e3b3fa09d196e0c5ba545c9c`의 focused re-review가 `PASS`했다. |

### Verification receipt

| Gate | Result |
| --- | --- |
| Landing tests | `npm test -w @ay-ple/landing` — `13/13` green. Valid/missing/mismatch decode, exact owner rendering, link, keyboard copy, rollback과 mixed-inline list structure를 포함한다. |
| Landing typecheck | `npm run typecheck -w @ay-ple/landing` — green |
| Landing build | `npm run build -w @ay-ple/landing` — green. Production `dist`는 renderer와 strict decoder만 export하며 test-only fixture는 포함하지 않는다. |
| Documentation links | `npm run check:docs-links` — active `28`, historical `2`, green |
| Diff | `git diff --check` — green |
| 1440×900 actual document | `h1` 1개, release card bottom `714.8125/900`, body/helper/status `17/14/13px`, horizontal overflow `0`. `AVAILABLE` 5개와 `COMING NEXT` 3개가 각각 한 개의 `.list-copy` direct child 안에서 28px readable line으로 렌더링됐다. |
| 1920×1080 actual document | `h1` 1개, release card bottom `887.96875/1080`, body/helper/status `17/14/13px`, horizontal overflow `0`. 같은 8개 문장의 marker와 inline `code`/`strong` 정렬을 다시 확인했다. |
| Interaction and trust | Keyboard `Enter`로 exact command copy를 실행하면 `aria-live` status가 성공을 알린다. Fixture의 Docs, GitHub, release evidence, Privacy, Security, Apache-2.0, NOTICE와 third-party notices destination을 그대로 렌더링하며 console warning/error는 `0`이었다. Content-bearing image를 사용하지 않아 누락된 `alt`도 없다. |

Initial visual review의 P1은 `.check-list li`와 `.arrow-list li`가 marker뿐 아니라 inline `code`/`strong`까지 각각의 grid child로 취급해 문장을 조각내는 문제였다. Corrective는 각 list item의 문장 전체를 단일 `.list-copy` child로 감싸 marker와 copy의 두 column만 남겼고, 두 list의 8개 item 모두 direct element child가 정확히 하나인지 검사하는 structural regression test를 추가했다.

### G0 consumer handoff

| Boundary | Ownership and shape |
| --- | --- |
| Reconciled Starting Point | Handoff SHA에는 Ticket이 예상한 S1 Landing release-display decoder와 fixture가 존재하지 않았다. Shared contract를 즉석에서 추가하지 않고 L1 writable surface 안에 lane-local consumer seam을 만들었다. |
| Consumer schema and decoder | L owner의 `apps/landing/src/release-display.ts`; SHA-256 `4be6c7bbb3dd2d90a9fce3b290a1597a6b2e0dd07ea5a4c843a3c8501cd592f4`. `schemaVersion: 1` 아래 `release`, `runtime`, `compatibility`, `links`, nullable `rollback`을 exact-decode한다. |
| Test-only fixture | `apps/landing/src/testing/release-display-fixtures.test.ts`; SHA-256 `74c451049aea0851e42293900a4e5bca230231c834564346d4807ac6f29b6259`. 명백히 fictional한 version·size·`example.com` URL만 사용하며 `.test.ts`라 production build에 들어가지 않는다. |
| Producer owner | G0b/G release lane이 application, Runtime, compatibility와 reviewed trust destination의 authoritative artifacts에서 production display input을 생성한다. L renderer나 fixture가 production release value의 authority가 아니다. |
| Required binding | `release.applicationVersion`은 `runtime.applicationVersion`, `compatibility.applicationVersion`, `links.applicationVersion`과 같아야 한다. `applicationReleaseTag`는 `v<applicationVersion>`, command는 byte-exact `npx ay-ple@<applicationVersion>`이다. Rollback은 `null` 또는 별도 exact version·command·evidence가 있는 `still-supported`만 허용한다. |
| Fail-closed behavior | Missing/extra/unknown field, version/command/tag mismatch, unsafe byte/path/URL와 unsupported rollback은 `LandingReleaseDisplayError`로 거부한다. `renderLandingDocument(undefined)`도 throw하며 `@latest`, bare package, placeholder 또는 production fallback document를 합성하지 않는다. |
| Production value rule | Production source에는 release version, Runtime size, compatibility minimum과 public URL의 hard-coded default가 없다. G0가 valid artifact를 주입하기 전에는 publishable Landing document가 존재하지 않는다. |

Root full gates와 publication/deploy는 이 isolated L lane이 합성하지 않았으며 coordinator가 integration DAG에서 수행한다. Parent Spec은 후속 implementation ticket이 남아 있으므로 incomplete 상태를 유지한다.

## Blocked By

- [003-spine-s2-server-composition-stabilization.md](003-spine-s2-server-composition-stabilization.md) — Spine S2 — Server composition을 분리하고 Browser fail-closed oracle을 닫는다

## Starting Points

- `apps/landing/src/**`와 S0 scaffold가 제공한 test/build seam
- 예상했던 `apps/landing/src/testing/**`의 S1 release-display fixture는 handoff snapshot에 없었다. 실제 lane-local decoder와 test-only fixture는 위 G0 consumer handoff에 고정했다.
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
| handoffSha | `27b8b77d8d4b4bd16a0c1589e7accb8550954eb3` — Coordinator가 전달한 clean integration HEAD다. Blocker 003은 `State: completed`이고 fixed reviewed `spineTipSha` `c2e95616d8ac2461844525c69a7e0d714da3e710` 및 root green receipt가 이 handoff ancestry에 포함됨을 claim 전에 확인했다. |
| writablePaths | `apps/landing/src/**`; `apps/landing/public/**`; `docs/tickets/2026-07-23-public-npx-first-release/015-l1-public-product-landing.md`. `apps/landing/package.json`, root manifest/lock와 deployment surface는 제외한다. |
| consumedContracts | Package compatibility와 Runtime descriptor display fields; C+B prototype verdict; ADR 0015 trust-link boundary. 예상했던 S1 Landing fixture/decoder 부재는 lane-local strict consumer seam으로 조정했다. |
| predecessorEvidence | 003 fixed reviewed SHA와 `spineTipSha`, handoff ancestry의 root four-gate receipt. 예상했던 S1 Landing fixture conformance는 실제 입력이 없어 L1 lane-local consumer tests로 대체했다. |
| requiredChecks | Landing valid/missing/mismatch render/link tests; workspace typecheck/build; accessibility checks; 1440×900·1920×1080 visual review; root four gates; docs links; `git diff --check` |
| reviewOwner | L author가 아닌 visual reviewer와 release-truth reviewer |
| handoffArtifact | Fixed reviewed L1 SHA `96b36b2e24da9952e3b3fa09d196e0c5ba545c9c`, consumer decoder/test-only fixture path와 digest, render/link matrix와 two-viewport visual acceptance receipt. G0b가 production display producer contract로 소비한다. |
