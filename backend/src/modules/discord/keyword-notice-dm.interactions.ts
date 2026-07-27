import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js'
import type { ButtonInteraction } from 'discord.js'
import {
  keywordNoticeDeleteRequestButtonCustomId,
  noticeNotificationSummaryButtonCustomId,
} from './discord.service.js'

export const keywordNoticeDeleteConfirmButtonCustomId = 'keyword-notice:delete-confirm'
export const keywordNoticeDeleteCancelButtonCustomId = 'keyword-notice:delete-cancel'

export async function executeKeywordNoticeDeleteButton(interaction: ButtonInteraction) {
  if (interaction.customId === keywordNoticeDeleteRequestButtonCustomId) {
    await interaction.update({
      components: [buildKeywordNoticeDeleteConfirmRow()],
    })
    return
  }

  if (interaction.customId === keywordNoticeDeleteCancelButtonCustomId) {
    await interaction.update({
      components: [buildKeywordNoticeDeleteRequestRow()],
    })
    return
  }

  if (interaction.customId === keywordNoticeDeleteConfirmButtonCustomId) {
    await interaction.message.delete()
  }
}

export function buildKeywordNoticeDeleteRequestRow() {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(noticeNotificationSummaryButtonCustomId)
      .setLabel('요약 보기')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(keywordNoticeDeleteRequestButtonCustomId)
      .setLabel('알림 삭제')
      .setStyle(ButtonStyle.Danger),
  )
}

function buildKeywordNoticeDeleteConfirmRow() {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(keywordNoticeDeleteConfirmButtonCustomId)
      .setLabel('정말 삭제')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(keywordNoticeDeleteCancelButtonCustomId)
      .setLabel('취소')
      .setStyle(ButtonStyle.Secondary),
  )
}
