import type { KstartupAnnouncement } from './kstartup-client.js'
import { isDuplicateTitle } from './dedup.js'
import { mapKstartupAnnouncementToSubsidy } from './kstartup-mapper.js'
import { SUBSIDIES_TABLE, supabase } from './supabase.js'
import { upsertSubsidies } from './upsert.js'

export interface KstartupProcessResult {
  upserted: number
  expired: number
  duplicates: number
}

/** bizinfo를 포함한 기존 저장 공고 이름 전체 — 제목 유사도 dedup 비교 대상 */
async function getExistingNames(): Promise<string[]> {
  const { data, error } = await supabase.from(SUBSIDIES_TABLE).select('name')
  if (error) {
    throw new Error(`Supabase 조회 실패: ${error.message}`)
  }
  return (data ?? []).map((row) => row.name as string)
}

/**
 * K-Startup 공고 배열 -> Subsidy 정규화 -> bizinfo와 제목 유사 중복 제외 -> 마감 지난 것 제외
 * -> Supabase upsert. bizinfo `pipeline.ts`와 달리 첨부파일 AI 추출 단계가 없다 — K-Startup
 * 응답엔 첨부파일 필드 자체가 없어서(이슈 #94 계획 문서 "전제 재확인" 참고) 그 단계가 원천적으로
 * 해당하지 않는다.
 */
export async function processKstartupAnnouncements(
  items: KstartupAnnouncement[],
): Promise<KstartupProcessResult> {
  if (items.length === 0) {
    return { upserted: 0, expired: 0, duplicates: 0 }
  }

  const existingNames = await getExistingNames()
  const subsidies = items.map((item) => mapKstartupAnnouncementToSubsidy(item))

  const nonDuplicate = subsidies.filter((s) => !isDuplicateTitle(s.name, existingNames))
  const duplicates = subsidies.length - nonDuplicate.length

  const active = nonDuplicate.filter((s) => s.dday >= 0)
  const expired = nonDuplicate.length - active.length

  const { count } = await upsertSubsidies(active)
  return { upserted: count, expired, duplicates }
}
