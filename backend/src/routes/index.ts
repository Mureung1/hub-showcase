import { Router } from 'express'
import { searchItemsHandler } from '../controllers/itemController'

export const router = Router()

router.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

router.get('/items/search', searchItemsHandler)
