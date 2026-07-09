import 'dotenv/config'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import { sessionMiddleware } from './middleware/session.js'
import { profileRouter } from './routes/profile.js'
import { progressRouter } from './routes/progress.js'

const app = express()
const port = process.env.PORT ?? 4000

app.use(cors({ origin: 'http://localhost:5173', credentials: true }))
app.use(express.json())
app.use(cookieParser())
app.use(sessionMiddleware)

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.use('/api/profile', profileRouter)
app.use('/api/progress', progressRouter)

app.listen(port, () => {
  console.log(`server listening on http://localhost:${port}`)
})
