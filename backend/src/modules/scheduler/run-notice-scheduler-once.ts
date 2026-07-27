import { runNoticeSchedulerOnce } from './notice-scheduler.js'
import { prisma } from '../../db/prisma.js'
import { discordClient } from '../discord/discord.client.js'
import { logger } from '../../shared/logger/logger.js'

runNoticeSchedulerOnce()
  .then(() => {
    logger.info('Notice scheduler run-once script completed')
  })
  .catch((error: unknown) => {
    logger.error('Notice scheduler run-once script failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    process.exitCode = 1
  })
  .finally(async () => {
    discordClient.destroy()
    await prisma.$disconnect()
  })
