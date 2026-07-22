import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js'
import type { ChatInputCommandInteraction } from 'discord.js'
import { env } from '../../../config/env.js'

export const setupCommand = new SlashCommandBuilder()
  .setName('setup')
  .setDescription('IRIS 관리자 설정 페이지 링크를 확인합니다.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

export async function executeSetupCommand(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild() || !interaction.guildId) {
    await interaction.reply({
      content: 'Discord 서버 안에서만 사용할 수 있습니다.',
      ephemeral: true,
    })
    return
  }

  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({
      content: '서버 관리자만 사용할 수 있습니다.',
      ephemeral: true,
    })
    return
  }

  const adminUrl = new URL(`/admin/${interaction.guildId}`, env.adminWebUrl)

  await interaction.reply({
    content: `IRIS 관리자 설정 페이지: ${adminUrl.toString()}`,
    ephemeral: true,
  })
}
