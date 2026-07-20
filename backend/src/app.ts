import express from 'express'
import { apiRouter } from './routes/api.routes.js'
import { errorHandler } from './shared/middleware/error-handler.js'
import { notFoundHandler } from './shared/middleware/not-found-handler.js'

export function createApp() {
  const app = express()

  app.use(express.json())
  app.use('/api', apiRouter)
  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
