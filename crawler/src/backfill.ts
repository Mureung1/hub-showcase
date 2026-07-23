import { fetchAnnouncements } from './bizinfo-client.js'
import { processAnnouncements } from './pipeline.js'

const PAGE_UNIT = 200
const DELAY_MS = 300

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 전체 백필 스크립트 (이슈 #40) — 최초 1회 수동 실행 목적.
 * pageIndex를 1부터 증가시키며 API 전체(totCnt)를 순회, 페이지마다 upsert한다.
 * 응답이 비었거나 PAGE_UNIT보다 적게 오면 마지막 페이지로 보고 중단.
 * 실행: npm run backfill -w @hub/crawler
 */
async function main(): Promise<void> {
  let pageIndex = 1
  let totalSeen = 0
  let totalUpserted = 0
  let totalExpired = 0
  let totCnt: number | undefined

  for (;;) {
    const items = await fetchAnnouncements({ pageIndex, pageUnit: PAGE_UNIT })
    if (items.length === 0) break

    if (totCnt === undefined) {
      totCnt = items[0].totCnt
    }
    totalSeen += items.length

    const { upserted, expired } = await processAnnouncements(items)
    totalUpserted += upserted
    totalExpired += expired

    console.log(
      `[backfill] page ${pageIndex}: ${items.length}건 조회, ${upserted}건 upsert, ${expired}건 마감 제외 (누적 ${totalSeen}/${totCnt}건)`,
    )

    if (items.length < PAGE_UNIT) break
    pageIndex += 1
    await sleep(DELAY_MS)
  }

  console.log(
    `[backfill] 완료 — 총 ${totalSeen}건 조회, ${totalUpserted}건 upsert, ${totalExpired}건 마감 제외`,
  )
}

main().catch((err) => {
  console.error('[backfill] 실행 실패:', err)
  process.exit(1)
})
