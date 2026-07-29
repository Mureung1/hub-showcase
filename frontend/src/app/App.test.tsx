import { ThemeProvider } from '@emotion/react'
import { render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { lazy } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { ROUTES } from '@/shared/config/routes'

import { AppRouteBoundary } from './providers/AppRouteBoundary'
import { AppRoutes } from './router'
import { gazuaTheme } from './styles/theme'

const renderWithProviders = (ui: ReactNode, initialEntries: string[] = [ROUTES.HOME]) =>
  render(
    <ThemeProvider theme={gazuaTheme}>
      <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
    </ThemeProvider>,
  )

describe('App shell', () => {
  it('renders the home route inside the app shell', async () => {
    renderWithProviders(<AppRoutes />)

    expect(screen.getByRole('main', { name: 'GAZUA app shell' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getAllByRole('textbox')).toHaveLength(2))
  })

  it('shows the spinner while a route is suspended', () => {
    const PendingPage = lazy(() => new Promise<{ default: () => ReactNode }>(() => undefined))

    renderWithProviders(
      <AppRouteBoundary>
        <PendingPage />
      </AppRouteBoundary>,
    )

    expect(screen.getByRole('status', { name: 'Loading page' })).toBeInTheDocument()
  })

  it('shows the spinner when a route render error is caught', () => {
    const ThrowingPage = () => {
      throw new Error('route render failed')
    }

    renderWithProviders(
      <AppRouteBoundary>
        <ThrowingPage />
      </AppRouteBoundary>,
    )

    expect(screen.getByRole('status', { name: 'Recovering page' })).toBeInTheDocument()
  })
})
