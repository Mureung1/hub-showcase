import { useQuery } from '@tanstack/react-query'
import type { OnboardingProfile } from '@hub/shared'
import { getSubsidy } from '../api/client'

/**
 * 지원금 상세 단건 조회 (서버 404/오류 시 mock에서 조회).
 *
 * 리스트 캐시(`['subsidies', profile, ...]`)는 `SubsidyListItem`만 담고 있어(이슈 #114) 상세
 * 필드(자격요건/제출서류/신청방법/문의처 등)가 없다 — 예전엔 이 캐시에서 값을 찾아 상세 쿼리의
 * `initialData`로 그대로 재사용했는데, 캐시에 없는 필드가 빈 값으로 잠깐 보이는 버그였다.
 * 타입을 분리하며 그 재사용을 구조적으로 막았으니, 상세는 항상 `getSubsidy(id, profile)`로
 * 서버에서 새로 받아온다.
 */
export function useSubsidy(id: string | undefined, profile: OnboardingProfile) {
  return useQuery({
    queryKey: ['subsidy', id],
    queryFn: () => getSubsidy(id as string, profile),
    enabled: Boolean(id),
  })
}
