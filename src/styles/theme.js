// 토스(TDS) 스타일 톤 — 배경/서피스/브랜드 컬러 + 부족/충족 데이터 시각화 의미색은 유지.

export const colors = {
  background: '#F2F4F6', // 세컨더리 배경 (앱 전체 배경)
  surface: '#FFFFFF', // 카드/컨테이너 배경

  primary: '#3182F6', // 토스 블루 — 메인 액션 버튼/활성 상태
  primarySurface: '#EBF2FE',

  satisfied: '#00C9A7', // 충족(그린/틸)
  satisfiedSurface: '#E6FBF6',
  deficient: '#FF9F1C', // 부족(오렌지)
  deficientSurface: '#FFF4E5',
  danger: '#F04452',
  dangerSurface: '#FDEEEF',

  title: '#191F28', // 타이틀/강조
  body: '#4E5968', // 본문/설명
  muted: '#8B95A1', // 비활성/보조

  track: '#F2F4F6', // 프로그레스 바 트랙
  skeleton: '#E8EBEE',
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 40,
}

export const radius = {
  sm: 12,
  md: 16,
  lg: 24,
  pill: 999,
}

export const shadow = {
  card: '0 8px 24px rgba(0, 0, 0, 0.04)',
  sm: '0 2px 8px rgba(0, 0, 0, 0.04)',
}

export const font = {
  family: "'Pretendard', -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Segoe UI', Roboto, sans-serif",
  size: {
    xs: 12,
    sm: 14,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 26,
  },
}

export const layout = {
  maxWidth: 430,
}

// 페이지·카드·폼 요소에 공통으로 쓰는 인라인 스타일 조각. 전 페이지에서 이 값들만 사용해 시각 일관성 유지.
// 클릭 가능한 요소에는 별도로 className="tds-press"를 붙여 스프링 프레스 인터랙션을 적용한다.
export const styles = {
  page: {
    maxWidth: layout.maxWidth,
    margin: '0 auto',
    minHeight: '100svh',
    background: colors.background,
    padding: `${spacing.xl}px ${spacing.lg}px ${spacing.xxxl}px`,
    boxSizing: 'border-box',
  },
  card: {
    background: colors.surface,
    borderRadius: radius.lg,
    boxShadow: shadow.card,
    padding: spacing.xl,
    marginBottom: spacing.md,
    boxSizing: 'border-box',
  },
  field: {
    marginBottom: spacing.md,
  },
  label: {
    display: 'block',
    marginBottom: spacing.xs,
    fontSize: font.size.sm,
    color: colors.muted,
    fontWeight: 600,
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: `${spacing.md}px ${spacing.lg}px`,
    borderRadius: radius.sm,
    border: 'none',
    background: colors.background,
    color: colors.title,
    fontSize: font.size.md,
    fontFamily: 'inherit',
  },
  buttonPrimary: {
    width: '100%',
    boxSizing: 'border-box',
    padding: `${spacing.md + 2}px`,
    borderRadius: radius.md,
    border: 'none',
    background: colors.primary,
    color: '#fff',
    fontSize: font.size.md,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  buttonSecondary: {
    padding: `${spacing.sm}px ${spacing.lg}px`,
    borderRadius: radius.pill,
    border: 'none',
    background: colors.background,
    color: colors.body,
    fontSize: font.size.sm,
    fontWeight: 600,
    cursor: 'pointer',
  },
  linkButton: {
    background: 'none',
    border: 'none',
    color: colors.primary,
    cursor: 'pointer',
    fontSize: font.size.sm,
    fontWeight: 600,
    padding: 0,
  },
  errorText: {
    color: colors.danger,
    fontSize: font.size.sm,
    margin: `${spacing.sm}px 0 0`,
  },
  helperText: {
    color: colors.muted,
    fontSize: font.size.sm,
  },
}

export const theme = { colors, spacing, radius, shadow, font, layout, styles }
