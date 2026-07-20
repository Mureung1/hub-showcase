import { QueryClient } from '@tanstack/react-query'

/** mock fallback이 있는 API라 재시도보다 빠른 실패 후 fallback이 낫다고 판단해 retry 비활성화 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: false,
    },
  },
})
