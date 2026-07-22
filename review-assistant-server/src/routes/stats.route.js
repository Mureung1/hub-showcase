import { Router } from 'express'
import { summary, monthly, insight } from '../controllers/stats.controller.js'
import { asyncHandler } from '../middleware/asyncHandler.js'

export const statsRouter = Router()

statsRouter.get('/summary', asyncHandler(summary))
statsRouter.get('/monthly', asyncHandler(monthly))
statsRouter.get('/insight', asyncHandler(insight))
