import { Global } from '@emotion/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { BrowserRouter } from 'react-router-dom'

import { globalStyles } from '../styles/globalStyles'

export interface AppProvidersProps {
  children: ReactNode
}

export const AppProviders = ({ children }: AppProvidersProps) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 60_000,
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Global styles={globalStyles} />
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  )
}
