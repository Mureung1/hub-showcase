import { Suspense, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

import { Spinner } from '@/shared/ui/Spinner'

import { ErrorBoundary } from '../ErrorBoundary'
import { RouteFallbackRoot } from './AppRouteBoundary.styles'

interface AppRouteBoundaryProps {
  children: ReactNode
}

const AppRouteFallback = ({ label }: { label: string }) => (
  <RouteFallbackRoot>
    <Spinner size="large" label={label} />
  </RouteFallbackRoot>
)

export const AppRouteBoundary = ({ children }: AppRouteBoundaryProps) => {
  const location = useLocation()
  const resetKey = `${location.pathname}${location.search}`

  return (
    <ErrorBoundary fallback={<AppRouteFallback label="Recovering page" />} resetKey={resetKey}>
      <Suspense fallback={<AppRouteFallback label="Loading page" />}>{children}</Suspense>
    </ErrorBoundary>
  )
}
