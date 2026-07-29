import { EmbedBuilder, SlashCommandBuilder } from 'discord.js'
import type { ChatInputCommandInteraction } from 'discord.js'
import type { DiscordCommand } from './discord-command.types.js'

const irisEmbedColor = 0x633df4

const helpCommandData = new SlashCommandBuilder()
  .setName('help')
  .setDescription('IRIS에서 사용할 수 있는 명령어를 확인합니다.')

export async function executeHelpCommand(interaction: ChatInputCommandInteraction) {
  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle('IRIS 명령어')
        .setColor(irisEmbedColor)
        .addFields(
          {
            name: '1. `/setup`',
            value: '관리자 설정 페이지를 엽니다.',
          },
          {
            name: '2. `/subscribe`',
            value: '카테고리 구독 목록을 보고\n구독 상태를 변경합니다.',
          },
          {
            name: '3. `/keyword`',
            value: '키워드 구독 목록을 보고\n키워드를 추가하거나 삭제합니다.',
          },
          {
            name: '4. `/guide`',
            value: '권한, 알림, 개인정보 설정 안내를 확인합니다.',
          },
        ),
    ],
    ephemeral: true,
  })
}

export const helpCommand: DiscordCommand = {
  name: 'help',
  data: helpCommandData,
  execute: executeHelpCommand,
}
