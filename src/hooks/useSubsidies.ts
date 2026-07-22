import { useQuery } from '@tanstack/react-query'
import type { OnboardingProfile, SortOption } from '@hub/shared'
import { submitProfile } from '../api/client'

/**
 * 온보딩 프로필 + 정렬 기준으로 매칭 목록을 조회한다.
 * 요청이 실패하면 `submitProfile`이 내부적으로 mock 데이터로 대체해 반환한다.
 */
export function useSubsidies(profile: OnboardingProfile, sort: SortOption) {
  return useQuery({
    queryKey: ['subsidies', profile, sort],
    queryFn: () => submitProfile({ profile, sort }),
  })
}
