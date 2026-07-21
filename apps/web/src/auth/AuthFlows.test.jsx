import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, test, vi } from 'vitest'

import App from '../App.jsx'
import { testTeamFlowRepository } from '../test/createTestTeamFlowRepository.js'
import { authenticatedSession, createTestAuthClient } from '../test/renderTeamFlowApp.jsx'
import { AuthProvider } from './AuthProvider.jsx'

function renderWithAuth({ initialEntry = '/', client = createTestAuthClient(null), guestRepository = testTeamFlowRepository } = {}) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuthProvider client={client}>
        <App authenticatedRepository={testTeamFlowRepository} guestRepository={guestRepository} />
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('TeamFlow authentication flows', () => {
  test('redirects a protected URL to the public landing page', async () => {
    renderWithAuth({ initialEntry: '/projects/project-1/tasks' })

    expect(await screen.findByRole('heading', { name: /팀의 흐름이/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Google로 계속하기' })).toBeInTheDocument()
  })

  test('starts Google OAuth with the requested protected path', async () => {
    const user = userEvent.setup()
    const client = createTestAuthClient(null)
    client.auth.signInWithOAuth = vi.fn(async () => ({ data: {}, error: null }))
    renderWithAuth({ initialEntry: '/?returnTo=%2Fprojects%2Fproject-1%2Ftasks', client })

    await user.click(await screen.findByRole('button', { name: 'Google로 계속하기' }))

    expect(client.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: `${globalThis.location.origin}/auth/callback` },
    })
    expect(globalThis.sessionStorage.getItem('teamflow:return-to')).toBe('/projects/project-1/tasks')
  })

  test('enters and exits the read-only guest workspace', async () => {
    const user = userEvent.setup()
    const guestRepository = {
      ...testTeamFlowRepository,
      load: async () => ({
        ...await testTeamFlowRepository.load(),
        accessMode: 'guest',
        capabilities: { projects: false, members: false, tasks: false, notes: false, resources: false, ai: false },
      }),
    }
    renderWithAuth({ guestRepository })

    await user.click(await screen.findByRole('button', { name: /게스트로 둘러보기/ }))
    expect(await screen.findByRole('heading', { name: '내 프로젝트' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /새 프로젝트/ })).not.toBeInTheDocument()
    expect(screen.getAllByText('읽기 전용 데모').length).toBeGreaterThan(0)
    expect(globalThis.sessionStorage.getItem('teamflow:guest')).toBe('1')

    await user.click(screen.getByRole('button', { name: '게스트 모드 종료' }))
    expect(await screen.findByRole('button', { name: 'Google로 계속하기' })).toBeInTheDocument()
    expect(globalThis.sessionStorage.getItem('teamflow:guest')).toBeNull()
  })

  test('restores an authenticated session and renders the account identity', async () => {
    renderWithAuth({ initialEntry: '/projects', client: createTestAuthClient(authenticatedSession) })

    expect(await screen.findByRole('heading', { name: '내 프로젝트' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('테스트 사용자')).toBeInTheDocument())
    expect(screen.getByText('tester@example.com')).toBeInTheDocument()
  })
})
