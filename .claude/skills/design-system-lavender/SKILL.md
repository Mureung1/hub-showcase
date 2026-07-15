---
name: design-system-lavender
description: Apply this project's pastel lavender/purple "cute" dashboard-style design system (colors, fonts, corner radius, spacing, card and button styles) as CSS variables. Use this whenever building or restyling any HTML page or component in this repo (git-practice) — to-do lists, dashboards, forms, calculators, prototype pages, etc. — so that every new page looks consistent with the others. Trigger even if the user just says "이 톤으로", "지금 스타일이랑 똑같이", "이 디자인대로" or asks for a new page/component without repeating the color values.
---

# Design system: lavender / pastel dashboard

Soft, rounded, "cute" pastel-purple visual style used across this project's HTML pages (established from `todo-list.html`, itself based on a Pinterest dashboard reference). Reuse these exact values — don't invent new colors, radii, or spacing scales for new pages in this repo.

## CSS variables

Paste this `:root` block into any new page's `<style>`, then build the page using only these variables (no hardcoded hex/px for the values they cover):

```css
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap');

:root {
  /* Color - Base */
  --color-bg: #EFEAFB;
  --color-surface: #FFFFFF;

  /* Color - Primary / Accent */
  --color-primary: #7C6AE8;
  --color-primary-dark: #6952E0;
  --color-accent-pink: #F97C99;
  --color-accent-yellow: #F5B942;
  --color-accent-blue: #5AA9E6;
  --color-accent-green: #8FD6A0;

  /* Tint backgrounds (for stat cards, tags) */
  --tint-purple: #E7E1FB;
  --tint-pink: #FCE1E7;
  --tint-yellow: #FDF1CC;
  --tint-blue: #DFEEFB;

  /* Text */
  --text-heading: #3B3153;
  --text-body: #6B6478;
  --text-muted: #A39CB0;
  --text-on-primary: #FFFFFF;

  /* Typography */
  --font-family: 'Noto Sans KR', sans-serif;

  /* Radius */
  --radius-card: 24px;      /* large cards / panels */
  --radius-card-sm: 16px;   /* small cards, list items */
  --radius-chip: 12px;      /* icon chips, small buttons */
  --radius-pill: 999px;     /* buttons, nav items, tags, avatars */

  /* Spacing */
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --gap-card: 20px;         /* gap between cards in a grid/row */
  --padding-card: 20px;     /* inner padding of a card */

  /* Shadow */
  --shadow-card: 0 8px 20px rgba(124, 106, 232, 0.12);
  --shadow-button: 0 6px 14px rgba(124, 106, 232, 0.35);
}
```

## Why these values

- **Font is `'Noto Sans KR'`, not a rounded display font.** An earlier draft used `'Baloo 2'`/`'Quicksand'` to match the "cute" reference image, but this project's other pages (`about-me/Day1.html`, `hub/prototype/style.css`) already standardized on Noto Sans KR — match the repo, not the inspiration image.
- **Shadows are always tinted with the primary purple** (`rgba(124, 106, 232, ...)`), never plain black — this is what gives cards their soft, colorful look instead of a generic Bootstrap-y shadow.
- **Radius scales by element size**, not randomly: page-level cards get 24px, list-row-level cards get 16px, small icon/tag chips get 12px, anything pill/button/avatar-shaped gets 999px (fully round).

## Component patterns

Build UI out of these recurring shapes rather than inventing new ones:

- **Card**: `background: var(--color-surface); border-radius: var(--radius-card) or var(--radius-card-sm); box-shadow: var(--shadow-card); padding: var(--padding-card);`
- **Tinted stat card**: same as Card but `background` is one of `--tint-purple/pink/yellow/blue` instead of white, no shadow needed if it's inside a `.stats` grid (see `todo-list.html` `.stat-card`).
- **Primary button (pill)**: `background: var(--color-primary); color: var(--text-on-primary); border-radius: var(--radius-pill); box-shadow: var(--shadow-button);` with `:hover { background: var(--color-primary-dark); }`.
- **Secondary/filter button**: `background: var(--color-surface); color: var(--text-body); border-radius: var(--radius-pill); box-shadow: var(--shadow-card);`, and `.active` swaps to the primary button colors.
- **Round icon badge** (e.g. next to a page heading): a `width/height: 34px` circle (`border-radius: var(--radius-pill)`) filled with `var(--color-primary)`, centering a small white SVG icon (18px). Use a plain inline SVG icon here, not an emoji — emoji read as "밋밋한"/flat next to this rounded, illustrated style.
- **Tag/chip**: `border-radius: var(--radius-pill); padding: 3px 10px; font-size: 11px; font-weight: 700;` background from a `--tint-*` color, text color from the matching `--color-accent-*` or `--color-primary-dark`.

## Icon-chip selection list

For multi-select lists (symptom checklists, category pickers, etc.), prefer this over a plain
checkbox-and-label row when there are more than ~4 options — it packs much more densely (items
wrap and flow instead of stacking one per line), which matters a lot on a 375px phone card.

- **Chip row**: `display: inline-flex; align-items: center; gap: 8px; border-radius: var(--radius-pill); border: 1.5px solid #F1EDFC; padding: 5px 14px 5px 5px;` — sits inside a `flex-wrap: wrap` container (`.chip-list`), not a full-width column.
- **Icon**: a 30px circle (`border-radius: var(--radius-pill)`) inside the chip, background from a `--tint-*` color, a small (15px) `currentColor` stroke SVG icon inside colored with the matching `--color-accent-*`/`--color-primary-dark`. Rotate through the 5 tint/accent pairs (purple, pink, yellow, blue, green) across the list items so the list reads as colorful, not monochrome.
- **Selected state**: the whole chip's `border-color` becomes `var(--color-primary)` and `background` becomes `var(--tint-purple)` — no separate checkmark circle needed, the chip itself is the toggle.
- Keep the underlying `<input type="checkbox">` in the DOM (visually hidden) inside the chip's `<label>` for accessibility/keyboard support — don't rebuild selection state with a plain `<div onClick>`.

Reference implementation: [`hub/prototype/design-v2-home.html`](../../../hub/prototype/design-v2-home.html) (icons + 5-color rotation logic) and its port into the real app at `frontend/src/chipIcons.tsx` + `frontend/src/components/Home.tsx`.

## Reference implementation

[`todo-list.html`](../../../todo-list.html) at the project root is the canonical example — copy its `:root` block and card/button/chip CSS wholesale when scaffolding a new page, then adjust layout/content only.
