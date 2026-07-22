import { supabaseAuthClient } from '../db/supabaseAuthClient.js'

// gapAnalysis.routes.js의 GET /:id 404 처리와 같은 스타일로, throw 없이 라우트 레벨에서 바로 응답한다.
export async function requireSupabaseAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) {
    res.status(401).json({ error: '로그인이 필요합니다.' })
    return
  }

  const { data, error } = await supabaseAuthClient.auth.getUser(token)
  if (error || !data.user) {
    res.status(401).json({ error: '로그인이 필요합니다.' })
    return
  }

  req.userId = data.user.id
  next()
}
