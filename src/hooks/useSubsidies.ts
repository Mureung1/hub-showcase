import { useInfiniteQuery } from '@tanstack/react-query'
import type { OnboardingProfile, SortOption } from '@hub/shared'
import { submitProfile } from '../api/client'

/**
 * 온보딩 프로필 + 정렬 기준으로 매칭 목록을 페이지 단위로 조회한다 (이슈 #48).
 * "더보기" 클릭 시 `fetchNextPage()`로 다음 페이지를 이어붙인다. `sort`가 바뀌면
 * queryKey가 달라져 자동으로 1페이지부터 새로 조회한다(react-query 기본 동작).
 * 요청이 실패하면 `submitProfile`이 내부적으로 mock 데이터로 대체해 반환한다.
 */
export function useSubsidies(profile: OnboardingProfile, sort: SortOption) {
  return useInfiniteQuery({
    queryKey: ['subsidies', profile, sort],
    queryFn: ({ pageParam }) => submitProfile({ profile, sort, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
  })
}
