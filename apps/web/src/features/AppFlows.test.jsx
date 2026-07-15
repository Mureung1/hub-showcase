import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, test } from 'vitest'

import App from '../App.jsx'
import { MarkdownPreview } from './notes/MarkdownPreview.jsx'
import { TeamFlowProvider } from '../state/TeamFlowProvider.jsx'

function renderApp(initialEntry) {
  return render(<MemoryRouter initialEntries={[initialEntry]}><TeamFlowProvider><App /></TeamFlowProvider></MemoryRouter>)
}

describe('connected prototype flows', () => {
  test('creates a task, exposes it in both task views, and closes details with Escape', async () => {
    const user = userEvent.setup()
    renderApp('/projects/1/tasks')
    expect(await screen.findByRole('heading', { name: '할 일 관리' })).toBeInTheDocument()

    const existingTask = screen.getByRole('button', { name: '기획서 최종 정리 상세 보기' })
    existingTask.focus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('dialog', { name: '할 일 상세' })).toBeInTheDocument()
    await user.keyboard('{Escape}')

    await user.click(screen.getByRole('button', { name: /새 할 일/ }))
    const titleInput = screen.getByLabelText(/할 일 제목/)
    expect(titleInput).toHaveFocus()
    await user.type(titleInput, '연결 테스트 업무')
    fireEvent.change(screen.getByLabelText(/마감일/), { target: { value: '2026-07-30' } })
    await user.click(screen.getByRole('button', { name: '할 일 추가' }))

    await user.click(await screen.findByText('연결 테스트 업무'))
    expect(screen.getByRole('dialog', { name: '할 일 상세' })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: '할 일 상세' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '보드' }))
    expect(screen.getByRole('button', { name: '보드' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('연결 테스트 업무')).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: '대시보드' }))
    expect(await screen.findByRole('progressbar')).toHaveAttribute('aria-valuenow', '36')
    const dashboardTask = screen.getByRole('button', { name: '연결 테스트 업무 상세 보기' })
    dashboardTask.focus()
    await user.keyboard(' ')
    expect(screen.getByRole('dialog', { name: '할 일 상세' })).toBeInTheDocument()
  })

  test('creates a note from a template, edits it, and previews unsafe markup as text', async () => {
    const user = userEvent.setup()
    renderApp('/projects/1/notes')
    expect(await screen.findByRole('heading', { name: '공유 노트' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '새 노트 만들기' }))
    const dialog = screen.getByRole('dialog', { name: '템플릿 선택' })
    await user.click(within(dialog).getByRole('button', { name: '빈 문서' }))

    const title = screen.getByPlaceholderText('제목 없음')
    fireEvent.change(title, { target: { value: '안전한 노트' } })
    const editor = screen.getByPlaceholderText(/내용을 자유롭게/)
    fireEvent.change(editor, { target: { value: '# 요약\n\n<img src=x onerror="alert(1)">' } })
    await user.click(screen.getByRole('button', { name: '미리보기' }))
    expect(screen.getByRole('heading', { name: '요약' })).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getAllByText(/<img src=x/).length).toBeGreaterThan(0)
  })

  test('adds a project member and reflects it on the project screen', async () => {
    const user = userEvent.setup()
    renderApp('/projects/1/members')
    expect(await screen.findByRole('heading', { name: '팀원 관리' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '팀원 추가' }))
    const dialog = screen.getByRole('dialog', { name: '팀원 추가' })
    await user.type(screen.getByLabelText(/이름/), '박코덱스')
    await user.type(screen.getByLabelText(/역할/), '프론트엔드 개발')
    await user.click(within(dialog).getByRole('button', { name: '팀원 추가' }))
    expect(await screen.findByRole('heading', { name: '박코덱스' })).toBeInTheDocument()
  })

  test('adds, filters, sorts, and opens a resource', async () => {
    const user = userEvent.setup()
    renderApp('/projects/1/resources')
    expect(await screen.findByRole('heading', { name: '자료실' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '자료 추가' }))
    const dialog = screen.getByRole('dialog', { name: '자료 추가' })
    await user.type(screen.getByLabelText(/자료 이름/), '테스트 명세서.md')
    await user.type(screen.getByLabelText(/설명/), '자료실 연결 확인')
    await user.click(within(dialog).getByRole('button', { name: '자료 추가' }))

    const search = screen.getByRole('searchbox', { name: '자료 검색' })
    await user.type(search, '테스트 명세서')
    const row = await screen.findByText('테스트 명세서.md')
    await user.click(row)
    expect(screen.getByRole('dialog', { name: '자료 상세' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '확인' }))
    await user.click(screen.getByRole('button', { name: /오래된 자료부터 정렬/ }))
  })

  test('saves AI settings and turns a briefing into an AI-owned task', async () => {
    const user = userEvent.setup()
    renderApp('/projects/1/ai')
    expect(await screen.findByRole('heading', { name: 'AI 팀원 관리' })).toBeInTheDocument()
    const instructions = screen.getByRole('textbox', { name: 'AI 역할 지시사항' })
    await user.clear(instructions)
    await user.type(instructions, '출처를 확인하고 요약해 주세요.')
    await user.click(screen.getByRole('button', { name: '저장' }))
    expect(await screen.findByText('역할 지시사항을 저장했습니다.')).toBeInTheDocument()

    await user.type(screen.getByLabelText(/작업 제목/), 'AI 경쟁사 조사')
    await user.click(screen.getByRole('button', { name: '브리핑 제출' }))
    expect(await screen.findByText(/AI 담당 할 일을 생성했습니다/)).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: '할 일' }))
    expect(await screen.findByText('AI 경쟁사 조사')).toBeInTheDocument()
  })

  test('redirects unsupported project URLs and safely renders markdown-like input', async () => {
    renderApp('/projects/not-found/tasks')
    expect(await screen.findByRole('heading', { name: '내 프로젝트' })).toBeInTheDocument()

    render(<MarkdownPreview content={'# 안전한 미리보기\n\n<img src=x onerror="alert(1)">'} />)
    expect(screen.getByRole('heading', { name: '안전한 미리보기' })).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText(/<img src=x/)).toBeInTheDocument()
  })
})
