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
  /**
   * 업종 배열 (이슈 #52). bsnsSumryCn/trgetNm 키워드 매칭으로 추출 — 커버리지가 낮아
   * (~6.6%) 대다수는 빈 배열("업종 정보 없음")이다. region과 달리 매칭 시 가점만 주고
   * 불일치 페널티는 없다 (신뢰도가 낮아서). 상세: docs/week4/issue-52-industry-match-plan.md
   */
  industry: string[]
  /**
   * 이슈 #67: 첨부파일 AI 구조화 추출 결과 — employees/revenue/businessYears는 문서 원문
   * 표현 그대로(예: "상시근로자 50인 미만"), `*MaxCount`/`*MaxKrw`/`*Max`는 매칭 가점 계산용으로
   * 정규화한 숫자(예: 50). 신규 공고 중 첨부파일에서 조건을 못 뽑았거나 아직 AI 추출을 못 한
   * 공고는 전부 undefined — region/industry와 같은 원칙으로 "정보 없음"은 중립 취급한다.
   */
  employees?: string
  employeesMaxCount?: number
  revenue?: string
  revenueMaxKrw?: number
  businessYears?: string
  businessYearsMax?: number
}

/** GET /api/subsidies 응답 — 페이지네이션 포함 (이슈 #48) */
export interface SubsidyListResponse {
  items: Subsidy[]
  /** 페이지네이션 이전 전체 건수 */
  total: number
  sort: SortOption
  page: number
  limit: number
  /** 다음 페이지 존재 여부 — "더보기" 버튼 노출 판단용 */
  hasMore: boolean
}
