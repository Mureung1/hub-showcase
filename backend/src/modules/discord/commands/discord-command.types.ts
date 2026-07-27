import type { ChatInputCommandInteraction } from 'discord.js'

type DiscordCommandBuilder = {
  toJSON: () => unknown
}

export type DiscordCommand = {
  name: string
  data: DiscordCommandBuilder
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>
}
