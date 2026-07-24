import type { SortOption } from '@hub/shared'
import { Router } from 'express'
import { z } from 'zod'
import { DEFAULT_LIMIT, DEFAULT_PAGE, findAll, findById } from '../db/subsidies-repo.js'

export const subsidiesRouter = Router()

const sortSchema = z.enum(['match', 'deadline', 'amount', 'new']).catch('match')
/** 잘못되거나 없는 값은 기본값으로 대체 — 페이지네이션(#48)이 없던 기존 호출부도 그대로 동작 */
const pageSchema = z.coerce.number().int().min(1).catch(DEFAULT_PAGE)
const limitSchema = z.coerce.number().int().min(1).max(100).catch(DEFAULT_LIMIT)

/** GET /api/subsidies?sort=&page=&limit= — Supabase 조회 결과를 정렬·페이지네이션해 반환 (실패 시 샘플 fallback) */
subsidiesRouter.get('/', async (req, res) => {
  const sort: SortOption = sortSchema.parse(req.query.sort)
  const page = pageSchema.parse(req.query.page)
  const limit = limitSchema.parse(req.query.limit)
  try {
    const { items, total, hasMore } = await findAll(sort, page, limit)
    res.json({ items, total, sort, page, limit, hasMore })
  } catch (err) {
    console.error('[GET /api/subsidies] 실패:', err)
    res.status(500).json({ error: 'Failed to load subsidies' })
  }
})

/** GET /api/subsidies/:id — 단건 조회, 없으면 404 */
subsidiesRouter.get('/:id', async (req, res) => {
  try {
    const item = await findById(req.params.id)
    if (!item) {
      res.status(404).json({ error: 'Not found' })
      return
    }
    res.json(item)
  } catch (err) {
    console.error('[GET /api/subsidies/:id] 실패:', err)
    res.status(500).json({ error: 'Failed to load subsidy' })
  }
})
