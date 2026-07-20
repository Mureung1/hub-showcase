import { useQuery } from '@tanstack/react-query'
import { getSubsidy } from '../api/client'

/** 지원금 상세 단건 조회 (서버 404/오류 시 mock에서 조회) */
export function useSubsidy(id: string | undefined) {
  return useQuery({
    queryKey: ['subsidy', id],
    queryFn: () => getSubsidy(id as string),
    enabled: Boolean(id),
  })
}
