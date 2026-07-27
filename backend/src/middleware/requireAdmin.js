// 관리자 전용 라우트 가드. env의 Supabase 사용자 UUID 허용목록으로 판단한다.
// requireAuth 뒤에 붙여 써서 req.userId가 이미 채워져 있다고 가정한다.
const ADMIN_USER_IDS = (process.env.ADMIN_USER_IDS || '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean)

export function requireAdmin(req, res, next) {
  if (!ADMIN_USER_IDS.includes(req.userId)) {
    return res.status(403).json({ error: '관리자만 접근할 수 있어요.' })
  }
  next()
}
