import { useQuery } from '@tanstack/react-query'
import type { OnboardingProfile, SortOption } from '@hub/shared'
import { submitProfile } from '../api/client'

/**
 * 온보딩 프로필 + 정렬 기준으로 매칭 목록을 조회한다.
 * `POST /api/match`가 준비되기 전까지는 `submitProfile`의 mock fallback을 그대로 사용한다.
 */
export function useSubsidies(profile: OnboardingProfile, sort: SortOption) {
  return useQuery({
    queryKey: ['subsidies', profile, sort],
    queryFn: () => submitProfile({ profile, sort }),
  })
}
