import { Router } from 'express'
import { validate } from '../../shared/middleware/validate.js'
import { getNoticeConfig, testCrawlNoticeConfig } from './notice-config.controller.js'
import { guildParamsSchema, testCrawlBodySchema } from './notice-config.schemas.js'

export const noticeConfigRouter = Router({ mergeParams: true })

noticeConfigRouter.get('/', validate({ params: guildParamsSchema }), getNoticeConfig)
noticeConfigRouter.post(
  '/test',
  validate({ params: guildParamsSchema, body: testCrawlBodySchema }),
  testCrawlNoticeConfig,
)
