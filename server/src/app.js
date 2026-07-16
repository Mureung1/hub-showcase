import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import healthRouter from './routes/health.js'
import storesRouter from './routes/stores.js'

const app = express()

app.use(cors())
app.use(express.json())
app.use(morgan('dev'))

app.use('/api/health', healthRouter)
app.use('/api/stores', storesRouter)

// 공통 에러 응답: { message }
app.use((err, req, res, next) => {
  console.error(err)
  res.status(err.status || 500).json({ message: err.message || '서버 오류가 발생했습니다.' })
})

export default app
