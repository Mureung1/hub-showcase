import express from 'express'
import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'
import authRoutes from './routes/auth.js'
import profileRoutes from './routes/profile.js'
import postingsRoutes from './routes/postings.js'

dotenv.config()

const app = express()
const prisma = new PrismaClient()
const PORT = process.env.PORT || 3000

// CORS 미들웨어
app.use((req, res, next) => {
  const origin = req.headers.origin || '*'
  res.header('Access-Control-Allow-Origin', origin)
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.header('Access-Control-Max-Age', '3600')

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200)
  }
  next()
})

// 미들웨어
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 라우트
app.use('/api/auth', authRoutes)
app.use('/api/profile', profileRoutes)
app.use('/api/postings', postingsRoutes)

// 헬스 체크
app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

// 서버 시작
const server = app.listen(PORT, () => {
  console.log(`\n🚀 서버 시작: http://localhost:${PORT}`)
  console.log(`📝 프로필 API: POST http://localhost:${PORT}/api/profile`)
  console.log(`🔐 인증: Supabase JWT 기반\n`)
})

// 종료 처리
process.on('SIGINT', async () => {
  console.log('\n✋ 서버 종료 중...')
  server.close()
  await prisma.$disconnect()
  process.exit(0)
})
