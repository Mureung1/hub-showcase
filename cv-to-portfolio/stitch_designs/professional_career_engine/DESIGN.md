---
name: Professional Career Engine
colors:
  surface: '#f8f9ff'
  surface-dim: '#ccdbf3'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e6eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d5e3fc'
  on-surface: '#0d1c2e'
  on-surface-variant: '#434655'
  inverse-surface: '#233144'
  inverse-on-surface: '#eaf1ff'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#006c4a'
  on-secondary: '#ffffff'
  secondary-container: '#82f5c1'
  on-secondary-container: '#00714e'
  tertiary: '#784b00'
  on-tertiary: '#ffffff'
  tertiary-container: '#996100'
  on-tertiary-container: '#ffeedd'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#85f8c4'
  secondary-fixed-dim: '#68dba9'
  on-secondary-fixed: '#002114'
  on-secondary-fixed-variant: '#005137'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#f8f9ff'
  on-background: '#0d1c2e'
  surface-variant: '#d5e3fc'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 0.25rem
  sm: 0.5rem
  md: 1rem
  lg: 1.5rem
  xl: 2rem
  xxl: 3rem
  container-max: 1200px
  gutter: 1.5rem
---

## Brand & Style

The design system is built on the pillars of **Professionalism, Efficiency, and Empowerment**. It aims to transform the often-stressful task of portfolio creation into a streamlined, high-confidence experience. The aesthetic follows a **Corporate Modern** approach—prioritizing clarity and utility while maintaining a premium, polished feel that reflects the career aspirations of the users.

The UI utilizes a card-based layout to organize data logically. It relies on a "Content-First" philosophy, where the interface recedes to let the user's professional achievements take center stage. The emotional response should be one of "controlled progress," guiding the user through a linear path from raw data to a finished digital product.

## Colors

The palette is anchored by **Corporate Blue (#2563EB)**, selected for its association with stability and trust in professional contexts. The secondary **Success Green (#059669)** is reserved specifically for "Generate" actions and completion states, providing a clear psychological reward for progress.

- **Primary:** Actions, active steps, and brand identifiers.
- **Secondary:** Final conversion points and "Success" feedback.
- **Neutrals:** Used for typography and structural borders. We use a Slate-based neutral scale to keep the interface feeling cool and modern rather than muddy.
- **Accessibility:** All color pairings for text and interactive elements are tested to meet **WCAG AA** standards, ensuring high legibility for all users.

## Typography

The design system exclusively uses **Inter**, a typeface designed for screens. Its tall x-height and exceptional legibility make it ideal for data-dense CV information.

- **Hierarchy:** We use a tight scale with subtle letter-spacing adjustments for larger headlines to maintain a compact, "designed" look.
- **Functional Labels:** `label-sm` is used for metadata and status badges, often in uppercase to provide visual contrast against body text.
- **Readability:** Line heights are set generously (1.5x for body text) to prevent eye fatigue during the review and editing phases.

## Layout & Spacing

The layout utilizes a **12-column fixed grid** on desktop, centered within the viewport to maintain focus. 

- **Workspace:** The main content area uses a light grey background (`#F8FAFC`) to separate the "Stage" from the navigational chrome.
- **The 4-Step Flow:** A persistent horizontal stepper sits at the top of the workspace. On mobile, this collapses into a "Step X of 4" indicator with a progress bar to save vertical space.
- **Responsive Behavior:** 
  - **Desktop:** Side-by-side view (Input on left, Live Preview on right).
  - **Tablet:** Stacked view with a toggle to "View Preview."
  - **Mobile:** Single column with bottom-fixed navigation for primary actions.

## Elevation & Depth

This design system uses **Tonal Layers** combined with **Ambient Shadows** to create a sense of organized structure.

- **Level 0 (Background):** Neutral workspace background, flat.
- **Level 1 (Cards):** White surfaces with a 1px border (`#E2E8F0`) and a very soft, diffused shadow (`y: 2px, blur: 4px, color: rgba(0,0,0,0.05)`).
- **Level 2 (Interactive/Hover):** Cards slightly lift on hover with an increased shadow (`y: 4px, blur: 12px, color: rgba(0,0,0,0.08)`) to indicate interactivity.
- **Level 3 (Modals/Popovers):** Higher contrast shadows to ensure clear separation from the workspace during file uploads or design selection.

## Shapes

We use a **Rounded** shape language (`0.5rem` / `8px` base) to strike a balance between friendly approachability and professional structure.

- **Standard Elements:** Buttons, input fields, and small cards use the base `8px` radius.
- **Container Elements:** Large sections and the main workspace container use `rounded-lg` (`16px`) to soften the overall appearance of the page.
- **Selection States:** Design templates in the "Select Design" phase should use `rounded-xl` (`24px`) to feel like modern, premium "objects."

## Components

### Buttons
- **Primary:** Solid Corporate Blue. White text. `8px` radius. High-contrast focus ring (2px offset).
- **Success (Generate):** Solid Success Green. Used only for the "Generate" and "Export" actions.
- **Ghost:** For secondary navigation (e.g., "Back"). Neutral border, no fill until hover.

### Stepper (4-Step Process)
- **Active:** Blue circle with white number; bold label.
- **Completed:** Green circle with a white checkmark; neutral label.
- **Pending:** Light grey border circle with grey number; muted label.

### Input Fields
- White background, `8px` radius, 1px grey border. 
- **Active State:** Border changes to Corporate Blue with a 3px soft blue glow.
- **Error State:** Border changes to Red, with helper text appearing immediately below.

### Design Selection Cards
- Large-scale thumbnails of portfolio templates.
- **Selected State:** Thick 3px Corporate Blue border with a checkmark badge in the top-right corner.

### Progress Bar
- A thin 4px bar at the top of the header, filling in Primary Blue as the user moves through the 4 steps.