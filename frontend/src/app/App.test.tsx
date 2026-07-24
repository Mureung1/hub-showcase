import { ThemeProvider } from '@emotion/react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { ROUTES } from '@/shared/config/routes'

import { AppRoutes } from './router'
import { gazuaTheme } from './styles/theme'

describe('App shell', () => {
  it('renders the home route inside the app shell', () => {
    render(
      <ThemeProvider theme={gazuaTheme}>
        <MemoryRouter initialEntries={[ROUTES.HOME]}>
          <AppRoutes />
        </MemoryRouter>
      </ThemeProvider>,
    )

    expect(screen.getByRole('main', { name: 'GAZUA app shell' })).toBeInTheDocument()
    expect(screen.getByText('가즈아')).toBeInTheDocument()
  })
})
