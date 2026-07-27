import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RESOURCE_TYPE, RESOURCE_UPLOAD, TASK_STATUS } from '@teamflow/shared'
import { describe, expect, test, vi } from 'vitest'

import { MarkdownPreview } from './notes/MarkdownPreview.jsx'
import { testTeamFlowRepository } from '../test/createTestTeamFlowRepository.js'
import { renderAuthenticatedApp as renderApp } from '../test/renderTeamFlowApp.jsx'

describe('connected prototype flows', () => {
  test('opens account details and restores focus when the panel closes', async () => {
    const user = userEvent.setup()
    renderApp('/projects/1')
    expect(await screen.findByRole('heading', { name: '팀플 관리 웹서비스 (TeamFlow)' })).toBeInTheDocument()

    const trigger = screen.getByRole('button', { name: '테스트 사용자 계정 메뉴' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')

    await user.click(trigger)
    const dialog = screen.getByRole('dialog', { name: '계정 및 설정' })
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(within(dialog).getByText('테스트 사용자')).toBeInTheDocument()
    expect(within(dialog).getByText('tester@example.com')).toBeInTheDocument()
    expect(within(dialog).getByText('Google')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /받은 프로젝트 초대.*0건/ })).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: '계정 및 설정' })).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()

    await user.click(screen.getByRole('button', { name: '사이드바 접기' }))
    await user.click(screen.getByRole('button', { name: '테스트 사용자 계정 메뉴' }))
    expect(screen.getByRole('dialog', { name: '계정 및 설정' })).toBeInTheDocument()

    await user.click(screen.getByRole('heading', { name: '팀플 관리 웹서비스 (TeamFlow)' }))
    expect(screen.queryByRole('dialog', { name: '계정 및 설정' })).not.toBeInTheDocument()
  })

  test('verifies and removes a personal Gemini API key from account settings', async () => {
    const user = userEvent.setup()
    const payload = await testTeamFlowRepository.load()
    const disconnected = {
      provider: 'gemini', configured: false, keyHint: '', verifiedAt: null,
    }
    const connected = {
      provider: 'gemini', configured: true, keyHint: '1234', verifiedAt: '2026-07-27T03:00:00.000Z',
    }
    const getAiCredential = vi.fn(async () => disconnected)
    const saveAiCredential = vi.fn(async () => connected)
    const deleteAiCredential = vi.fn(async () => disconnected)
    const repository = {
      ...testTeamFlowRepository,
      load: async () => ({ ...payload, aiCredential: disconnected }),
      getAiCredential,
      saveAiCredential,
      deleteAiCredential,
    }

    renderApp('/projects/1', repository)
    expect(await screen.findByRole('heading', { name: '팀플 관리 웹서비스 (TeamFlow)' })).toBeInTheDocument()
    const accountTrigger = screen.getByRole('button', { name: '테스트 사용자 계정 메뉴' })
    await user.click(accountTrigger)
    await user.click(within(screen.getByRole('dialog', { name: '계정 및 설정' })).getByRole('button', { name: /AI API 설정/ }))

    const dialog = screen.getByRole('dialog', { name: 'Gemini API 설정' })
    const apiKeyInput = within(dialog).getByLabelText('Gemini API 키')
    const saveButton = within(dialog).getByRole('button', { name: '저장 및 연결 확인' })
    expect(apiKeyInput).toHaveAttribute('type', 'password')
    expect(saveButton).toBeDisabled()
    await waitFor(() => expect(getAiCredential).toHaveBeenCalledTimes(1))

    await user.type(apiKeyInput, 'private-gemini-key')
    await user.click(within(dialog).getByRole('checkbox', { name: /무료 티어 데이터 처리 안내에 동의/ }))
    await user.click(saveButton)

    await waitFor(() => expect(saveAiCredential).toHaveBeenCalledWith({
      apiKey: 'private-gemini-key',
      acknowledgedFreeTierPolicy: true,
    }))
    expect(apiKeyInput).toHaveValue('')
    expect(within(dialog).getByText('1234')).toBeInTheDocument()
    expect(within(dialog).queryByDisplayValue('private-gemini-key')).not.toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: '저장된 키 삭제' }))
    await waitFor(() => expect(deleteAiCredential).toHaveBeenCalledTimes(1))
    expect(within(dialog).getByText('연결된 API 키가 없습니다.')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: '닫기' }))
    expect(accountTrigger).toHaveFocus()
  })

  test('opens received invitations from the account panel', async () => {
    const user = userEvent.setup()
    const payload = await testTeamFlowRepository.load()
    const repository = {
      ...testTeamFlowRepository,
      load: async () => ({
        ...payload,
        invitations: [{
          id: 'received-invitation',
          projectId: 'shared-project',
          projectName: '초대받은 프로젝트',
          inviteeEmail: 'tester@example.com',
          inviterName: '초대한 사용자',
          status: 'pending',
          direction: 'received',
        }],
      }),
    }
    renderApp('/projects/1', repository)
    expect(await screen.findByRole('heading', { name: '팀플 관리 웹서비스 (TeamFlow)' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '테스트 사용자 계정 메뉴' }))
    await user.click(within(screen.getByRole('dialog', { name: '계정 및 설정' })).getByRole('button', { name: /받은 프로젝트 초대.*1건/ }))

    expect(await screen.findByRole('heading', { name: '내 프로젝트' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '받은 프로젝트 초대' })).toBeInTheDocument()
    expect(screen.getByText('초대받은 프로젝트')).toBeInTheDocument()
  })

  test('keeps project sidebar controls within dedicated touch targets', async () => {
    const user = userEvent.setup()
    renderApp('/projects/1')
    expect(await screen.findByRole('heading', { name: '팀플 관리 웹서비스 (TeamFlow)' })).toBeInTheDocument()

    const collapseButton = screen.getByRole('button', { name: '사이드바 접기' })
    const logoutButton = screen.getByRole('button', { name: '로그아웃' })
    expect(getComputedStyle(collapseButton).width).toBe('40px')
    expect(getComputedStyle(collapseButton).height).toBe('40px')
    expect(getComputedStyle(logoutButton).width).toBe('36px')
    expect(getComputedStyle(logoutButton).height).toBe('36px')

    await user.click(collapseButton)
    expect(screen.getByRole('button', { name: '사이드바 펼치기' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('button', { name: '로그아웃' })).toBeInTheDocument()
    expect(screen.queryByText('테스트 사용자')).not.toBeInTheDocument()
  })

  test('keeps the priority task card at the fully expanded panel height and shows empty panels', async () => {
    const user = userEvent.setup()
    const payload = await testTeamFlowRepository.load()
    const repository = {
      ...testTeamFlowRepository,
      load: async () => ({
        ...payload,
        notes: payload.notes.filter((note) => note.projectId !== '1'),
        resources: payload.resources.filter((resource) => resource.projectId !== '1'),
      }),
    }
    const rectSpy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      bottom: 444,
      height: 444,
      left: 0,
      right: 0,
      top: 0,
      width: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })

    try {
      renderApp('/projects/1', repository)
      expect(await screen.findByText('공유 노트가 없습니다.')).toBeInTheDocument()
      expect(screen.getByText('등록된 자료가 없습니다.')).toBeInTheDocument()

      const tasksCard = screen.getByRole('heading', { name: '우선 할 일' }).closest('section')
      await waitFor(() => expect(tasksCard.style.getPropertyValue('--dashboard-expanded-side-height')).toBe('444px'))

      await user.click(screen.getByRole('button', { name: /공유 노트.*0개/ }))
      expect(tasksCard.style.getPropertyValue('--dashboard-expanded-side-height')).toBe('444px')
    } finally {
      rectSpy.mockRestore()
    }
  })

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
    const assigneeSelect = screen.getByLabelText(/담당 팀원/)
    expect(within(assigneeSelect).getByRole('option', { name: '김민지' })).toBeInTheDocument()
    expect(within(assigneeSelect).getByRole('option', { name: '자료조사 AI' })).toBeInTheDocument()
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

  test('shows collaborators without the removed manual assignee controls', async () => {
    renderApp('/projects/1/members')
    expect(await screen.findByRole('heading', { name: '팀원 관리' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '담당자 추가' })).not.toBeInTheDocument()
    expect(screen.queryByText('로그인 계정 없이 할 일을 배정하기 위한 프로젝트 내 담당자입니다.')).not.toBeInTheDocument()
  })

  test('creates a note from a template, edits it, and previews unsafe markup as text', async () => {
    const user = userEvent.setup()
    renderApp('/projects/1/notes?note=note-3')
    expect(await screen.findByRole('heading', { name: '공유 노트' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '디자인 시스템 컬러 & 타이포그래피 규칙' })).toBeInTheDocument()
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

  test('auto-saves note drafts and flushes a newer draft before internal navigation', async () => {
    const user = userEvent.setup()
    const updates = []
    const repository = {
      ...testTeamFlowRepository,
      updateNote: async (noteId, patch) => {
        updates.push({ noteId, patch })
        return { noteId, patch }
      },
    }
    renderApp('/projects/1/notes?note=note-3', repository)
    await user.click(await screen.findByRole('button', { name: '편집으로 돌아가기' }))
    const title = await screen.findByPlaceholderText('제목 없음')

    fireEvent.change(title, { target: { value: '800ms 자동 저장 확인' } })
    expect(await screen.findByText('저장됨', {}, { timeout: 2_000 })).toBeInTheDocument()
    expect(updates.at(-1)).toMatchObject({ noteId: 'note-3', patch: { title: '800ms 자동 저장 확인' } })

    fireEvent.change(title, { target: { value: '이동 전 저장 확인' } })
    await user.click(screen.getByRole('link', { name: '할 일' }))
    expect(await screen.findByRole('heading', { name: '할 일 관리' })).toBeInTheDocument()
    expect(updates.at(-1)).toMatchObject({ noteId: 'note-3', patch: { title: '이동 전 저장 확인' } })
  })

  test('waits for a pending note save before browser history navigation', async () => {
    const user = userEvent.setup()
    const updates = []
    let completeSave
    const repository = {
      ...testTeamFlowRepository,
      updateNote: (noteId, patch) => {
        updates.push({ noteId, patch })
        return new Promise((resolve) => {
          completeSave = () => resolve({ noteId, patch })
        })
      },
    }
    const { router } = renderApp('/projects/1/tasks', repository)
    expect(await screen.findByRole('heading', { name: '할 일 관리' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: '공유 노트' }))
    await user.click(await screen.findByRole('button', { name: '편집으로 돌아가기' }))
    const title = await screen.findByPlaceholderText('제목 없음')
    fireEvent.change(title, { target: { value: '뒤로 가기 저장 확인' } })

    const navigation = router.navigate(-1)
    expect(await screen.findByRole('status')).toHaveTextContent('저장 중')
    expect(screen.getByRole('heading', { name: '공유 노트' })).toBeInTheDocument()
    expect(updates.at(-1)).toMatchObject({ noteId: 'note-3', patch: { title: '뒤로 가기 저장 확인' } })

    completeSave()
    await navigation
    expect(await screen.findByRole('heading', { name: '할 일 관리' })).toBeInTheDocument()
  })

  test('opens existing notes in view mode and sorts the list by update, creation, or title', async () => {
    const user = userEvent.setup()
    const payload = await testTeamFlowRepository.load()
    const repository = {
      ...testTeamFlowRepository,
      load: async () => ({
        ...payload,
        notes: payload.notes.map((note) => {
          if (note.id === 'note-1') return { ...note, title: 'C note', createdAt: '2026-07-30T00:00:00.000Z' }
          if (note.id === 'note-2') return { ...note, title: 'A note', createdAt: '2026-07-10T00:00:00.000Z' }
          if (note.id === 'note-3') return { ...note, title: 'B note', createdAt: '2026-07-20T00:00:00.000Z' }
          return note
        }),
      }),
    }

    renderApp('/projects/1/notes', repository)
    const noteList = await screen.findByRole('complementary', { name: '노트 목록' })
    const firstNoteButton = () => within(noteList).getAllByRole('button').find((button) => button.querySelector('strong'))

    expect(firstNoteButton()).toHaveTextContent('B note')
    expect(screen.getByRole('button', { name: '편집으로 돌아가기' })).toBeInTheDocument()

    await user.selectOptions(within(noteList).getByRole('combobox', { name: '노트 정렬' }), 'created')
    expect(firstNoteButton()).toHaveTextContent('C note')

    await user.selectOptions(within(noteList).getByRole('combobox', { name: '노트 정렬' }), 'title')
    expect(firstNoteButton()).toHaveTextContent('A note')
  })

  test('labels notes whose author has left the project', async () => {
    const payload = await testTeamFlowRepository.load()
    const repository = {
      ...testTeamFlowRepository,
      load: async () => ({
        ...payload,
        notes: payload.notes.map((note) => note.id === 'note-3' ? { ...note, authorId: null } : note),
      }),
    }

    renderApp('/projects/1/notes?note=note-3', repository)
    expect((await screen.findAllByText('탈퇴한 사용자')).length).toBeGreaterThanOrEqual(2)
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
      const columnHeader = screen.getByRole('columnheader', { name: new RegExp(`^${label}`) })
      const header = within(columnHeader).getByRole('button')
      await user.click(header)
      expect(header.closest('th')).toHaveAttribute('aria-sort', 'ascending')
      await user.click(header)
      expect(header.closest('th')).toHaveAttribute('aria-sort', 'descending')
    }

    const dueDateHeader = screen.getByRole('button', { name: /마감일/ })
    await user.click(dueDateHeader)
    const table = screen.getByRole('table')
    expect(within(table).getAllByRole('button', { name: /상세 보기/ })[0]).toHaveAccessibleName('초기 회의 일정 조율 상세 보기')

    const statusMenu = screen.getByRole('button', { name: '기획서 최종 정리 진행 상태' })
    await user.click(statusMenu)
    await user.click(screen.getByRole('option', { name: '진행 중' }))
    expect(statusMenu).toHaveTextContent('진행 중')

    await user.click(screen.getByRole('button', { name: '기획서 최종 정리 상세 보기' }))
    const dialog = screen.getByRole('dialog', { name: '할 일 상세' })
    await user.click(within(dialog).getByRole('button', { name: '검토 중' }))
    expect(within(dialog).getByRole('button', { name: '검토 중' })).toHaveAttribute('aria-pressed', 'true')
    await user.keyboard('{Escape}')
    expect(statusMenu).toHaveTextContent('검토 중')

    await user.click(screen.getByRole('button', { name: '보드' }))
    const boardTask = screen.getByRole('button', { name: /기획서 최종 정리/ })
    expect(boardTask.closest('section')).toHaveTextContent('검토 중')
    await user.click(screen.getByRole('link', { name: '대시보드' }))
    expect(await screen.findByRole('progressbar')).toHaveAttribute('aria-valuenow', '30')
  })

  test('navigates folders and creates a file in a selected Drive-like location', async () => {
    const user = userEvent.setup()
    renderApp('/projects/1/resources')
    expect(await screen.findByRole('heading', { name: '자료실' })).toBeInTheDocument()

    expect(screen.queryByText('PRD_요구사항정의서.md')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '회의 자료 및 녹음본 폴더 열기' }))
    expect(screen.getByRole('heading', { name: /자료실.*회의 자료 및 녹음본/ })).toBeInTheDocument()
    expect(screen.getByText('PRD_요구사항정의서.md')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '자료실' }))

    await user.click(screen.getByRole('button', { name: '새 폴더' }))
    const folderDialog = screen.getByRole('dialog', { name: '새 폴더' })
    await user.type(within(folderDialog).getByLabelText(/폴더 이름/), '테스트 폴더')
    await user.click(within(folderDialog).getByRole('button', { name: '폴더 만들기' }))
    expect(await screen.findByRole('button', { name: '테스트 폴더 폴더 열기' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '자료 추가' }))
    const dialog = screen.getByRole('dialog', { name: '자료 추가' })
    const selectedFile = new File(['test spec'], '테스트 명세서.md', { type: 'text/markdown' })
    await user.upload(within(dialog).getByLabelText(/업로드할 파일/), selectedFile)
    expect(within(dialog).getByText('테스트 명세서.md', { selector: 'strong' })).toBeInTheDocument()
    expect(within(dialog).getByText(/9 B.*최대 6MB/)).toBeInTheDocument()
    await user.type(within(dialog).getByLabelText(/설명/), '자료실 연결 확인')
    await user.selectOptions(within(dialog).getByLabelText(/위치/), within(dialog).getByRole('option', { name: '테스트 폴더' }))
    await user.click(within(dialog).getByRole('button', { name: '파일 업로드' }))

    expect(screen.queryByText('테스트 명세서.md')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '테스트 폴더 폴더 열기' }))
    const search = screen.getByRole('searchbox', { name: '자료 검색' })
    await user.type(search, '테스트 명세서')
    const row = await screen.findByText('테스트 명세서.md')
    await user.click(row)
    const detailDialog = screen.getByRole('dialog', { name: '자료 상세' })
    expect(within(detailDialog).getByText('테스트 명세서.md', { selector: 'dd' })).toBeInTheDocument()
    expect(within(detailDialog).getByText('9 B')).toBeInTheDocument()

    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    await user.click(within(detailDialog).getByRole('button', { name: '파일 다운로드' }))
    await waitFor(() => expect(anchorClick).toHaveBeenCalledTimes(1))
    anchorClick.mockRestore()

    await user.click(screen.getByRole('button', { name: '확인' }))
    await user.click(screen.getByRole('button', { name: /오래된 자료부터 정렬/ }))
  })

  test('blocks files larger than 6MB before starting an upload', async () => {
    const user = userEvent.setup()
    const uploadResource = vi.fn(testTeamFlowRepository.uploadResource)
    renderApp('/projects/1/resources', { ...testTeamFlowRepository, uploadResource })
    expect(await screen.findByRole('heading', { name: '자료실' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '자료 추가' }))
    const dialog = screen.getByRole('dialog', { name: '자료 추가' })
    const oversizedFile = new File(
      [new Uint8Array(RESOURCE_UPLOAD.MAX_BYTES + 1)],
      '용량초과.bin',
      { type: 'application/octet-stream' },
    )
    await user.upload(within(dialog).getByLabelText(/업로드할 파일/), oversizedFile)

    expect(within(dialog).getByRole('alert')).toHaveTextContent('파일은 1바이트 이상 6MB 이하여야 합니다.')
    expect(within(dialog).getByRole('button', { name: '파일 업로드' })).toBeDisabled()
    expect(uploadResource).not.toHaveBeenCalled()
  })

  test('keeps external links as an explicit non-upload resource option', async () => {
    const user = userEvent.setup()
    const createResource = vi.fn(testTeamFlowRepository.createResource)
    renderApp('/projects/1/resources', { ...testTeamFlowRepository, createResource })
    expect(await screen.findByRole('heading', { name: '자료실' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '자료 추가' }))
    const dialog = screen.getByRole('dialog', { name: '자료 추가' })
    await user.click(within(dialog).getByRole('radio', { name: '외부 링크' }))
    await user.type(within(dialog).getByLabelText(/자료 이름/), '외부 문서')
    await user.type(within(dialog).getByLabelText(/외부 URL/), 'https://example.com/docs')
    await user.click(within(dialog).getByRole('button', { name: '링크 추가' }))

    await waitFor(() => expect(createResource).toHaveBeenCalledWith('1', expect.objectContaining({
      name: '외부 문서',
      type: RESOURCE_TYPE.LINK,
      url: 'https://example.com/docs',
    })))
    expect(await screen.findByText('외부 문서')).toBeInTheDocument()
  })

  test('saves project AI settings, runs an assigned task, and applies the reviewed result', async () => {
    const user = userEvent.setup()
    const payload = await testTeamFlowRepository.load()
    const aiTask = {
      id: 'ai-open-task',
      projectId: '1',
      title: '경쟁 서비스 기능 비교',
      description: '저장된 자료를 기준으로 비교표를 만듭니다.',
      assigneeId: 'member-ai',
      dueDate: '2026-07-30',
      status: TASK_STATUS.NOT_STARTED,
    }
    const updateAiAgent = vi.fn(testTeamFlowRepository.updateAiAgent)
    const createAiRun = vi.fn(testTeamFlowRepository.createAiRun)
    const applyAiRun = vi.fn(testTeamFlowRepository.applyAiRun)
    const repository = {
      ...testTeamFlowRepository,
      load: async () => ({ ...payload, tasks: [...payload.tasks, aiTask] }),
      updateAiAgent,
      createAiRun,
      applyAiRun,
    }

    renderApp('/projects/1/ai', repository)
    expect(await screen.findByRole('heading', { name: 'AI Agent 관리' })).toBeInTheDocument()
    expect(screen.getByText('Mock 모드')).toBeInTheDocument()
    expect(screen.getByText('이름 · 역할')).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'AI Agent 색상' })).not.toBeInTheDocument()
    const instructions = screen.getByRole('textbox', { name: 'AI 역할 프롬프트' })
    await user.clear(instructions)
    await user.type(instructions, '출처를 확인하고 요약해 주세요.')
    await user.click(screen.getByLabelText(/팀원 역할/))
    await user.click(screen.getByRole('button', { name: '설정 저장' }))
    expect(await screen.findByText('AI Agent 설정을 저장했습니다.')).toBeInTheDocument()
    expect(updateAiAgent).toHaveBeenCalledWith('member-ai', expect.objectContaining({
      instructions: '출처를 확인하고 요약해 주세요.',
      contextConfig: {
        project: true,
        notes: true,
        tasks: true,
        team: true,
        resources: true,
      },
    }))

    expect(screen.getByRole('button', { name: '반영 완료' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: '모의 작업 실행' }))
    await waitFor(() => expect(createAiRun).toHaveBeenCalledWith('member-ai', aiTask.id))
    expect(await screen.findByRole('heading', { name: '모의 실행 결과' })).toBeInTheDocument()
    expect(screen.getAllByText('검토 대기').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: '검토 대기' })).toBeDisabled()
    const taskRow = screen
      .getAllByText(aiTask.title)
      .map((element) => element.closest('li'))
      .find(Boolean)
    expect(taskRow).toHaveTextContent('검토 중')

    await user.click(screen.getByRole('button', { name: '공유 노트로 반영' }))
    await waitFor(() => expect(applyAiRun).toHaveBeenCalledTimes(1))
    expect(screen.getAllByText('반영 완료').length).toBeGreaterThan(0)
    expect(taskRow).toHaveTextContent('완료')
    await user.click(screen.getByRole('link', { name: '반영된 공유 노트 보기' }))
    expect(await screen.findByRole('heading', { name: 'AI 결과 · Mock 작업' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'AI 팀원' }))

    const appliedTaskRow = screen
      .getAllByText(aiTask.title)
      .map((element) => element.closest('li'))
      .find((row) => row && within(row).queryByRole('button', { name: '반영 완료' }))
    expect(appliedTaskRow).not.toBeNull()
    expect(within(appliedTaskRow).getByRole('button', { name: '반영 완료' })).toHaveAttribute(
      'title',
      '공유 노트에 반영한 결과는 다시 실행할 수 없습니다.',
    )
    expect(createAiRun).toHaveBeenCalledTimes(1)
  })

  test('blocks live AI execution until the signed-in user connects a Gemini key', async () => {
    const user = userEvent.setup()
    const payload = await testTeamFlowRepository.load()
    const aiTask = {
      id: 'live-key-required-task',
      projectId: '1',
      title: '키 연결 후 실행할 조사',
      description: '',
      assigneeId: 'member-ai',
      dueDate: '2026-07-30',
      status: TASK_STATUS.NOT_STARTED,
    }
    const repository = {
      ...testTeamFlowRepository,
      load: async () => ({
        ...payload,
        tasks: [...payload.tasks, aiTask],
        aiExecution: {
          mode: 'live', provider: 'gemini', modelLabel: 'Gemini 3.5 Flash', credentialRequired: true,
        },
        aiCredential: {
          provider: 'gemini', configured: false, keyHint: '', verifiedAt: null,
        },
      }),
    }

    renderApp('/projects/1/ai', repository)

    expect(await screen.findByText('Gemini API 키 설정 필요')).toBeInTheDocument()
    expect(screen.queryByText('Mock 모드')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'AI 작업 실행' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'API 키 설정' }))
    expect(screen.getByRole('dialog', { name: 'Gemini API 설정' })).toBeInTheDocument()
  })

  test('runs a live AI task with the connected user credential without changing review behavior', async () => {
    const user = userEvent.setup()
    const payload = await testTeamFlowRepository.load()
    const aiTask = {
      id: 'live-ai-task',
      projectId: '1',
      title: '실제 Gemini 조사',
      description: '',
      assigneeId: 'member-ai',
      dueDate: '2026-07-30',
      status: TASK_STATUS.NOT_STARTED,
    }
    const createAiRun = vi.fn(testTeamFlowRepository.createAiRun)
    const repository = {
      ...testTeamFlowRepository,
      createAiRun,
      load: async () => ({
        ...payload,
        tasks: [...payload.tasks, aiTask],
        aiExecution: {
          mode: 'live', provider: 'gemini', modelLabel: 'Gemini 3.5 Flash', credentialRequired: true,
        },
        aiCredential: {
          provider: 'gemini', configured: true, keyHint: '1234', verifiedAt: '2026-07-27T03:00:00.000Z',
        },
      }),
    }

    renderApp('/projects/1/ai', repository)

    expect(await screen.findByText('Gemini 연결됨')).toBeInTheDocument()
    expect(screen.getByText(/Gemini 3.5 Flash/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'AI 작업 실행' }))
    await waitFor(() => expect(createAiRun).toHaveBeenCalledWith('member-ai', aiTask.id))
    expect(await screen.findByRole('heading', { name: '모의 실행 결과' })).toBeInTheDocument()
    expect(screen.getAllByText('검토 대기').length).toBeGreaterThan(0)
  })

  test('shows a persisted failed live run immediately without waiting for a reload', async () => {
    const user = userEvent.setup()
    const payload = await testTeamFlowRepository.load()
    const aiTask = {
      id: 'failed-live-ai-task',
      projectId: '1',
      title: '할당량 실패 조사',
      description: '',
      assigneeId: 'member-ai',
      dueDate: '2026-07-30',
      status: TASK_STATUS.NOT_STARTED,
    }
    const failedRun = {
      id: 'failed-live-run',
      projectId: '1',
      aiMemberId: 'member-ai',
      taskId: aiTask.id,
      status: 'failed',
      contextSnapshot: { task: aiTask },
      resultMarkdown: '',
      errorMessage: 'Gemini API 사용 한도를 초과했습니다.',
      appliedNoteId: null,
      createdBy: 'member-current',
      executionMode: 'live',
      provider: 'gemini',
      model: 'gemini-3.5-flash',
      usage: { inputTokens: null, outputTokens: null, totalTokens: null },
      durationMs: 245,
      createdAt: '2026-07-27T03:00:00.000Z',
      updatedAt: '2026-07-27T03:00:00.000Z',
    }
    const providerError = Object.assign(
      new Error('Gemini API 사용 한도를 초과했습니다.'),
      {
        code: 'AI_QUOTA_EXCEEDED',
        aiRun: failedRun,
        task: { ...aiTask, status: TASK_STATUS.IN_PROGRESS },
      },
    )
    const repository = {
      ...testTeamFlowRepository,
      createAiRun: vi.fn(async () => {
        throw providerError
      }),
      load: async () => ({
        ...payload,
        tasks: [...payload.tasks, aiTask],
        aiExecution: {
          mode: 'live', provider: 'gemini', modelLabel: 'Gemini 3.5 Flash', credentialRequired: true,
        },
        aiCredential: {
          provider: 'gemini', configured: true, keyHint: '1234', verifiedAt: '2026-07-27T03:00:00.000Z',
        },
      }),
    }

    renderApp('/projects/1/ai', repository)

    await user.click(await screen.findByRole('button', { name: 'AI 작업 실행' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Gemini API 사용 한도를 초과했습니다.')
    expect(screen.getAllByText('실패').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Gemini API 사용 한도를 초과했습니다.').length).toBeGreaterThan(1)
    const failedTaskRow = screen
      .getAllByText(aiTask.title)
      .map((element) => element.closest('li'))
      .find(Boolean)
    expect(failedTaskRow).toHaveTextContent('진행 중')
  })

  test('allows another Mock run after a reviewed result is put on hold', async () => {
    const user = userEvent.setup()
    const payload = await testTeamFlowRepository.load()
    const aiTask = {
      id: 'ai-retry-task',
      projectId: '1',
      title: '재실행 가능한 조사',
      assigneeId: 'member-ai',
      dueDate: '2026-07-30',
      status: TASK_STATUS.NOT_STARTED,
    }
    const createAiRun = vi.fn(testTeamFlowRepository.createAiRun)
    const repository = {
      ...testTeamFlowRepository,
      load: async () => ({ ...payload, tasks: [...payload.tasks, aiTask] }),
      createAiRun,
    }

    renderApp('/projects/1/ai', repository)
    expect(await screen.findByRole('heading', { name: 'AI Agent 관리' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '모의 작업 실행' }))
    await user.click(await screen.findByRole('button', { name: '보류' }))
    expect(screen.getAllByText('보류').length).toBeGreaterThan(0)
    const rejectedTaskRow = screen
      .getAllByText(aiTask.title)
      .map((element) => element.closest('li'))
      .find(Boolean)
    expect(rejectedTaskRow).toHaveTextContent('진행 중')

    const retryButton = screen.getByRole('button', { name: '모의 작업 실행' })
    expect(retryButton).toBeEnabled()
    await user.click(retryButton)
    await waitFor(() => expect(createAiRun).toHaveBeenCalledWith('member-ai', aiTask.id))
    expect(createAiRun).toHaveBeenCalledTimes(2)
  })

  test('keeps project AI assignment scoped to the current project', async () => {
    const user = userEvent.setup()
    renderApp('/projects/2/tasks')
    expect(await screen.findByRole('heading', { name: '할 일 관리' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /새 할 일/ }))
    expect(within(screen.getByLabelText(/담당 팀원/)).queryByRole('option', { name: '자료조사 AI' })).not.toBeInTheDocument()
  })

  test('shows project AI Agents in the team page and links each card to that Agent', async () => {
    renderApp('/projects/1/members')

    expect(await screen.findByRole('heading', { name: '팀원 관리' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'AI Agent' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '자료조사 AI' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'AI 관리' })).toHaveAttribute('href', '/projects/1/ai?agent=member-ai')
  })

  test('keeps Agent selection, task assignment, and execution history separate by Agent', async () => {
    const payload = await testTeamFlowRepository.load()
    const secondAgent = {
      id: 'member-ai-risk', projectId: '1', authUserId: null, email: null, kind: 'ai', isAi: true,
      name: '리스크 점검 Agent', initial: '리', role: '리스크 점검', description: '일정 위험을 검토합니다.', color: '#6b3e00',
    }
    const secondTask = {
      id: 'risk-open-task', projectId: '1', title: '일정 리스크 정리', description: '', assigneeId: secondAgent.id,
      dueDate: '2026-07-30', status: TASK_STATUS.NOT_STARTED,
    }
    const secondRun = {
      id: 'risk-run', projectId: '1', aiMemberId: secondAgent.id, taskId: secondTask.id, status: 'rejected',
      contextSnapshot: { task: { id: secondTask.id, title: secondTask.title } }, resultMarkdown: '# 모의 실행 결과',
      errorMessage: null, appliedNoteId: null, createdBy: 'auth-user-1', createdAt: '2026-07-24T10:00:00.000Z', updatedAt: '2026-07-24T10:00:00.000Z',
    }
    const repository = {
      ...testTeamFlowRepository,
      load: async () => ({
        ...payload,
        members: [...payload.members, secondAgent],
        projects: payload.projects.map((project) => project.id === '1' ? { ...project, memberIds: [...project.memberIds, secondAgent.id] } : project),
        tasks: [...payload.tasks, secondTask],
        aiAgents: [...payload.aiAgents, { memberId: secondAgent.id, projectId: '1', instructions: '위험을 정리합니다.', contextConfig: { project: true, notes: false, tasks: true, team: true, resources: false }, enabled: true }],
        aiRuns: [...payload.aiRuns, secondRun],
      }),
    }

    renderApp(`/projects/1/ai?agent=${secondAgent.id}`, repository)
    expect(await screen.findByRole('heading', { name: '리스크 점검 Agent' })).toBeInTheDocument()
    expect(screen.getAllByText('일정 리스크 정리').length).toBeGreaterThan(0)
    expect(screen.getByRole('textbox', { name: 'AI 역할 프롬프트' })).toHaveValue('위험을 정리합니다.')
    expect(screen.queryByText('유사 서비스 레퍼런스 분석')).not.toBeInTheDocument()
    expect(screen.getAllByText('보류').length).toBeGreaterThan(0)
  })

  test('does not offer a disabled AI Agent for a new task and blocks its Mock execution', async () => {
    const user = userEvent.setup()
    const payload = await testTeamFlowRepository.load()
    const disabledAgent = {
      id: 'member-ai-disabled', projectId: '1', authUserId: null, email: null, kind: 'ai', isAi: true,
      name: '보류 Agent', initial: '보', role: '보류 작업', description: '', color: '#3d4a63',
    }
    const disabledTask = {
      id: 'disabled-ai-task', projectId: '1', title: '비활성 Agent 업무', description: '', assigneeId: disabledAgent.id,
      dueDate: '2026-07-30', status: TASK_STATUS.NOT_STARTED,
    }
    const repository = {
      ...testTeamFlowRepository,
      load: async () => ({
        ...payload,
        members: [...payload.members, disabledAgent],
        projects: payload.projects.map((project) => project.id === '1' ? { ...project, memberIds: [...project.memberIds, disabledAgent.id] } : project),
        tasks: [...payload.tasks, disabledTask],
        aiAgents: [...payload.aiAgents, { memberId: disabledAgent.id, projectId: '1', instructions: '', contextConfig: {}, enabled: false }],
      }),
    }

    renderApp(`/projects/1/ai?agent=${disabledAgent.id}`, repository)
    expect(await screen.findByRole('heading', { name: '보류 Agent' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '비활성' })).toBeDisabled()

    renderApp('/projects/1/tasks', repository)
    expect(await screen.findByRole('heading', { name: '할 일 관리' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /새 할 일/ }))
    expect(within(screen.getByLabelText(/담당 팀원/)).queryByRole('option', { name: '보류 Agent' })).not.toBeInTheDocument()
  })

  test('activates and deactivates the selected AI Agent without changing its execution history', async () => {
    const user = userEvent.setup()
    const payload = await testTeamFlowRepository.load()
    const updateAiAgent = vi.fn(async (memberId, patch) => ({
      member: payload.members.find((member) => member.id === memberId),
      aiAgent: { ...payload.aiAgents.find((agent) => agent.memberId === memberId), ...patch },
    }))
    renderApp('/projects/1/ai?agent=member-ai', { ...testTeamFlowRepository, updateAiAgent })
    expect(await screen.findByRole('heading', { name: '자료조사 AI' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '비활성화' }))
    await waitFor(() => expect(updateAiAgent).toHaveBeenCalledWith('member-ai', { enabled: false }))
    expect(screen.getByRole('button', { name: '활성화' })).toBeInTheDocument()
    expect(screen.getAllByText('반영 완료').length).toBeGreaterThan(0)
  })

  test('displays failed Mock execution history without hiding the server error', async () => {
    const payload = await testTeamFlowRepository.load()
    const failedRun = {
      id: 'failed-run',
      projectId: '1',
      aiMemberId: 'member-ai',
      taskId: '5',
      status: 'failed',
      contextSnapshot: { task: { id: '5', title: '유사 서비스 레퍼런스 분석' } },
      resultMarkdown: '',
      errorMessage: 'Mock 결과 생성에 실패했습니다.',
      appliedNoteId: null,
      createdBy: 'auth-user-1',
      createdAt: '2026-07-24T12:00:00.000Z',
      updatedAt: '2026-07-24T12:00:00.000Z',
    }
    renderApp('/projects/1/ai', {
      ...testTeamFlowRepository,
      load: async () => ({ ...payload, aiRuns: [failedRun, ...payload.aiRuns] }),
    })
    expect((await screen.findAllByText('실패')).length).toBeGreaterThanOrEqual(1)
    expect(await screen.findByText('Mock 결과 생성에 실패했습니다.')).toBeInTheDocument()
  })

  test('adds a missing project AI to the current project', async () => {
    const user = userEvent.setup()
    const payload = await testTeamFlowRepository.load()
    const withoutAi = {
      ...payload,
      members: payload.members.filter((member) => member.id !== 'member-ai'),
      projects: payload.projects.map((project) => project.id === '1'
        ? { ...project, memberIds: project.memberIds.filter((memberId) => memberId !== 'member-ai') }
        : project),
      tasks: payload.tasks.filter((task) => task.assigneeId !== 'member-ai'),
      aiAgents: [],
      aiRuns: [],
    }
    const createAiAgent = vi.fn(testTeamFlowRepository.createAiAgent)
    renderApp('/projects/1/ai', {
      ...testTeamFlowRepository,
      load: async () => withoutAi,
      createAiAgent,
    })

    expect(await screen.findByText('이 프로젝트에는 아직 AI Agent가 없습니다.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'AI Agent 추가' }))
    const dialog = screen.getByRole('dialog', { name: 'AI Agent 추가' })
    await user.type(within(dialog).getByLabelText('AI Agent 이름'), '릴리즈 요약 Agent')
    await user.type(within(dialog).getByLabelText('역할'), '릴리즈 노트 요약')
    await user.click(within(dialog).getByRole('button', { name: 'AI Agent 추가' }))
    await waitFor(() => expect(createAiAgent).toHaveBeenCalledWith('1', expect.objectContaining({
      name: '릴리즈 요약 Agent', role: '릴리즈 노트 요약',
    })))
    expect(await screen.findByRole('heading', { name: '릴리즈 요약 Agent' })).toBeInTheDocument()
  })

  test('keeps the guest AI teammate screen read-only', async () => {
    const payload = await testTeamFlowRepository.load()
    const readOnlyPayload = {
      ...payload,
      accessMode: 'guest',
      capabilities: { projects: false, members: false, tasks: false, notes: false, resources: false, ai: false },
    }
    renderApp('/projects/1/ai', {
      ...testTeamFlowRepository,
      load: async () => readOnlyPayload,
    })

    expect(await screen.findByRole('heading', { name: 'AI Agent 관리' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '설정 저장' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '모의 작업 실행' })).not.toBeInTheDocument()
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
