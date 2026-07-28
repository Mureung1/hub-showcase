import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../lib/apiClient'

export const COLLECTION_POINT_CATEGORIES = ['건전지', '형광등', '소형가전', '종이팩'] as const
export type CollectionPointCategory = (typeof COLLECTION_POINT_CATEGORIES)[number]

export interface CollectionPoint {
  id: string
  category: string
  name: string
  address: string
  hours: string | null
}

async function fetchCollectionPoints(category: CollectionPointCategory): Promise<CollectionPoint[]> {
  const { data } = await apiClient.get<{ points: CollectionPoint[] }>('/collection-points', {
    params: { category },
  })
  return data.points
}

export function useCollectionPoints(category: CollectionPointCategory) {
  return useQuery({
    queryKey: ['collection-points', category],
    queryFn: () => fetchCollectionPoints(category),
  })
}
