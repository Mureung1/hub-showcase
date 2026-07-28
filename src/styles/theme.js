// 토스(Toss) 스타일 디자인 토큰 — 포인트 컬러는 그린 1개만 사용(버튼/강조/충족 상태 공통),
// 나머지는 중립 회색 계열. 부족=주황, 위험=레드는 기존 값을 그대로 유지한다.
// 기존 페이지들이 이미 이 파일의 키 이름을 참조하고 있으므로, 기존 키는 값만 갱신하고
// 이름은 그대로 둔다. 새로 요청된 키(primaryDark, bg, textStrong, textSub, border, success 등)는
// 기존 값의 별칭으로 추가한다.

export const colors = {
  // 포인트 컬러(그린) — 버튼/강조와 "충족" 상태에 공통으로 쓰는 단 하나의 그린.
  // 흰 텍스트를 얹는 꽉 찬 버튼에서도 AA 대비(4.5:1 이상)를 만족하도록 고른 톤이다.
  primary: '#059669',
  primaryDark: '#047857', // 프레스/호버 등 더 진한 상태가 필요할 때
  primarySurface: '#E3F5EC',

  // "충족" 상태는 포인트 컬러와 동일한 그린을 재사용한다(포인트 컬러 1개 원칙).
  satisfied: '#059669',
  satisfiedSurface: '#E3F5EC',
  success: '#059669',
  successSurface: '#E3F5EC',

  // "부족" = 주황, "위험" = 레드. 기존 값 유지.
  deficient: '#FF9F1C',
  deficientSurface: '#FFF4E5',
  danger: '#F04452',
  dangerSurface: '#FDEEEF',

  // deficient/danger를 "텍스트"로 쓸 때만 쓰는 더 짙은 톤 — 흰 배경 대비 각각 2.05:1/3.71:1로
  // WCAG AA(4.5:1) 미달이었다(6주차 다각도 리뷰에서 발견). deficient/danger 원래 값은 막대 채우기·
  // 배지처럼 "면"으로 쓰는 곳의 픽셀을 그대로 유지하기 위해 손대지 않고, 텍스트 전용 토큰을
  // 새로 추가해 그 자리만 바꾼다.
  deficientText: '#C2410C', // vs #fff 5.18:1 · vs #F2F4F6 4.70:1
  dangerText: '#C81E2C', // vs #fff 5.71:1 · vs #F2F4F6 5.18:1

  // "식약처DB"(신뢰 최상) 출처 배지 전용 블루. 포인트 컬러(그린)와 겹치지 않게 구분한다.
  info: '#3182F6',
  infoSurface: '#EAF2FE',

  // 배경/서피스: 전역은 옅은 회색, 카드는 흰색으로 대비를 준다.
  background: '#F2F4F6',
  bg: '#F2F4F6',
  surface: '#FFFFFF',

  // 텍스트 위계: 진회색(강조) / 중간회색(보조) / 연회색(placeholder 등 최약)
  title: '#191F28',
  textStrong: '#191F28',
  body: '#4E5968',
  textSub: '#4E5968',
  // #8B95A1(3.04:1)은 WCAG AA 미달이었다 — 거의 전부 보조/안내 텍스트로만 쓰여(막대·배지 채우기용이
  // 아님) 다른 톤처럼 별도 텍스트 토큰을 만들 필요 없이 이 값 자체를 더 짙게 바꾼다.
  muted: '#64707D', // vs #fff 5.05:1 · vs #F2F4F6 4.58:1

  // 로고 워드마크("Mealyze") 전용 잉크색. 로고 심볼(bowl+arrow)의 짙은 청록 끝단과 맞춘 값이라
  // 심볼 옆에 나란히 놓았을 때 하나의 로고로 읽힌다.
  // ⚠️ 이 색은 **로고에서만** 쓴다 — 버튼/강조/링크 등 UI 액센트는 이 앱의 원칙대로 그린 하나(primary)뿐이다.
  brandInk: '#15566B',

  border: '#E5E8EB', // 카드에 그림자 대신 얇은 테두리를 쓰고 싶을 때

  track: '#F2F4F6',
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
  lg: 20,
  pill: 999,
}

export const shadow = {
  card: '0 2px 12px rgba(25, 31, 40, 0.06)', // 아주 옅은 카드 그림자
  sm: '0 1px 4px rgba(25, 31, 40, 0.05)',
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
    title: 28, // 화면 큰 제목(ScreenHeader) 전용, 22~28px 범위의 상단값
  },
}

export const layout = {
  maxWidth: 430, // 420~480px 범위, 모바일 화면 중앙 정렬 기준
  pagePaddingX: 20,
  shellMaxWidth: 480, // AppShell/BottomTabBar 전용 바깥 셸 폭
}

// 페이지·카드·폼 요소에 공통으로 쓰는 인라인 스타일 조각. 전 페이지에서 이 값들만 사용해 시각 일관성 유지.
// 클릭 가능한 요소에는 별도로 className="tds-press"를 붙여 스프링 프레스 인터랙션을 적용한다.
export const styles = {
  page: {
    maxWidth: layout.maxWidth,
    margin: '0 auto',
    minHeight: '100svh',
    background: colors.bg,
    padding: `${spacing.xl}px ${layout.pagePaddingX}px ${spacing.xxxl}px`,
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
    color: colors.textSub,
    fontWeight: 600,
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: `${spacing.md}px ${spacing.lg}px`,
    borderRadius: radius.sm,
    border: 'none',
    background: colors.bg,
    color: colors.textStrong,
    fontSize: font.size.md,
    fontFamily: 'inherit',
  },
  buttonPrimary: {
    width: '100%',
    boxSizing: 'border-box',
    height: 52,
    padding: `0 ${spacing.lg}px`,
    borderRadius: radius.md,
    border: 'none',
    background: colors.primary,
    color: '#fff',
    fontSize: font.size.lg,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  buttonSecondary: {
    // inline-flex(= 내용만큼만 차지, buttonPrimary처럼 100% 폭으로 늘어나지 않음)로 스피너+텍스트를
    // 가운데 정렬하고 사이 간격을 준다 — 기존엔 이 셋이 없어 스피너가 텍스트에 바로 붙어 보이던 곳이
    // 있었다. 폭/높이는 호출부마다 의도가 달라(로그아웃 버튼처럼 좁아야 하는 곳도 있다) 강제하지 않는다.
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: `${spacing.sm}px ${spacing.lg}px`,
    borderRadius: radius.pill,
    border: 'none',
    background: colors.bg,
    color: colors.textSub,
    fontSize: font.size.sm,
    fontWeight: 600,
    cursor: 'pointer',
  },
  // 주 버튼과 나란히 놓이는 대등한 선택지용(예: [저장하기] 옆의 [다시 찍기]).
  // buttonSecondary(회색 필)와 달리 같은 높이·같은 라운드라 한 줄에 두 개를 나란히 둘 때 균형이 맞고,
  // 초록 테두리 + 흰 배경이라 채워진 주 버튼보다 한 단계 낮은 위계를 유지한다(한 화면에 주 버튼은 하나).
  buttonOutline: {
    width: '100%',
    boxSizing: 'border-box',
    height: 52,
    padding: `0 ${spacing.lg}px`,
    borderRadius: radius.md,
    border: `1.5px solid ${colors.primary}`,
    background: colors.surface,
    color: colors.primary,
    fontSize: font.size.lg,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
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
    color: colors.dangerText,
    fontSize: font.size.sm,
    margin: `${spacing.sm}px 0 0`,
  },
  helperText: {
    color: colors.muted,
    fontSize: font.size.sm,
  },
}

export const theme = { colors, spacing, radius, shadow, font, layout, styles }
