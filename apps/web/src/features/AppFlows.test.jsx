import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'vitest'

import { MarkdownPreview } from './notes/MarkdownPreview.jsx'
import { testTeamFlowRepository } from '../test/createTestTeamFlowRepository.js'
import { renderAuthenticatedApp as renderApp } from '../test/renderTeamFlowApp.jsx'

describe('connected prototype flows', () => {
  test('validates and updates the project period across dashboard and project list', async () => {
    const user = userEvent.setup()
    renderApp('/projects/1')
    expect(await screen.findByRole('heading', { name: '팀플 관리 웹서비스 (TeamFlow)' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '프로젝트 기간 수정' }))
    const dialog = screen.getByRole('dialog', { name: '프로젝트 기간 수정' })
    fireEvent.change(within(dialog).getByLabelText(/시작일/), { target: { value: '2026-08-10' } })
    fireEvent.change(within(dialog).getByLabelText(/종료일/), { target: { value: '2026-08-09' } })
    await user.click(within(dialog).getByRole('button', { name: '기간 저장' }))
    expect(within(dialog).getByRole('alert')).toHaveTextContent('종료일은 시작일보다 빠를 수 없습니다.')

    fireEvent.change(within(dialog).getByLabelText(/종료일/), { target: { value: '2026-08-31' } })
    await user.click(within(dialog).getByRole('button', { name: '기간 저장' }))
    expect(screen.queryByRole('dialog', { name: '프로젝트 기간 수정' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '프로젝트 기간 수정' })).toHaveTextContent('08.10 ~ 08.31')

    await user.click(screen.getByRole('link', { name: '내 프로젝트' }))
    expect(await screen.findByRole('heading', { name: '내 프로젝트' })).toBeInTheDocument()
    const projectCard = screen.getByRole('button', { name: '팀플 관리 웹서비스 (TeamFlow) 프로젝트 열기' })
    expect(projectCard).toHaveTextContent('08.10 ~ 08.31')
  })

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
    const dashboardTable = screen.getByRole('table')
    const dashboardRows = within(dashboardTable).getAllByRole('button')
    expect(dashboardRows).toHaveLength(7)
    expect(dashboardRows[0]).toHaveAccessibleName('DB 테이블 스키마 설계 상세 보기')
    expect(dashboardRows.at(-1)).toHaveAccessibleName('연결 테스트 업무 상세 보기')
    expect(within(dashboardTable).queryByText('기획서 최종 정리')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /할 일 관리에서 전체 보기/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '디자인 시스템 컬러 & 타이포그래피 규칙 노트 열기' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '자료 조사 링크 모음 (AI 요약본) 노트 열기' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '팀플 관리 서비스 기획 아이디어 및 차별점 노트 열기' })).toBeInTheDocument()
    const dashboardTask = screen.getByRole('button', { name: '연결 테스트 업무 상세 보기' })
    dashboardTask.focus()
    await user.keyboard(' ')
    const dashboardDialog = screen.getByRole('dialog', { name: '할 일 상세' })
    await user.click(within(dashboardDialog).getByRole('button', { name: '할 일 삭제' }))
    expect(within(dashboardDialog).getByText('이 할 일을 삭제할까요?')).toBeInTheDocument()
    await user.click(within(dashboardDialog).getByRole('button', { name: '삭제하기' }))
    expect(screen.queryByRole('dialog', { name: '할 일 상세' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '연결 테스트 업무 상세 보기' })).not.toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '40')
  })

  test('creates a note from a template, edits it, and previews unsafe markup as text', async () => {
    const user = userEvent.setup()
    renderApp('/projects/1/notes?note=note-3')
    expect(await screen.findByRole('heading', { name: '공유 노트' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('제목 없음')).toHaveValue('디자인 시스템 컬러 & 타이포그래피 규칙')
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

  test('keeps the task modal open when persistent creation fails', async () => {
    const user = userEvent.setup()
    const failingRepository = {
      ...testTeamFlowRepository,
      createTask: async () => {
        throw new Error('할 일을 저장하지 못했습니다.')
      },
    }
    renderApp('/projects/1/tasks', failingRepository)
    expect(await screen.findByRole('heading', { name: '할 일 관리' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /새 할 일/ }))
    await user.type(screen.getByLabelText(/할 일 제목/), '실패 테스트')
    fireEvent.change(screen.getByLabelText(/마감일/), { target: { value: '2026-07-30' } })
    await user.click(screen.getByRole('button', { name: '할 일 추가' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('할 일을 저장하지 못했습니다.')
    expect(screen.getByRole('dialog', { name: '새 할 일 추가' })).toBeInTheDocument()
  })

  test('changes task status from list and details, and sorts every list column', async () => {
    const user = userEvent.setup()
    renderApp('/projects/1/tasks')
    expect(await screen.findByRole('heading', { name: '할 일 관리' })).toBeInTheDocument()

    for (const label of ['할 일 제목', '담당자', '마감일', '진행 상태']) {
      const header = screen.getByRole('button', { name: new RegExp(label) })
      await user.click(header)
      expect(header.closest('th')).toHaveAttribute('aria-sort', 'ascending')
      await user.click(header)
      expect(header.closest('th')).toHaveAttribute('aria-sort', 'descending')
    }

    const dueDateHeader = screen.getByRole('button', { name: /마감일/ })
    await user.click(dueDateHeader)
    const table = screen.getByRole('table')
    expect(within(table).getAllByRole('button', { name: /상세 보기/ })[0]).toHaveAccessibleName('초기 회의 일정 조율 상세 보기')

    const statusSelect = screen.getByRole('combobox', { name: '기획서 최종 정리 진행 상태' })
    await user.selectOptions(statusSelect, 'in_progress')
    expect(statusSelect).toHaveValue('in_progress')

    await user.click(screen.getByRole('button', { name: '기획서 최종 정리 상세 보기' }))
    const dialog = screen.getByRole('dialog', { name: '할 일 상세' })
    await user.click(within(dialog).getByRole('button', { name: '검토 중' }))
    expect(within(dialog).getByRole('button', { name: '검토 중' })).toHaveAttribute('aria-pressed', 'true')
    await user.keyboard('{Escape}')
    expect(statusSelect).toHaveValue('in_review')

    await user.click(screen.getByRole('button', { name: '보드' }))
    const boardTask = screen.getByRole('button', { name: /기획서 최종 정리/ })
    expect(boardTask.closest('section')).toHaveTextContent('검토 중')
    await user.click(screen.getByRole('link', { name: '대시보드' }))
    expect(await screen.findByRole('progressbar')).toHaveAttribute('aria-valuenow', '30')
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

  test('navigates folders and creates a file in a selected Drive-like location', async () => {
    const user = userEvent.setup()
    renderApp('/projects/1/resources')
    expect(await screen.findByRole('heading', { name: '자료실' })).toBeInTheDocument()

    expect(screen.queryByText('PRD_요구사항정의서.md')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /회의 자료 및 녹음본/ }))
    expect(screen.getByRole('heading', { name: /자료실.*회의 자료 및 녹음본/ })).toBeInTheDocument()
    expect(screen.getByText('PRD_요구사항정의서.md')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '자료실' }))

    await user.click(screen.getByRole('button', { name: '새 폴더' }))
    const folderDialog = screen.getByRole('dialog', { name: '새 폴더' })
    await user.type(within(folderDialog).getByLabelText(/폴더 이름/), '테스트 폴더')
    await user.click(within(folderDialog).getByRole('button', { name: '폴더 만들기' }))
    expect(await screen.findByRole('button', { name: /테스트 폴더/ })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '자료 추가' }))
    const dialog = screen.getByRole('dialog', { name: '자료 추가' })
    await user.type(screen.getByLabelText(/자료 이름/), '테스트 명세서.md')
    await user.type(screen.getByLabelText(/설명/), '자료실 연결 확인')
    await user.selectOptions(screen.getByLabelText(/위치/), screen.getByRole('option', { name: '테스트 폴더' }))
    await user.click(within(dialog).getByRole('button', { name: '자료 추가' }))

    expect(screen.queryByText('테스트 명세서.md')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /테스트 폴더/ }))
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
