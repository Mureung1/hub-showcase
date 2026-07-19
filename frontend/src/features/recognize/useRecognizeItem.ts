import { useMutation } from '@tanstack/react-query'
import { apiClient } from '../../lib/apiClient'
import type { DisposalRuleResponse } from '../disposal/useDisposalRule'

async function recognizeItem(file: File): Promise<DisposalRuleResponse> {
  const formData = new FormData()
  formData.append('photo', file)
  const { data } = await apiClient.post<DisposalRuleResponse>('/recognize', formData)
  return data
}

export function useRecognizeItem() {
  return useMutation({ mutationFn: recognizeItem })
}
