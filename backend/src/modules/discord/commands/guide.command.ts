import { EmbedBuilder, SlashCommandBuilder } from 'discord.js'
import type { ChatInputCommandInteraction } from 'discord.js'
import type { DiscordCommand } from './discord-command.types.js'

const irisEmbedColor = 0x633df4

const guideCommandData = new SlashCommandBuilder()
  .setName('guide')
  .setDescription('IRIS 사용 전 확인해야 할 권한과 개인정보 설정을 안내합니다.')

export async function executeGuideCommand(interaction: ChatInputCommandInteraction) {
  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle('IRIS 사용 안내')
        .setColor(irisEmbedColor)
        .addFields(
          {
            name: '권한 설정',
            value:
              'Bot 역할은 IRIS가 만든 역할보다 위에 있어야 합니다.\n' +
              '역할 관리 권한이 없으면 구독 역할 부여와 해제가 실패할 수 있습니다.',
          },
          {
            name: '알림 설정',
            value:
              '카테고리 알림은 서버 채널에 역할 멘션으로 전송됩니다.\n' +
              '키워드 알림은 개인 DM으로 전송됩니다.',
          },
          {
            name: '개인정보 설정',
            value:
              'Discord 개인정보 설정에서 서버 멤버의 DM을 차단하면 키워드 알림을 받을 수 없고,\n' +
              '공지를 DM으로 저장할 수 없습니다.',
          },
          {
            name: '설정 삭제',
            value:
              '공지 사이트 설정을 삭제하면 카테고리, 구독, 수집 공지 데이터가 삭제됩니다.\n' +
              '키워드는 유지되며, 서버에서 나가거나 Bot을 제거하면 함께 정리됩니다.',
          },
          {
            name: 'Bot 제거',
            value:
              'Discord 역할까지 정리하려면 Bot을 제거하기 전에 관리자 페이지에서 설정 삭제를 먼저 실행해주세요.\n' +
              'Bot을 먼저 제거하면 DB 데이터는 정리되지만 Discord 역할은 서버에 남을 수 있습니다.',
          },
        ),
    ],
    ephemeral: true,
  })
}

export const guideCommand: DiscordCommand = {
  name: 'guide',
  data: guideCommandData,
  execute: executeGuideCommand,
}
