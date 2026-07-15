import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, test } from 'vitest'

import App from '../../App.jsx'
import { ProjectCard } from './components/ProjectCard.jsx'

function renderApp(initialEntry = '/projects') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <App />
    </MemoryRouter>,
  )
}

describe('project overview', () => {
  test('redirects the root route and renders all project summaries', async () => {
    renderApp('/')

    expect(await screen.findByRole('heading', { name: '내 프로젝트' })).toBeInTheDocument()
    expect(await screen.findAllByRole('article')).toHaveLength(4)
    expect(screen.getByRole('progressbar', { name: /TeamFlow.*진행률/ })).toHaveAttribute(
      'aria-valuenow',
      '40',
    )
  })

  test('filters projects by title and description as the user types', async () => {
    const user = userEvent.setup()
    renderApp()
    const search = await screen.findByRole('searchbox', { name: '프로젝트 검색' })

    await user.type(search, '공모전')
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(1))
    expect(screen.getByRole('heading', { name: '교내 창업 공모전 기획안' })).toBeInTheDocument()

    await user.clear(search)
    await user.type(search, '개인화 일정')
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(1))
    expect(screen.getByRole('heading', { name: '캡스톤 디자인 (졸업작품)' })).toBeInTheDocument()
  })

  test('shows an explicit empty state for an unmatched query', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.type(await screen.findByRole('searchbox', { name: '프로젝트 검색' }), '없는 프로젝트')

    expect(await screen.findByText('검색 결과가 없습니다.')).toBeInTheDocument()
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })

  test('keeps keyboard focus order predictable and clamps invalid progress values', async () => {
    const user = userEvent.setup()
    renderApp()

    await screen.findAllByRole('article')
    await user.tab()
    expect(screen.getByRole('link', { name: '프로젝트' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('searchbox', { name: '프로젝트 검색' })).toHaveFocus()

    render(
      <ProjectCard
        project={{
          id: 'boundary',
          name: '경계값 프로젝트',
          description: '진행률 경계값 테스트',
          status: 'in_progress',
          progress: 140,
          members: [],
          startDate: '2026-07-01',
          endDate: '2026-07-31',
        }}
      />,
    )

    expect(screen.getByRole('progressbar', { name: '경계값 프로젝트 진행률' })).toHaveAttribute(
      'aria-valuenow',
      '100',
    )
  })
})
