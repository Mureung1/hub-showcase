---
name: dabnyangi-ui
description: Apply Dabnyangi's cute, clean mobile UI design system for React/CSS screens, demos, landing sections, and design documentation. Use when styling or reviewing 답냥이 screens, updating CSS variables, choosing colors, typography, spacing, radii, cards, chips, inputs, or translating the agreed design rules into implementation.
---

# Dabnyangi UI

## Core Direction

Use this skill to keep 답냥이 visually consistent: cute but clean, soft but readable, mobile-first, and suitable for a college-student message helper.

Prefer:
- Powder blue page background with a white app-like surface.
- Soft sky-blue primary actions.
- Rounded pastel cards for relationship/situation choices.
- Cute rounded Korean typography that remains readable in generated message text.
- Large radii, generous spacing, weak shadows, and low visual noise.

Avoid:
- One-note purple/blue gradients.
- Heavy dark dashboards, harsh borders, or dense enterprise styling.
- Overly childish decoration, mascot illustration, or animation unless explicitly requested.
- Tiny body text for Korean message content.
- Changing app structure, routes, or MVP scope just to style a screen.

## Workflow

1. Check the target files and existing component structure first.
2. Read `references/tokens.md` when applying or updating concrete CSS variables.
3. Keep edits scoped to styling and design copy unless the user explicitly asks for behavior changes.
4. Use the existing React/CSS setup. Do not add a UI framework just for these rules.
5. Validate with the repo's available checks, usually `npm run test`, `npm run lint`, and `npm run build`.

## Implementation Rules

- Put global tokens in `src/index.css` or the repo's existing token location.
- Put component layout and state styles in the existing screen stylesheet, such as `src/App.css`.
- Use `--font-sans` for body, buttons, inputs, and result messages.
- Use `--font-display` only for brand names, headings, and short card titles.
- Use `--color-primary` only for CTA, selected state, active progress, and copy/generate buttons.
- Use `--color-card-*` pastel tokens for scannable option cards.
- Keep result-message cards highly readable. If a pastel background reduces contrast, use `--color-surface` or `--color-surface-soft`.
- Use `word-break: keep-all` for short Korean headings/copy, and avoid viewport-based font scaling.
- Keep card radii at `--radius-lg` or larger for this brand, unless fitting inside compact controls.

## Resources

- `references/tokens.md`: canonical color, font, radius, spacing, and component token values.
