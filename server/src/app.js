import cors from 'cors'
import express from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import morgan from 'morgan'
import { env } from './config/env.js'
import { AppError } from './errors/AppError.js'
import { errorHandler } from './middleware/errorHandler.js'
import { notFound } from './middleware/notFound.js'

const app = express()

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler(req, res, next) {
    next(
      new AppError({
        status: 429,
        code: 'RATE_LIMITED',
        message: '요청이 너무 많아요. 잠시 후 다시 시도해주세요.',
      }),
    )
  },
})

app.disable('x-powered-by')
app.use(helmet())
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.corsOrigins.includes(origin)) {
        callback(null, true)
        return
      }

      callback(
        new AppError({
          status: 403,
          code: 'FORBIDDEN',
          message: '허용되지 않은 요청 출처예요.',
        }),
      )
    },
  }),
)
app.use(express.json({ limit: '100kb' }))
app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'))
app.use('/api', apiLimiter)

app.get('/health', (req, res) => {
  res.status(200).json({
    data: {
      status: 'ok',
    },
  })
})

app.use(notFound)
app.use(errorHandler)

export { app }
