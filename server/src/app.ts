import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import { env } from './lib/env.js'

export const app = express()

app.use(cors({ origin: env.CORS_ORIGIN }))
app.use(morgan('dev'))
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})
