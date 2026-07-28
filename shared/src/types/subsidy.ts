/** 온보딩 4스텝에서 수집하는 사용자 프로필 */
export interface OnboardingProfile {
  /**
   * 지원분야 복수선택(이슈 #91/#92) — 예전 업종(industry) 질문을 완전히 대체함.
   * `Subsidy.supportRealm`과 hard filter로 매칭(region과 동일 방식): 여기 담긴 값 중 하나와
   * subsidy.supportRealm이 일치해야 결과에 남는다.
   */
  supportRealm: string[]
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
   * 지원분야 대분류 (이슈 #90). bizinfo `pldirSportRealmLclasCodeNm` 그대로 사용 — 8개 고정값
   * (수출/기술/경영/내수/창업/인력/금융/기타)이고 실측 300건 결측 0%로 industry(6.6%)보다
   * 신뢰도가 훨씬 높다. 다만 온보딩 프로필에 대응 필드가 아직 없어 스코어링 미배선 상태
   * (다음 결정: [#91](https://github.com/syd348/hub/issues/91), 배선:
   * [#92](https://github.com/syd348/hub/issues/92)). 상세: docs/week4/issue-90-support-realm-filter-plan.md
   */
  supportRealm: string
  /** 지원분야 중분류 (이슈 #90). bizinfo `pldirSportRealmMlsfcCodeNm` — 옵션 필드지만 실측 300건 전부 값 있었음 */
  supportRealmDetail?: string
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
  /**
   * 이슈 #77: 공고 첨부파일 식별자 — `document_extractions.atch_file_id`와 조인해 이 지원금이
   * AI로 보강됐는지·어떤 모델로 처리됐는지 확인하는 용도. 첨부파일이 없거나 미지원 포맷이면
   * undefined.
   */
  atchFileId?: string
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
