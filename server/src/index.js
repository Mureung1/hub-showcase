import 'dotenv/config'
import { createApp } from './app.js'
import { seedJobsIfEmpty, fixForeignLangScoresIfNeeded } from './db/seed.js'

const port = process.env.PORT || 4000

// 재배포 시 파일시스템이 초기화돼 jobs 테이블이 비어있을 수 있는 배포 환경을 대비한 안전장치.
// 이미 데이터가 있으면 아무것도 하지 않는다 — 로컬 개발에서도 그대로 안전하게 동작한다.
const seedResult = seedJobsIfEmpty()
if (seedResult.seeded) {
  console.log(`jobs 테이블이 비어있어 서버 시작 시 자동으로 시드했습니다 (${seedResult.total}건).`)
}

// 어학 성적 척도 보정(OPIc 등급화/TOEFL·TOEIC Speaking 실제 범위) — 이미 옛 값으로 시드된 기존
// DB에도 매번 적용해서 고쳐준다. idempotent라 이미 고쳐졌으면 아무 것도 하지 않는다.
const langFixResult = fixForeignLangScoresIfNeeded()
if (langFixResult.fixed > 0) {
  console.log(`어학 성적 척도를 시험별로 보정했습니다 (${langFixResult.fixed}건).`)
}

const app = createApp()

app.listen(port, () => {
  console.log(`SpecFit API listening on http://localhost:${port}`)
})
