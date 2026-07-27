import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder, PermissionFlagsBits } from 'discord.js'
import { AppError } from '../../shared/errors/app-error.js'
import { loginDiscordBot } from './discord.client.js'

const irisRolePrefix = 'IRIS-'
const irisRoleColor = 0x633df4
const discordMissingPermissionsCode = 50013
const discordUnknownRoleCode = 10011

export const keywordNoticeDeleteRequestButtonCustomId = 'keyword-notice:delete-request'
export const noticeNotificationDmButtonCustomId = 'notice-notification:dm'
export const noticeNotificationSummaryButtonCustomId = 'notice-notification:summary'

type SendNoticeNotificationInput = {
  guildId: string
  channelId: string
  roleIds: string[]
  title: string
  link: string
  date: Date
  categoryName: string
}

type SendKeywordNoticeDmInput = {
  userId: string
  title: string
  link: string
  date: Date
  siteName: string
  categoryName: string
  matchedKeywords: string[]
}

export function getDefaultIrisRoleName(categoryName: string) {
  const trimmedCategoryName = categoryName.trim()

  return trimmedCategoryName.startsWith(irisRolePrefix)
    ? trimmedCategoryName
    : `${irisRolePrefix}${trimmedCategoryName}`
}

function getDiscordErrorCode(error: unknown) {
  if (!error || typeof error !== 'object' || !('code' in error)) {
    return undefined
  }

  const code = (error as { code: unknown }).code

  return typeof code === 'number' ? code : undefined
}

function throwDiscordRoleError(error: unknown): never {
  if (getDiscordErrorCode(error) === discordMissingPermissionsCode) {
    throw new AppError(400, 'Discord bot cannot manage roles')
  }

  throw error
}

function isUnknownRoleError(error: unknown) {
  return getDiscordErrorCode(error) === discordUnknownRoleCode
}

export class DiscordService {
  private async fetchGuild(guildId: string) {
    const client = await loginDiscordBot()
    const guild = await client.guilds.fetch(guildId).catch(() => null)

    if (!guild) {
      throw new AppError(404, 'Discord guild not found')
    }

    return guild
  }

  async getTextChannels(guildId: string) {
    const guild = await this.fetchGuild(guildId)
    const channels = await guild.channels.fetch()
    const botMember = guild.members.me

    if (!botMember) {
      throw new AppError(404, 'Discord bot member not found')
    }

    return {
      channels: Array.from(channels.values())
        .flatMap((channel) => {
          if (!channel || channel.type !== ChannelType.GuildText) {
            return []
          }

          if (!channel.permissionsFor(botMember).has(PermissionFlagsBits.SendMessages)) {
            return []
          }

          return [
            {
              id: channel.id,
              name: channel.name,
            },
          ]
        }),
    }
  }

  async validateTextChannel(guildId: string, channelId: string) {
    const guild = await this.fetchGuild(guildId)
    const channel = await guild.channels.fetch(channelId).catch(() => null)
    const botMember = guild.members.me

    if (!botMember) {
      throw new AppError(404, 'Discord bot member not found')
    }

    if (!channel || channel.type !== ChannelType.GuildText) {
      throw new AppError(400, 'Invalid Discord channel')
    }

    if (!channel.permissionsFor(botMember).has(PermissionFlagsBits.SendMessages)) {
      throw new AppError(400, 'Discord bot cannot send messages to channel')
    }
  }

  async createRole(guildId: string, roleName: string) {
    const guild = await this.fetchGuild(guildId)
    const normalizedRoleName = roleName.trim()
    const roles = await guild.roles.fetch()
    const existingRole = roles.find((role) => role.name === normalizedRoleName)

    if (existingRole) {
      throw new AppError(400, `이미 Discord 서버에 있는 역할 이름입니다: ${normalizedRoleName}`)
    }

    const createdRole = await guild.roles
      .create({
        name: normalizedRoleName,
        reason: 'IRIS notice category role',
      })
      .catch((error: unknown) => throwDiscordRoleError(error))

    return {
      roleId: createdRole.id,
      roleName: createdRole.name,
    }
  }

  async deleteRole(guildId: string, roleId: string) {
    const guild = await this.fetchGuild(guildId)
    await guild.roles.delete(roleId, 'IRIS notice config rollback').catch((error: unknown) => {
      if (isUnknownRoleError(error)) {
        return
      }

      throwDiscordRoleError(error)
    })
  }

  async updateRoleName(guildId: string, roleId: string, roleName: string) {
    const guild = await this.fetchGuild(guildId)
    const normalizedRoleName = roleName.trim()
    const roles = await guild.roles.fetch()
    const existingRole = roles.find((role) => role.name === normalizedRoleName && role.id !== roleId)

    if (existingRole) {
      throw new AppError(400, `이미 Discord 서버에 있는 역할 이름입니다: ${normalizedRoleName}`)
    }

    const role = await guild.roles.fetch(roleId)

    if (!role) {
      throw new AppError(404, 'Discord role not found')
    }

    const updatedRole = await role
      .setName(normalizedRoleName, 'IRIS notice category role rename')
      .catch((error: unknown) => throwDiscordRoleError(error))

    return {
      roleId: updatedRole.id,
      roleName: updatedRole.name,
    }
  }

  async addMemberRole(guildId: string, userId: string, roleId: string) {
    const guild = await this.fetchGuild(guildId)
    const member = await guild.members.fetch(userId)

    await member.roles.add(roleId, 'IRIS notice category subscription').catch((error: unknown) => {
      throwDiscordRoleError(error)
    })
  }

  async removeMemberRole(guildId: string, userId: string, roleId: string) {
    const guild = await this.fetchGuild(guildId)
    const member = await guild.members.fetch(userId)

    await member.roles.remove(roleId, 'IRIS notice category subscription update').catch((error: unknown) => {
      throwDiscordRoleError(error)
    })
  }

  async sendNoticeNotification(input: SendNoticeNotificationInput) {
    const guild = await this.fetchGuild(input.guildId)
    const channel = await guild.channels.fetch(input.channelId).catch(() => null)

    if (!channel || channel.type !== ChannelType.GuildText) {
      throw new AppError(400, 'Invalid Discord notification channel')
    }

    await channel.send({
      content: input.roleIds.map((roleId) => `<@&${roleId}>`).join(' '),
      embeds: [
        new EmbedBuilder()
          .setColor(irisRoleColor)
          .setTitle(input.title)
          .setURL(input.link)
          .addFields(
            {
              name: '카테고리',
              value: input.categoryName,
              inline: true,
            },
            {
              name: '공지일',
              value: input.date.toISOString().slice(0, 10),
              inline: true,
            },
          ),
      ],
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(noticeNotificationDmButtonCustomId)
            .setLabel('DM으로 저장')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(noticeNotificationSummaryButtonCustomId)
            .setLabel('요약 보기')
            .setStyle(ButtonStyle.Primary),
        ),
      ],
      allowedMentions: {
        roles: input.roleIds,
      },
    })
  }

  async sendKeywordNoticeDm(input: SendKeywordNoticeDmInput) {
    const client = await loginDiscordBot()
    const user = await client.users.fetch(input.userId)

    await user.send({
      embeds: [
        new EmbedBuilder()
          .setColor(irisRoleColor)
          .setTitle(input.title)
          .setURL(input.link)
          .setDescription(`매칭된 키워드: ${input.matchedKeywords.join(', ')}`)
          .addFields(
            {
              name: '사이트',
              value: input.siteName,
              inline: true,
            },
            {
              name: '카테고리',
              value: input.categoryName,
              inline: true,
            },
            {
              name: '공지일',
              value: input.date.toISOString().slice(0, 10),
              inline: true,
            },
          ),
      ],
      components: [buildNoticeDmActionRow()],
    })
  }
}

export const discordService = new DiscordService()

function buildNoticeDmActionRow() {
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
