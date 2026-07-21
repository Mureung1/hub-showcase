// 인증 라우트 — 회원가입·로그인·로그아웃·아이디 중복확인·현재 사용자.
// 비밀번호는 bcrypt 해시로만 저장하고, 로그인 세션은 httpOnly JWT 쿠키로 유지한다.
import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { supabase } from '../db/supabase.js'
import { signToken, setAuthCookie, clearAuthCookie, userIdFromReq } from '../lib/auth.js'

export const auth = Router()

const USERNAME_RE = /^[a-zA-Z0-9_]{4,20}$/ // 4~20자 영문/숫자/밑줄
const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/ // 8자 이상, 영문+숫자 포함

// 아이디 중복확인 — 회원가입 화면의 [중복확인] 버튼
auth.get('/api/auth/check-username', async (req, res) => {
  try {
    const username = String(req.query.username ?? '').trim()
    if (!USERNAME_RE.test(username)) {
      return res.json({ available: false, reason: '아이디는 4~20자의 영문·숫자·밑줄만 사용할 수 있습니다.' })
    }
    const { data, error } = await supabase.from('users').select('id').eq('username', username).maybeSingle()
    if (error) throw new Error(error.message)
    res.json({ available: !data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 회원가입 — 성공 시 자동 로그인(쿠키 발급)
auth.post('/api/auth/signup', async (req, res) => {
  try {
    const name = String(req.body?.name ?? '').trim()
    const username = String(req.body?.username ?? '').trim()
    const email = String(req.body?.email ?? '').trim() || null
    const password = String(req.body?.password ?? '')

    if (!name) return res.status(400).json({ error: '이름을 입력해 주세요.' })
    if (!USERNAME_RE.test(username)) {
      return res.status(400).json({ error: '아이디는 4~20자의 영문·숫자·밑줄만 사용할 수 있습니다.' })
    }
    if (!PASSWORD_RE.test(password)) {
      return res.status(400).json({ error: '비밀번호는 8자 이상이며 영문과 숫자를 포함해야 합니다.' })
    }

    const password_hash = await bcrypt.hash(password, 10)
    const { data, error } = await supabase
      .from('users')
      .insert({ username, password_hash, name, email })
      .select('id, username, name')
      .single()
    if (error) {
      // 23505 = Postgres unique 위반 → 가입 직전 레이스로 아이디가 선점된 경우
      if (error.code === '23505') return res.status(409).json({ error: '사용중인 아이디입니다.' })
      throw new Error(error.message)
    }

    setAuthCookie(res, signToken(data.id))
    res.status(201).json({ user: data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 로그인 — "로그인 상태 유지" 시 쿠키 만료를 연장
auth.post('/api/auth/login', async (req, res) => {
  try {
    const username = String(req.body?.username ?? '').trim()
    const password = String(req.body?.password ?? '')
    const remember = Boolean(req.body?.remember)

    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, name, password_hash')
      .eq('username', username)
      .maybeSingle()
    if (error) throw new Error(error.message)

    // 아이디 유무를 구분해 알려주지 않는다(계정 존재 여부 노출 방지)
    const ok = user && (await bcrypt.compare(password, user.password_hash))
    if (!ok) return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' })

    setAuthCookie(res, signToken(user.id, remember), remember)
    res.json({ user: { id: user.id, username: user.username, name: user.name } })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 로그아웃
auth.post('/api/auth/logout', (req, res) => {
  clearAuthCookie(res)
  res.json({ ok: true })
})

// 현재 로그인 사용자 — 앱 진입 시 세션 확인용
auth.get('/api/auth/me', async (req, res) => {
  try {
    const userId = userIdFromReq(req)
    if (!userId) return res.status(401).json({ error: '로그인이 필요합니다.' })
    const { data, error } = await supabase.from('users').select('id, username, name').eq('id', userId).maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) return res.status(401).json({ error: '로그인이 필요합니다.' })
    res.json({ user: data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})
