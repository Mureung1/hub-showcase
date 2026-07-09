export const TYPOGRAPHY = {
  // Font
  fontFamily: 'Manrope, system-ui, sans-serif',

  // Font Sizes
  sizes: {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '20px',
    xl: '24px',
    '2xl': '28px',
    '3xl': '32px',
  },

  // Font Weights
  weights: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  // Line Heights
  lineHeights: {
    tight: 1.1,
    normal: 1.5,
    relaxed: 1.6,
    loose: 1.8,
  },

  // Letter Spacing
  letterSpacing: {
    tight: '-0.02em',
    normal: '0em',
    wide: '0.02em',
  },
}

// Tailwind text utilities reference
export const TEXT_STYLES = {
  sectionTitle: 'text-lg font-semibold text-text-primary',
  cardTitle: 'text-base font-semibold text-text-primary',
  kpiValue: 'text-3xl font-bold text-text-primary',
  label: 'text-xs font-semibold text-text-secondary uppercase',
  body: 'text-sm font-normal text-text-secondary',
  caption: 'text-xs font-medium text-text-secondary',
}
