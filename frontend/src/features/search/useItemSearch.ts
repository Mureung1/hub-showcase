import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../lib/apiClient'

export interface Item {
  id: string
  name: string
  nameEn: string | null
}

interface SearchItemsResponse {
  items: Item[]
}

async function fetchItems(query: string): Promise<Item[]> {
  const { data } = await apiClient.get<SearchItemsResponse>('/items/search', {
    params: { q: query },
  })
  return data.items
}

export function useItemSearch(query: string) {
  const trimmed = query.trim()

  return useQuery({
    queryKey: ['items', 'search', trimmed],
    queryFn: () => fetchItems(trimmed),
    enabled: trimmed.length > 0,
  })
}
