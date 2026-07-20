---
name: Ink Sketch Narrative
colors:
  surface: '#fbf9f1'
  surface-dim: '#dcdad2'
  surface-bright: '#fbf9f1'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f4ec'
  surface-container: '#f0eee6'
  surface-container-high: '#eae8e0'
  surface-container-highest: '#e4e3db'
  on-surface: '#1b1c17'
  on-surface-variant: '#5b4137'
  inverse-surface: '#30312c'
  inverse-on-surface: '#f3f1e9'
  outline: '#8f7065'
  outline-variant: '#e4beb1'
  surface-tint: '#a73a00'
  primary: '#a73a00'
  on-primary: '#ffffff'
  primary-container: '#ff5c00'
  on-primary-container: '#521800'
  inverse-primary: '#ffb59a'
  secondary: '#5f5e5e'
  on-secondary: '#ffffff'
  secondary-container: '#e2dfde'
  on-secondary-container: '#636262'
  tertiary: '#5e5e5e'
  on-tertiary: '#ffffff'
  tertiary-container: '#929292'
  on-tertiary-container: '#2a2b2c'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbce'
  primary-fixed-dim: '#ffb59a'
  on-primary-fixed: '#370e00'
  on-primary-fixed-variant: '#802a00'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1c1b1b'
  on-secondary-fixed-variant: '#474746'
  tertiary-fixed: '#e3e2e2'
  tertiary-fixed-dim: '#c7c6c6'
  on-tertiary-fixed: '#1b1c1c'
  on-tertiary-fixed-variant: '#464747'
  background: '#fbf9f1'
  on-background: '#1b1c17'
  surface-variant: '#e4e3db'
  ink-black: '#1A1A1A'
  paper-cream: '#FFFDF5'
  campfire-orange: '#FF5C00'
  muted-gray: '#808080'
typography:
  headline-lg:
    fontFamily: Jua
    fontSize: 20px
    fontWeight: '700'
    lineHeight: '1.3'
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Jua
    fontSize: 19px
    fontWeight: '700'
    lineHeight: '1.3'
  subheader:
    fontFamily: Jua
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.4'
  body-md:
    fontFamily: Jua
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Jua
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.5'
  button-label:
    fontFamily: Jua
    fontSize: 15px
    fontWeight: '700'
    lineHeight: '1'
  caption:
    fontFamily: Jua
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.2'
  mono-timer:
    fontFamily: ui-monospace, monospace
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base-unit: 4px
  gap-chip: 8px
  gap-button-group: 12px
  gap-form: 14px
  margin-container: 24px
  gutter-grid: 16px
  border-thick: 2px
  border-extra-thick: 2.5px
---

## Brand & Style

The design system is built on a "Hand-drawn Ink Sketch" aesthetic, creating a tactile, analog feeling within a digital interface. It targets users seeking a personal, warm, and approachable experience, evoking the nostalgia of planning and journaling on paper.

The style is a hybrid of **Brutalism** and **Tactile Sketching**. It utilizes high-contrast ink lines, heavy "hard" shadows without blurs, and a warm cream-based palette to mimic physical media. The emotional response should be one of "structured creativity"—organized yet informal, reliable yet friendly.

Key visual principles:
- **Imperfection by Design:** While aligned to a grid, the thick borders and rounded typography suggest a human touch.
- **Physical Depth:** Depth is achieved through XY offsets (hard shadows) rather than Z-axis blurs.
- **Action-Oriented:** A single vivid accent color is used sparingly to draw immediate attention to primary actions and active states.

## Colors

The color palette is strictly limited to maintain the "Ink on Paper" narrative. 

- **Primary (Campfire Orange):** Reserved for active states, CTA buttons, notification badges, and selected highlights. It represents energy and gathering.
- **Secondary (Ink Black):** Used for all structural elements, including borders, shadows, and primary text. 
- **Neutral (Paper Cream):** The foundation of the UI, used for background surfaces to reduce eye strain compared to pure white and reinforce the sketch aesthetic.
- **Tertiary (Muted Gray):** Used specifically for subheaders and secondary information labels.

**Color Application:**
- Borders must always use **Ink Black**.
- Shadows must use **Ink Black** (often at high opacity or solid).
- The "Inverse" state uses **Ink Black** as a background with **Paper Cream** text.

## Typography

This design system uses a single typeface, **Jua**, to maintain a consistent, friendly, and handwritten personality. Contrast is achieved through size and weight rather than font pairing.

- **Headlines:** Use Bold (700) and the largest sizes in the scale.
- **Body Text:** Use Regular (400) with a generous line height (1.5–1.6) for readability.
- **Utility Text:** A secondary monospace stack is used exclusively for functional countdowns and timers to ensure character alignment.
- **White-space Rule:** Button labels must never wrap to a second line.

## Layout & Spacing

The layout follows a **Fixed Grid** philosophy centered on a 1440x810 (16:9) canvas. The application operates as a single-screen dashboard where all sub-tasks and navigation occur within modals and popovers, avoiding full-page refreshes.

**Grid & Alignment:**
- Content is primarily housed in a central main area.
- Secondary utilities (My Page, Memo) are fixed to the top-right.
- Modals are centered or side-docked (2-column layouts use a 170px fixed sidebar).

**Spacing Rhythm:**
- Uses a 4px-based scaling system.
- Form fields require distinct breathing room (12-14px gaps).
- All structural elements must utilize a minimum 2px border; 1px lines are strictly prohibited to maintain the "ink" aesthetic.

## Elevation & Depth

This design system rejects blurred shadows and gradients in favor of **Hard Offset Shadows**. This simulates a paper-cut or sticker effect.

- **Hierarchy through Offset:**
  - Small elements (Small cards, chips): `3px 3px 0px` offset.
  - Standard elements (Cards, Buttons): `6px 6px 0px` offset.
  - Large elements (Modals, Popups): `8px 8px 0px` offset.
- **Visual Character:** Shadows must use the same color as the borders (`#1A1A1A`) at 100% opacity.
- **Surface Layering:** Depth is also communicated through the "Ink Inverse" technique—active elements flip to a dark background or the primary accent color to stand out against the cream surface.

## Shapes

The shape language is "Soft Geometry." It avoids the clinical precision of sharp corners while maintaining the structure of a sketch.

- **Standard Containers:** Modals and main cards use a 14px to 16px radius.
- **Small Components:** Input fields and list items use a 10px radius.
- **Interactive Elements:** Buttons can alternate between "Pill" (999px) for friendly actions or "Rect" (10px) for more formal structural actions.
- **Dashed Lines:** Secondary dividers or inactive "placeholder" states use a 1.5px dashed stroke to suggest a "tear-off" or "to-be-filled" paper area.

## Components

### Buttons
- **Neutral:** Paper cream background, 2.5px ink-black border, ink-black text.
- **Active:** Campfire orange background and border, paper cream text.
- **Padding:** Fixed at `14px 26px`.
- **Shadow:** Solid 6px hard shadow that "depresses" or disappears on click to simulate a physical press.

### Modals & Windows
- **Structure:** 2.5px border, 16px radius, and 8px hard shadow.
- **Header:** Title on the left (Bold, 19px), Close button on the right (28x28px square with a border and "✕").
- **Overlay:** A semi-transparent "dim" layer covers the main canvas.

### Input & Selection (Pickers)
- **Selection-Only:** Most inputs (Time, Headcount) use a "Click to Reveal" list rather than text entry.
- **Dropdowns:** 10px padding, 8px radius. When open, the list appears as a card directly beneath the trigger with a hard shadow.
- **Checkboxes/Chips:** 999px radius (pill), toggling between a border-only state and a solid-fill state (Ink Black background with Cream text).

### List Items
- **Rows:** 12-14px padding, 10px radius.
- **Selected State:** Border changes to Campfire Orange with a very light orange tint background.
- **Dividers:** Use `1.5px dashed` for internal list separations (e.g., date vs. title).

### Utility Icons
- **Hand-drawn style:** Icons are not SVGs or Emojis; they are constructed from thick CSS lines (e.g., three lines for a menu) to match the border weights.
- **Badges:** 12px circles, Campfire Orange fill, Cream border, positioned at the top-right of utility icons.