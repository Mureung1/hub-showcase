import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import { httpError } from './lib/httpError.js'
import healthRouter from './routes/health.js'
import storesRouter from './routes/stores.js'
import dealsRouter from './routes/deals.js'
import reservationsRouter from './routes/reservations.js'
import notificationsRouter from './routes/notifications.js'
import usersRouter from './routes/users.js'
import favoritesRouter from './routes/favorites.js'
import deviceTokensRouter from './routes/deviceTokens.js'

const app = express()

/*
 * CORS. 로컬은 vite proxy를 거쳐 동일 출처라 설정이 필요 없지만,
 * 배포에서는 Vercel(프론트)과 Render(서버)의 출처가 달라 명시적 허용이 필요하다.
 *
 * CORS_ORIGIN에 쉼표로 구분해 넣는다(예: https://hub.vercel.app,http://localhost:5173).
 * 미설정 시 모든 출처를 허용한다 — 로컬 개발 편의를 위한 기본값이므로 배포에서는 반드시 지정할 것.
 */
const allowedOrigins = process.env.CORS_ORIGIN?.split(',')
  .map((s) => s.trim())
  .filter(Boolean)

app.use(
  cors(
    allowedOrigins?.length
      ? {
          origin(origin, callback) {
            // 서버 간 호출·curl 등 Origin 헤더가 없는 요청은 CORS 대상이 아니다
            if (!origin || allowedOrigins.includes(origin)) return callback(null, true)
            // 서버 결함이 아니라 정책상 거부이므로 403으로 내린다(500이면 로그·원인 파악이 흐려진다)
            callback(httpError(403, `CORS 차단된 출처: ${origin}`))
          },
        }
      : undefined,
  ),
)
app.use(express.json())
app.use(morgan('dev'))

app.use('/api/health', healthRouter)
app.use('/api/stores', storesRouter)
app.use('/api/deals', dealsRouter)
app.use('/api/reservations', reservationsRouter)
app.use('/api/notifications', notificationsRouter)
app.use('/api/users', usersRouter)
app.use('/api/favorites', favoritesRouter)
app.use('/api/device-tokens', deviceTokensRouter)

// 공통 에러 응답: { message }
app.use((err, req, res, next) => {
  console.error(err)
  res.status(err.status || 500).json({ message: err.message || '서버 오류가 발생했습니다.' })
})

export default app
