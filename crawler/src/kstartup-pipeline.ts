import { fetchKstartupAnnouncements, type KstartupAnnouncement } from './kstartup-client.js'
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
export async function getExistingNames(): Promise<string[]> {
  const { data, error } = await supabase.from(SUBSIDIES_TABLE).select('name')
  if (error) {
    throw new Error(`Supabase 조회 실패: ${error.message}`)
  }
  return (data ?? []).map((row) => row.name as string)
}

/** 주어진 id들 중 subsidies 테이블에 이미 존재하는 것만 Set으로 반환 (일일 수집 페이지네이션 종료 판단용, 이슈 #126) */
export async function getExistingIds(ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set()
  const { data, error } = await supabase.from(SUBSIDIES_TABLE).select('id').in('id', ids)
  if (error) {
    throw new Error(`Supabase 조회 실패: ${error.message}`)
  }
  return new Set((data ?? []).map((row) => row.id as string))
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

export interface KstartupDailyResult extends KstartupProcessResult {
  /** 실제로 조회한 페이지 수 (로그·모니터링용) */
  pagesFetched: number
}

/** 무한 루프 방지용 안전 상한 — 정상 상황이면 1페이지 안에서 끝난다 */
const DAILY_MAX_PAGES = 20

/**
 * 일일 증분 수집 (이슈 #126). page=1부터 순회하며 이미 DB에 있는 id를 만난 페이지까지
 * 처리한 뒤 중단한다. K-Startup 응답은 `pbanc_sn` 내림차순(최신순)이라, 어떤 페이지에서
 * 기존 id를 만났다는 건 그 페이지를 포함해 이후(더 오래된 공고)는 이전 실행에서 이미
 * 다 본 것이라는 뜻이라 안전하게 멈출 수 있다. 하루 신규 공고가 `perPage`를 넘어도
 * 페이지를 늘려가며 자동으로 다 잡고, 평소(신규가 한 페이지 안에 다 들어오는 날)엔
 * 1페이지만 조회하고 끝나 낭비가 없다.
 */
export async function processKstartupDaily(perPage: number): Promise<KstartupDailyResult> {
  let upserted = 0
  let expired = 0
  let duplicates = 0
  let pagesFetched = 0

  for (let page = 1; page <= DAILY_MAX_PAGES; page++) {
    const items = await fetchKstartupAnnouncements({ page, perPage })
    pagesFetched += 1
    if (items.length === 0) break

    const ids = items.map((item) => `KS_${item.pbanc_sn}`)
    const existingIds = await getExistingIds(ids)

    const result = await processKstartupAnnouncements(items)
    upserted += result.upserted
    expired += result.expired
    duplicates += result.duplicates

    if (ids.some((id) => existingIds.has(id))) break
  }

  return { upserted, expired, duplicates, pagesFetched }
}
