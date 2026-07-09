import express from 'express'
import cors from 'cors'
import { reviewsRouter } from './routes/reviews.route.js'
import { sessionId } from './middleware/sessionId.js'
import { errorHandler } from './middleware/errorHandler.js'

export function createApp() {
  const app = express()

  app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }))
  app.use(express.json())
  app.use(sessionId)

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' })
  })

  app.use('/api/v1/reviews', reviewsRouter)

  app.use(errorHandler)

  return app
}
