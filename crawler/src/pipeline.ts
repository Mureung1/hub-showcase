import type { BizinfoAnnouncement } from './bizinfo-client.js'
import { mapAnnouncementToSubsidy } from './mapper.js'
import { upsertSubsidies } from './upsert.js'

export interface ProcessResult {
  upserted: number
  expired: number
}

/**
 * 공고 배열 -> Subsidy 정규화 -> 이미 마감된 공고 제외 -> Supabase upsert.
 * index.ts(일일 실행)와 backfill.ts(전체 순회)가 공유하는 파이프라인.
 */
export async function processAnnouncements(items: BizinfoAnnouncement[]): Promise<ProcessResult> {
  const subsidies = items.map((item) => mapAnnouncementToSubsidy(item))

  const active = subsidies.filter((s) => s.dday >= 0)
  const expired = subsidies.length - active.length

  const { count } = await upsertSubsidies(active)
  return { upserted: count, expired }
}
