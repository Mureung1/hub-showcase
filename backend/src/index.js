import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import { lettersRouter } from './routes/letters.js'
import { matchesRouter } from './routes/matches.js'
import { adminRouter } from './routes/admin.js'
import { errorHandler } from './middleware/errorHandler.js'

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

app.use('/api/letters', lettersRouter)
app.use('/api/matches', matchesRouter)
app.use('/api/admin', adminRouter)

// 에러 핸들러는 항상 라우터들보다 뒤에 등록한다.
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Bridge backend running on http://localhost:${PORT}`)
})
