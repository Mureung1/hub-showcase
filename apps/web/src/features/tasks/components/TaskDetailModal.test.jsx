import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { testTeamFlowRepository } from '../../../test/createTestTeamFlowRepository.js'
import { renderAuthenticatedApp as renderApp } from '../../../test/renderTeamFlowApp.jsx'

describe('task detail editing', () => {
  test('updates every editable task field and reflects the result immediately', async () => {
    const user = userEvent.setup()
    renderApp('/projects/1/tasks')

    await screen.findByRole('heading', { name: '할 일 관리' })
    await user.click(screen.getByRole('button', { name: '대시보드 레이아웃 개발 상세 보기' }))
    const dialog = screen.getByRole('dialog', { name: '할 일 상세' })
    await user.click(within(dialog).getByRole('button', { name: '수정' }))

    const title = within(dialog).getByLabelText(/할 일 제목/)
    await user.clear(title)
    await user.type(title, '대시보드 반응형 레이아웃 완성')
    const assigneeSelect = within(dialog).getByLabelText(/담당 팀원/)
    expect(within(assigneeSelect).getByRole('option', { name: '최지우' })).toBeInTheDocument()
    expect(within(assigneeSelect).getByRole('option', { name: '자료조사 AI' })).toBeInTheDocument()
    await user.selectOptions(assigneeSelect, 'member-5')
    const dueDate = within(dialog).getByLabelText(/마감일/)
    await user.clear(dueDate)
    await user.type(dueDate, '2026-07-19')
    await user.click(within(dialog).getByRole('button', { name: '검토 중' }))
    const description = within(dialog).getByLabelText(/설명/)
    await user.clear(description)
    await user.type(description, '모든 화면 크기에서 레이아웃을 확인합니다.')
    await user.click(within(dialog).getByRole('button', { name: '변경사항 저장' }))

    await waitFor(() => expect(screen.getByRole('dialog', { name: '할 일 상세' })).toBeInTheDocument())
    expect(within(dialog).getByRole('heading', { name: '대시보드 반응형 레이아웃 완성' })).toBeInTheDocument()
    expect(within(dialog).getByText('최지우')).toBeInTheDocument()
    expect(within(dialog).getByText('07.19')).toBeInTheDocument()
    expect(within(dialog).getByText('모든 화면 크기에서 레이아웃을 확인합니다.')).toBeInTheDocument()
  })

  test('locks an AI task after its result is applied', async () => {
    const user = userEvent.setup()
    renderApp('/projects/1/tasks')

    await screen.findByRole('heading', { name: '할 일 관리' })
    expect(screen.getByRole('button', { name: '유사 서비스 레퍼런스 분석 진행 상태' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: '유사 서비스 레퍼런스 분석 상세 보기' }))
    const dialog = screen.getByRole('dialog', { name: '할 일 상세' })

    expect(within(dialog).getByText('공유 노트에 반영된 AI 할 일은 변경하거나 삭제할 수 없습니다.')).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: '수정' })).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: /할 일 삭제/ })).not.toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: '시작 전' })).toBeDisabled()
  })

  test('allows editing a rejected AI task without sending a manual status change', async () => {
    const user = userEvent.setup()
    const updateTask = vi.fn(async (taskId, patch) => ({ taskId, patch }))
    const repository = {
      ...testTeamFlowRepository,
      updateTask,
      async load() {
        const loaded = await testTeamFlowRepository.load()
        return {
          ...loaded,
          tasks: loaded.tasks.map((task) => task.id === '5'
            ? { ...task, status: 'in_progress' }
            : task),
          aiRuns: loaded.aiRuns.filter((run) => run.status === 'rejected'),
        }
      },
    }
    renderApp('/projects/1/tasks', repository)

    await screen.findByRole('heading', { name: '할 일 관리' })
    await user.click(screen.getByRole('button', { name: '유사 서비스 레퍼런스 분석 상세 보기' }))
    const dialog = screen.getByRole('dialog', { name: '할 일 상세' })
    await user.click(within(dialog).getByRole('button', { name: '수정' }))

    expect(within(dialog).getByText('AI Agent가 담당한 할 일의 진행 상태는 실행 흐름에서 자동으로 변경됩니다.')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: '시작 전' })).toBeDisabled()
    await user.click(within(dialog).getByRole('button', { name: '변경사항 저장' }))

    expect(updateTask).toHaveBeenCalledTimes(1)
    expect(updateTask.mock.calls[0][1]).not.toHaveProperty('status')
  })

  test('registers a newly assigned AI task with an automatically managed initial status', async () => {
    const user = userEvent.setup()
    renderApp('/projects/1/tasks')

    await screen.findByRole('heading', { name: '할 일 관리' })
    await user.click(screen.getByRole('button', { name: '새 할 일' }))
    const dialog = screen.getByRole('dialog', { name: '새 할 일 추가' })
    await user.selectOptions(within(dialog).getByLabelText(/담당 팀원/), 'member-ai')

    expect(within(dialog).getByText('AI Agent 할 일은 시작 전으로 등록되고 실행 흐름에서 자동으로 변경됩니다.')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: '시작 전' })).toBeDisabled()
    expect(within(dialog).getByRole('button', { name: '진행 중' })).toBeDisabled()
  })
})
