import 'dotenv/config'

const defaultPort = 3000

function parsePort(value: string | undefined) {
  if (!value) {
    return defaultPort
  }

  const port = Number(value)

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('PORT must be a positive integer')
  }

  return port
}

function readOptionalString(value: string | undefined) {
  const normalizedValue = value?.trim()

  return normalizedValue ? normalizedValue : undefined
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parsePort(process.env.PORT),
  discordBotToken: readOptionalString(process.env.DISCORD_BOT_TOKEN),
  discordClientId: readOptionalString(process.env.DISCORD_CLIENT_ID),
  discordDevGuildId: readOptionalString(process.env.DISCORD_DEV_GUILD_ID),
  adminWebUrl: readOptionalString(process.env.ADMIN_WEB_URL) ?? 'http://localhost:5173',
}
