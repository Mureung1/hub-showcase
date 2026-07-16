---
name: Nocturnal Ink
colors:
  surface: '#1e100a'
  surface-dim: '#1e100a'
  surface-bright: '#47352e'
  surface-container-lowest: '#180b06'
  surface-container-low: '#271812'
  surface-container: '#2c1c16'
  surface-container-high: '#372620'
  surface-container-highest: '#43312a'
  on-surface: '#fadcd2'
  on-surface-variant: '#e4beb1'
  inverse-surface: '#fadcd2'
  inverse-on-surface: '#3e2c26'
  outline: '#ab897d'
  outline-variant: '#5b4137'
  surface-tint: '#ffb59a'
  primary: '#ffb59a'
  on-primary: '#5a1b00'
  primary-container: '#ff5c00'
  on-primary-container: '#521800'
  inverse-primary: '#a73a00'
  secondary: '#cbc6bd'
  on-secondary: '#32302a'
  secondary-container: '#4e4b45'
  on-secondary-container: '#c0bbb3'
  tertiary: '#a0c9ff'
  on-tertiary: '#00325a'
  tertiary-container: '#0096fd'
  on-tertiary-container: '#002d51'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdbce'
  primary-fixed-dim: '#ffb59a'
  on-primary-fixed: '#370e00'
  on-primary-fixed-variant: '#802a00'
  secondary-fixed: '#e7e2d9'
  secondary-fixed-dim: '#cbc6bd'
  on-secondary-fixed: '#1d1b16'
  on-secondary-fixed-variant: '#494640'
  tertiary-fixed: '#d2e4ff'
  tertiary-fixed-dim: '#a0c9ff'
  on-tertiary-fixed: '#001c37'
  on-tertiary-fixed-variant: '#00497f'
  background: '#1e100a'
  on-background: '#fadcd2'
  surface-variant: '#43312a'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Be Vietnam Pro
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  caption:
    fontFamily: Be Vietnam Pro
    fontSize: 12px
    fontWeight: '500'
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
  xs: 8px
  sm: 16px
  md: 24px
  lg: 40px
  xl: 64px
  gutter: 16px
  margin-mobile: 20px
  margin-desktop: auto
---

## Brand & Style
The brand personality centers on "Midnight Socializing"—capturing the vibrant, energetic essence of nighttime gatherings. The design system blends **Neo-Brutalism** with **Glassmorphism**, creating a unique "Ink & Glow" aesthetic. It evokes a sense of excitement and clarity, targeting a social-active audience that values both spontaneous meetups and structured planning. 

The visual style utilizes heavy, intentional ink-stroke borders and hard shadows inherited from brutalist traditions, but softens the internal surfaces with translucent, frosted-glass textures to simulate the depth of a night sky. The contrast between the raw, structural lines and the ethereal background creates a high-energy, modern interface.

## Colors
The palette is dominated by a deep, expansive "Midnight Navy" (#1A1C2E) that serves as the canvas. 

- **Primary (Spark Orange):** A vivid, high-saturation orange (#FF5C00) used for critical actions and highlights, mimicking a firework or a streetlamp against the dark sky.
- **Secondary (Ink Cream):** A warm, high-contrast cream (#FFF9F0) used for typography and structural strokes, ensuring maximum legibility and a tactile "paper on dark ink" feel.
- **Surface (Glass):** Semi-transparent white layers provide the glassmorphism effect, allowing the deep background to subtly bleed through while maintaining element grouping.
- **Semantic Colors:** Success (Emerald), Error (Crimson), and Warning (Amber) are adjusted to high-vibrancy tints to remain visible against the dark background.

## Typography
The system uses **Plus Jakarta Sans** for headings and UI labels to provide a welcoming, rounded geometric feel that softens the harshness of brutalist borders. **Be Vietnam Pro** is utilized for body text to maintain high readability with a contemporary, friendly tone.

All typography defaults to **Ink Cream (#FFF9F0)** for maximum contrast. Headline weights are intentionally heavy (Bold/ExtraBold) to balance the thick 2px-3px borders of the UI components.

## Layout & Spacing
This design system utilizes a **8px soft-grid system** with a 12-column fluid layout for desktop and a 4-column layout for mobile. 

Margins are generous to allow the "Night Sky" background to breathe, enhancing the glassmorphism effect. Internal padding within cards and buttons follows a strict "even-spacing" rule (e.g., 16px or 24px) to maintain the geometric integrity of the brutalist shapes. Elements are often slightly offset from their shadows by a fixed 4px or 8px increment.

## Elevation & Depth
Elevation is expressed through **Hard Shadows** and **Backdrop Blurs** rather than traditional soft ambient shadows.

1.  **Surfaces:** Use `backdrop-filter: blur(12px)` combined with a semi-transparent fill (`rgba(255, 255, 255, 0.08)`).
2.  **Borders:** Every elevated element must have a solid 2px border using **Ink Cream**.
3.  **Shadows:** Shadows are 100% opaque, hard-edged, and offset (typically 4px down and 4px right). The shadow color is a darker shade of the background (#0D0E17) or the Primary color for interactive states.
4.  **Tiers:** Higher elevation is represented by a larger shadow offset and a slightly higher background opacity, rather than light-source simulations.

## Shapes
The shape language is "Rounded-Brutalist." While the structure is rigid and the borders are thick, the corners are softened to keep the interface friendly and accessible. 

- **Standard Elements:** 0.5rem (8px) corner radius.
- **Large Containers:** 1rem (16px) corner radius.
- **Interactive Small Elements (Chips/Tags):** 1.5rem (24px) for a pill-shaped appearance.

## Components
- **Buttons:** 
  - Primary: Spark Orange background, Ink Cream 2px border, 4px Hard Shadow (Black).
  - Secondary: Glass background (15% white), Ink Cream 2px border, 4px Hard Shadow.
- **Cards:** 
  - Glassmorphism base (8% white fill), 12px blur, 2px Ink Cream border. 
  - Must include a 4px hard shadow to "ground" the card against the navy background.
- **Inputs:** 
  - Transparent background with a 2px Ink Cream border. 
  - On focus, the border shifts to Spark Orange and a small 2px hard shadow appears.
- **Chips/Badges:** 
  - Pill-shaped, semi-transparent backgrounds with thin borders. 
  - Use Spark Orange for "Active" or "Live" status indicators.
- **Lists:** 
  - Separated by thin 1px Ink Cream lines with 10% opacity, or contained within individual glass-cards for higher grouping.
- **Selection Controls (Checkbox/Radio):** 
  - Thick 2px borders. When checked, filled with Spark Orange and marked with an Ink Cream icon.