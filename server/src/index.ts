import 'dotenv/config'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import type { NextFunction, Request, Response } from 'express'
import { authRouter } from './routes/auth.js'
import { schedulesRouter } from './routes/schedules.js'
import { categoriesRouter } from './routes/categories.js'
import { friendsRouter } from './routes/friends.js'
import { groupsRouter } from './routes/groups.js'
import { usersRouter } from './routes/users.js'
import { homeRouter } from './routes/home.js'

const app = express()
const port = Number(process.env.PORT ?? 4000)
const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5173'

app.use(cors({ origin: corsOrigin, credentials: true }))
app.use(express.json())
app.use(cookieParser())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/auth', authRouter)
app.use('/api/schedules', schedulesRouter)
app.use('/api/categories', categoriesRouter)
app.use('/api/friends', friendsRouter)
app.use('/api/groups', groupsRouter)
app.use('/api/users', usersRouter)
app.use('/api/home', homeRouter)

// 라우터에서 던진 에러가 여기로 모인다 — 이게 없으면 비동기 핸들러 에러가 프로세스 전체를 죽인다.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err)
  res.status(500).json({ error: '서버 오류가 발생했습니다.' })
})

app.listen(port, () => {
  console.log(`we-should-do server listening on port ${port}`)
})
