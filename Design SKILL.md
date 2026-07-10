---
name: mentor-design-system
description: Use when building or styling the mentor matching service UI. Provides shared CSS design tokens and reusable classes for mentor/mentee screens, including colors, typography, spacing, radius, cards, inputs, buttons, tags, and bottom CTA bars.
---

# Mentor Design System

Use this skill when creating or updating screens for the mentor matching service.

## CSS Source

Use `assets/mentor-design-skill.css` as the shared style source.

For HTML/CSS prototypes:

```html
<link rel="stylesheet" href="assets/mentor-design-skill.css">
```

For React:

```jsx
import "./styles/mentor-design-skill.css";
```

## Visual Rules

- Use `#2563eb` as the primary action color.
- Use `#eef3f8` as the page background.
- Use white cards with light borders and subtle shadows.
- Use near-black text for headings and blue-gray muted text for secondary copy.
- Use system UI plus `Noto Sans KR` for Korean text.
- Use `8px` as the default radius for cards, fields, tags, and buttons.
- Keep content width around `980px`.
- Prefer compact service UI layouts over marketing-style hero layouts.

## Reusable Classes

Prefer these classes before adding one-off styles:

- `.page-header`
- `.page-container`
- `.stack`
- `.eyebrow`
- `.page-title`
- `.card-title`
- `.body-text`
- `.muted-text`
- `.card`
- `.card-muted-box`
- `.field`
- `.button`
- `.button-primary`
- `.button-soft`
- `.button-neutral`
- `.tag`
- `.tag-list`
- `.cta-bar`
- `.cta-bar-fixed`

## Mentor Screen Guidance

- Use `.card` for each mentor profile or request item.
- Use `.tag-list` and `.tag` for research keywords.
- Use `.card-muted-box` for metadata such as major, lab, and available time.
- Use `.button-soft` for secondary actions such as profile detail.
- Use `.button-primary` for the main action such as applying for a meeting.
- Use `.cta-bar.cta-bar-fixed` for the fixed bottom application bar.

## Form Guidance

- Use `.field` for text inputs and textareas.
- Use `.button-primary` for submit actions.
- Use `.button-neutral` or `.button-soft` for back/cancel actions.

## Avoid

- Do not introduce a different dominant palette unless explicitly requested.
- Do not use large rounded corners above `10px` for ordinary cards and controls.
- Do not hard-code repeated colors, spacing, or shadows when an existing token exists.
