---
name: briefy-ui
description: "Use this skill when designing or implementing UI pages, components, CSS variables, or frontend prototypes in a glossy red automotive style inspired by a red sports car: high-gloss red primary actions, charcoal wheel/tire surfaces, cool metallic light backgrounds, sharp modern typography, precise spacing, and polished card/button/input styling."
---

# Glossy Red Auto UI

Use this skill to apply a polished sports-car interface tone. Favor speed, precision, contrast, and glossy material cues without making the UI feel like a marketing poster unless the user explicitly asks for a landing page.

## Design Direction

- Use high-gloss red as the primary brand/action color.
- Use charcoal and near-black surfaces for dashboards, headers, hero panels, and high-contrast stats.
- Use cool off-white, light gray, and metal-gray backgrounds for the main page surface.
- Keep typography modern, compact, and confident. Prefer heavy display weights for major headings.
- Use restrained radii: smooth enough to feel like car bodywork, sharp enough to feel technical.
- Use cards as functional UI containers. Avoid nested cards and decorative clutter.
- Add gloss through subtle gradients, highlights, and shadows rather than large abstract blobs.

## CSS Variables

Start from these tokens unless the existing project already has a compatible token system. If integrating into an existing app, map these values into the local naming convention instead of duplicating unrelated variables.

```css
:root {
  /* Primary: 고광택 스포츠 레드 */
  --color-primary: #c40012;
  --color-primary-hover: #e00016;
  --color-primary-active: #92000d;

  /* Secondary: 휠/타이어 차콜 */
  --color-secondary: #171c21;
  --color-secondary-hover: #252c33;
  --color-secondary-active: #0b0f13;

  /* Accent: 브레이크 캘리퍼 레드 */
  --color-accent: #ff1f2d;
  --color-accent-soft: #ff6b73;

  /* Background */
  --color-bg: #eef3f5;
  --color-bg-soft: #dce5e9;
  --color-bg-panel: #ffffff;
  --color-bg-card: #f7fafb;

  /* Surface / Metal */
  --color-surface-dark: #11161b;
  --color-surface-mid: #2f3a42;
  --color-surface-light: #b8c5cb;

  /* Text */
  --color-text: #101418;
  --color-text-muted: #52616b;
  --color-text-subtle: #82919a;
  --color-text-inverse: #ffffff;

  /* Border */
  --color-border: #c7d2d8;
  --color-border-soft: #e2eaee;
  --color-border-dark: #303941;
  --color-border-bright: #ff2b38;

  /* Shadow */
  --shadow-color: rgba(8, 13, 18, 0.22);
  --shadow-soft: 0 8px 24px rgba(8, 13, 18, 0.12);
  --shadow-card: 0 16px 42px rgba(8, 13, 18, 0.16);
  --shadow-gloss: 0 12px 36px rgba(196, 0, 18, 0.24);

  /* Typography */
  --font-sans: "Inter", "Pretendard", "Helvetica Neue", system-ui, sans-serif;
  --font-display: "Inter", "Pretendard", system-ui, sans-serif;
  --font-heading: var(--font-display);
  --font-body: var(--font-sans);

  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-md: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.5rem;
  --font-size-2xl: 2rem;
  --font-size-hero: clamp(2.75rem, 7vw, 6rem);

  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  --font-weight-black: 900;

  --line-height-tight: 1.08;
  --line-height-normal: 1.5;
  --line-height-loose: 1.7;

  /* Radius */
  --radius-xs: 2px;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-pill: 999px;

  /* Spacing */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;
  --space-16: 4rem;
  --space-20: 5rem;

  /* Cards */
  --card-bg: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.98),
    rgba(247, 250, 251, 0.96)
  );
  --card-border: 1px solid var(--color-border-soft);
  --card-radius: var(--radius-md);
  --card-padding: var(--space-6);
  --card-shadow: var(--shadow-card);

  --card-dark-bg: linear-gradient(
    180deg,
    rgba(23, 28, 33, 0.98),
    rgba(11, 15, 19, 0.98)
  );
  --card-dark-border: 1px solid var(--color-border-dark);
  --card-hover-border: 1px solid var(--color-border-bright);
  --card-hover-shadow: var(--shadow-card), var(--shadow-gloss);

  /* Buttons */
  --button-bg: var(--color-primary);
  --button-bg-hover: var(--color-primary-hover);
  --button-bg-active: var(--color-primary-active);
  --button-text: var(--color-text-inverse);
  --button-border: 1px solid rgba(255, 255, 255, 0.18);
  --button-radius: var(--radius-sm);
  --button-padding-y: 0.7rem;
  --button-padding-x: 1.15rem;

  /* Inputs */
  --input-bg: #ffffff;
  --input-border: 1px solid var(--color-border);
  --input-border-focus: 1px solid var(--color-primary);
  --input-text: var(--color-text);
  --input-placeholder: var(--color-text-subtle);
  --input-radius: var(--radius-sm);
}
```

## Component Rules

Use these rules when building pages, dashboards, task lists, cards, forms, and prototypes.

- Body background: use `--color-bg` or a cool light metallic gradient. Keep the main canvas bright unless the product is explicitly a dark dashboard.
- Hero or dashboard header: use `--card-dark-bg`, inverse text, and a small red gloss highlight. Keep content readable and avoid covering text with decoration.
- Primary buttons: use red, white text, a subtle gloss gradient, and `--shadow-gloss`.
- Secondary buttons and active filters: use charcoal surfaces with white text.
- Cards: use `--card-bg`, `--card-border`, `--card-radius`, and `--card-shadow`. On hover, use `--card-hover-shadow` and red border only for interactive cards.
- Inputs: use white backgrounds, metal-gray borders, red focus border, and no heavy inset shadows.
- Tags or urgency badges: use red only for urgent/high-priority states. Use gray chips for normal metadata.
- Typography: use `--font-weight-black` for major titles, `--font-weight-semibold` for card titles, and muted gray for supporting copy.
- Spacing: use the token scale; prefer `--space-4` to `--space-6` for dense task/product UIs.
- Radius: use `--radius-md` for cards, `--radius-sm` for buttons/inputs, and `--radius-pill` only for chips and badges.

## Implementation Workflow

1. Inspect the existing app styles before editing.
2. Add or map the CSS variables at the global theme level.
3. Replace hard-coded blues, purples, warm browns, or generic grays with the automotive palette.
4. Apply dark card styling to only the strongest surfaces: hero, stats, nav, or command panels.
5. Keep ordinary content cards light for contrast and readability.
6. Verify mobile widths so long Korean and English labels do not overflow buttons, cards, or filters.
7. If creating a standalone HTML prototype, include the tokens inline and make basic interactions work when reasonable.

## Avoid

- Do not turn the whole UI red. Red is for primary action, urgency, gloss accents, and selected state.
- Do not use purple/blue gradients, beige parchment tones, or wood textures with this skill.
- Do not use oversized rounded cards for operational tools.
- Do not put cards inside cards.
- Do not use decorative orbs, bokeh blobs, or unrelated abstract backgrounds.
- Do not scale font size directly with viewport width except for the provided `clamp()` hero token.
