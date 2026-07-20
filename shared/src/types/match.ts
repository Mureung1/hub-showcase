import type { OnboardingProfile, SortOption, Subsidy } from './subsidy.js'

/** POST /api/match 요청 — 온보딩 프로필 기준 매칭 + 정렬 */
export interface MatchRequest {
  profile: OnboardingProfile
  sort?: SortOption
}

/** POST /api/match 응답 — SubsidyListResponse와 동일한 형태 */
export interface MatchResponse {
  items: Subsidy[]
  total: number
  sort: SortOption
}
