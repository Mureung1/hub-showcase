import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
    expect(await screen.findByRole('status')).toHaveTextContent(
      '계획·결과·자체 점검을 진행 중입니다.',
    )
    expect(screen.queryByText('결과 내용이 없습니다.')).not.toBeInTheDocument()
  })

  test('5분 이상 정체된 persisted running은 실행 중으로 오인하지 않고 재시도를 안내한다', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW)
    const payload = await testTeamFlowRepository.load()
    const task = aiTask('stale-only-task', '오래 멈춘 실행')
    const staleRun = aiRun(
      'stale-only-run',
      task,
      AI_RUN_STATUS.RUNNING,
      '2026-07-27T11:55:00.000Z',
    )
    const repository = {
      ...testTeamFlowRepository,
      load: async () => ({
        ...payload,
        tasks: [...payload.tasks, task],
        aiRuns: [staleRun, ...payload.aiRuns],
      }),
    }

    renderAuthenticatedApp('/projects/1/ai?agent=member-ai', repository)

    expect(await screen.findByText('실행이 오래 멈춰 있습니다.')).toBeInTheDocument()
    expect(screen.getByText('할 일에서 다시 실행해 주세요.')).toBeInTheDocument()
    expect(screen.queryByText('계획·결과·자체 점검을 진행 중입니다.')).not.toBeInTheDocument()
    expect(screen.queryByText('결과 내용이 없습니다.')).not.toBeInTheDocument()
    expect(taskRunButton(task.title)).toBeEnabled()
  })
})

describe('제한형 Agent 실행 표시', () => {
  test('실행 중에는 실제 단계 진행률 대신 계획·결과·자체 점검 안내를 표시한다', async () => {
    const user = userEvent.setup()
    const payload = await testTeamFlowRepository.load()
    const task = aiTask('bounded-agent-task', '제한형 Agent 실행')
    const otherTask = aiTask('other-agent-task', '동시에 실행하면 안 되는 작업')
    const secondMember = {
      id: 'member-ai-second',
      projectId: '1',
      authUserId: null,
      email: null,
      kind: 'ai',
      name: '코딩 AI',
      initial: '코',
      role: '코드 검토',
      description: '',
      isAi: true,
      color: '#3d4a63',
    }
    const secondAgent = {
      memberId: secondMember.id,
      projectId: '1',
      instructions: '',
      contextConfig: {
        project: true,
        notes: false,
        tasks: true,
        team: false,
        resources: false,
      },
      enabled: true,
      createdAt: '2026-07-27T11:00:00.000Z',
      updatedAt: '2026-07-27T11:00:00.000Z',
    }
    let resolveRun
    const createAiRun = vi.fn(() => new Promise((resolve) => {
      resolveRun = resolve
    }))
    const repository = {
      ...testTeamFlowRepository,
      load: async () => ({
        ...payload,
        projects: payload.projects.map((project) => (
          project.id === '1'
            ? { ...project, memberIds: [...project.memberIds, secondMember.id] }
            : project
        )),
        members: [...payload.members, secondMember],
        tasks: [...payload.tasks, task, otherTask],
        aiAgents: [...payload.aiAgents, secondAgent],
      }),
      createAiRun,
    }

    renderAuthenticatedApp('/projects/1/ai?agent=member-ai', repository)
    expect(await screen.findByRole('heading', { name: 'AI Agent 관리' })).toBeInTheDocument()

    await user.click(taskRunButton(task.title))

    expect(screen.getByRole('status')).toHaveTextContent(
      '계획·결과·자체 점검을 진행 중입니다.',
    )
    expect(createAiRun).toHaveBeenCalledWith('member-ai', task.id)
    expect(taskRunButton(otherTask.title)).toBeDisabled()
    expect(screen.getByRole('button', { name: /자료조사 AI/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /코딩 AI/ })).toBeDisabled()

    const result = await testTeamFlowRepository.createAiRun('member-ai', task.id)
    await act(async () => {
      resolveRun(result)
    })

    await waitFor(() => {
      expect(screen.queryByText('계획·결과·자체 점검을 진행 중입니다.')).not.toBeInTheDocument()
    })
    expect(screen.getByText('1회 생성')).toBeInTheDocument()
  })

  test('보완된 결과는 최종 결과를 중심으로 접힌 계획·자체 점검과 함께 표시한다', async () => {
    const user = userEvent.setup()
    const payload = await testTeamFlowRepository.load()
    const task = aiTask('repaired-agent-task', '보완된 Agent 결과', TASK_STATUS.IN_REVIEW)
    const repairedRun = {
      ...aiRun(
        'repaired-agent-run',
        task,
        AI_RUN_STATUS.PENDING_REVIEW,
        '2026-07-27T11:59:00.000Z',
      ),
      resultMarkdown: '# 보완된 최종 결과\n\n사람이 검토할 최종 결과입니다.',
      agentTrace: {
        version: 1,
        plan: ['할 일을 확인합니다.', '초안을 보완하고 자체 점검합니다.'],
        selfReview: {
          roleFollowed: true,
          requirementsMet: true,
          selectedContextOnly: true,
          issues: [],
        },
        suggestedNextAction: '근거를 확인한 뒤 공유 노트에 반영합니다.',
        attemptCount: 2,
        repaired: true,
      },
    }
    const repository = {
      ...testTeamFlowRepository,
      load: async () => ({
        ...payload,
        tasks: [...payload.tasks, task],
        aiRuns: [repairedRun, ...payload.aiRuns],
      }),
    }

    renderAuthenticatedApp('/projects/1/ai?agent=member-ai', repository)

    expect(await screen.findByRole('heading', { name: '보완된 최종 결과' })).toBeInTheDocument()
    expect(screen.getByText('1회 보완됨')).toBeInTheDocument()
    const planDetails = screen.getByText('작업 계획').closest('details')
    const reviewDetails = screen.getByText('자체 점검').closest('details')
    expect(planDetails.open).toBe(false)
    expect(reviewDetails.open).toBe(false)

    await user.click(screen.getByText('작업 계획'))
    expect(planDetails.open).toBe(true)
    expect(screen.getByText('초안을 보완하고 자체 점검합니다.')).toBeInTheDocument()

    await user.click(screen.getByText('자체 점검'))
    expect(reviewDetails.open).toBe(true)
    expect(screen.getByText('역할 준수')).toBeInTheDocument()
    expect(screen.getByText('근거를 확인한 뒤 공유 노트에 반영합니다.')).toBeInTheDocument()
  })

  test('agentTrace가 없는 과거 실행은 기존 결과 화면으로 표시한다', async () => {
    renderAuthenticatedApp('/projects/1/ai?agent=member-ai', testTeamFlowRepository)

    expect(await screen.findByRole('heading', { name: '모의 실행 결과' })).toBeInTheDocument()
    expect(screen.queryByText('1회 생성')).not.toBeInTheDocument()
    expect(screen.queryByText('1회 보완됨')).not.toBeInTheDocument()
    expect(screen.queryByText('작업 계획')).not.toBeInTheDocument()
    expect(screen.queryByText('자체 점검')).not.toBeInTheDocument()
  })

  test('형식이 깨진 agentTrace는 무시하고 기존 결과와 검토 동작을 유지한다', async () => {
    const payload = await testTeamFlowRepository.load()
    const task = aiTask('malformed-trace-task', '깨진 trace 결과', TASK_STATUS.IN_REVIEW)
    const run = {
      ...aiRun(
        'malformed-trace-run',
        task,
        AI_RUN_STATUS.PENDING_REVIEW,
        '2026-07-27T11:59:30.000Z',
      ),
      resultMarkdown: '# 기존 결과는 유지됩니다.\n\n검토 가능한 결과입니다.',
      agentTrace: {
        version: 1,
        plan: [],
        selfReview: {},
        suggestedNextAction: '',
        attemptCount: 1,
        repaired: false,
      },
    }
    const repository = {
      ...testTeamFlowRepository,
      load: async () => ({
        ...payload,
        tasks: [...payload.tasks, task],
        aiRuns: [run, ...payload.aiRuns],
      }),
    }

    renderAuthenticatedApp('/projects/1/ai?agent=member-ai', repository)

    expect(await screen.findByRole('heading', { name: '기존 결과는 유지됩니다.' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '보류' })).toBeEnabled()
    expect(screen.getByRole('button', { name: '공유 노트로 반영' })).toBeEnabled()
    expect(screen.queryByText('작업 계획')).not.toBeInTheDocument()
    expect(screen.queryByText('자체 점검')).not.toBeInTheDocument()
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
    agentTrace: null,
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
