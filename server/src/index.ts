import { app } from './app.js'
import { env } from './lib/env.js'
// study: 실제 서버 올리기 = listen 하기
app.listen(env.PORT, () => {
  console.log(`server listening on http://localhost:${env.PORT}`)
})
