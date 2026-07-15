import { Router } from 'express'
import { getItemDisposalRuleHandler, searchItemsHandler } from '../controllers/itemController'

export const router = Router()

router.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

router.get('/items/search', searchItemsHandler)
router.get('/items/:id/disposal-rule', getItemDisposalRuleHandler)
