import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, test } from 'vitest'

import App from '../../App.jsx'
import { TeamFlowProvider } from '../../state/TeamFlowProvider.jsx'
import { ProjectCard } from './components/ProjectCard.jsx'

function renderApp(initialEntry = '/projects') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <TeamFlowProvider><App /></TeamFlowProvider>
    </MemoryRouter>,
  )
}

describe('project overview', () => {
  test('redirects the root route and derives every project summary', async () => {
    renderApp('/')

    expect(await screen.findByRole('heading', { name: '내 프로젝트' })).toBeInTheDocument()
    expect(await screen.findAllByRole('article')).toHaveLength(4)
    expect(screen.getByRole('progressbar', { name: /TeamFlow.*진행률/ })).toHaveAttribute('aria-valuenow', '40')
  })

  test('filters by project title or description and shows an empty state', async () => {
    const user = userEvent.setup()
    renderApp()
    const search = await screen.findByRole('searchbox', { name: '프로젝트 검색' })

    await user.type(search, '공모전')
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(1))
    expect(screen.getByRole('heading', { name: '교내 창업 공모전 기획안' })).toBeInTheDocument()

    await user.clear(search)
    await user.type(search, '없는 프로젝트')
    expect(await screen.findByText('검색 결과가 없습니다.')).toBeInTheDocument()
  })

  test('creates a project in session state and opens its dashboard', async () => {
    const user = userEvent.setup()
    renderApp()
    await screen.findByRole('heading', { name: '내 프로젝트' })

    await user.click(screen.getByRole('button', { name: /새 프로젝트/ }))
    const dialog = screen.getByRole('dialog', { name: '새 프로젝트 만들기' })
    expect(dialog).toBeInTheDocument()
    await user.type(screen.getByLabelText(/프로젝트 이름/), '테스트 프로젝트')
    await user.type(screen.getByLabelText(/설명/), '세션 상태 연동 확인')
    await user.click(screen.getByRole('button', { name: '프로젝트 만들기' }))

    const cardTitle = await screen.findByRole('heading', { name: '테스트 프로젝트' })
    await user.click(cardTitle.closest('button'))
    expect(await screen.findByRole('heading', { name: '테스트 프로젝트' })).toBeInTheDocument()
  })

  test('clamps invalid progress values at the component boundary', () => {
    render(
      <ProjectCard
        project={{
          id: 'boundary', name: '경계값 프로젝트', description: '진행률 경계 테스트', status: 'in_progress', progress: 140, members: [], startDate: '2026-07-01', endDate: '2026-07-31',
        }}
      />,
    )
    expect(screen.getByRole('progressbar', { name: '경계값 프로젝트 진행률' })).toHaveAttribute('aria-valuenow', '100')
  })
})
