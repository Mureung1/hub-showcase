import type { RequestHandler } from 'express'
import { ok } from '../../shared/http/api-response.js'
import { noticeConfigService } from './notice-config.service.js'
import type {
  GuildParams,
  SaveNoticeConfigBody,
  TestCrawlBody,
} from './notice-config.schemas.js'

export const deleteNoticeConfig: RequestHandler<GuildParams> = async (request, response, next) => {
  try {
    const result = await noticeConfigService.deleteNoticeConfig(request.params.guildId)

    response.status(200).json(ok(result))
  } catch (error) {
    next(error)
  }
}

export const getNoticeConfig: RequestHandler<GuildParams> = async (request, response, next) => {
  try {
    const noticeConfig = await noticeConfigService.getNoticeConfig(request.params.guildId)

    response.status(200).json(ok(noticeConfig))
  } catch (error) {
    next(error)
  }
}

export const testCrawlNoticeConfig: RequestHandler<GuildParams, unknown, TestCrawlBody> = async (
  request,
  response,
  next,
) => {
  try {
    const result = await noticeConfigService.testCrawlNoticeConfig(request.params.guildId, request.body)

    response.status(200).json(ok(result))
  } catch (error) {
    next(error)
  }
}

export const saveNoticeConfig: RequestHandler<GuildParams, unknown, SaveNoticeConfigBody> = async (
  request,
  response,
  next,
) => {
  try {
    const result = await noticeConfigService.saveNoticeConfig(request.params.guildId, request.body)

    response.status(201).json(ok(result))
  } catch (error) {
    next(error)
  }
}
