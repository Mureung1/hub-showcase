import { fetchAnnouncements } from './bizinfo-client.js'
import { processAnnouncements } from './pipeline.js'
import { sweepExpired } from './sweep.js'

/**
 * 일일 크롤러 실행 스크립트 (cron 대상, 이슈 #32/#40).
 * 실행: npm run run -w @hub/crawler
 * 최근 공고 위주로만 조회한다 — 전체 백필은 backfill.ts 참고.
 */
const DAILY_PAGE_UNIT = 200

async function main(): Promise<void> {
  const items = await fetchAnnouncements({ pageIndex: 1, pageUnit: DAILY_PAGE_UNIT })
  const { upserted, expired } = await processAnnouncements(items)

  if (expired > 0) {
    console.log(`[crawler] 이미 마감된 공고 ${expired}건 제외`)
  }
  console.log(`[crawler] ${upserted}건 upsert 완료`)

  /**
   * 위 필터는 그날 새로 수집된 공고에만 적용된다 — 이미 DB에 있던 공고는 재수집되지 않으면
   * 마감이 지나도 그대로 남아있어서(이슈 #63), 매 실행마다 기존 저장분 전체를 재검증한다.
   */
  const { deleted } = await sweepExpired()
  if (deleted > 0) {
    console.log(`[crawler] 기존 저장된 공고 중 마감 지난 ${deleted}건 삭제`)
  }
}

main().catch((err) => {
  console.error('[crawler] 실행 실패:', err)
  process.exit(1)
})
