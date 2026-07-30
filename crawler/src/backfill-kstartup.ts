import { isDuplicateTitle } from './dedup.js'
import { getExistingIds, getExistingNames } from './kstartup-pipeline.js'
import { fetchKstartupAnnouncements } from './kstartup-client.js'
import { mapKstartupAnnouncementToSubsidy } from './kstartup-mapper.js'
import { upsertSubsidies } from './upsert.js'

const PAGE_UNIT = 100
const DELAY_MS = 300

/**
 * `rcrt_prgs_yn` 쿼리가 서버에서 실제로 필터링되지 않아(kstartup-client.ts 참고) 항상
 * 꽉 찬 페이지가 오므로, bizinfo backfill처럼 "빈 페이지 = 끝"을 종료 조건으로 못 쓴다.
 * 대신 연속 이 페이지 수만큼 진행중(Y) 공고가 0건이면 더 과거로 가도 의미가 없다고
 * 보고 중단한다 (설계 결정: 이슈 #126).
 */
const CONSECUTIVE_EMPTY_PAGE_LIMIT = 5

/** 위 조건에 안 걸리는 이상 상황(예: Y 판정이 드문드문 계속 섞여 나옴) 대비 절대 상한 */
const MAX_PAGES = 50

const DRY_RUN = process.argv.includes('--dry-run')

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * K-Startup 전체 백필 스크립트 (이슈 #126) — 최초 1회(또는 커버리지 재확장 필요 시) 수동 실행 목적.
 * 일일 크롤러(`processKstartupDaily`)는 최신 쪽만 훑지만, 이 스크립트는 과거 페이지까지 순회해
 * 그동안 놓친 진행중 공고를 마저 채운다.
 *
 * 실행: npm run backfill:kstartup -w @hub/crawler
 * 미리보기(실제 저장 없이 몇 건이 새로 들어갈지만 확인): npm run backfill:kstartup -w @hub/crawler -- --dry-run
 */
async function main(): Promise<void> {
  console.log(`[backfill-kstartup] 시작${DRY_RUN ? ' (dry-run — 실제 저장 안 함)' : ''}`)

  const existingNames = await getExistingNames()

  let consecutiveEmptyPages = 0
  let totalActiveSeen = 0
  let totalNew = 0
  let totalAlreadyKnown = 0
  let totalDuplicates = 0
  let totalExpired = 0
  let totalUpserted = 0

  for (let page = 1; page <= MAX_PAGES; page++) {
    const items = await fetchKstartupAnnouncements({ page, perPage: PAGE_UNIT })

    if (items.length === 0) {
      consecutiveEmptyPages += 1
      console.log(
        `[backfill-kstartup] page ${page}: 진행중 0건 (연속 ${consecutiveEmptyPages}/${CONSECUTIVE_EMPTY_PAGE_LIMIT})`,
      )
      if (consecutiveEmptyPages >= CONSECUTIVE_EMPTY_PAGE_LIMIT) {
        console.log(
          `[backfill-kstartup] 연속 ${CONSECUTIVE_EMPTY_PAGE_LIMIT}페이지 진행중 0건 — 중단`,
        )
        break
      }
      await sleep(DELAY_MS)
      continue
    }

    consecutiveEmptyPages = 0
    totalActiveSeen += items.length

    const ids = items.map((item) => `KS_${item.pbanc_sn}`)
    const existingIds = await getExistingIds(ids)
    const newItems = items.filter((item) => !existingIds.has(`KS_${item.pbanc_sn}`))
    totalAlreadyKnown += items.length - newItems.length

    const subsidies = newItems.map((item) => mapKstartupAnnouncementToSubsidy(item))
    const nonDuplicate = subsidies.filter((s) => !isDuplicateTitle(s.name, existingNames))
    const duplicates = subsidies.length - nonDuplicate.length
    totalDuplicates += duplicates

    const active = nonDuplicate.filter((s) => s.dday >= 0)
    totalExpired += nonDuplicate.length - active.length
    totalNew += active.length

    console.log(
      `[backfill-kstartup] page ${page}: 진행중 ${items.length}건 (신규 ${newItems.length}건, 기존 ${items.length - newItems.length}건, 중복 제외 ${duplicates}건, 저장 대상 ${active.length}건)`,
    )

    if (!DRY_RUN && active.length > 0) {
      const { count } = await upsertSubsidies(active)
      totalUpserted += count
      // 이번 실행에서 upsert한 이름도 이후 페이지의 제목 중복 판정에 반영한다
      existingNames.push(...active.map((s) => s.name))
    }

    await sleep(DELAY_MS)
  }

  console.log(
    `[backfill-kstartup] 완료 — 진행중 ${totalActiveSeen}건 조회 (기존 ${totalAlreadyKnown}건, 중복 제외 ${totalDuplicates}건, 마감 제외 ${totalExpired}건, 신규 ${totalNew}건)`,
  )
  if (DRY_RUN) {
    console.log(`[backfill-kstartup] dry-run이라 실제 저장은 안 했습니다. 신규 ${totalNew}건이 저장될 예정입니다.`)
  } else {
    console.log(`[backfill-kstartup] 총 ${totalUpserted}건 upsert 완료`)
  }
}

main().catch((err) => {
  console.error('[backfill-kstartup] 실행 실패:', err)
  process.exit(1)
})
