// 인증(회원가입/로그인) 붙기 전까지 모든 요청은 이 데모 유저 소유로 취급한다.
export const DEMO_USER_ID = 'demo-user'

export const DEMO_CATEGORIES = [
  { id: 'study', name: '공부', color: '#98bce7', tone: 'blue' },
  { id: 'exercise', name: '운동', color: '#f2a58d', tone: 'coral' },
  { id: 'appointment', name: '약속', color: '#b8a6de', tone: 'violet' },
  { id: 'personal', name: '기타', color: '#8fbdab', tone: 'green' },
] as const
