import { fetchAnnouncements } from './bizinfo-client.js'
import { mapAnnouncementToSubsidy } from './mapper.js'
import { upsertSubsidies } from './upsert.js'

/**
 * 크롤러 실행 스크립트 (이슈 #31).
 * 실행: npm run run -w @hub/crawler
 * bizinfo API 조회 -> Subsidy 정규화 -> 이미 마감된 공고 제외 -> Supabase upsert.
 */
async function main(): Promise<void> {
  const items = await fetchAnnouncements({ pageIndex: 1, pageUnit: 5 })
  const subsidies = items.map((item) => mapAnnouncementToSubsidy(item))

  const active = subsidies.filter((s) => s.dday >= 0)
  const expiredCount = subsidies.length - active.length
  if (expiredCount > 0) {
    console.log(`[crawler] 이미 마감된 공고 ${expiredCount}건 제외`)
  }

  const { count } = await upsertSubsidies(active)
  console.log(`[crawler] ${count}건 upsert 완료`)
}

main().catch((err) => {
  console.error('[crawler] 실행 실패:', err)
  process.exit(1)
})
