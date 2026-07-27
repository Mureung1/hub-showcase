// 실패/정체된(stale pending) 편지를 배치로 재처리하는 운영 스크립트.
// 지금은 배경 잡 인프라가 없어서 수동 실행이 기본이지만, 로직은 서비스 계층 함수
// (reprocessTagging)에 있으므로 나중에 크론으로 옮기기 쉽다.
// 실행: node scripts/reprocessTagging.js (backend 디렉터리에서)
import 'dotenv/config'
import { prisma } from '../src/lib/prisma.js'
import { listFailedOrStaleTagging } from '../src/services/adminService.js'
import { reprocessTagging } from '../src/services/taggingService.js'
import { MAX_TAGGING_ATTEMPTS, REPROCESS_CONCURRENCY } from '../src/config/matchingConfig.js'

async function processInBatches(items, concurrency, worker) {
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)
    await Promise.all(batch.map(worker))
  }
}

async function main() {
  const targets = await listFailedOrStaleTagging()
  const eligible = targets.filter((t) => t.taggingAttempts < MAX_TAGGING_ATTEMPTS)
  const skipped = targets.length - eligible.length

  console.log(`재처리 대상: ${targets.length}건 (그 중 시도 한도 초과로 건너뜀: ${skipped}건)`)

  await processInBatches(eligible, REPROCESS_CONCURRENCY, async (letter) => {
    await reprocessTagging(letter.id)
    console.log(`재처리 완료: ${letter.id}`)
  })

  console.log('배치 재처리 종료')
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
