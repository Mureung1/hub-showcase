# UI Design Rules — The Elegance Formula

A reference checklist of UI/UX design principles, organized by category.

## 1. Visual Composition & Hierarchy

- **Embrace negative space** — Use empty space deliberately to reduce clutter and let key elements breathe.
- **Achieve simplicity through meaningful reduction** — Strip away anything that doesn't serve the user's goal.
- **Use the Golden Ratio or the Rule of Thirds** — Apply proven proportion systems to layout composition.
- **Use size, color, and contrast to establish a clear hierarchy** — Guide the eye to what matters most first.
- **Utilize grid systems** — Keep alignment and spacing consistent across the interface.
- **60-30-10 color rule** — Split a palette into a dominant color (60%), a secondary color (30%), and an accent color (10%).
- **Lean flat, but don't sacrifice affordance** — Favor flat design while keeping interactive elements visually recognizable as such.

## 2. User Experience & Flow

- **Design with empathy** — Build experiences around real user needs and context, not assumptions.
- **Strive for intuitive processes** — Minimize the steps and thought required to complete a task.
- **Don't make users think** — Interfaces should be self-explanatory; avoid unnecessary cognitive load.
- **Intuitive flow** — Sequence screens and actions in the order users naturally expect.
- **Be predictable** — Consistent patterns build trust; avoid surprising the user with unexpected behavior.
- **Reduce effort/friction** — Minimize the mental and physical effort needed to complete common actions.

## 3. Personalization & Engagement

- **Personalization & customization** — Let users tailor the experience to their preferences.
- **Personalization and visual feedback** — Reflect user actions and state changes clearly and immediately.
- **Introduce gamification** — Use game-like mechanics (progress, rewards, streaks) to motivate engagement.
- **Contextual hints and tips** — Surface guidance exactly when and where it's relevant, not upfront in bulk.
- **Onboard or retire users appropriately** — Guide new users in, and gracefully sunset inactive ones.
- **Social integration** — Connect the product to users' social context where it adds value.

## 4. System & Consistency

- **Create a comprehensive design system** — Centralize components, tokens, and rules for consistency at scale.
- **Stick to tried-and-tested design patterns** — Don't reinvent well-understood UI conventions without reason.
- **Ensure consistent, identical design elements** — Reuse components rather than creating one-offs.
- **Set guidelines for micro-experience/micro-interaction components** — Define small interaction details (hover, transitions, loading states) as part of the system.

## 5. Data & Discoverability

- **Leverage rich user analytics** — Use behavioral data to inform design decisions.
- **Organization aids discoverability** — Structure content/features so they're easy to find.
- **Preference disclosures** — Reveal advanced options progressively, not all at once.

## 6. Inclusivity & Trust

- **Good design is inclusive** — Design for accessibility and a broad range of users and abilities.
- **Prefer modal use sparingly / avoid over-reliance on modals** — Use modals only when truly necessary; they interrupt flow.

## 7. What NOT to Do — Signs of Generic "AI-Slop" Design

These are recurring fingerprints that make an interface look mass-produced by an AI tool rather than intentionally designed. Avoid all of them.

- **Don't default to the purple-to-blue gradient.** <cite index="3-1">It was once a fresh look, but it has become the go-to visual shorthand that signals "this was made with AI."</cite>
- **Don't slap glassmorphism on everything.** <cite index="3-1">Frosted-glass panels floating in soft pastel voids with no functional purpose is an overused, easily-spotted pattern.</cite>
- **Don't leave the typeface at Inter or Roboto.** <cite index="3-1,4-1">These are safe, legible defaults that AI tools reach for automatically, but they read as generic and forgettable rather than intentional</cite> — pick a typeface that reflects the product's personality.
- **Don't use faceless 3D abstract human illustrations.** <cite index="3-1">Generic characters in impossible poses holding glowing orbs or floating UI pieces are a well-known AI-illustration cliché.</cite>
- **Don't apply identical padding and border-radius everywhere.** <cite index="4-1">Uniform spacing and corner-rounding across every single element is one of the tells of an AI-generated layout, along with vague aspirational headlines and generic stock imagery.</cite>
- **Don't write vague, aspirational copy** like "Build the future" or "Empower your team" — say something specific to the actual product.
- **Don't reuse the same page skeleton by default.** <cite index="1-1">AI-generated design tends to be ultra-conventional, repeating the same predictable structure and visual hierarchy across unrelated products.</cite>
- **Don't skip micro-interactions.** <cite index="4-1">Missing or generic hover, transition, and loading states are a common giveaway that the design wasn't refined by a human.</cite>
- **Don't fill space with generic stock photos or AI-generated illustrations** as a substitute for real content or product screenshots.
- **Don't use white space as a cover for thin content.** <cite index="3-1">Generous spacing is good practice, but it becomes a red flag when it's really just hiding the absence of an actual content strategy.</cite>

**Rule of thumb:** if a layout, palette, or illustration choice feels like it could belong to *any* product in *any* industry, that's the sign to make it more specific to this one.

### 7.1 Confirmed hits in this project (2026-07-23 audit)

This project's `taxwiz-fe` inherited the root `docs/design.md` "Night Sky" dark-fintech token set (built by generalizing an AI-generated reference image) almost verbatim onto a data-entry tool. Cross-checked against §7 above, it matches nearly every flagged pattern — not coincidentally, since it was itself produced by asking AI to generalize a stock landing-page look:

- Navy/purple-gradient background + a single cyan accent (`--accent-cyan #4FC3E8`) — the #1 most-cited AI tell, present in `docs/design.md` root spec.
- `backdrop-filter: blur(10px)` glassmorphism on the sticky `TopBar` for no functional reason.
- Fully pill-shaped (`border-radius: 9999px`) buttons/badges used everywhere with zero sharp/flat counterpoint anywhere in the UI (mandated explicitly in the root design doc §5/§7).
- Poppins/Quicksand as "the one font for everything."
- Tiny uppercase `.eyebrow` label above every screen heading, applied identically every time.
- Identical fade+slide-up (`opacity 0→1, x:28→0`) entrance animation on every topic transition in `TaxInputWizard`, same easing/duration everywhere — motion applied uniformly rather than to communicate state.
- Gradient-fill progress bar (`linear-gradient(90deg, ...)`) as the default, rather than a flat fill.

**Decision:** don't just re-hue these — swap the reference point entirely, vary motion per state, and introduce at least one deliberately non-pill/non-blurred structural element as a counterpoint. See §8 for the productivity-tool direction this should move toward instead.

---

## 8. Tax Input Wizard — UX Decisions (2026-07-23)

Research-backed decisions for `taxwiz-fe`'s annual tax data-entry wizard, given the actual goal: a non-technical small-business owner (소상공인) entering annual financial data once a year, where the product's whole differentiator is making tax work *feel as easy as Toss made securities trading feel* — speed and low error rate matter more than a marketing-site look.

- **8.1 Step-by-step input — revised to loose grouping (2026-07-23).** Originally "keep strict one-cell-at-a-time." Revised after a follow-up research pass: a controlled usability study (PMC8190652, 20 healthcare-staff participants comparing single-page/grouped, multi-page, and conversational one-field-at-a-time digital forms for the same task) found the **grouped single-page format beat conversational one-at-a-time on usability (SUS 76 vs 57), error count (21 vs 83), and speed** — users explicitly praised being able to see and cross-check related answers together, and criticized the conversational format as unpredictable and hard to verify. This lines up with Miller's Law/chunking research and NN/g's 4 cognitive-load principles, both of which favor grouping tightly-related fields over forced atomization. New rule: **group loosely-related fields into small clusters of 2-4 items** (e.g. a "company basics" cluster: 설립연도/중소기업여부/상시근로자수) shown together on one card; transitions between clusters use the same light fade/slide already in place — don't regress to a dense table (still wins only for bulk-entry power users, not this one), and don't over-atomize into 17 single-field steps either.
  - **Explicitly rejected: staggered-reveal animation to disguise a multi-field cluster as feeling like one field.** Researched and rejected — "labor illusion" (animation making users perceive less effort) is documented only for *wait-time* perception (e.g. fake progress bars), not for *field-count/complexity* perception; there is no evidence base for extending it that way. The nearest real analogue (the same study's conversational one-at-a-time arm) had the *worst* error rate and trust scores of the three formats tested — i.e. the mechanism this would mimic is the one that performed worst. In a trust-sensitive tax context, papering over real complexity with motion risks reading as a dark pattern once noticed. Get the "light" feeling from structure (clear section heading, whitespace, exactly-2-4-items) instead of motion.
- **8.2 Balance-sheet equality check (자산=부채+자본) — elevate.** Treat this live cross-check as a signature feature, not an incidental status bar. Inline validation catches typos, but real errors need more visual weight — make imbalance loud (color + position), not a quiet muted line.
- **8.3 Dark mode — reconsider.** Precision numeric-entry/proofreading work is better served by light/high-contrast screens; dark mode's real benefit is low-ambient-light reading/coding sessions, not daytime data entry. Dark-by-default here was inherited from the landing-page reference, not chosen for this task — decide explicitly rather than keep it because it "looks premium."
- **8.4 Keyboard-first input — add.** Verify `ActiveCell` autofocuses and Enter commits + advances for every cell type, not just some. Cheap, high-leverage for repetitive sequential entry.
- **8.5 Restrained "productivity tool" language over "marketing site" language — add.** Follow Linear/Notion/Stripe: minimalism there is ruthless prioritization for a user trying to finish a task, not decoration. Gradients/glow/blur/pill-everything read as "marketing landing page," which undercuts trust in a tool meant to say "I am handling your tax numbers correctly."
- **8.6 Plain-language accessibility — add.** Audit every field label (e.g. "부동산임대업주업") for jargon vs. plain-language phrasing/tooltips, beyond the partial coverage already in `TOPIC_META.desc`. Target an older, non-technical small-business-owner user: larger type, strong contrast, generous click targets.

---

## 9. Desktop Layout — 2026-07-23

`taxwiz-fe/src/styles/global.css`'s `.app-container` is hard-capped at `max-width: 480px` — on a wide desktop monitor the entire app is a narrow mobile-width column floating in dead space either side. This is the concrete cause behind the "홈 화면이 가로로 긴 화면에 최적화가 안 되어 있다" complaint. Researched how comparable products (US: TurboTax, QuickBooks Online, Mercury, Ramp, Stripe Dashboard, Linear, Notion; Korean: 자비스, 캐시노트, 세무사랑Pro, WEHAGO, 홈택스) use wide-desktop space, and decided the structure differs **by screen type**, not a single 3/4-pane template applied everywhere:

- **Sequential-input screens** (Hometax's own actual filing wizard, presumably 삼쩜삼) deliberately stay close to single-column even in Korean government/tax products — "간결하고 직관적" is the explicit government UX rationale. Wide monitors don't change that a filing step is inherently linear.
- **Dashboard/status screens** (자비스, 캐시노트, WEHAGO's landing dashboard) use card/widget grids — this is where wide-screen space gets used for genuinely separate pieces of information shown at once.
- **The common non-trivial pattern across Linear/Notion/Stripe/Ramp/WEHAGO/세무사랑Pro**: don't stretch the primary task column to fill the monitor (Linear explicitly caps issue-content width even on ultrawide); instead let a secondary region (properties/detail panel, contextual history, drawer) grow to absorb the remaining width, present only when relevant.

### 9.1 Wizard (input) screen — 3 regions
- **Left**: full 17-topic list (TurboTax EasyStep Navigator style) — done/current/remaining state per topic, clickable to jump.
- **Center**: the grouped-field card from §8.1 (2-4 loosely-related fields, light fade/slide between groups) — not stretched to fill the screen, kept at a comfortable reading width.
- **Right**: persistent live panel — progress % + remaining question count, and the 자산=부채+자본 balance-sheet equality check (§8.2's signature-feature elevation lives here, loud color/position on imbalance).

### 9.2 Home screen — card-grid dashboard
Replaces the current single centered vertical list. Cards: 회사 프로필, 이번 연도 신고 현황, 준비물 체크 현황, 사업연도별 신고 이력, 홈택스 조회 — laid out as an actual grid using the freed-up width, matching the 자비스/캐시노트/WEHAGO dashboard convention rather than a stretched single column.

### 9.3 Color mode — light
Per §8.3's "reconsider dark mode": switching to a light/high-contrast palette for both screens. Precision numeric entry/proofreading is better served by bright, high-contrast screens per the earlier research pass; dark-by-default here was inherited from the landing-page reference token set, not chosen for this task.

### 9.4 Scope of this pass
Only Home + Wizard are being redesigned this round (highest-frequency, most visibly broken screens). Login/Onboarding are left as-is for now.

### 9.5 Parked ideas (not in this round)
Noted for later, explicitly deferred so as not to scope-creep this pass: (a) a fully user-customizable widget/panel dashboard along the lines of Toss Securities' desktop trading screen (tossinvest.com) — user-added/removable/rearrangeable panels via "+"/"패널 편집"; (b) expanding beyond the single tax-adjustment-engine feature into additional features (not yet specified). Revisit after the Home/Wizard mockups are reviewed.

### 9.6 What actually shipped (2026-07-24)

Implemented directly in code (no Figma/mockup step — Figma hit its usage cap, and reviewing the
real screens in the dev server turned out to be faster than reviewing a static mockup):

- **Token set replaced** (`src/styles/global.css`): dark "Night Sky" → light "장부(ledger)" —
  warm neutral paper bg, ink text, single deep sea-blue action color (`#10557f`). Radii dropped
  from pill-everywhere to 3–12px; `--radius-full` now only used for actual circles (radio dots).
  Gradient progress fill → flat fill; `backdrop-filter` glassmorphism removed from the top bar.
  The old `@import` pulled Pretendard from Google Fonts, **where it does not exist** — it had been
  silently 404ing and falling back to system fonts. Now points at the official jsdelivr CDN.
- **`.app-container` 480px cap removed**, replaced by per-screen width tokens
  (`--w-page` / `--w-read` / `--w-rail` / `--w-panel` / `--topbar-h`).
- **Wizard 3분할** (§9.1): new `TopicRail` (left, 17 topics grouped by section, done/current/
  remaining, click-to-return) + new `LivePanel` (right, progress % + remaining count + balance
  check + 손익). `useEngine` gained `visitedTopics` and `goToTopic` — **backward jumps only**;
  forward jumps are refused because cells are generated dynamically from earlier answers, so
  skipping ahead would desync `frontier` from the actual cell list.
- **§8.2 elevated**: the balance check moved from a per-topic bottom `StatusBar` (visible only on
  재무상태표/손익계산서 screens) to the always-visible right panel, with three distinct states —
  입력 전(무채색) / 맞아요(조용한 초록) / 안 맞아요(굵은 빨강 테두리 + 차액 금액 + 어느 쪽이
  많은지 평문 안내). The "입력 전" state exists specifically so an all-zero form doesn't report
  "맞아요" and give false reassurance.
- **TopBar restructured** into the government-portal skeleton (얇은 유틸리티 바 → 브랜드/현재 위치
  행 → 진행 실선); section pills removed since the rail replaces them.
- **Home card grid** (§9.2): 1행 [이번 연도 신고 ×2][회사 프로필], 2행 [신고 이력 ×2][준비물].
- Dead Vite template leftovers `src/index.css` / `src/App.css` deleted (neither was imported).
- Tests: the TDD "약 N문항 남음" test moved TopBar → LivePanel along with the feature, plus 3 new
  balance-check tests. 14 passing, `tsc -b` clean, `oxlint` clean.

**Still open from §8, deliberately not in this pass:**
- **§8.1 (2–4개 묶음 입력)** — not done. This is an engine change (`cellsForTopic` emits one cell
  at a time and `frontier` advances by one), not a layout change, so it needs its own pass.
- §8.6 (평문 라벨 전수 점검) and §9.4's "Login/Onboarding은 그대로" both still stand.

### 9.7 §8.4 키보드 우선 입력 — 고침 (2026-07-24)

§9.6에서 "깨져 있음"으로 기록한 걸 그날 바로 고쳤다. 원인은 `ActiveCell`의 자동 포커스
effect가 `cell.kind === 'text'`일 때만 동작하고, 숫자(`NumberInput`)·날짜(`YmdField`)는 내부
`<input>`/`<select>`에 그 ref가 안 붙어 있던 것. 필드마다 ref를 꿰는 대신 **`.body` 컨테이너에서
첫 입력 요소(`input, select, textarea`)를 찾아 포커스**하는 방식으로 통일 — 셋을 한 메커니즘으로
커버하고, `.body`에 다는 덕에 titleRow의 도움말(?) 버튼은 자연히 제외된다. `date-ymd`에는 없던
Enter 핸들러도 추가(유효할 때만 확정).

**의도적으로 제외한 것: 선택형(yesno/select)은 자동 포커스하지 않는다.** 첫 보기 버튼에 포커스를
주면 앞 질문을 Enter로 넘긴 손이 그대로 Enter를 한 번 더 눌러 안 읽은 채 첫 보기가 선택돼버린다 —
세무 맥락에선 위험. 타이핑 필드(text/number/date)만 포커스하며, 거기서 Enter는 "내가 친 값 확정"이라
안전하다. `AUTOFOCUS_KINDS = {text, number, date-ymd}`.

검증: `ActiveCell.test.tsx` 7개(자동 포커스 3 + Enter 확정 4) 추가, 전체 21개 통과. dev 서버에서
type→Enter→type→Enter로 숫자 시퀀스를 손을 마우스로 안 옮기고 통과하는 것까지 브라우저로 확인.

### Source note
Transcribed and cleaned up from a UI design principles infographic ("Elegance Formula — Rules for UI Design"). A few labels in the source image were cut off or partially obscured by an overlay, so wording for those items has been reconstructed based on best interpretation and grouped into the closest matching category above. Section 7 ("What NOT to Do") is compiled from current commentary on generic AI-generated design patterns (mid-2026). §7.1 and §8 are from a two-subagent research pass (AI-design-tell audit + tax-productivity UX research) run against this repo's actual code/design docs on 2026-07-23. §9 (and the §8.1 revision) are from a same-day follow-up: two Explore research passes on US/global and Korean fintech/tax desktop layouts, plus one on grouped-field-with-animation UX research, done while planning the Figma redesign of Home + Wizard with the user.
