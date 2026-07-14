// 인증(회원가입/로그인) 붙기 전까지 모든 요청은 이 데모 유저 소유로 취급한다.
export const DEMO_USER_ID = 'demo-user'

// 카테고리 색은 톤 4가지로 고정 — 사용자가 임의 hex를 고르지 않고 톤만 선택한다.
export const TONE_COLORS = {
  blue: '#98bce7',
  coral: '#f2a58d',
  violet: '#b8a6de',
  green: '#8fbdab',
} as const

// 새로 가입한 유저에게 기본으로 만들어주는 카테고리(id는 유저마다 새로 생성됨).
export const DEFAULT_CATEGORY_TEMPLATE = [
  { name: '공부', tone: 'blue', color: TONE_COLORS.blue },
  { name: '운동', tone: 'coral', color: TONE_COLORS.coral },
  { name: '약속', tone: 'violet', color: TONE_COLORS.violet },
  { name: '기타', tone: 'green', color: TONE_COLORS.green },
] as const

export const DEMO_CATEGORIES = [
  { id: 'study', ...DEFAULT_CATEGORY_TEMPLATE[0] },
  { id: 'exercise', ...DEFAULT_CATEGORY_TEMPLATE[1] },
  { id: 'appointment', ...DEFAULT_CATEGORY_TEMPLATE[2] },
  { id: 'personal', ...DEFAULT_CATEGORY_TEMPLATE[3] },
] as const
