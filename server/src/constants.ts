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

// 프론트 src/components/scheduler/shared.tsx의 AVATAR_PALETTE와 값이 동일해야 한다(프로필 편집 시 검증용).
export const AVATAR_PALETTE = ['#a9c8ec', '#c7b7e7', '#a9cfbd', '#f2a58d', '#b8a6de', '#8fbdab'] as const

// 핸들은 영문/숫자/언더스코어 3~20자만 허용(프로필 수정, 친구 검색 양쪽에서 재사용).
export const HANDLE_PATTERN = /^[a-zA-Z0-9_]{3,20}$/
