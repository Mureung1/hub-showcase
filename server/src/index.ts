import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { schedulesRouter } from './routes/schedules.js'

const app = express()
const port = Number(process.env.PORT ?? 4000)
const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5173'

app.use(cors({ origin: corsOrigin }))
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/schedules', schedulesRouter)

app.listen(port, () => {
  console.log(`we-should-do server listening on port ${port}`)
})
