import assert from 'node:assert/strict'
import test from 'node:test'

import { calculateProgress, normalizeProgress, TASK_STATUS } from '../src/project.js'

test('normalizeProgress rounds and clamps values', () => {
  assert.equal(normalizeProgress(40.4), 40)
  assert.equal(normalizeProgress(-10), 0)
  assert.equal(normalizeProgress(140), 100)
  assert.equal(normalizeProgress(Number.NaN), 0)
})

test('calculateProgress derives completion from tasks', () => {
  const tasks = [
    { status: TASK_STATUS.COMPLETED },
    { status: TASK_STATUS.COMPLETED },
    { status: TASK_STATUS.IN_PROGRESS },
  ]

  assert.equal(calculateProgress(tasks), 67)
  assert.equal(calculateProgress([]), 0)
})
