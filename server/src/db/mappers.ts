import type { Subsidy } from '@hub/shared'

/** subsidies 테이블 row (snake_case, 예약어 회피 컬럼) */
export interface SubsidyRow {
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
  created_at?: string
}

/** DB row → Subsidy 타입 (API/프론트에서 쓰는 형태) */
export function rowToSubsidy(row: SubsidyRow): Subsidy {
  return {
    id: row.id,
    name: row.name,
    org: row.org,
    amount: row.amount,
    dday: row.dday,
    match: row.match_score,
    deadline: row.deadline,
    method: row.method,
    qualifications: row.qualifications,
    documents: row.documents,
    how: row.how,
    where: row.apply_where,
    whereUrl: row.where_url ?? undefined,
    contact: row.contact,
  }
}

/** Subsidy 타입 → DB row (insert/upsert용, created_at 제외) */
export function subsidyToRow(subsidy: Subsidy): Omit<SubsidyRow, 'created_at'> {
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
  }
}
