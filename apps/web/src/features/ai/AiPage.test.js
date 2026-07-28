import { AI_RUN_STATUS } from '@teamflow/shared'
import { describe, expect, test } from 'vitest'

import { isAiRunBlocking, isAiRunStale } from './aiRunBlocking.js'

const NOW = Date.parse('2026-07-27T12:00:00.000Z')

describe('AI 실행 차단 시간 경계', () => {
  test('5분이 지나지 않은 running 실행은 차단한다', () => {
    expect(isAiRunBlocking({
      status: AI_RUN_STATUS.RUNNING,
      createdAt: '2026-07-27T11:56:00.001Z',
      updatedAt: '2026-07-27T11:56:00.001Z',
    }, NOW)).toBe(true)
  })

  test('마지막 갱신 후 정확히 5분 이상 정체된 running 실행은 차단하지 않는다', () => {
    const run = {
      status: AI_RUN_STATUS.RUNNING,
      createdAt: '2026-07-27T11:40:00.000Z',
      updatedAt: '2026-07-27T11:55:00.000Z',
    }
    expect(isAiRunBlocking(run, NOW)).toBe(false)
    expect(isAiRunStale(run, NOW)).toBe(true)
  })

  test('pending_review 실행은 오래되어도 계속 차단한다', () => {
    expect(isAiRunBlocking({
      status: AI_RUN_STATUS.PENDING_REVIEW,
      createdAt: '2026-07-27T10:00:00.000Z',
      updatedAt: '2026-07-27T10:00:00.000Z',
    }, NOW)).toBe(true)
  })
})
