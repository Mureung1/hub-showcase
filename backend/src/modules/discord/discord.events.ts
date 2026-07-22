import type { Client } from 'discord.js'
import { logger } from '../../shared/logger/logger.js'
import { noticeConfigService } from '../notice-config/notice-config.service.js'
import { executeSetupCommand } from './commands/setup.command.js'

let isRegistered = false

export function registerDiscordEvents(client: Client) {
  if (isRegistered) {
    return
  }

  client.on('guildDelete', (guild) => {
    void noticeConfigService.cleanupGuildNoticeConfig(guild.id).catch((error: unknown) => {
      logger.error('Failed to cleanup guild notice config after guildDelete', {
        guildId: guild.id,
        error: error instanceof Error ? error.message : String(error),
      })
    })
  })

  client.on('interactionCreate', (interaction) => {
    if (!interaction.isChatInputCommand()) {
      return
    }

    if (interaction.commandName !== 'setup') {
      return
    }

    void executeSetupCommand(interaction).catch((error: unknown) => {
      logger.error('Failed to execute setup command', {
        guildId: interaction.guildId,
        error: error instanceof Error ? error.message : String(error),
      })
    })
  })

  isRegistered = true
}
