import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'

const app = express()
const PORT = process.env.PORT || 4000
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173'

// 미들웨어
app.use(morgan('dev'))
app.use(cors({ origin: CLIENT_ORIGIN }))
app.use(express.json())

// 헬스 체크
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'bridge-backend', time: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`Bridge backend running on http://localhost:${PORT}`)
})
