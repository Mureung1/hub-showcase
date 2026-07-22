import { Client, GatewayIntentBits } from 'discord.js'
import { env } from '../../config/env.js'
import { registerDiscordEvents } from './discord.events.js'

export const discordClient = new Client({
  intents: [GatewayIntentBits.Guilds],
})

registerDiscordEvents(discordClient)

export async function loginDiscordBot() {
  if (!env.discordBotToken) {
    throw new Error('DISCORD_BOT_TOKEN is required')
  }

  if (discordClient.isReady()) {
    return discordClient
  }

  await discordClient.login(env.discordBotToken)

  return discordClient
}
