import express from 'express'
import cors from 'cors'
import { healthRouter } from './routes/health.routes.js'
import { gapAnalysisRouter } from './routes/gapAnalysis.routes.js'
import { bookmarksRouter } from './routes/bookmarks.routes.js'
import { errorHandler } from './middleware/errorHandler.js'

export function createApp() {
  const app = express()

  app.use(cors())
  app.use(express.json())

  app.use('/api', healthRouter)
  app.use('/api', gapAnalysisRouter)
  app.use('/api', bookmarksRouter)

  app.use(errorHandler)

  return app
}
