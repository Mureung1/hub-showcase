import type { Subsidy } from '@hub/shared'
import { SUBSIDIES_TABLE, supabase } from './supabase.js'

/** subsidies 테이블 row (snake_case, 예약어 회피 컬럼) — server/src/db/mappers.ts의 SubsidyRow와 동일한 컬럼 규칙 */
interface SubsidyRow {
  id: string
  name: string
  org: string
  amount: string
  dday: number
  match_score: number
  deadline: string
  method: string
  qualifications: string[]
  documents: string[]
  how: string
  apply_where: string
  where_url: string | null
  contact: string
  region: string[]
}

function subsidyToRow(subsidy: Subsidy): SubsidyRow {
  return {
    id: subsidy.id,
    name: subsidy.name,
    org: subsidy.org,
    amount: subsidy.amount,
    dday: subsidy.dday,
    match_score: subsidy.match,
    deadline: subsidy.deadline,
    method: subsidy.method,
    qualifications: subsidy.qualifications,
    documents: subsidy.documents,
    how: subsidy.how,
    apply_where: subsidy.where,
    where_url: subsidy.whereUrl ?? null,
    contact: subsidy.contact,
    region: subsidy.region,
  }
}

/**
 * 크롤러가 수집·변환한 Subsidy[]를 subsidies 테이블에 upsert한다.
 * id(원본 공고 pblancId) 충돌 시 갱신 — 재수집해도 중복 row가 쌓이지 않는다.
 * 기존 샘플 데이터(id: '1'~'8')와는 id 체계가 달라 충돌 없이 공존한다.
 */
export async function upsertSubsidies(subsidies: Subsidy[]): Promise<{ count: number }> {
  if (subsidies.length === 0) {
    return { count: 0 }
  }

  const rows = subsidies.map(subsidyToRow)
  const { error } = await supabase.from(SUBSIDIES_TABLE).upsert(rows, { onConflict: 'id' })

  if (error) {
    throw new Error(`Supabase upsert 실패: ${error.message}`)
  }

  return { count: rows.length }
}
