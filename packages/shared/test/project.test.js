import assert from 'node:assert/strict'
import test from 'node:test'

import {
  calculateProgress,
  isProjectStatus,
  isTaskStatus,
  normalizeProgress,
  PROJECT_STATUS,
  TASK_STATUS,
} from '../src/project.js'

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

test('isTaskStatus accepts only shared task status values', () => {
  assert.equal(isTaskStatus(TASK_STATUS.NOT_STARTED), true)
  assert.equal(isTaskStatus(TASK_STATUS.IN_PROGRESS), true)
  assert.equal(isTaskStatus(TASK_STATUS.IN_REVIEW), true)
  assert.equal(isTaskStatus(TASK_STATUS.COMPLETED), true)
  assert.equal(isTaskStatus('deleted'), false)
  assert.equal(isTaskStatus(null), false)
})

test('isProjectStatus accepts only shared project status values', () => {
  assert.equal(isProjectStatus(PROJECT_STATUS.IN_PROGRESS), true)
  assert.equal(isProjectStatus('archived'), false)
})
