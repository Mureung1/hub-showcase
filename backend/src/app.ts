import express from 'express'
import { apiRouter } from './routes/api.routes.js'
import { corsHandler } from './shared/middleware/cors.js'
import { errorHandler } from './shared/middleware/error-handler.js'
import { notFoundHandler } from './shared/middleware/not-found-handler.js'

export function createApp() {
  const app = express()

  app.use(corsHandler)
  app.use(express.json())
  app.use('/api', apiRouter)
  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
