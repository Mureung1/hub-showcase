import { screen, within } from '@testing-library/react'
import { AI_RUN_STATUS, TASK_STATUS } from '@teamflow/shared'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { testTeamFlowRepository } from '../../test/createTestTeamFlowRepository.js'
import { renderAuthenticatedApp } from '../../test/renderTeamFlowApp.jsx'

const NOW = Date.parse('2026-07-27T12:00:00.000Z')

describe('AI 실행 정체 복구 UI', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('최근 running과 pending_review는 차단하고 5분 지난 running은 재시도를 허용한다', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW)
    const payload = await testTeamFlowRepository.load()
    const tasks = [
      aiTask('recent-running-task', '최근 실행 중인 할 일'),
      aiTask('stale-running-task', '정체된 실행의 할 일'),
      aiTask('pending-review-task', '검토 대기 중인 할 일', TASK_STATUS.IN_REVIEW),
    ]
    const aiRuns = [
      aiRun('recent-running-run', tasks[0], AI_RUN_STATUS.RUNNING, '2026-07-27T11:56:00.001Z'),
      aiRun('stale-running-run', tasks[1], AI_RUN_STATUS.RUNNING, '2026-07-27T11:55:00.000Z'),
      aiRun('pending-review-run', tasks[2], AI_RUN_STATUS.PENDING_REVIEW, '2026-07-27T10:00:00.000Z'),
    ]
    const repository = {
      ...testTeamFlowRepository,
      load: async () => ({
        ...payload,
        tasks: [...payload.tasks, ...tasks],
        aiRuns: [...aiRuns, ...payload.aiRuns],
      }),
    }

    renderAuthenticatedApp('/projects/1/ai', repository)
    expect(await screen.findByRole('heading', { name: 'AI Agent 관리' })).toBeInTheDocument()

    expect(taskRunButton(tasks[0].title)).toBeDisabled()
    expect(taskRunButton(tasks[1].title)).toBeEnabled()
    expect(taskRunButton(tasks[1].title)).toHaveTextContent('모의 작업 실행')
    expect(taskRunButton(tasks[2].title)).toBeDisabled()
  })
})

function aiTask(id, title, status = TASK_STATUS.IN_PROGRESS) {
  return {
    id,
    projectId: '1',
    title,
    description: '',
    assigneeId: 'member-ai',
    dueDate: '2026-07-30',
    status,
  }
}

function aiRun(id, task, status, changedAt) {
  return {
    id,
    projectId: '1',
    aiMemberId: 'member-ai',
    taskId: task.id,
    status,
    contextSnapshot: { task: { id: task.id, title: task.title } },
    resultMarkdown: '',
    errorMessage: null,
    appliedNoteId: null,
    createdBy: 'member-current',
    executionMode: 'mock',
    provider: null,
    model: null,
    usage: { inputTokens: null, outputTokens: null, totalTokens: null },
    durationMs: null,
    createdAt: changedAt,
    updatedAt: changedAt,
  }
}

function taskRunButton(title) {
  const row = screen
    .getAllByText(title)
    .map((element) => element.closest('li'))
    .find(Boolean)
  return within(row).getByRole('button')
}
