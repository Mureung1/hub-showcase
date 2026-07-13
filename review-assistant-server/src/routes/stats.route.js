import { Router } from 'express'
import { summary, monthly } from '../controllers/stats.controller.js'

export const statsRouter = Router()

statsRouter.get('/summary', summary)
statsRouter.get('/monthly', monthly)
