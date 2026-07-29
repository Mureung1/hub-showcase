---
name: confisort-design-system
description: Use this skill whenever creating or editing HTML/CSS pages, components, or mockups for the confiSort (분리수거 도우미) project, or any related prototype that should match its established visual identity. Covers color palette, typography, spacing, border-radius, and card/component styling rules. Trigger on requests like "confiSort 페이지 만들어줘", "이 프로젝트 스타일로 화면 추가해줘", or any new screen for the recycling-assistant app.
---

# confiSort Design System

A green, editorial-leaning design language for the 분리수거 도우미 (recycling assistant) app. Built mobile-first inside a 420px "phone" frame.

## Core file
Always link the shared stylesheet rather than redefining tokens:
```html
<link rel="stylesheet" href="style.css">
```
If `style.css` doesn't exist yet in the working directory, create it first using the tokens below before building any page.

## Design tokens (CSS variables)

```css
:root{
  /* Primary green scale */
  --green-900:#0e3a2c;   /* darkest — dark-surface cards (e.g. part-separation), strong headings */
  --green-700:#1c6b49;   /* emphasis text, borders, gradient dark stop */
  --green-600:#279160;   /* main brand color — buttons, FAB, icons, badges */
  --green-500:#4ab784;   /* secondary accent — thin details like checkbox borders */
  --green-100:#e6f5ec;   /* light background — pills, info cards */
  --green-50:#f4faf6;    /* lightest background — region bar, sheet options */

  /* Neutral / background */
  --sand:#f8f6ef;        /* header background */
  --bg:#f3f6f2;          /* page background */
  --card:#fff;           /* card/sheet background */

  /* Text */
  --ink:#132922;         /* primary text */
  --sub:#5f7369;         /* secondary/caption text */
  --line:#e0e8e1;        /* borders, dividers */

  /* Type */
  --font-display:'Fraunces',serif;  /* headings, hero numbers/titles — use sparingly */
  --font-body:'Manrope',sans-serif; /* everything else */

  /* Radius */
  --radius:16px;         /* default card radius */
  --radius-sm:10px;      /* small elements (day cells, selects) */
  --radius-md:12px;      /* buttons, inputs, tiles */
  --radius-pill:22px;    /* tags, pills, badges, capsule buttons */
}
```

## Rules

**Color**
- `--green-600` is the only color used for primary buttons/CTAs/FAB/icons.
- `--green-700` is for emphasized text and borders — never for large fill areas.
- `--green-900` is reserved for dark inverted surfaces (e.g. a card that flips to dark background), not for body text.
- Light tints (`--green-50` / `--green-100`) are the only backgrounds allowed for soft-emphasis surfaces (info cards, pills, selected states). Don't introduce new grays or off-brand greens.
- Body text is always `--ink`; secondary/caption text is always `--sub`. No arbitrary gray values.

**Typography**
- `--font-display` (Fraunces) is only for: brand logo, page hero headings (e.g. "No Pickup Today"), result item names, big numeric callouts (e.g. fee amount). Never for body copy, buttons, or labels.
- `--font-body` (Manrope) is used everywhere else, including buttons.
- Font-size scale in practice: 10–11px (captions/eyebrows) · 12–13px (secondary/body) · 14–15px (inputs/buttons) · 17px+ (display headings, via font-display).

**Radius**
- Cards/sections: `--radius` (16px).
- Buttons, inputs, tiles, selects: `--radius-md` (12px).
- Small utility elements (day cells, selects): `--radius-sm` (10px).
- Tags, pills, badges, capsule buttons: `--radius-pill` (22px), or 50% for perfectly circular icon buttons/FAB.
- Bottom sheets: rounded top corners only (`22px 22px 0 0`).

**Spacing**
- Page content padding: 18–20px left/right.
- Card-to-card vertical gap: 14–16px.
- Section title top margin: 22–24px (larger than card gaps, to visually separate sections).
- Card internal padding: 16–17px.

**Card/component style**
- Default cards: white background, `1px solid var(--line)` border, no shadow — shadows are reserved for the outer phone frame and the FAB button only.
- Dark/inverted cards (e.g. part-separation card) use `--green-900` background with white text and `rgba(255,255,255,.15)` dividers — use only for one standout card per screen, not repeated.
- Info/callout boxes use `--green-100` background, no border, `--green-900` text.
- Interactive list items (candidates, points, steps) use top-border dividers between rows instead of individual card wrapping, to keep lists compact.
- Selected/active states: swap border color to `--green-600` and background to `--green-50` (see `.cand.selected`, `.day-cell.today` uses the inverted dark style instead as a stronger callout for "today").

## Page structure convention
Every screen lives in its own `.html` file inside a shared `.phone` container (max-width 420px, rounded 26px, outer shadow), with:
1. `header.top` — back arrow or brand + optional right-aligned action (icon button or text button)
2. `.content` — scrollable body, 18–20px side padding, 90px bottom padding to clear the FAB if present
3. Optional `.fab` (only on the home/hub screen) and `.sheet-overlay` bottom sheets for in-place choices (never a separate page for a simple 2-option choice)

## When building a new screen
1. Reuse existing component classes from `style.css` (`.card`, `.pill`, `.tile`, `.info-card`, `.btn-primary`, etc.) before inventing new ones.
2. If a genuinely new component is needed, define it following the token rules above (borders not shadows, radius from the scale, colors from the palette) and add it to `style.css` rather than inlining styles.
3. Keep one "signature" moment per screen (e.g. the gradient today-card on home, the dark part-separation card on result) — don't stack multiple bold treatments on one screen.
