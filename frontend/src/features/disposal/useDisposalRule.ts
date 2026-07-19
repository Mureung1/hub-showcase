import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../lib/apiClient'

export interface DisposalRulePart {
  part: string
  category: string
}

export interface DisposalRuleResponse {
  item: {
    id: string
    name: string
  }
  disposalRule: {
    govItemName: string
    method: string
    sourceRegion: string
    steps: string[]
    parts: DisposalRulePart[]
    commonMistakes: string[]
    reason: string | null
    fetchedAt: string
  }
}

async function fetchDisposalRule(itemId: string): Promise<DisposalRuleResponse> {
  const { data } = await apiClient.get<DisposalRuleResponse>(`/items/${itemId}/disposal-rule`)
  return data
}

export function useDisposalRule(itemId: string | undefined) {
  return useQuery({
    queryKey: ['items', itemId, 'disposal-rule'],
    queryFn: () => fetchDisposalRule(itemId!),
    enabled: !!itemId,
  })
}
