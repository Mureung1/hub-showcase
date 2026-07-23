import 'dotenv/config'
import { createApp } from './app.js'
import { seedJobsIfEmpty } from './db/seed.js'

const port = process.env.PORT || 4000

// 재배포 시 파일시스템이 초기화돼 jobs 테이블이 비어있을 수 있는 배포 환경을 대비한 안전장치.
// 이미 데이터가 있으면 아무것도 하지 않는다 — 로컬 개발에서도 그대로 안전하게 동작한다.
const seedResult = seedJobsIfEmpty()
if (seedResult.seeded) {
  console.log(`jobs 테이블이 비어있어 서버 시작 시 자동으로 시드했습니다 (${seedResult.total}건).`)
}

const app = createApp()

app.listen(port, () => {
  console.log(`SpecFit API listening on http://localhost:${port}`)
})
