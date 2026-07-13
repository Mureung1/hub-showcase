import { app } from './app.js'
import { env } from './config/env.js'

const server = app.listen(env.PORT, () => {
  console.log(`사이사이 API가 ${env.PORT}번 포트에서 실행 중입니다.`)
})

function shutdown(signal) {
  console.log(`${signal} 신호를 받아 서버를 종료합니다.`)
  server.close((error) => {
    if (error) {
      console.error(error)
      process.exit(1)
    }

    process.exit(0)
  })
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
