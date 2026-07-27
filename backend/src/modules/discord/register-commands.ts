import { REST, Routes } from 'discord.js'
import { env } from '../../config/env.js'
import { discordCommands } from './commands/index.js'

if (!env.discordBotToken) {
  throw new Error('DISCORD_BOT_TOKEN is required')
}

if (!env.discordClientId) {
  throw new Error('DISCORD_CLIENT_ID is required')
}

const rest = new REST({ version: '10' }).setToken(env.discordBotToken)
const commands = discordCommands.map((command) => command.data.toJSON())
const mode = process.argv[2]

if (mode === 'dev') {
  if (!env.discordDevGuildId) {
    throw new Error('DISCORD_DEV_GUILD_ID is required')
  }

  await rest.put(Routes.applicationGuildCommands(env.discordClientId, env.discordDevGuildId), {
    body: commands,
  })

  console.log(`Registered Discord commands for guild ${env.discordDevGuildId}`)
} else if (mode === 'global') {
  await rest.put(Routes.applicationCommands(env.discordClientId), {
    body: commands,
  })

  console.log('Registered global Discord commands')
} else {
  throw new Error('Command register mode must be "dev" or "global"')
}
