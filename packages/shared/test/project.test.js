import assert from 'node:assert/strict'
import test from 'node:test'

import {
  calculateProgress,
  INVITATION_STATUS,
  isInvitationStatus,
  isMemberKind,
  isProjectIcon,
  isProjectStatus,
  isResourceType,
  isTaskStatus,
  MEMBER_KIND,
  normalizeProgress,
  PROJECT_STATUS,
  PROJECT_ICON,
  RESOURCE_TYPE,
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

test('isProjectIcon accepts only supported project icon values', () => {
  assert.equal(isProjectIcon(PROJECT_ICON.LAYERS), true)
  assert.equal(isProjectIcon(PROJECT_ICON.ROCKET), true)
  assert.equal(isProjectIcon('custom-svg'), false)
})

test('shared collaboration and resource predicates accept only contract values', () => {
  assert.equal(isMemberKind(MEMBER_KIND.USER), true)
  assert.equal(isMemberKind('owner'), false)
  assert.equal(isInvitationStatus(INVITATION_STATUS.PENDING), true)
  assert.equal(isInvitationStatus('expired'), false)
  assert.equal(isResourceType(RESOURCE_TYPE.LINK), true)
  assert.equal(isResourceType('file'), false)
})
