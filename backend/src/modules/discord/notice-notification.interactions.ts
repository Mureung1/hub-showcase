import { EmbedBuilder } from 'discord.js'
import type { APIEmbed, ButtonInteraction } from 'discord.js'
import {
  noticeNotificationDmButtonCustomId,
  noticeNotificationSummaryButtonCustomId,
} from './discord.service.js'
import { buildKeywordNoticeDeleteRequestRow } from './keyword-notice-dm.interactions.js'

export async function executeNoticeNotificationButton(interaction: ButtonInteraction) {
  if (interaction.customId === noticeNotificationSummaryButtonCustomId) {
    await interaction.reply({
      content: '요약 기능은 준비 중입니다.',
      ephemeral: true,
    })
    return
  }

  if (interaction.customId !== noticeNotificationDmButtonCustomId) {
    return
  }

  const [noticeEmbed] = interaction.message.embeds

  if (!noticeEmbed) {
    await interaction.reply({
      content: 'DM으로 보낼 공지 정보를 찾을 수 없습니다.',
      ephemeral: true,
    })
    return
  }

  await interaction.user.send({
    embeds: [new EmbedBuilder(noticeEmbed.toJSON() as APIEmbed)],
    components: [buildKeywordNoticeDeleteRequestRow()],
  }).catch(async () => {
    await interaction.reply({
      content: '개인 DM을 보낼 수 없습니다. Discord 개인정보 설정을 확인해주세요.',
      ephemeral: true,
    })
  })

  if (interaction.replied) {
    return
  }

  await interaction.reply({
    content: 'DM으로 저장했습니다.',
    ephemeral: true,
  })
}
