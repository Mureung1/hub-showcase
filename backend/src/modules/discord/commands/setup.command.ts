import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js'
import type { ChatInputCommandInteraction } from 'discord.js'
import { env } from '../../../config/env.js'
import type { DiscordCommand } from './discord-command.types.js'

const irisEmbedColor = 0x633df4

const setupCommandData = new SlashCommandBuilder()
  .setName('setup')
  .setDescription('IRIS 관리자 설정 페이지 링크를 확인합니다.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

export async function executeSetupCommand(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild() || !interaction.guildId) {
    await interaction.reply({
      content: '이 명령어는 Discord 서버 안에서만 사용할 수 있습니다.',
      ephemeral: true,
    })
    return
  }

  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({
      content: 'IRIS 관리자 설정은 서버 관리자만 열 수 있습니다.',
      ephemeral: true,
    })
    return
  }

  const adminUrl = new URL(`/admin/${interaction.guildId}`, env.adminWebUrl)

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle('IRIS 관리자 설정')
        .setDescription('관리자 페이지에서 공지 사이트와 알림 설정을 관리할 수 있습니다.')
        .setColor(irisEmbedColor),
    ],
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel('바로가기')
          .setStyle(ButtonStyle.Link)
          .setURL(adminUrl.toString()),
      ),
    ],
    ephemeral: true,
  })
}

export const setupCommand: DiscordCommand = {
  name: 'setup',
  data: setupCommandData,
  execute: executeSetupCommand,
}
