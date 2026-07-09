import { Router } from 'express'
import { sampleSubsidies } from '../data/sample-subsidies.js'

export const subsidiesRouter = Router()

/** GET /api/subsidies — MVP: 샘플 데이터. 2주차에 DB·매칭 로직 연동 */
subsidiesRouter.get('/', (_req, res) => {
  res.json({
    items: sampleSubsidies,
    total: sampleSubsidies.length,
    sort: 'match',
  })
})

subsidiesRouter.get('/:id', (req, res) => {
  const item = sampleSubsidies.find((s) => s.id === req.params.id)
  if (!item) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  res.json(item)
})
