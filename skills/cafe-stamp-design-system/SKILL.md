---
name: cafe-stamp-design-system
description: Design, implement, and review Cafe Stamp web screens using the project's warm olive-and-beige visual system. Use for new or modified React/CSS screens, customer or staff flows, responsive layouts, UI components, visual QA, and design-consistency audits in the cafe_stamp project.
---

# Cafe Stamp Design System

Keep every Cafe Stamp screen visually consistent with the approved customer home screen while preserving the free web MVP scope.

## Required context

1. Read `docs/service-plan.md` and `checklist.md` before proposing or implementing features.
2. Read [references/design-system.md](references/design-system.md) before any visual design, UI implementation, or visual review.
3. Inspect [assets/main-screen-reference.png](assets/main-screen-reference.png) when the task needs visual comparison or introduces a new layout pattern.
4. Inspect the existing React and CSS structure before editing. Reuse compatible components and tokens instead of duplicating them.

## Choose the workflow

### Design a screen

1. Identify the user role, primary action, required states, and MVP boundary.
2. Place the primary action in the highest visual hierarchy.
3. Compose the screen from the established header, card, list, form, feedback, and bottom-navigation patterns.
4. Specify the exact tokens and responsive behavior. Do not describe only a mood.
5. Call out any pattern that is not covered by the reference before introducing it.

### Implement a screen

1. Preserve the current React/Vite architecture and established application behavior.
2. Define shared design tokens centrally and consume them from components.
3. Use only the documented palette, gradients, spacing, radii, typography, and shadows unless the task requires a justified exception.
4. Render every functional, reward, status, and navigation illustration as a black monochrome icon.
5. Keep the staff MVP centered on member-number lookup and one-stamp accumulation; do not add camera scanning.
6. Implement mobile-first at the 393 px reference width, then verify narrow mobile and desktop behavior.
7. Preserve keyboard focus, readable text, touch targets, semantic controls, safe areas, and reduced-motion preferences.

### Review an existing screen

1. Compare the screen with both the token reference and the reference PNG.
2. Report concrete deviations with the current value and required value.
3. Prioritize structural hierarchy, overflow, contrast, touch targets, typography, spacing, radii, shadows, and decorative details in that order.
4. Distinguish product-scope problems from visual-consistency problems.
5. Do not rewrite unrelated working UI during a targeted review.

## Guardrails

- Do not add payment, POS integration, map discovery, cafe search, coupon redemption approval, fraud prevention, or native-app-only patterns.
- Do not request camera permission or implement QR scanning in the current MVP.
- Do not invent one-off hex colors, gradients, font sizes, radii, shadows, or spacing values.
- Do not use emoji, multicolor pictograms, colored clip art, or decorative illustrations such as a pink cake or colored drink.
- Use black SVG, CSS-drawn, or icon-font shapes with `currentColor`; keep one consistent stroke weight and visual style.
- Use cafe-specific colors only in contained identity accents such as the circular cafe mark.
- Keep card surfaces neutral so cafe identity colors do not fragment the application shell.
- Explain an exception before implementing it and add a reusable token when the exception will recur.
- Update product documentation before code when implementation intent conflicts with documented scope.

## Completion checks

- Verify at 320 px, 393 px, 480 px, and a desktop viewport.
- Confirm there is no horizontal scrolling or content hidden behind the bottom navigation.
- Confirm interactive targets are at least 44 by 44 px and keyboard focus remains visible.
- Confirm body and action text are legible; reserve sub-12 px text for short decorative labels only.
- Confirm safe-area padding is applied to fixed bottom UI.
- Run the project's available lint and build checks after implementation.
- Summarize reused tokens, intentional exceptions, and remaining visual mismatches.
