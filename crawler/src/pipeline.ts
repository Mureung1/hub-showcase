import { applyAiExtraction } from './apply-ai-extraction.js'
import { parseAttachment } from './attachment.js'
import type { BizinfoAnnouncement } from './bizinfo-client.js'
import { enrichAnnouncements } from './ai-enrichment.js'
import { getCachedExtractions } from './document-cache.js'
import { mapAnnouncementToSubsidy } from './mapper.js'
import { SUBSIDIES_TABLE, supabase } from './supabase.js'
import { upsertSubsidies } from './upsert.js'

export interface ProcessResult {
  upserted: number
  expired: number
}

/**
 * 이번에 조회된 공고 중 아직 DB에 없는(=신규) id만 걸러낸다.
 * 첨부파일 AI 추출(이슈 #67)은 무료 티어 호출 한도가 있어 신규 공고에만 실행한다 — 이미
 * 저장된 공고를 매 실행마다 재추출하면 한도를 금방 소진한다.
 */
async function filterNewItems(items: BizinfoAnnouncement[]): Promise<BizinfoAnnouncement[]> {
  if (items.length === 0) return []

  const ids = items.map((item) => item.pblancId)
  const { data, error } = await supabase.from(SUBSIDIES_TABLE).select('id').in('id', ids)
  if (error) {
    throw new Error(`Supabase 조회 실패: ${error.message}`)
  }

  const existingIds = new Set((data ?? []).map((row) => row.id as string))
  return items.filter((item) => !existingIds.has(item.pblancId))
}

/**
 * 공고 배열 -> Subsidy 정규화 -> AI 추출 결과 병합 -> 이미 마감된 공고 제외 -> Supabase upsert.
 * index.ts(일일 실행)와 backfill.ts(전체 순회)가 공유하는 파이프라인.
 * 신규 공고의 첨부파일은 AI로 구조화 추출해 `document_extractions`에 캐싱하고(이슈 #67 묶음 2),
 * 이번에 조회된 전체 공고(신규 여부 무관)에 대해 캐시를 조회해 Subsidy에 병합한다(묶음 3) —
 * 캐시가 이전 실행에서 이미 채워져 있었을 수도 있어서 신규 항목으로 한정하지 않는다.
 */
export async function processAnnouncements(items: BizinfoAnnouncement[]): Promise<ProcessResult> {
  const newItems = await filterNewItems(items)
  await enrichAnnouncements(newItems)

  const atchFileIds = items
    .map((item) => parseAttachment(item)?.atchFileId)
    .filter((id): id is string => id !== undefined)
  const cache = await getCachedExtractions(atchFileIds)

  const subsidies = items.map((item) => {
    const base = mapAnnouncementToSubsidy(item)
    const atchFileId = parseAttachment(item)?.atchFileId
    return applyAiExtraction(base, atchFileId ? (cache.get(atchFileId) ?? null) : null)
  })

  const active = subsidies.filter((s) => s.dday >= 0)
  const expired = subsidies.length - active.length

  const { count } = await upsertSubsidies(active)
  return { upserted: count, expired }
}
