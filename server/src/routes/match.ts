import type { OnboardingProfile, SortOption } from '@hub/shared'
import { Router } from 'express'
import { z } from 'zod'
import { insertMatchRequest } from '../db/match-requests-repo.js'
import { DEFAULT_LIMIT, DEFAULT_PAGE, match } from '../db/subsidies-repo.js'

export const matchRouter = Router()

const profileSchema = z.object({
  supportRealm: z.array(z.string()).min(1),
  region: z.string(),
  district: z.string(),
  employees: z.string(),
  revenue: z.string(),
  creditScore: z.string().optional(),
  businessYears: z.string().optional(),
})

/** page/limit은 이슈 #48 페이지네이션 — 없으면 기본값(1페이지/20건)으로 동작 */
const matchRequestSchema = z.object({
  profile: profileSchema,
  sort: z.enum(['match', 'deadline', 'amount', 'new']).optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
})

/** POST /api/match — 온보딩 프로필 기준 매칭 + 정렬 + 페이지네이션 결과 반환 */
matchRouter.post('/', async (req, res) => {
  const parsed = matchRequestSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid match request' })
    return
  }

  const profile: OnboardingProfile = parsed.data.profile
  const sort: SortOption = parsed.data.sort ?? 'match'
  const page = parsed.data.page ?? DEFAULT_PAGE
  const limit = parsed.data.limit ?? DEFAULT_LIMIT
  const requestStartedAt = performance.now()
  try {
    const { items, total, hasMore } = await match(profile, sort, page, limit)

    res.json({ items, total, sort, page, limit, hasMore })
    console.log(`[timing] POST /api/match: full handler took ${(performance.now() - requestStartedAt).toFixed(1)}ms`)

    // 매칭 요청 저장은 best-effort이자 응답과 무관하므로 await하지 않고 백그라운드로 흘려보낸다
    // (이슈 #107 — 응답 전에 await하면 insert 지연이 그대로 사용자 체감 지연이 됨).
    const insertStartedAt = performance.now()
    insertMatchRequest(profile, sort)
      .catch((err) => {
        console.error('[POST /api/match] 매칭 요청 저장 실패:', err)
      })
      .finally(() => {
        console.log(`[timing] POST /api/match: insertMatchRequest (background) took ${(performance.now() - insertStartedAt).toFixed(1)}ms`)
      })
  } catch (err) {
    console.error('[POST /api/match] 실패:', err)
    res.status(500).json({ error: 'Failed to match subsidies' })
  }
})
