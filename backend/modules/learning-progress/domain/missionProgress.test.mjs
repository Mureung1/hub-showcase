import { describe, expect, it } from 'vitest'
import { createMissionProgress, normalizeMissionProgressInput } from './missionProgress.mjs'

describe('missionProgress domain', () => {
  it('normalizes a valid lastTestResult', () => {
    const progress = createMissionProgress('mission-1', {
      lastTestResult: { passed: 2, total: 3, ranAt: '2026-07-25T09:00:00.000Z' },
    })

    expect(progress.lastTestResult).toEqual({ passed: 2, total: 3, ranAt: '2026-07-25T09:00:00.000Z' })
  })

  it('drops an incomplete or missing lastTestResult', () => {
    expect(createMissionProgress('mission-1', {}).lastTestResult).toBeNull()
    expect(createMissionProgress('mission-1', { lastTestResult: { passed: 2 } }).lastTestResult).toBeNull()
  })

  it('passes lastTestResult through normalizeMissionProgressInput', () => {
    const progress = normalizeMissionProgressInput('mission-1', {
      runState: 'passed',
      lastTestResult: { passed: 3, total: 3, ranAt: '2026-07-25T09:00:00.000Z' },
    })

    expect(progress.lastTestResult).toEqual({ passed: 3, total: 3, ranAt: '2026-07-25T09:00:00.000Z' })
  })
})
