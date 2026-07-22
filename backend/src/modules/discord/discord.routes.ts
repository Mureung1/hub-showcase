import { Router } from 'express'
import { guildParamsSchema } from '../notice-config/notice-config.schemas.js'
import { validate } from '../../shared/middleware/validate.js'
import { getDiscordChannels } from './discord.controller.js'

export const discordRouter = Router({ mergeParams: true })

discordRouter.get('/channels', validate({ params: guildParamsSchema }), getDiscordChannels)
