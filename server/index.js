import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import requestsRouter from './routes/requests.js'

const app = express()
const port = process.env.PORT || 4000

const allowedOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(',').map((origin) => origin.trim())
  : true

app.use(cors({ origin: allowedOrigins }))
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/requests', requestsRouter)

app.listen(port, () => {
  console.log(`서버 실행 중: http://localhost:${port}`)
})
