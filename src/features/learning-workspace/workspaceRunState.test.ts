import { describe, expect, it } from 'vitest'
import { createWorkspaceTestCases, getResultMessage } from './workspaceInteraction'

describe('workspace run states', () => {
  it('keeps test cases pending while compiling or rendering', () => {
    const compilingCases = createWorkspaceTestCases({
      isGeneratedMission: true,
      runState: 'compiling',
    })
    const renderingCases = createWorkspaceTestCases({
      isGeneratedMission: true,
      runState: 'rendering',
    })

    expect(compilingCases).toHaveLength(3)
    expect(compilingCases.every((testCase) => testCase.state === 'pending')).toBe(true)
    expect(renderingCases.every((testCase) => testCase.state === 'pending')).toBe(true)
  })

  it('summarizes each asynchronous learner state', () => {
    expect(getResultMessage('compiling', 0, 0, 3)).toContain('컴파일')
    expect(getResultMessage('rendering', 0, 0, 3)).toContain('렌더링')
    expect(getResultMessage('failed', 2, 1, 3)).toContain('다시 실행')
    expect(getResultMessage('timeout', 2, 1, 3)).toContain('시간')
    expect(getResultMessage('passed', 3, 0, 3)).toContain('다음 단계')
  })
})
