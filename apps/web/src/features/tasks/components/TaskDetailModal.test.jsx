import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'vitest'

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
    await user.selectOptions(within(dialog).getByLabelText(/담당자/), 'member-5')
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
})
