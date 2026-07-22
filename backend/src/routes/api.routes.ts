import { Router } from 'express'
import { healthRouter } from './health.routes.js'
import { discordRouter } from '../modules/discord/discord.routes.js'
import { noticeConfigRouter } from '../modules/notice-config/notice-config.routes.js'

export const apiRouter = Router()

apiRouter.use(healthRouter)
apiRouter.use('/admin/:guildId/discord', discordRouter)
apiRouter.use('/admin/:guildId/notice-config', noticeConfigRouter)
