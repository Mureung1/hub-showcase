import { Global, css } from '@emotion/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type PropsWithChildren, useState } from 'react'
import { BrowserRouter } from 'react-router-dom'

const globalStyles = css`
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  html {
    font-family:
      Inter,
      ui-sans-serif,
      system-ui,
      -apple-system,
      BlinkMacSystemFont,
      'Segoe UI',
      sans-serif;
    background: #f6f7f9;
  }

  body {
    min-width: 320px;
    margin: 0;
  }

  button,
  input,
  textarea,
  select {
    font: inherit;
  }
`

export function AppProviders({ children }: PropsWithChildren) {
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
