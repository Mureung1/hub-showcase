/** 온보딩 4스텝에서 수집하는 사용자 프로필 */
export interface OnboardingProfile {
  industry: string
  region: string
  district: string
  employees: string
  revenue: string
  /** plan.md 기준 선택 입력 — MVP UI 미노출 */
  creditScore?: string
  /** plan.md 기준 필수 — API 매칭용, UI는 2차 추가 */
  businessYears?: string
}

export type SortOption = 'match' | 'deadline' | 'amount' | 'new'

export interface Subsidy {
  id: string
  name: string
  org: string
  amount: string
  dday: number
  match: number
  deadline: string
  method: string
  qualifications: string[]
  documents: string[]
  how: string
  where: string
  whereUrl?: string
  contact: string
  /**
   * 시/도 배열 (이슈 #43). 전국 대상 공고는 REGIONS 전체가 담기고, 지역 정보가 없으면
   * 빈 배열이다 — `region.includes(profile.region)`로 전국/광역권/단일 지역을 동일하게 매칭한다.
   */
  region: string[]
}

export interface SubsidyListResponse {
  items: Subsidy[]
  total: number
  sort: SortOption
}
