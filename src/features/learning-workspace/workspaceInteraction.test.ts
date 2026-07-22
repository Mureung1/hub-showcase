import { describe, expect, it } from 'vitest'
import {
  clampStepOffset,
  createStepState,
  createWorkspaceTestCases,
  generatedMissionId,
  getInitialStepOffset,
  getNextRunState,
  getResultMessage,
  isFinalStep,
} from './workspaceInteraction'

describe('workspaceInteraction', () => {
  it('marks curriculum steps around the active offset', () => {
    expect(createStepState(0, 1)).toBe('done')
    expect(createStepState(1, 1)).toBe('current')
    expect(createStepState(2, 1)).toBe('waiting')
  })

  it('starts generated missions at the first step and queued missions at the mission step', () => {
    expect(getInitialStepOffset(generatedMissionId)).toBe(0)
    expect(getInitialStepOffset('run-tests')).toBe(1)
  })

  it('clamps active step offsets to the playable range', () => {
    expect(clampStepOffset(-1, 3)).toBe(0)
    expect(clampStepOffset(1, 3)).toBe(1)
    expect(clampStepOffset(9, 3)).toBe(2)
    expect(clampStepOffset(2, 0)).toBe(0)
  })

  it('detects the final curriculum step', () => {
    expect(isFinalStep(0, 3)).toBe(false)
    expect(isFinalStep(2, 3)).toBe(true)
    expect(isFinalStep(9, 3)).toBe(true)
    expect(isFinalStep(0, 0)).toBe(false)
  })

  it('fails the first run attempt and passes later attempts', () => {
    expect(getNextRunState(0)).toBe('failed')
    expect(getNextRunState(1)).toBe('passed')
    expect(getNextRunState(3)).toBe('passed')
  })

  it('keeps generated mission test cases pending while running', () => {
    const cases = createWorkspaceTestCases({ isGeneratedMission: true, runState: 'running' })

    expect(cases).toHaveLength(3)
    expect(cases.every((testCase) => testCase.state === 'pending')).toBe(true)
  })

  it('marks the generated mission source check as failed after a failed run', () => {
    const cases = createWorkspaceTestCases({ isGeneratedMission: true, runState: 'failed' })

    expect(cases.map((testCase) => testCase.state)).toEqual(['passed', 'passed', 'failed'])
    expect(cases[2]?.actual).toBe('근거 문서 확인 필요')
  })

  it('marks every queued mission case as passed after a successful rerun', () => {
    const cases = createWorkspaceTestCases({ isGeneratedMission: false, runState: 'passed' })

    expect(cases).toHaveLength(4)
    expect(cases.every((testCase) => testCase.state === 'passed')).toBe(true)
  })

  it('summarizes result messages for learner actions', () => {
    expect(getResultMessage('running', 0, 0, 3)).toContain('실행')
    expect(getResultMessage('failed', 2, 1, 3)).toContain('다시')
    expect(getResultMessage('passed', 3, 0, 3)).toContain('다음 단계')
  })
})