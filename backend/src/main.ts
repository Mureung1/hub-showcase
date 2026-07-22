import { createApp } from './app.js'
import { env } from './config/env.js'
import { loginDiscordBot } from './modules/discord/discord.client.js'
import { logger } from './shared/logger/logger.js'

const app = createApp()

app.listen(env.port, () => {
  logger.info(`Server is running at http://localhost:${env.port}`)
})

if (env.discordBotToken) {
  void loginDiscordBot()
    .then((client) => {
      logger.info('Discord bot logged in', {
        user: client.user?.tag,
      })
    })
    .catch((error: unknown) => {
      logger.error('Failed to login Discord bot', {
        error: error instanceof Error ? error.message : String(error),
      })
    })
}
