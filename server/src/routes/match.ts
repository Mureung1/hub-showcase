import type { OnboardingProfile, SortOption } from '@hub/shared'
import { Router } from 'express'
import { z } from 'zod'
import { match } from '../db/subsidies-repo.js'

export const matchRouter = Router()

const profileSchema = z.object({
  industry: z.string(),
  region: z.string(),
  district: z.string(),
  employees: z.string(),
  revenue: z.string(),
  creditScore: z.string().optional(),
  businessYears: z.string().optional(),
})

const matchRequestSchema = z.object({
  profile: profileSchema,
  sort: z.enum(['match', 'deadline', 'amount', 'new']).optional(),
})

/** POST /api/match — 온보딩 프로필 기준 매칭 + 정렬 결과 반환 */
matchRouter.post('/', async (req, res) => {
  const parsed = matchRequestSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid match request' })
    return
  }

  const profile: OnboardingProfile = parsed.data.profile
  const sort: SortOption = parsed.data.sort ?? 'match'
  try {
    const items = await match(profile, sort)
    res.json({ items, total: items.length, sort })
  } catch (err) {
    console.error('[POST /api/match] 실패:', err)
    res.status(500).json({ error: 'Failed to match subsidies' })
  }
})
