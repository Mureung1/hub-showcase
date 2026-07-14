---
name: build-clinic-ui
description: Build, modify, or review Barojinryo patient and clinic-staff UI with the repository design system. Use for React or prototype screens, layouts, components, forms, queue tables, status indicators, responsive styling, accessibility checks, design-token changes, and visual QA for the local-clinic remote waiting service.
---

# Build Clinic UI

Apply this workflow to every UI change in `apps/web/` or `prototype/`.

## Read First

1. Read `docs/plan.md` for product behavior and queue terminology.
2. Read `docs/feature-spec.md` for state transitions, queue rules, validation, and privacy requirements.
3. Read the relevant section of `docs/checklist.md` to confirm priority and scope.
4. Read `docs/ux-structure.md` for the approved screen flow, IA, and wireframes.
5. Read `docs/design-system.md` for visual and interaction rules.
6. Use `apps/web/src/styles/design-tokens.css` as the canonical implementation tokens.

Inspect the relevant image in `docs/assets/design/` when matching a patient registration, patient status, or staff queue layout. Treat the image as visual guidance; product rules and copy in `docs/feature-spec.md` remain authoritative.

## Choose the Surface

- Patient pages: mobile-first, one-column, large queue status, one clear next action.
- Staff pages: dense but readable queue list, stable controls, keyboard-friendly repeated actions.
- Static prototype: HTML/CSS only, links for navigation, no simulated behavior that implies real persistence or notifications.

## Build

1. Identify the screen's single primary task.
2. Import or preserve the canonical design tokens before styling components.
3. Reuse existing components before creating new variants.
4. Keep queue states consistent with `docs/feature-spec.md`.
5. Apply the status token and Lucide icon mapping from `docs/design-system.md`.
6. Show family counts as child, adult, senior, and total patients.
7. Display estimated time as advisory, never as a guaranteed treatment time.
8. Pair every status color with text and an icon or marker.
9. Keep controls at stable sizes; dynamic labels must not shift the queue layout.
10. Handle loading, empty, error, closed-waiting, and cancelled states.
11. Use one primary action per view or tightly related action group.

## Surface Rules

- Patient mobile: 20px side padding, one column, full-width primary action, 44px minimum controls.
- Patient desktop: maximum 1200px content and a responsive hospital-info/registration split.
- Staff desktop: 64px header, 208px sidebar, dense queue table, optional 360px detail panel.
- Use 6px radius by default and never exceed 8px except status pills.
- Use borders and spacing before shadows. Do not turn every section into a card.
- Do not add raw color, spacing, radius, or shadow values when an existing `--bj-*` token applies.

## Verify

- Check the patient flow at 390px width and a desktop viewport.
- Check that text does not overflow cards, buttons, or status badges.
- Check keyboard focus, labels, contrast, and 44px touch targets.
- Verify that staff actions remain scannable with multiple queue entries.
- Compare information hierarchy with the matching image in `docs/assets/design/`.
- Confirm there is no card nesting, decorative gradient, or color-only status.
- Run frontend lint and build checks after React changes.
- For interactive work, verify patient and staff views in separate browser sessions.

## Do Not

- Reintroduce PlaceSync screens, labels, platform cards, or cafe sample data.
- Add medical diagnosis, symptom interpretation, or treatment advice to UI copy.
- Present mocked SMS, Alimtalk, or clinic-system integration as real.
- Use decorative gradients, large marketing heroes, nested cards, or color-only status indicators.
- Add a second primary action to the same view without product approval.
- Copy exact text or branding from Catchtable, Tabling, Waitwhile, or another waiting product.
- Create component-local design tokens that conflict with `apps/web/src/styles/design-tokens.css`.
