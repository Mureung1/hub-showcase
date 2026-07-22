import type { RequestHandler } from 'express'
import { ok } from '../../shared/http/api-response.js'
import type { GuildParams } from '../notice-config/notice-config.schemas.js'
import { discordService } from './discord.service.js'

export const getDiscordChannels: RequestHandler<GuildParams> = async (request, response, next) => {
  try {
    const result = await discordService.getTextChannels(request.params.guildId)

    response.status(200).json(ok(result))
  } catch (error) {
    next(error)
  }
}
