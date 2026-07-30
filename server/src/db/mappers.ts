import type { OnboardingProfile, SortOption, Subsidy } from '@hub/shared'

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
  region: string[]
  industry: string[]
  employees: string | null
  employees_max_count: number | null
  revenue: string | null
  revenue_max_krw: number | null
  business_years: string | null
  business_years_max: number | null
  atch_file_id: string | null
  support_realm: string
  support_realm_detail: string | null
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
    region: row.region,
    industry: row.industry,
    employees: row.employees ?? undefined,
    employeesMaxCount: row.employees_max_count ?? undefined,
    revenue: row.revenue ?? undefined,
    revenueMaxKrw: row.revenue_max_krw ?? undefined,
    businessYears: row.business_years ?? undefined,
    businessYearsMax: row.business_years_max ?? undefined,
    atchFileId: row.atch_file_id ?? undefined,
    supportRealm: row.support_realm,
    supportRealmDetail: row.support_realm_detail ?? undefined,
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
    region: subsidy.region,
    industry: subsidy.industry,
    employees: subsidy.employees ?? null,
    employees_max_count: subsidy.employeesMaxCount ?? null,
    revenue: subsidy.revenue ?? null,
    revenue_max_krw: subsidy.revenueMaxKrw ?? null,
    business_years: subsidy.businessYears ?? null,
    business_years_max: subsidy.businessYearsMax ?? null,
    atch_file_id: subsidy.atchFileId ?? null,
    support_realm: subsidy.supportRealm,
    support_realm_detail: subsidy.supportRealmDetail ?? null,
  }
}

/** match_requests 테이블 row (snake_case) */
export interface MatchRequestRow {
  industry: string
  support_realm: string[]
  region: string
  district: string
  employees: string
  revenue: string
  credit_score: string | null
  business_years: string | null
  sort: string | null
}

/** OnboardingProfile + sort → DB row (insert용) */
export function profileToMatchRequestRow(
  profile: OnboardingProfile,
  sort: SortOption,
): MatchRequestRow {
  return {
    // 이슈 #91/#92로 온보딩 업종(industry) 질문이 지원분야(supportRealm)로 완전히
    // 교체되며 OnboardingProfile에서 industry 필드가 사라졌다. DB의 industry 컬럼은
    // 이 프로젝트 관례대로 드롭하지 않고 남아있는 legacy NOT NULL 컬럼이라, 제약을
    // 만족시키기 위해 빈 문자열로 채운다(이슈 #108).
    industry: '',
    support_realm: profile.supportRealm,
    region: profile.region,
    district: profile.district,
    employees: profile.employees,
    revenue: profile.revenue,
    credit_score: profile.creditScore ?? null,
    business_years: profile.businessYears ?? null,
    sort,
  }
}
