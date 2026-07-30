import type { OnboardingProfile, SortOption, SubsidyListItem } from './subsidy.js'

/** POST /api/match 요청 — 온보딩 프로필 기준 매칭 + 정렬 + 페이지네이션(이슈 #48) */
export interface MatchRequest {
  profile: OnboardingProfile
  sort?: SortOption
  /** 1-based, 기본값 1 */
  page?: number
  /** 페이지당 건수, 기본값 20 */
  limit?: number
}

/** POST /api/match 응답 — SubsidyListResponse와 동일한 형태 */
export interface MatchResponse {
  items: SubsidyListItem[]
  /** 페이지네이션 이전 전체 매칭 건수 */
  total: number
  sort: SortOption
  page: number
  limit: number
  /** 다음 페이지 존재 여부 — "더보기" 버튼 노출 판단용 */
  hasMore: boolean
}
