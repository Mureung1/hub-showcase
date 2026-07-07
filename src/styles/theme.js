// 색·간격 토큰: 포인트 컬러(그린=건강) + 중립 회색. 부족=주황, 충족=그린.

export const colors = {
  primary: '#2e7d32',
  primarySurface: '#e8f5e9',
  deficient: '#e67e22',
  deficientSurface: '#fff3e6',
  danger: '#c0392b',
  dangerSurface: '#fdecea',
  text: '#1f2933',
  textMuted: '#6b7280',
  border: '#e2e2e2',
  surface: '#ffffff',
  background: '#f6f7f5',
  track: '#ececea',
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
}

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
}

export const font = {
  size: {
    sm: 13,
    md: 15,
    lg: 18,
    xl: 24,
  },
}

export const layout = {
  maxWidth: 420,
}

// 페이지·카드·폼 요소에 공통으로 쓰는 인라인 스타일 조각. 전 페이지에서 이 값들만 사용해 시각 일관성 유지.
export const styles = {
  page: {
    maxWidth: layout.maxWidth,
    margin: '0 auto',
    padding: `${spacing.xl}px ${spacing.lg}px ${spacing.xxl}px`,
    boxSizing: 'border-box',
  },
  card: {
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.md,
    padding: spacing.lg,
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
    color: colors.textMuted,
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: `${spacing.sm}px ${spacing.md}px`,
    borderRadius: radius.sm,
    border: `1px solid ${colors.border}`,
    fontSize: font.size.md,
    fontFamily: 'inherit',
  },
  buttonPrimary: {
    width: '100%',
    boxSizing: 'border-box',
    padding: `${spacing.md}px`,
    borderRadius: radius.sm,
    border: 'none',
    background: colors.primary,
    color: '#fff',
    fontSize: font.size.md,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  buttonSecondary: {
    padding: `${spacing.sm}px ${spacing.md}px`,
    borderRadius: radius.sm,
    border: `1px solid ${colors.border}`,
    background: colors.surface,
    color: colors.text,
    fontSize: font.size.sm,
    cursor: 'pointer',
  },
  linkButton: {
    background: 'none',
    border: 'none',
    color: colors.primary,
    cursor: 'pointer',
    fontSize: font.size.sm,
    padding: 0,
  },
  errorText: {
    color: colors.danger,
    fontSize: font.size.sm,
    margin: `${spacing.sm}px 0 0`,
  },
  helperText: {
    color: colors.textMuted,
    fontSize: font.size.sm,
  },
}

export const theme = { colors, spacing, radius, font, layout, styles }
