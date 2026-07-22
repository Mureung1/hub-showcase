import type { SortOption } from '@hub/shared'
import { Router } from 'express'
import { z } from 'zod'
import { findAll, findById } from '../db/subsidies-repo.js'

export const subsidiesRouter = Router()

const sortSchema = z.enum(['match', 'deadline', 'amount', 'new']).catch('match')

/** GET /api/subsidies?sort= — Supabase 조회 결과를 정렬해 반환 (실패 시 샘플 fallback) */
subsidiesRouter.get('/', async (req, res) => {
  const sort: SortOption = sortSchema.parse(req.query.sort)
  try {
    const items = await findAll(sort)
    res.json({ items, total: items.length, sort })
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
