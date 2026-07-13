---
name: design-skill
description: Apply the TasteFit UI system to frontend screens, HTML/CSS prototypes, React components, and design reviews. Use when creating or restyling TasteFit interfaces that require yellow accents, warm neutral surfaces, a compact sidebar or mobile bottom navigation, wide content-first layouts, review lists, or in-place review writing flows.
---

# TasteFit Design Skill

Build quiet, warm, content-first interfaces with restrained yellow accents. Prefer clear hierarchy and generous central content over decorative panels.

## Start here

1. Import `design-tokens.css` before component styles.
2. Reuse or adapt classes from `skill.css`.
3. Inspect `index.html` for the small component demo.
4. Inspect `review-design.html` and `styles.css` only when building restaurant detail, review list, or review-writing screens.

## Visual direction

- Use warm off-white for the page and white for primary surfaces.
- Use near-black brown for headings and body text.
- Reserve yellow for primary actions, selected states, ratings, small highlights, and active navigation.
- Keep cards flat and quiet: thin warm borders, 14–20px radii, and low warm shadows.
- Prefer pill buttons and filters. Keep primary controls at least 42px high.
- Use compact metadata and generous content spacing; do not fill space with unnecessary cards.
- Render café imagery with warm yellow, cream, espresso brown, and charcoal when no brand photography is available.

## Layout rules

- On wide screens, use a compact left sidebar and let the main content fill all remaining width.
- Do not reserve a permanent right panel unless it contains essential, persistent information.
- Keep the restaurant summary and review content in the same central reading flow.
- On tablet, collapse the sidebar labels before reducing content readability.
- On mobile, convert the sidebar to a fixed bottom navigation and keep at least 80px bottom clearance.

## Review interaction

- Show review filters and review cards in one full-width content region.
- Place a visible `리뷰 작성` primary action in the review section heading.
- When selected, replace the review list in place with the writing form; do not open a separate right panel.
- Hide the write action while the form is open.
- Provide both `취소` and `리뷰 목록` actions that restore the list in the same region.
- Include star rating, review text with a character counter, optional keyword chips, optional photo attachment, and a clear submit action.
- Preserve the user's draft if the surrounding product requirements call for reversible navigation.

## Accessibility

- Use semantic `main`, `nav`, `section`, `article`, `form`, `fieldset`, and `legend` elements.
- Provide visible keyboard focus using a soft yellow outline.
- Keep body text contrast independent of yellow; never use yellow as small body text on white.
- Connect controls to labels and expose star ratings with accessible names.
- Use the native `hidden` attribute for list/form state changes and move focus when implementing production JavaScript.

## Token policy

Use variables from `design-tokens.css` instead of copying hex values. Extend the token file only when a value is reused across multiple components. Use component-local values for one-off illustrations.

The core palette is:

- `--color-primary`: main yellow
- `--color-primary-strong`: hover and emphasis yellow
- `--color-primary-soft`: selected and matching backgrounds
- `--color-bg`: warm page background
- `--color-surface`: white content surface
- `--color-ink`: primary text and dark feature panels
- `--color-text-muted`: metadata and supporting copy
- `--color-border`: warm low-contrast dividers

## Completion check

- Verify desktop, tablet, and mobile layouts.
- Verify yellow is an accent rather than the dominant body color.
- Verify no empty right column remains after removing a detail panel.
- Verify review list → form → list transitions in the same region.
- Verify focus states, labels, and contrast.

