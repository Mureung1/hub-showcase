import { ChannelType, PermissionFlagsBits } from 'discord.js'
import { AppError } from '../../shared/errors/app-error.js'
import { loginDiscordBot } from './discord.client.js'

const irisRolePrefix = 'IRIS-'
const discordMissingPermissionsCode = 50013
const discordUnknownRoleCode = 10011

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

  async createOrReuseRole(guildId: string, roleName: string) {
    const guild = await this.fetchGuild(guildId)
    const normalizedRoleName = roleName.trim()
    const roles = await guild.roles.fetch()
    const existingRole = roles.find((role) => role.name === normalizedRoleName)

    if (existingRole) {
      return {
        roleId: existingRole.id,
        roleName: existingRole.name,
        created: false,
      }
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
      created: true,
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
    const role = await guild.roles.fetch(roleId)

    if (!role) {
      throw new AppError(404, 'Discord role not found')
    }

    const updatedRole = await role
      .setName(roleName.trim(), 'IRIS notice category role rename')
      .catch((error: unknown) => throwDiscordRoleError(error))

    return {
      roleId: updatedRole.id,
      roleName: updatedRole.name,
    }
  }
}

export const discordService = new DiscordService()
