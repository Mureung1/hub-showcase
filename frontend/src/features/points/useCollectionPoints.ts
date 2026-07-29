import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../lib/apiClient'
import type { SelectedRegion } from '../region/useSelectedRegion'

export const COLLECTION_POINT_CATEGORIES = [
  '건전지',
  '형광등',
  '소형가전',
  '종이팩',
  '폐의약품',
  '의류',
  '재활용센터',
] as const
export type CollectionPointCategory = (typeof COLLECTION_POINT_CATEGORIES)[number]

export interface CollectionPoint {
  id: string
  category: string
  name: string
  address: string
  hours: string | null
  lat: number | null
  lng: number | null
}

async function fetchCollectionPoints(
  category: CollectionPointCategory,
  ctpvNm: string,
  sggNm: string,
): Promise<CollectionPoint[]> {
  const { data } = await apiClient.get<{ points: CollectionPoint[] }>('/collection-points', {
    params: { category, ctpvNm, sggNm },
  })
  return data.points
}

export function useCollectionPoints(category: CollectionPointCategory, region: SelectedRegion | null) {
  return useQuery({
    queryKey: ['collection-points', category, region?.ctpvNm, region?.sggNm],
    queryFn: () => fetchCollectionPoints(category, region!.ctpvNm, region!.sggNm),
    enabled: !!region,
  })
}
