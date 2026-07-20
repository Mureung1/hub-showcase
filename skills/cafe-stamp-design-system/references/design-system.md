# Cafe Stamp visual specification

## Contents

1. Design language
2. Tokens
3. Reference layout
4. Component patterns
5. Responsive and accessibility rules
6. Visual review checklist

## 1. Design language

Build a warm, approachable cafe-diary interface: high-contrast dark olive hero surfaces, a vertically graduated beige page, warm neutral cards, heavy rounded shapes, black monochrome hand-drawn iconography, and short friendly labels. Keep the experience direct: one dominant task per screen and minimal secondary chrome.

The approved raster reference is `../assets/main-screen-reference.png`, measured at 393 by 852 px. Color values below were sampled from that image. The raster does not contain font metadata; `Jua` and `Noto Sans KR` are the chosen project standards for reproducing its character.

## 2. Tokens

### Color

```css
:root {
  --cs-ink: #000000;
  --cs-on-dark: #ffffff;
  --cs-card: #e7deda;
  --cs-card-strong: #fefefe;
  --cs-avatar: #d9d9d9;

  --cs-olive-start: #3c4930;
  --cs-olive-mid: #27321c;
  --cs-olive-end: #10170a;

  --cs-sand-start: #a68f67;
  --cs-sand-mid: #ae966f;
  --cs-sand-end: #b59d76;

  --cs-cafe-green: #55a56c;
  --cs-cafe-orange: #f4b17e;

  --cs-focus: #ffffff;
  --cs-focus-shadow: rgba(0, 0, 0, 0.72);
}
```

Use these gradients exactly:

```css
--cs-gradient-hero: linear-gradient(
  180deg,
  #3c4930 0%,
  #303c24 30%,
  #202a16 62%,
  #10170a 100%
);

--cs-gradient-page: linear-gradient(
  180deg,
  #a68f67 0%,
  #aa926b 28%,
  #ae966f 52%,
  #b59d76 100%
);
```

Do not add gradients to cards, buttons, inputs, or navigation.

The revised hero gradient intentionally uses a brighter olive start and a nearly black-green end. Apply it across the full hero height; do not flatten it with a translucent overlay.

### Iconography

- Render all functional, navigation, reward, coupon, status, cafe-category, and empty-state imagery as black monochrome icons.
- Use `#000000` or `currentColor` on light surfaces. Use white only when an icon must sit directly on the dark hero.
- Prefer simple SVG or CSS-drawn icons with rounded or hand-drawn character.
- Keep icon strokes visually consistent at approximately 2–2.5 px at a 24 px icon size.
- Use solid black shapes when the reference icon is filled; otherwise use black outlines with transparent interiors.
- Do not use emoji because platform rendering changes its color and shape.
- Do not use multicolor pictograms, colored clip art, gradients inside icons, or colored food illustrations such as pink cake, brown coffee, or orange drinks.
- Use background color only for a containing cafe identity circle or state surface. The icon drawn inside that container must remain black.
- Accompany unfamiliar icons with a short text label; never use color alone to communicate state.

### Typography

```css
--cs-font-display: "Jua", sans-serif;
--cs-font-readable: "Noto Sans KR", sans-serif;
```

Load both fonts once at the application level. Use Jua for greetings, screen and section titles, cafe names, navigation, buttons, and short expressive labels. Use Noto Sans KR for form data, longer explanations, validation messages, identifiers, and dense numeric information.

| Token | Size / line height | Use |
|---|---:|---|
| `--cs-type-greeting` | 28px / 34px | Hero greeting |
| `--cs-type-screen` | 24px / 30px | Screen title |
| `--cs-type-section` | 22px / 28px | Section title |
| `--cs-type-card` | 19px / 24px | Cafe or card title |
| `--cs-type-id` | 21px / 26px | QR identifier |
| `--cs-type-body` | 16px / 24px | Default readable body |
| `--cs-type-data` | 14px / 18px | Progress and compact data |
| `--cs-type-caption` | 12px / 16px | Supporting label |
| `--cs-type-micro` | 10px / 12px | Short icon label only |

Jua has one regular weight; create hierarchy with size and placement. Use Noto Sans KR 400 for body text and 600 for compact data or emphasis. Never use body copy below 14 px.

### Spacing

Use a 4 px base scale:

```css
--cs-space-1: 4px;
--cs-space-2: 8px;
--cs-space-3: 12px;
--cs-space-4: 16px;
--cs-space-5: 20px;
--cs-space-6: 24px;
--cs-space-8: 32px;
--cs-space-10: 40px;
```

Use 20 px for page gutters, 20–22 px between list cards, 14–16 px from a section title to its first item, and 4–8 px between an icon and its short label.

### Radius

```css
--cs-radius-small: 12px;
--cs-radius-medium: 20px;
--cs-radius-hero-card: 24px;
--cs-radius-card: 28px;
--cs-radius-section: 36px;
--cs-radius-round: 999px;
```

Use small for badges and compact controls, medium for fields and nested surfaces, hero-card for the QR card, card for list cards and bottom navigation, section for the hero's lower corners, and round for avatars and cafe marks.

### Shadow

```css
--cs-shadow-card: 0 9px 4px rgba(48, 40, 27, 0.36);
--cs-shadow-floating: 0 10px 4px rgba(48, 40, 27, 0.34);
```

Use card shadow for repeated list cards and floating shadow for the QR card or a primary modal. Do not shadow icons, text, fields, or every nested surface.

### Motion and focus

- Use 160–220 ms transitions for color, opacity, and transform.
- Limit press feedback to `transform: translateY(1px)` or a slight opacity change.
- Disable nonessential motion under `prefers-reduced-motion: reduce`.
- Use a high-contrast 3 px focus ring with 2 px offset. On light surfaces, pair the white ring with `0 0 0 5px var(--cs-focus-shadow)`.

## 3. Reference layout

### Application shell

- Reference viewport: 393 by 852 px.
- Minimum supported width: 320 px.
- Content maximum width: 480 px.
- Center the shell on desktop; expand outer whitespace rather than stretching card internals.
- Reserve space for fixed bottom navigation plus `env(safe-area-inset-bottom)`.

### Hero

- Reference height: 313 px.
- Lower radius: 36 px.
- Horizontal content inset: 39 px for the reference composition; use 20 px for general hero text when no overlapping QR card exists.
- Greeting: top 40 px.
- Avatar: 50 by 50 px, top 25 px, right 46 px.

### QR card

- Reference bounds: x 39 px, y 95 px, width 307 px, height 255 px.
- Radius: 24 px.
- Surface: `--cs-card-strong`.
- Horizontal padding: 24 px.
- QR graphic: approximately 150 by 150 px.
- QR-to-identifier gap: 14 px.
- Expand action: 28 px icon inside a 44 px minimum target, 24 px from top and right.

### Main content

- Page gutters: 20 px.
- Start the first section after the hero overlap/shadow clears.
- Keep section-title and card left edges aligned.
- Use the sand gradient as the continuous page surface.

### Bottom navigation

- Visual height: 60 px plus bottom safe area.
- Four equal columns.
- Surface: `--cs-card`.
- Top radius: 28 px.
- Icon size: 25–28 px inside a 44 px target.
- Use black icons. Indicate the active item with a 34 by 3 px black marker or an equally clear shape change; do not introduce an unrelated accent color.

## 4. Component patterns

### Cafe stamp card

- Reference size: 343 by 100 px at 393 px viewport.
- Minimum height: 100 px.
- Surface: `--cs-card`.
- Radius and shadow: `--cs-radius-card`, `--cs-shadow-card`.
- Padding: 16 px 14 px 16 px 19 px.
- Structure: 58 px cafe mark, 10 px gap, flexible cafe/progress content, compact count, 2 px divider, 54 px reward area.
- Divider: 2 by 56 px, black, 1 px radius.
- Keep cafe-specific color inside the circular 58 px identity mark.
- Draw the cafe or reward symbol inside the mark in black, even when the containing circle uses a cafe-specific color.

### Buttons

- Minimum height: 48 px; minimum interactive target: 44 by 44 px.
- Primary: dark olive surface, white Jua label, medium radius.
- Secondary: warm neutral surface with black text and a visible black or olive outline.
- Destructive color is allowed only for genuinely destructive actions and must be introduced as a named semantic token.

### Forms

- Use Noto Sans KR for entered text, help, and validation.
- Use at least 16 px input text to avoid mobile browser zoom.
- Use medium radius, warm neutral or white surfaces, and clear black/olive borders.
- Place validation beside the relevant field and do not rely on color alone.

### Feedback, coupons, and empty states

- Preserve the same neutral surfaces and token set.
- Show earned or automatic-coupon success prominently without adding metallic gradients or confetti by default.
- Pair black monochrome status icons with text.
- Keep empty states concise and connect them to one available action.

### Staff member lookup

- Make the member-number input and lookup action the dominant region.
- After lookup, show the customer name, current stamp count, and one-stamp action in one neutral card.
- Provide empty, invalid-number, loading, customer-found, stamp-earned, coupon-issued, and retry states.
- Do not request camera permission or present a functional scanner in the current MVP.

## 5. Responsive and accessibility rules

- Start from 393 px and test 320, 393, 480, and desktop widths.
- At 320 px, reduce internal gaps before reducing font size or touch targets.
- At desktop width, center the 480 px shell; do not turn the mobile card into a wide dashboard unless the task explicitly requires a desktop-specific workflow.
- Avoid horizontal scrolling and fixed pixel positioning for content below the hero.
- Keep fixed navigation from covering the last item by padding the scroll container.
- Meet WCAG AA contrast for functional text and controls. Treat micro labels as supplementary, never as the only explanation of an action.
- Support keyboard operation, visible focus, semantic headings, button elements, form labels, alt text, and screen-reader status announcements.

## 6. Visual review checklist

- Product flow remains within the documented MVP.
- Dominant task is immediately apparent.
- Hero and page gradients use the exact stops.
- Hero shows a clearly visible light-to-dark olive transition from `#3c4930` to `#10170a`.
- Cards use approved surfaces, radii, and one of the two shadows.
- Typography uses the designated family, size, and role.
- Gaps belong to the 4 px scale.
- Cafe colors remain contained.
- Every icon and illustration is monochrome black on light surfaces; no emoji or multicolor food artwork remains.
- Icons share a simple hand-drawn or rounded visual weight and a consistent stroke.
- No content clips at 320 px or stretches beyond the 480 px shell.
- Bottom navigation respects safe area and does not obscure content.
- Every control has a 44 px target, visible focus, and text-equivalent meaning.
- Any new token is named, reusable, and justified in the implementation summary.
