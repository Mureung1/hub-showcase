import { fetchAnnouncements } from './bizinfo-client.js'

/**
 * 로컬 확인용 실행 스크립트 (이슈 #29).
 * 실행: npm run fetch:sample -w @hub/crawler
 * Supabase 적재는 #31에서 별도 스크립트로 붙인다.
 */
async function main(): Promise<void> {
  const items = await fetchAnnouncements({ pageIndex: 1, pageUnit: 5 })

  console.log(`[crawler] ${items.length}건 수신`)
  for (const item of items) {
    console.log(`- [${item.pblancId}] ${item.pblancNm} (${item.jrsdInsttNm}, ${item.reqstBeginEndDe})`)
  }
}

main().catch((err) => {
  console.error('[crawler] 실행 실패:', err)
  process.exit(1)
})
