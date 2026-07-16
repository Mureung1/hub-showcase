import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('./lib/supabase', () => ({
  ensureAnonymousSession: vi.fn().mockResolvedValue({ access_token: 'token' }),
}))

vi.mock('./api/client', () => ({
  api: {
    getUserInterests: vi.fn(),
    getInterests: vi.fn(),
    replaceUserInterests: vi.fn(),
    getTodayArticles: vi.fn().mockResolvedValue({ items: [], emptyStateMessage: null }),
  },
}))

import { api } from './api/client'

describe('App startup', () => {
  beforeEach(() => {
    vi.mocked(api.getUserInterests).mockReset()
    vi.mocked(api.getInterests).mockReset()
  })

  it('shows onboarding when hasCompletedOnboarding is false', async () => {
    vi.mocked(api.getUserInterests).mockResolvedValue({
      hasCompletedOnboarding: false,
      interests: [],
    })
    vi.mocked(api.getInterests).mockResolvedValue([
      {
        id: 'interest-1',
        name: 'IT·개발',
        displayOrder: 1,
        launchStatus: 'active',
        riskLevel: 'low',
        emptyStateMessage: null,
      },
    ])
    render(<App />)
    expect(await screen.findByRole('button', { name: 'IT·개발' })).toBeInTheDocument()
  })

  it('shows today when hasCompletedOnboarding is true', async () => {
    vi.mocked(api.getUserInterests).mockResolvedValue({
      hasCompletedOnboarding: true,
      interests: [],
    })
    render(<App />)
    expect(await screen.findByText('오늘의 깸')).toBeInTheDocument()
  })
})
