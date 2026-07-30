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

  let result: Awaited<ReturnType<typeof match>>
  try {
    result = await match(profile, sort, page, limit)
  } catch (err) {
    console.error('[POST /api/match] 실패:', err)
    res.status(500).json({ error: 'Failed to match subsidies' })
    return
  }

  // 응답을 보낸 뒤에는(아래) 어떤 이유로도 다시 res를 건드리지 않는다 — 위 try/catch 밖에
  // 둬서, 여기서 뭔가 실패해도 이미 보낸 200 응답 위에 500을 또 보내려 하지 않도록 한다
  // (이슈 #118 — 예전엔 이 블록이 위 try 안에 있어서, insertMatchRequest 호출부 예외가
  // res.json() 이후에 잡혀도 catch가 res.status(500)을 또 호출하는 이중 응답 버그가 있었다).
  const { items, total, hasMore } = result
  res.json({ items, total, sort, page, limit, hasMore })
  console.log(`[timing] POST /api/match: full handler took ${(performance.now() - requestStartedAt).toFixed(1)}ms`)

  // 매칭 요청 저장은 best-effort이자 응답과 무관하므로 await하지 않고 백그라운드로 흘려보낸다
  // (이슈 #107 — 응답 전에 await하면 insert 지연이 그대로 사용자 체감 지연이 됨).
  // Promise.resolve로 감싸서 insertMatchRequest가 항상 진짜 Promise를 반환한다고 가정하지
  // 않는다 (이슈 #118 — 테스트 mock처럼 Promise가 아닌 값을 반환해도 안전하게 처리).
  const insertStartedAt = performance.now()
  Promise.resolve(insertMatchRequest(profile, sort))
    .catch((err) => {
      console.error('[POST /api/match] 매칭 요청 저장 실패:', err)
    })
    .finally(() => {
      console.log(`[timing] POST /api/match: insertMatchRequest (background) took ${(performance.now() - insertStartedAt).toFixed(1)}ms`)
    })
})
