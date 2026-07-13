import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import checkinsRouter from './routes/checkins.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/checkins', checkinsRouter)

app.use((err, req, res, _next) => {
  const status = err.status || 500
  const message = status === 500 ? '서버에서 문제가 발생했습니다.' : err.message

  res.status(status).json({
    error: { message },
  })
})

app.listen(PORT, () => {
  console.log(`server listening on http://localhost:${PORT}`)
})
