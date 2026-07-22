import { Router } from 'express'
import { validate } from '../../shared/middleware/validate.js'
import {
  deleteNoticeConfig,
  getNoticeConfig,
  replaceNoticeConfig,
  saveNoticeConfig,
  testCrawlNoticeConfig,
  updateNoticeCategories,
} from './notice-config.controller.js'
import {
  guildParamsSchema,
  saveNoticeConfigBodySchema,
  testCrawlBodySchema,
  updateNoticeCategoriesBodySchema,
} from './notice-config.schemas.js'

export const noticeConfigRouter = Router({ mergeParams: true })

noticeConfigRouter.delete('/', validate({ params: guildParamsSchema }), deleteNoticeConfig)
noticeConfigRouter.get('/', validate({ params: guildParamsSchema }), getNoticeConfig)
noticeConfigRouter.post(
  '/test',
  validate({ params: guildParamsSchema, body: testCrawlBodySchema }),
  testCrawlNoticeConfig,
)
noticeConfigRouter.post(
  '/',
  validate({ params: guildParamsSchema, body: saveNoticeConfigBodySchema }),
  saveNoticeConfig,
)
noticeConfigRouter.put(
  '/',
  validate({ params: guildParamsSchema, body: saveNoticeConfigBodySchema }),
  replaceNoticeConfig,
)
noticeConfigRouter.patch(
  '/categories',
  validate({ params: guildParamsSchema, body: updateNoticeCategoriesBodySchema }),
  updateNoticeCategories,
)
