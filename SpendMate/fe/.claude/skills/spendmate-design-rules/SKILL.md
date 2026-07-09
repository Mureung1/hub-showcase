---
name: spendmate-design-rules
description: Design system rules for the SpendMate mobile app prototype (React + Vite, Figma Make export). Use this skill whenever you're building a new screen, adding a component, modifying an existing screen's layout, styling a modal/bottom sheet, choosing colors for a new expense category, or writing any user-facing copy (AI coach messages, empty states, buttons) inside this project. Trigger even if the user just says "화면 하나 추가해줘", "이거 스타일 바꿔줘", "카테고리 추가하고 싶어", or similar, without explicitly mentioning "디자인 규칙" — any visual or copy change in this codebase should consult this skill first so it stays consistent with the existing screens instead of inventing new colors, spacing, or tone.
---

# SpendMate Design Rules

SpendMate already has five working screens (Home, Stats, AddExpense, AICoach, MyPage) with a consistent visual language. The whole point of this skill is to stop new screens from silently drifting — a slightly different card radius, a shadow that doesn't match, a color that isn't in the palette. None of that is enforced by a linter here (styling is inline, not Tailwind classes, despite what `AGENTS.md` suggests — see below), so it only stays consistent if whoever writes the next screen actually looks at what's already there. That's what this file is for.

Before writing new UI code, skim the tokens and patterns below. If you're about to pick a hex color, a border-radius, or a shadow value that isn't listed here, that's a signal to go check how an existing screen solved the same problem rather than inventing a new one.

## Reality check: inline styles, not Tailwind classes

`AGENTS.md` says this project uses Tailwind CSS v4 utility classes. In practice, every screen (`HomeScreen.tsx`, `StatsScreen.tsx`, `AddExpenseScreen.tsx`, `AICoachScreen.tsx`, `MyPageScreen.tsx`) is written almost entirely with inline `style={{ ... }}` objects instead. Follow the code that's actually there, not the aspirational doc — write new components the same way (inline style objects), so the codebase stays uniform. Tailwind is still loaded and fine to reach for if you genuinely need a utility it's good at (e.g. `no-scrollbar`), but don't introduce a second styling convention for new screens.

## Design tokens

These are defined as CSS variables in `src/index.css` — reference them with `var(--name)` rather than re-typing hex codes, except where noted.

| Token | Value | Use for |
|---|---|---|
| `--primary` | `#4F8EF7` | Primary brand blue — CTAs, active nav state, links |
| `--primary-light` | `#EBF2FF` | Light blue background behind primary-colored icons/badges |
| `--mint` | `#6ED6C8` | Secondary accent — pairs with primary in gradients |
| `--mint-light` | `#E8F8F6` | Light mint background |
| `--accent` | `#FFC857` | Warm accent (warnings, highlights, streaks) |
| `--accent-light` | `#FFF8E8` | Light accent background |
| `--background` | `#F7F8FA` | Screen background (inside the phone frame) |
| `--card` | `#FFFFFF` | Card/surface background |
| `--foreground` | `#1A1D27` | Primary text |
| `--muted` | `#6B7280` | Secondary/label text |
| `--border` | `#E8EAF0` | Hairline borders, dividers |
| `--radius` | `20px` | Default card radius (also just written as `20` inline — see Radius scale) |

**Not a CSS variable, but used consistently as a hardcoded hex:** `#FF6B6B` is the danger/warning red (over-budget states, delete actions, negative trends). Keep using this exact hex for that meaning rather than picking a different red — it needs to read as "the same kind of alert" everywhere.

The whole app runs on **Pretendard** (loaded via CDN in `index.css`), falling back to `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`. Every text style in the existing screens sets `fontFamily: 'Pretendard'` explicitly even though it's the global default — match that (it protects against the font not applying inside portals/modals).

## Radius scale

There's a real hierarchy here, not random numbers — use the one that matches what kind of element you're building:

| Radius | Use for |
|---|---|
| `99` | Pills — badges, tags, filter chips, circular buttons, progress bar tracks |
| `20` | Default cards, sheets, hero cards |
| `16` | Secondary cards, larger icon containers |
| `14` | Icon containers, small buttons |
| `12` | Small icon boxes, inline stat chips |
| `10` | Tiny elements (small badges, compact icon boxes) |
| `44` | The phone mockup frame itself (`App.tsx`) — don't reuse this elsewhere |

## Shadow scale

| Shadow | Use for |
|---|---|
| `0 2px 16px rgba(0,0,0,0.06)` or `0 2px 12px rgba(0,0,0,0.05–0.06)` | Default resting card shadow |
| `0 8px 32px rgba(79,142,247,0.35)` | Colored shadow under a gradient hero card/primary CTA — swap the RGB to match the gradient's dominant color, keep the alpha around 0.3–0.35 |
| `0 -8px 40px rgba(0,0,0,0.15)` | Bottom sheets / modals sliding up from the bottom edge |

## Typography scale

Font sizes cluster around a few values — don't introduce arbitrary in-between sizes:

- **13px** — the default body/label size, used more than anything else. When in doubt, start here.
- **14–16px** — secondary emphasis, list item values, section subheadings
- **20–22px** — screen titles / headline text (`fontWeight: 800`)
- **34px** — the one hero number (e.g. remaining budget on the Home card) — reserve big sizes like this for the single most important number on a screen, not for general emphasis

Font weights follow the content's importance, not just visual preference:
- `900` — the single biggest number on a screen (hero amount, big title)
- `800` — screen headlines, card titles
- `700` — emphasized inline text, key values
- `500–600` — secondary/supporting text
- (regular 400 is essentially unused — this app leans bold)

## Color gradients

Gradients are always `135deg` and always a two-stop pair from the palette above. Reuse one of these rather than mixing new color pairs:

- **Brand / primary CTA / hero cards**: `linear-gradient(135deg, #4F8EF7, #6B5CF0)` (blue → purple)
- **AI / assistant-related accents**: `linear-gradient(135deg, #6ED6C8, #4F8EF7)` (mint → blue)
- **Warning / alert / "pay attention" moments**: `linear-gradient(135deg, #FFC857, #FF6B6B)` or `#FFC857, #FF9500`
- **Soft pastel backgrounds** (behind icons, illustrations): `linear-gradient(135deg, #EBF2FF, #E8F8F6)` — light blue → light mint

Pick the gradient by *meaning* (is this a primary action, an AI moment, or a warning?), not by which one looks nicest in isolation.

## Category color mapping

Every expense category gets a dedicated (icon color, light background) pair — this is what makes the recent-expenses list scannable at a glance. Existing mapping:

| Category | Icon color | Background |
|---|---|---|
| 카페 | `#6F4E37` | `#FFF3E0` |
| 편의점 | `#4F8EF7` | `#EBF2FF` |
| 외식 | `#00C4B3` | `#E8F8F6` |
| 식료품 | `#FF6B6B` | `#FFF0F0` |
| 교통 | `#FFC857` | `#FFF8E8` |
| 쇼핑 | `#9B8FFF` | `#F0EFFF` |

**Adding a new category**: pick a new saturated icon color that's visually distinct from the ones above, then generate its background by taking roughly the same hue at very low saturation/high lightness (about a 20%-tint version — same relationship every existing pair has). Don't reuse an existing icon color for a different category, and don't invent a background that isn't a pale tint of its own icon color.

## Icons

Only `lucide-react` — never mix in another icon set or raw SVGs for something Lucide already covers. Import only the specific icons a screen needs (`import { X, Check } from 'lucide-react'`), not a bulk import.

Recurring icon → meaning associations already established, keep using the same icon for the same meaning:
- `ChevronRight` — "go to / see more" affordance at the end of a row
- `X` — close a modal/sheet
- `Check` — confirm/selected state
- `Plus` — add a new item (also the shape of the center nav button)
- `TrendingUp` / `TrendingDown` — spending increase/decrease
- `Bell` — notifications
- `Camera` / `Image` — receipt/photo capture entry points
- `Sparkles` / `Zap` — "this is an AI-generated insight" marker

## Layout structure

- The whole app renders inside a fixed **393×852** div (`App.tsx`) styled to look like a physical phone: `borderRadius: 44`, a ~10px dark border, and a large drop shadow, with a fake status bar (`9:41` + battery icon) at the top. New top-level layout work should stay inside this frame, not fight it.
- **Bottom nav**: 5 items — 홈 / 통계 / **+** / AI 코치 / 마이페이지. The center `+` button is visually distinct from the other four: larger (52×52), circular, gradient-filled, and pulled up above the bar (`marginTop: -16`) so it reads as the primary action, not just another tab.
- **Modals / bottom sheets** (e.g. the "전체 지출" modal): `position: fixed; inset: 0` full-screen overlay with a dark blur backdrop, sliding up a `borderRadius: '28px 28px 0 0'` panel from the bottom via `animation: slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)`. Use this same pattern for any new "drill into detail" flow (e.g. the receipt-upload intermediate screens, recipe detail view, subscription edit) rather than a centered dialog — centered modals don't currently exist in this app and would look inconsistent if introduced.

## Copy & tone

- Address the user by name with `~님` (e.g. "안녕하세요, 지민님 👋"), not a generic "사용자".
- Use warm, casual emoji sparingly at natural points (👋 🍱 💬 ✨) — not on every line, just where it reinforces the message's feeling.
- AI coach messages follow a fixed shape: **[what changed, with a number] → [a concrete alternative] → [the expected savings, with a number]**, all in one or two sentences. Example already in the app: *"이번 주 배달비가 42% 증가했어요. 편의점 도시락으로 대체하면 주 12,000원 절약 가능해요!"* Write new AI-coach copy in this same shape — signal, suggestion, payoff — rather than vague encouragement.
- **Never state a fabricated confidence number or probability** ("소진 확률 82%", "추천 신뢰도 95%" etc.). This isn't just a style preference — the product PRD (`AI_소비코치_PRD_v8.md`) explicitly calls out that this app must not overstate the precision of its predictions, since the underlying calculations are simple rule-based estimates, not calibrated probabilities. Only state numbers the app can actually compute (amounts, percentages of actual spend, day counts) — never an invented certainty score.

## Before shipping a new screen or component

Quick self-check:
1. Are all colors either a `var(--token)` or one of the specific hardcoded hex values documented above (`#FF6B6B`, or a category/gradient pair)?
2. Does every radius match the scale (99 / 20 / 16 / 14 / 12 / 10) instead of an arbitrary number?
3. Does the shadow match one of the three patterns (resting card / colored hero / bottom-sheet)?
4. Is `fontFamily: 'Pretendard'` set explicitly?
5. If this is a "drill into detail" flow, does it use the bottom-sheet slide-up pattern instead of a centered modal?
6. If there's AI-generated copy, does it follow the signal → suggestion → payoff shape, and does it avoid fake confidence numbers?
