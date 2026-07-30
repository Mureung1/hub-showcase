import { fetchAnnouncements } from './bizinfo-client.js'
import { processKstartupDaily } from './kstartup-pipeline.js'
import { processAnnouncements } from './pipeline.js'
import { sweepExpired } from './sweep.js'

/**
 * 일일 크롤러 실행 스크립트 (cron 대상, 이슈 #32/#40).
 * 실행: npm run run -w @hub/crawler
 * 최근 공고 위주로만 조회한다 — 전체 백필은 backfill.ts 참고.
 */
const DAILY_PAGE_UNIT = 200
/** perPage=300으로 호출 시 500 에러 확인(2026-07-28 실측) — 안전 마진으로 100 사용 */
const KSTARTUP_PAGE_UNIT = 100

async function main(): Promise<void> {
  const items = await fetchAnnouncements({ pageIndex: 1, pageUnit: DAILY_PAGE_UNIT })
  const { upserted, expired } = await processAnnouncements(items)

  if (expired > 0) {
    console.log(`[crawler] 이미 마감된 공고 ${expired}건 제외`)
  }
  console.log(`[crawler] ${upserted}건 upsert 완료`)

  /**
   * K-Startup은 bizinfo와 별도 소스라 실패해도 bizinfo 결과에 영향 주지 않게 격리한다(이슈 #94).
   * page=1 고정이 아니라 이미 본 id를 만날 때까지 페이지네이션한다(이슈 #126) — 하루 신규
   * 공고가 KSTARTUP_PAGE_UNIT을 넘어도 놓치지 않는다.
   */
  try {
    const kstartupResult = await processKstartupDaily(KSTARTUP_PAGE_UNIT)
    console.log(
      `[crawler] K-Startup ${kstartupResult.upserted}건 upsert (중복 제외 ${kstartupResult.duplicates}건, 마감 제외 ${kstartupResult.expired}건, ${kstartupResult.pagesFetched}페이지 조회)`,
    )
  } catch (err) {
    console.error('[crawler] K-Startup 조회 실패 (bizinfo 결과는 유지):', err)
  }

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
