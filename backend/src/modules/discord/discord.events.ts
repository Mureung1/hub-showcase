import type { Client } from 'discord.js'
import { logger } from '../../shared/logger/logger.js'
import { noticeConfigService } from '../notice-config/notice-config.service.js'
import { discordCommandMap } from './commands/index.js'
import {
  executeKeywordAddModal,
  executeKeywordButton,
  executeKeywordDeleteSelect,
  keywordAddButtonCustomId,
  keywordAddModalCustomId,
  keywordDeleteCancelButtonCustomId,
  keywordDeleteConfirmButtonCustomId,
  keywordDeleteModeButtonCustomId,
  keywordDeletePageButtonPrefix,
  keywordDeleteSelectCustomId,
  keywordPageButtonPrefix,
} from './commands/keyword.command.js'
import {
  executeSubscribeCategoryButton,
  subscribeCategoryButtonPrefix,
} from './commands/subscribe.command.js'
import {
  keywordNoticeDeleteRequestButtonCustomId,
  noticeNotificationDmButtonCustomId,
  noticeNotificationSummaryButtonCustomId,
} from './discord.service.js'
import {
  executeKeywordNoticeDeleteButton,
  keywordNoticeDeleteCancelButtonCustomId,
  keywordNoticeDeleteConfirmButtonCustomId,
} from './keyword-notice-dm.interactions.js'
import { executeNoticeNotificationButton } from './notice-notification.interactions.js'

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
    if (interaction.isModalSubmit()) {
      if (interaction.customId !== keywordAddModalCustomId) {
        return
      }

      void executeKeywordAddModal(interaction).catch((error: unknown) => {
        logger.error('Failed to execute Discord modal interaction', {
          customId: interaction.customId,
          guildId: interaction.guildId,
          error: error instanceof Error ? error.message : String(error),
        })
      })

      return
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId !== keywordDeleteSelectCustomId) {
        return
      }

      void executeKeywordDeleteSelect(interaction).catch((error: unknown) => {
        logger.error('Failed to execute Discord select menu interaction', {
          customId: interaction.customId,
          guildId: interaction.guildId,
          error: error instanceof Error ? error.message : String(error),
        })
      })

      return
    }

    if (interaction.isButton()) {
      if (
        interaction.customId === keywordNoticeDeleteRequestButtonCustomId ||
        interaction.customId === keywordNoticeDeleteConfirmButtonCustomId ||
        interaction.customId === keywordNoticeDeleteCancelButtonCustomId
      ) {
        void executeKeywordNoticeDeleteButton(interaction).catch((error: unknown) => {
          logger.error('Failed to execute keyword notice DM button interaction', {
            customId: interaction.customId,
            guildId: interaction.guildId,
            error: error instanceof Error ? error.message : String(error),
          })
        })

        return
      }

      if (
        interaction.customId === noticeNotificationDmButtonCustomId ||
        interaction.customId === noticeNotificationSummaryButtonCustomId
      ) {
        void executeNoticeNotificationButton(interaction).catch((error: unknown) => {
          logger.error('Failed to execute notice notification button interaction', {
            customId: interaction.customId,
            guildId: interaction.guildId,
            error: error instanceof Error ? error.message : String(error),
          })
        })

        return
      }

      if (
        interaction.customId === keywordAddButtonCustomId ||
        interaction.customId === keywordDeleteModeButtonCustomId ||
        interaction.customId === keywordDeleteCancelButtonCustomId ||
        interaction.customId === keywordDeleteConfirmButtonCustomId ||
        interaction.customId.startsWith(keywordDeletePageButtonPrefix) ||
        interaction.customId.startsWith(keywordPageButtonPrefix)
      ) {
        void executeKeywordButton(interaction).catch((error: unknown) => {
          logger.error('Failed to execute Discord button interaction', {
            customId: interaction.customId,
            guildId: interaction.guildId,
            error: error instanceof Error ? error.message : String(error),
          })
        })

        return
      }

      if (!interaction.customId.startsWith(subscribeCategoryButtonPrefix)) {
        return
      }

      void executeSubscribeCategoryButton(interaction).catch((error: unknown) => {
        logger.error('Failed to execute Discord button interaction', {
          customId: interaction.customId,
          guildId: interaction.guildId,
          error: error instanceof Error ? error.message : String(error),
        })
      })

      return
    }

    if (!interaction.isChatInputCommand()) {
      return
    }

    const command = discordCommandMap.get(interaction.commandName)

    if (!command) {
      return
    }

    void command.execute(interaction).catch((error: unknown) => {
      logger.error('Failed to execute Discord command', {
        commandName: interaction.commandName,
        guildId: interaction.guildId,
        error: error instanceof Error ? error.message : String(error),
      })
    })
  })

  isRegistered = true
}
