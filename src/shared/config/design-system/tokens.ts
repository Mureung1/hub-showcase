type ColorTokenName =
  | 'amber'
  | 'ash'
  | 'canvas'
  | 'charcoal'
  | 'coral'
  | 'electricBlue'
  | 'errorInk'
  | 'fog'
  | 'graphite'
  | 'ink'
  | 'lightBlue'
  | 'mist'
  | 'paleBlue'
  | 'pewter'
  | 'signalGreen'
  | 'smoke';
type GradientTokenName = 'electricBlue';
type LayoutTokenName =
  | 'contentWidth'
  | 'sectionGapDesktop'
  | 'sectionGapMobile'
  | 'sectionGapTablet';
type MotionTokenName = 'durationFast' | 'durationStandard' | 'easingStandard';
type RadiusTokenName = 'button' | 'card' | 'input' | 'label';
type SpacingTokenName =
  '1' | '2' | '3' | '4' | '5' | '6' | '8' | '10' | '12' | '16' | '20';
type TypographyTokenName =
  | 'bodyLineHeight'
  | 'bodySize'
  | 'cardTitleLineHeight'
  | 'cardTitleSize'
  | 'fontFamily'
  | 'heroLineHeight'
  | 'heroSize'
  | 'labelLineHeight'
  | 'labelSize'
  | 'metaLineHeight'
  | 'metaSize'
  | 'screenTitleLineHeight'
  | 'screenTitleSize'
  | 'sectionTitleLineHeight'
  | 'sectionTitleSize';

type TokenGroup<TName extends string> = Readonly<Record<TName, string>>;

export type DesignTokens = Readonly<{
  color: TokenGroup<ColorTokenName>;
  gradient: TokenGroup<GradientTokenName>;
  layout: TokenGroup<LayoutTokenName>;
  motion: TokenGroup<MotionTokenName>;
  radius: TokenGroup<RadiusTokenName>;
  spacing: TokenGroup<SpacingTokenName>;
  typography: TokenGroup<TypographyTokenName>;
}>;

export const designTokens = {
  color: {
    amber: '#F59E0B',
    ash: '#E1E2E5',
    canvas: '#FFFFFF',
    charcoal: '#25272D',
    coral: '#F04438',
    electricBlue: '#0560FD',
    errorInk: '#D92D20',
    fog: '#C8CAD0',
    graphite: '#363940',
    ink: '#151619',
    lightBlue: '#3A8DFF',
    mist: '#F3F3F5',
    paleBlue: '#C3D9FF',
    pewter: '#B0B3BB',
    signalGreen: '#047857',
    smoke: '#667085',
  },
  gradient: {
    electricBlue:
      'linear-gradient(90deg, #0560FD 0%, #3A8DFF 50%, #C3D9FF 100%)',
  },
  layout: {
    contentWidth: '1200px',
    sectionGapDesktop: '80px',
    sectionGapMobile: '48px',
    sectionGapTablet: '64px',
  },
  motion: {
    durationFast: '150ms',
    durationStandard: '200ms',
    easingStandard: 'ease-out',
  },
  radius: {
    button: '8px',
    card: '16px',
    input: '12px',
    label: '0.16em',
  },
  spacing: {
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
  },
  typography: {
    bodyLineHeight: '26px',
    bodySize: '16px',
    cardTitleLineHeight: '24px',
    cardTitleSize: '17px',
    fontFamily:
      "Pretendard, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    heroLineHeight: '0.98',
    heroSize: 'clamp(48px, 6vw, 80px)',
    labelLineHeight: '20px',
    labelSize: '14px',
    metaLineHeight: '18px',
    metaSize: '13px',
    screenTitleLineHeight: '40px',
    screenTitleSize: '32px',
    sectionTitleLineHeight: '32px',
    sectionTitleSize: '24px',
  },
} as const satisfies DesignTokens;
