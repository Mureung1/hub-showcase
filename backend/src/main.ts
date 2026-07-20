import { createApp } from './app.js'
import { env } from './config/env.js'
import { logger } from './shared/logger/logger.js'

const app = createApp()

app.listen(env.port, () => {
  logger.info(`Server is running at http://localhost:${env.port}`)
})
