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
export type CategoryColorKey =
  | 'amber-1'
  | 'amber-2'
  | 'amber-3'
  | 'blue-1'
  | 'blue-2'
  | 'blue-3'
  | 'coral-1'
  | 'coral-2'
  | 'coral-3'
  | 'green-1'
  | 'green-2'
  | 'green-3'
  | 'indigo-1'
  | 'indigo-2'
  | 'indigo-3'
  | 'slate-1'
  | 'slate-2'
  | 'slate-3'
  | 'teal-1'
  | 'teal-2'
  | 'teal-3'
  | 'violet-1'
  | 'violet-2'
  | 'violet-3';
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
  category: TokenGroup<CategoryColorKey>;
  color: TokenGroup<ColorTokenName>;
  gradient: TokenGroup<GradientTokenName>;
  layout: TokenGroup<LayoutTokenName>;
  motion: TokenGroup<MotionTokenName>;
  radius: TokenGroup<RadiusTokenName>;
  spacing: TokenGroup<SpacingTokenName>;
  typography: TokenGroup<TypographyTokenName>;
}>;

export const designTokens = {
  category: {
    'slate-1': '#F1F5F9',
    'slate-2': '#64748B',
    'slate-3': '#334155',
    'blue-1': '#DBEAFE',
    'blue-2': '#3B82F6',
    'blue-3': '#1D4ED8',
    'indigo-1': '#E0E7FF',
    'indigo-2': '#6366F1',
    'indigo-3': '#4338CA',
    'violet-1': '#EDE9FE',
    'violet-2': '#8B5CF6',
    'violet-3': '#6D28D9',
    'green-1': '#DCFCE7',
    'green-2': '#16A34A',
    'green-3': '#166534',
    'teal-1': '#CCFBF1',
    'teal-2': '#0D9488',
    'teal-3': '#115E59',
    'amber-1': '#FEF3C7',
    'amber-2': '#F59E0B',
    'amber-3': '#B45309',
    'coral-1': '#FEE2E2',
    'coral-2': '#F04438',
    'coral-3': '#B42318',
  },
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
