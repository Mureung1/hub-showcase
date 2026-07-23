import express from 'express'
import cors from 'cors'
import { healthRouter } from './routes/health.routes.js'
import { gapAnalysisRouter } from './routes/gapAnalysis.routes.js'
import { bookmarksRouter } from './routes/bookmarks.routes.js'
import { errorHandler } from './middleware/errorHandler.js'

// ALLOWED_ORIGIN 미설정(로컬 개발) 시 cors()에 옵션을 안 넘겨 지금과 동일하게 모든 origin을 허용한다.
// 설정되면 콤마로 구분된 origin 목록만 허용 — 배포 환경(프론트/백엔드가 다른 origin)과 로컬을 동시에 열어둘 수 있다.
function corsOptions() {
  const origins = process.env.ALLOWED_ORIGIN?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
  return origins?.length ? { origin: origins } : undefined
}

export function createApp() {
  const app = express()

  app.use(cors(corsOptions()))
  app.use(express.json())

  app.use('/api', healthRouter)
  app.use('/api', gapAnalysisRouter)
  app.use('/api', bookmarksRouter)

  app.use(errorHandler)

  return app
}
