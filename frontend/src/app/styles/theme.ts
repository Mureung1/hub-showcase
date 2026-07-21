import '@emotion/react'

// ============================================================================
// 1. BASE COLOR TOKENS
// ----------------------------------------------------------------------------
// 실제 색상값을 정의하는 원시 토큰이다.
// 컴포넌트에서는 palette를 직접 사용하지 않고 semanticColors를 사용한다.
// ============================================================================

export const palette = {
  common: {
    white: '#FFFFFF',
    black: '#000000',
    transparent: 'transparent',
  },

  grey: {
    50: '#F9FAFB',
    100: '#F2F4F6',
    200: '#E5E8EB',
    300: '#D1D6DB',
    400: '#B0B8C1',
    500: '#8B95A1',
    600: '#6B7684',
    700: '#4E5968',
    800: '#333D4B',
    900: '#191F28',
  },

  blue: {
    50: '#E8F3FF',
    100: '#C9E2FF',
    200: '#90C2FF',
    300: '#64A8FF',
    400: '#4593FC',
    500: '#3182F6',
    600: '#2272EB',
    700: '#1B64DA',
    800: '#1957C2',
    900: '#194AA6',
  },

  red: {
    50: '#FFEEEE',
    100: '#FFD4D6',
    200: '#FEAFB4',
    300: '#FB8890',
    400: '#F66570',
    500: '#F04452',
    600: '#E42939',
    700: '#D22030',
    800: '#BC1B2A',
    900: '#A51926',
  },

  green: {
    50: '#F0FAF6',
    100: '#AEEFD5',
    200: '#76E4B8',
    300: '#3FD599',
    400: '#15C47E',
    500: '#03B26C',
    600: '#02A262',
    700: '#029359',
    800: '#028450',
    900: '#027648',
  },

  orange: {
    50: '#FFF3E0',
    100: '#FFE0B0',
    200: '#FFCD80',
    300: '#FFBD51',
    400: '#FFA927',
    500: '#FE9800',
    600: '#FB8800',
    700: '#F57800',
    800: '#ED6700',
    900: '#E45600',
  },

  yellow: {
    50: '#FFF9E7',
    100: '#FFEFBF',
    500: '#FFC342',
    700: '#FAA131',
    900: '#DD7D02',
  },

  teal: {
    50: '#EDF8F8',
    500: '#18A5A5',
    700: '#0C8585',
  },

  purple: {
    50: '#F9F0FC',
    500: '#A234C7',
    700: '#8222A2',
  },
} as const

export type Palette = typeof palette

// ============================================================================
// 2. SEMANTIC COLOR TOKENS
// ----------------------------------------------------------------------------
// 색상값이 아닌 색상의 역할을 정의한다.
//
// 권장: theme.colors.text.primary, theme.colors.market.rise
// 지양: theme.palette.grey[900], theme.palette.red[500]
// ============================================================================

export const semanticColors = {
  background: {
    canvas: palette.common.white,
    base: palette.grey[50],
    elevated: palette.common.white,
    floating: palette.common.white,
    brandWeak: palette.blue[50],
    dimmed: 'rgba(0, 12, 30, 0.48)',
  },

  fill: {
    brand: palette.blue[500],
    brandHover: palette.blue[600],
    brandPressed: palette.blue[700],

    brandWeak: palette.blue[50],
    brandWeakHover: palette.blue[100],

    neutral: palette.grey[100],
    neutralHover: palette.grey[200],
    neutralPressed: palette.grey[300],
    neutralStrong: palette.grey[800],

    disabled: palette.grey[100],
  },

  text: {
    primary: palette.grey[900],
    secondary: palette.grey[800],
    tertiary: palette.grey[600],

    placeholder: palette.grey[500],
    disabled: palette.grey[400],

    inverse: palette.common.white,

    brand: palette.blue[500],
    brandStrong: palette.blue[700],

    success: palette.green[700],
    warning: palette.orange[700],
    danger: palette.red[500],
  },

  icon: {
    primary: palette.grey[900],
    secondary: palette.grey[600],
    tertiary: palette.grey[500],

    disabled: palette.grey[400],
    inverse: palette.common.white,

    brand: palette.blue[500],
    success: palette.green[600],
    warning: palette.orange[600],
    danger: palette.red[500],
  },

  border: {
    subtle: palette.grey[100],
    default: palette.grey[200],
    strong: palette.grey[300],

    brand: palette.blue[500],
    focus: palette.blue[500],
    danger: palette.red[500],
  },

  status: {
    success: palette.green[600],
    successWeak: palette.green[50],

    warning: palette.orange[600],
    warningWeak: palette.orange[50],

    danger: palette.red[500],
    dangerWeak: palette.red[50],

    info: palette.blue[500],
    infoWeak: palette.blue[50],
  },

  /**
   * 국내 증시 기준. 상승은 빨간색, 하락은 파란색이다.
   * 일반적인 success, danger 상태 색상과 혼용하지 않는다.
   */
  market: {
    rise: palette.red[500],
    riseStrong: palette.red[700],
    riseWeak: palette.red[50],

    fall: palette.blue[500],
    fallStrong: palette.blue[700],
    fallWeak: palette.blue[50],

    unchanged: palette.grey[600],
    unchangedWeak: palette.grey[100],
  },

  ai: {
    primary: palette.blue[500],
    primaryWeak: palette.blue[50],

    analyzing: palette.purple[500],
    analyzingWeak: palette.purple[50],

    complete: palette.green[600],
    completeWeak: palette.green[50],

    caution: palette.orange[600],
    cautionWeak: palette.orange[50],
  },

  chart: {
    grid: palette.grey[200],
    axis: palette.grey[500],

    tooltipBackground: palette.grey[900],
    tooltipText: palette.common.white,

    series: [
      palette.blue[500],
      palette.green[500],
      palette.orange[500],
      palette.purple[500],
      palette.teal[500],
      palette.red[500],
    ],
  },
} as const

export type SemanticColors = typeof semanticColors

// ============================================================================
// 3. SPACING TOKENS — 4px 단위 기반 간격 체계
// ============================================================================

export const space = {
  0: '0',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
} as const

// ============================================================================
// 4. BORDER RADIUS TOKENS
// ============================================================================

export const radius = {
  none: '0',
  xs: '6px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  round: '9999px',
} as const

// ============================================================================
// 5. SHADOW TOKENS
// ----------------------------------------------------------------------------
// 토스 스타일처럼 그림자를 강하게 사용하지 않는다.
// 테두리와 배경 차이를 우선적으로 사용한다.
// ============================================================================

export const shadow = {
  none: 'none',

  card: '0 1px 3px rgba(25, 31, 40, 0.04)',

  floating: ['0 4px 12px rgba(25, 31, 40, 0.06)', '0 12px 32px rgba(25, 31, 40, 0.08)'].join(', '),

  overlay: '0 16px 48px rgba(25, 31, 40, 0.16)',
} as const

// ============================================================================
// 6. FONT TOKENS
// ============================================================================

export const fontFamily = {
  sans: [
    'Pretendard Variable',
    'Pretendard',
    '-apple-system',
    'BlinkMacSystemFont',
    'Apple SD Gothic Neo',
    'Noto Sans KR',
    'Segoe UI',
    'sans-serif',
  ].join(', '),

  mono: ['JetBrains Mono', 'SFMono-Regular', 'Consolas', 'Liberation Mono', 'monospace'].join(', '),
} as const

export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const

// ============================================================================
// 7. TYPOGRAPHY TOKENS
// ----------------------------------------------------------------------------
// Emotion에서 아래처럼 바로 사용할 수 있다.
// ${({ theme }) => theme.typography.bodyMedium}
// ============================================================================

export const typography = {
  displayLarge: {
    fontSize: '40px',
    lineHeight: '52px',
    fontWeight: fontWeight.bold,
    letterSpacing: '-0.02em',
  },

  displaySmall: {
    fontSize: '32px',
    lineHeight: '42px',
    fontWeight: fontWeight.bold,
    letterSpacing: '-0.015em',
  },

  titleLarge: {
    fontSize: '30px',
    lineHeight: '40px',
    fontWeight: fontWeight.bold,
    letterSpacing: '-0.015em',
  },

  titleMedium: {
    fontSize: '24px',
    lineHeight: '33px',
    fontWeight: fontWeight.bold,
    letterSpacing: '-0.01em',
  },

  titleSmall: {
    fontSize: '20px',
    lineHeight: '29px',
    fontWeight: fontWeight.semibold,
    letterSpacing: '-0.005em',
  },

  bodyLarge: {
    fontSize: '17px',
    lineHeight: '25.5px',
    fontWeight: fontWeight.regular,
    letterSpacing: '0',
  },

  bodyMedium: {
    fontSize: '16px',
    lineHeight: '24px',
    fontWeight: fontWeight.regular,
    letterSpacing: '0',
  },

  bodySmall: {
    fontSize: '15px',
    lineHeight: '22.5px',
    fontWeight: fontWeight.regular,
    letterSpacing: '0',
  },

  labelLarge: {
    fontSize: '16px',
    lineHeight: '24px',
    fontWeight: fontWeight.semibold,
    letterSpacing: '0',
  },

  labelMedium: {
    fontSize: '14px',
    lineHeight: '21px',
    fontWeight: fontWeight.medium,
    letterSpacing: '0',
  },

  caption: {
    fontSize: '13px',
    lineHeight: '19.5px',
    fontWeight: fontWeight.regular,
    letterSpacing: '0',
  },
} as const

// ============================================================================
// 8. SIZE TOKENS
// ============================================================================

export const size = {
  button: {
    sm: '40px',
    md: '48px',
    lg: '56px',
  },

  input: {
    md: '48px',
    lg: '56px',
  },

  icon: {
    sm: '16px',
    md: '20px',
    lg: '24px',
    xl: '32px',
  },

  sidebar: {
    width: '264px',
    collapsedWidth: '72px',
  },

  content: {
    maxWidth: '1200px',
    readingWidth: '720px',
  },
} as const

// ============================================================================
// 9. BREAKPOINT TOKENS
// ============================================================================

export const breakpoint = {
  mobile: '480px',
  tablet: '768px',
  desktop: '1024px',
  wide: '1280px',
} as const

// ============================================================================
// 10. MOTION TOKENS
// ----------------------------------------------------------------------------
// 금융 서비스에서는 장식적인 애니메이션보다 상태 전환을 명확하게 보여준다.
// ============================================================================

export const motion = {
  duration: {
    fast: '100ms',
    normal: '180ms',
    slow: '280ms',
  },

  easing: {
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
    enter: 'cubic-bezier(0, 0, 0.2, 1)',
    exit: 'cubic-bezier(0.4, 0, 1, 1)',
  },
} as const

// ============================================================================
// 11. Z-INDEX TOKENS
// ============================================================================

export const zIndex = {
  base: 0,
  sticky: 100,
  navigation: 200,
  dropdown: 300,
  overlay: 400,
  modal: 500,
  toast: 600,
} as const

// ============================================================================
// 12. COMPONENT TOKENS
// ----------------------------------------------------------------------------
// Button, Input, Card 등 컴포넌트에서 반복되는 값을 정의한다.
// ============================================================================

export const componentTokens = {
  button: {
    height: {
      small: size.button.sm,
      medium: size.button.md,
      large: size.button.lg,
    },

    radius: radius.md,

    padding: {
      small: `0 ${space[3]}`,
      medium: `0 ${space[4]}`,
      large: `0 ${space[5]}`,
    },
  },

  input: {
    height: {
      medium: size.input.md,
      large: size.input.lg,
    },

    radius: radius.md,
    padding: `0 ${space[4]}`,

    background: semanticColors.fill.neutral,
    border: semanticColors.border.default,
    focusBorder: semanticColors.border.focus,
  },

  card: {
    radius: radius.lg,
    padding: space[6],

    background: semanticColors.background.elevated,
    border: semanticColors.border.subtle,
    shadow: shadow.card,
  },

  listRow: {
    minHeight: '64px',
    padding: `${space[3]} ${space[4]}`,
    divider: semanticColors.border.subtle,
  },

  sidebar: {
    width: size.sidebar.width,
    collapsedWidth: size.sidebar.collapsedWidth,

    background: semanticColors.background.canvas,
    border: semanticColors.border.subtle,
  },

  bottomSheet: {
    radius: `${radius.xl} ${radius.xl} 0 0`,
    background: semanticColors.background.floating,
    shadow: shadow.overlay,
  },

  badge: {
    height: '28px',
    radius: radius.round,
    padding: `0 ${space[2]}`,
  },
} as const

// ============================================================================
// 13. EMOTION THEME
// ============================================================================

export const gazuaTheme = {
  palette,
  colors: semanticColors,

  space,
  radius,
  shadow,

  fontFamily,
  fontWeight,
  typography,

  size,
  breakpoint,
  motion,
  zIndex,

  components: componentTokens,
} as const

export type GazuaTheme = typeof gazuaTheme

// ============================================================================
// 14. EMOTION THEME TYPE DECLARATION
// ----------------------------------------------------------------------------
// styled 컴포넌트와 useTheme에서 자동 완성을 제공한다.
// ============================================================================

declare module '@emotion/react' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- Theme 타입 확장은 interface 선언 병합이 필요해 type 별칭으로 대체할 수 없다
  export interface Theme extends GazuaTheme {}
}
