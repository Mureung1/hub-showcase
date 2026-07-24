import 'dotenv/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cors from 'cors'
import checkinsRouter from './routes/checkins.js'
import { isDemoMode } from './config/runtimeMode.js'

const app = express()
const PORT = process.env.PORT || 3001
const clientDistPath = fileURLToPath(new URL('../client/dist/', import.meta.url))

app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    storage: isDemoMode() ? 'demo' : 'supabase',
  })
})

app.use('/api/checkins', checkinsRouter)

if (process.env.SERVE_CLIENT === 'true') {
  app.use(express.static(clientDistPath))

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return next()
    }

    return res.sendFile(path.join(clientDistPath, 'index.html'))
  })
}

app.use((err, req, res, _next) => {
  // multer의 파일 크기 초과 에러를 사용자용 메시지로 바꾼다
  if (err.code === 'LIMIT_FILE_SIZE') {
    err.status = 400
    err.message = '사진은 5MB 이하만 업로드할 수 있어요.'
  }

  const status = err.status || 500
  const message = status === 500 ? '서버에서 문제가 발생했습니다.' : err.message

  res.status(status).json({
    error: { message },
  })
})

app.listen(PORT, () => {
  console.log(`server listening on http://localhost:${PORT}`)
  console.log(`storage mode: ${isDemoMode() ? 'demo (in-memory)' : 'supabase'}`)
})
