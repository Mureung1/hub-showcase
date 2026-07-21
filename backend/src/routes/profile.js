import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/requireAuth.js'

const router = Router()

function unwrap({ data, error }) {
  if (error) {
    const e = new Error(error.message)
    e.status = 500
    throw e
  }
  return data
}

function toApiProfile(row) {
  return {
    id: row.id,
    nickname: row.nickname ?? null,
    isBeginner: row.is_beginner ?? false,
    onboardedAt: row.onboarded_at ?? null,
  }
}

// GET /api/profile — 내 프로필(없으면 기본값으로 생성해서 반환).
router.get('/', requireAuth, async (req, res) => {
  const rows = unwrap(await supabase.from('profiles').select('*').eq('id', req.user.id).limit(1))
  if (rows.length > 0) return res.json(toApiProfile(rows[0]))

  const created = unwrap(
    await supabase
      .from('profiles')
      .insert({ id: req.user.id, nickname: req.user.email?.split('@')[0] ?? null })
      .select(),
  )
  res.json(toApiProfile(created[0]))
})

// PATCH /api/profile — 닉네임 / 초심자 여부 / 튜토리얼 완료 시각 갱신(upsert).
router.patch('/', requireAuth, async (req, res) => {
  const patch = { id: req.user.id }
  if (req.body.nickname !== undefined) patch.nickname = req.body.nickname
  if (req.body.isBeginner !== undefined) patch.is_beginner = req.body.isBeginner
  if (req.body.onboardedAt !== undefined) patch.onboarded_at = req.body.onboardedAt

  const rows = unwrap(await supabase.from('profiles').upsert(patch).select())
  res.json(toApiProfile(rows[0]))
})

export default router
