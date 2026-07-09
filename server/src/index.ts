import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { healthRouter } from './routes/health.js'
import { subsidiesRouter } from './routes/subsidies.js'

const app = express()
const PORT = Number(process.env.PORT) || 3001

app.use(helmet())
app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173' }))
app.use(express.json())

app.use('/api/health', healthRouter)
app.use('/api/subsidies', subsidiesRouter)

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`)
})
