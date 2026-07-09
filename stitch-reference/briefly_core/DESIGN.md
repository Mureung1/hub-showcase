---
name: Briefly Core
colors:
  surface: '#f8f9ff'
  surface-dim: '#d5dae7'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e9eefb'
  surface-container-high: '#e3e8f5'
  surface-container-highest: '#dde3ef'
  on-surface: '#161c25'
  on-surface-variant: '#414754'
  inverse-surface: '#2b313a'
  inverse-on-surface: '#ebf1fe'
  outline: '#727785'
  outline-variant: '#c1c6d6'
  surface-tint: '#005bbe'
  primary: '#0059b9'
  on-primary: '#ffffff'
  primary-container: '#1071e5'
  on-primary-container: '#fefcff'
  inverse-primary: '#acc7ff'
  secondary: '#5c5f61'
  on-secondary: '#ffffff'
  secondary-container: '#e0e3e5'
  on-secondary-container: '#626567'
  tertiary: '#595c5f'
  on-tertiary: '#ffffff'
  tertiary-container: '#717578'
  on-tertiary-container: '#fbfdff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d7e2ff'
  primary-fixed-dim: '#acc7ff'
  on-primary-fixed: '#001a40'
  on-primary-fixed-variant: '#004491'
  secondary-fixed: '#e0e3e5'
  secondary-fixed-dim: '#c4c7c9'
  on-secondary-fixed: '#191c1e'
  on-secondary-fixed-variant: '#444749'
  tertiary-fixed: '#e0e3e6'
  tertiary-fixed-dim: '#c4c7ca'
  on-tertiary-fixed: '#181c1e'
  on-tertiary-fixed-variant: '#43474a'
  background: '#f8f9ff'
  on-background: '#161c25'
  surface-variant: '#dde3ef'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  margin-mobile: 20px
  gutter: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 24px
  section-gap: 40px
---

## Brand & Style

The design system is engineered for a service that bridges the gap between financial literacy and language acquisition. The brand personality is **articulate, trustworthy, and effortless**. It targets ambitious professionals and students who value efficiency and high-density information presented with extreme clarity.

The visual style is **Corporate / Modern** with a strong emphasis on **Minimalism**. It draws heavily from modern fintech aesthetics—utilizing vast white space, subtle tonal shifts, and a singular high-energy accent color to guide the user. The interface should feel less like a website and more like a native mobile application: fluid, responsive, and tactile. High readability is the primary objective, ensuring that complex stock data and educational text are easily digestible.

## Colors

The palette is rooted in a "Clean Canvas" philosophy. The primary background is pure white, creating a sterile and focused environment.

- **Primary Blue (#3182F6):** A vibrant, high-contrast blue used exclusively for primary actions, progress indicators, and key financial highlights.
- **Secondary Grey (#F2F4F6):** Used for large surface areas like card backgrounds and input fields to provide subtle separation from the white base.
- **Tertiary Border (#E5E8EB):** A soft, low-contrast grey for hairline borders and dividers.
- **Neutral Text (#191F28):** A deep, near-black charcoal used for maximum legibility in typography. Secondary text should utilize a 60% opacity of this value.

## Typography

This design system uses a dual-sans-serif pairing to distinguish between branding and utility. **Hanken Grotesk** provides a sharp, contemporary edge for headlines and financial figures, while **Inter** is used for body text and interface labels to ensure maximum readability at small sizes.

For English learning modules, body-lg is the preferred size to reduce eye strain. Financial tickers and stock prices should always use the semi-bold or bold weights of Hanken Grotesk to command attention. Tighten letter-spacing on headlines to maintain a compact, premium feel.

## Layout & Spacing

The layout follows a **Fluid Grid** model optimized for mobile-first consumption. It uses a 4-column system for mobile devices and scales to a centered 8-column column container on larger screens (max-width: 480px) to preserve the "app-like" verticality.

- **Safe Margins:** A consistent 20px margin on the left and right edges of the viewport.
- **Vertical Rhythm:** Content is organized in "stacks." Use 16px (stack-md) for elements within a card and 24px (stack-lg) for spacing between distinct cards or sections.
- **Generous Whitespace:** Prioritize breathing room. Use section-gaps of 40px to separate major functional areas (e.g., separating "Stock Market Overview" from "Word of the Day").

## Elevation & Depth

The system eschews heavy shadows in favor of **Tonal Layers** and **Low-contrast Outlines**. 

- **Surface Levels:** The base layer is #FFFFFF. Content cards use #F2F4F6 or a pure white background with a 1px border of #E5E8EB.
- **Shadows:** Use only one shadow style for floating elements (like Bottom Sheets or Floating Action Buttons): `0px 10px 30px rgba(0, 0, 0, 0.05)`. This creates a soft, ambient lift without muddying the clean aesthetic.
- **Interaction:** On tap/press, cards should subtly scale (98%) rather than changing color, reinforcing the tactile, physical nature of the UI.

## Shapes

The shape language is defined by oversized, friendly radiuses that evoke a modern, high-end mobile experience. 

- **Standard Containers:** Use a 20px to 24px corner radius for primary content cards.
- **Buttons & Inputs:** Use a 12px to 16px radius to maintain a consistent but slightly tighter feel than the larger containers.
- **Small Elements:** Chips and tags should be fully pill-shaped (rounded-xl) to distinguish them from interactive buttons.

## Components

- **Buttons:** Primary buttons use the Primary Blue background with white text. Secondary buttons use a light grey background (#F2F4F6) with the Primary Blue as the text color. No borders on buttons.
- **Cards:** The signature component. Cards should have a white background, a 1px border (#E5E8EB), and 20px padding. Multiple cards in a sequence should be separated by 12px.
- **Input Fields:** Use #F2F4F6 as the background color with no border. On focus, apply a 1px Primary Blue border. Labels should sit above the field in label-md.
- **Progress Bars:** For learning modules, use a 6px thick bar with a #F2F4F6 track and a Primary Blue indicator.
- **Lists:** Use "In-Card Lists" where each item is separated by a 1px hairline divider that doesn't reach the card edges (inset by 16px).
- **Bottom Navigation:** A persistent white bar with a subtle top border. Icons should be 24px, using the Primary Blue for the active state and a light grey (#B0B8C1) for inactive states.