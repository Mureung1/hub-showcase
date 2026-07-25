import { useQueryClient, useQuery, type InfiniteData } from '@tanstack/react-query'
import type { MatchResponse, OnboardingProfile } from '@hub/shared'
import { getSubsidy } from '../api/client'

/** 5분 — 리스트 캐시에서 찾은 값을 짧게라도 fresh로 취급해 불필요한 재요청을 줄인다 */
const CACHE_REUSE_STALE_TIME = 5 * 60 * 1000

/**
 * 지원금 상세 단건 조회 (서버 404/오류 시 mock에서 조회).
 *
 * 평소(리스트에서 클릭)엔 `useSubsidies`가 이미 채워둔 `['subsidies', profile, ...]` 캐시에서
 * 같은 id를 찾아 그대로 재사용한다 — 리스트와 상세의 매칭도가 항상 같고, 네트워크 요청도 없다.
 * 캐시에 없으면(직접 URL 접속·새로고침) `getSubsidy(id, profile)`로 서버가 재계산한 값을
 * 받아온다(이슈 #61).
 */
export function useSubsidy(id: string | undefined, profile: OnboardingProfile) {
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: ['subsidy', id],
    queryFn: () => getSubsidy(id as string, profile),
    enabled: Boolean(id),
    staleTime: CACHE_REUSE_STALE_TIME,
    initialData: () => {
      if (!id) return undefined
      const cachedLists = queryClient.getQueriesData<InfiniteData<MatchResponse>>({
        queryKey: ['subsidies', profile],
      })
      for (const [, data] of cachedLists) {
        const found = data?.pages.flatMap((page) => page.items).find((item) => item.id === id)
        if (found) return found
      }
      return undefined
    },
  })
}
