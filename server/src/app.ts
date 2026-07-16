import express from 'express'
import cors from 'cors'
import morgan from 'morgan' // study: 방문 기록장
import { env } from './lib/env.js'
import { appointmentsRouter } from './routes/appointments.js'
import { participantsRouter } from './routes/participants.js'

export const app = express() // study: 서버 열기

// study: 필수 검문소 3가지.
app.use(cors({ origin: env.CORS_ORIGIN })) // study: CORS_ORIGIN 에서만 받기.
app.use(morgan('dev')) // study: 콘솔에 방문 기록(요청)을 남김.
app.use(express.json())

// study: health = 서버 살아있나 확인하는 용도로 업계에서 흔히 쓰는 이름.
// study: req = 요청 정보가 들어있음(health는 대답만 하면 끝이므로, _ 붙여서 안씀을 나타냄)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/appointments', appointmentsRouter) // study: 약속 라우터
app.use('/api/appointments', participantsRouter) // study: 참여 라우터
