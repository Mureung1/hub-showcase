import { getSupabase } from "../services/supabaseClient.js"

function extractToken(req) {
  const header = req.headers.authorization ?? ""
  return header.startsWith("Bearer ") ? header.slice(7) : null
}

async function resolveUserId(token) {
  const supabase = getSupabase()
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) return null
  return data.user.id
}

// vocabulary 조회처럼 반드시 로그인이 필요한 라우트에 사용. Supabase 설정이
// 안 돼 있으면(getSupabase() throw) 401 대신 500으로 원인을 드러낸다.
export async function requireAuth(req, res, next) {
  const token = extractToken(req)
  if (!token) {
    res.status(401).json({ success: false, error: "로그인이 필요합니다" })
    return
  }

  try {
    const userId = await resolveUserId(token)
    if (!userId) {
      res.status(401).json({ success: false, error: "로그인이 필요합니다" })
      return
    }
    req.userId = userId
    next()
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
}

// article/analyze처럼 비로그인 사용자도 허용하되, 로그인 상태면 req.userId를
// 채워 단어장 자동 적재 같은 부가 기능에 쓰도록 하는 라우트에 사용. 토큰
// 검증이 실패하거나 Supabase가 아직 설정되지 않았어도 절대 요청을 막지
// 않고 익명(userId: null)으로 통과시킨다.
export async function attachUser(req, _res, next) {
  const token = extractToken(req)
  if (!token) {
    req.userId = null
    next()
    return
  }

  try {
    req.userId = await resolveUserId(token)
  } catch {
    req.userId = null
  }
  next()
}
