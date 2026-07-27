import assert from 'node:assert/strict'
import test from 'node:test'

import {
  ProductContractError,
  decodeTargetProductBootstrap,
} from '@ay-ple/product-contract'

const workspaceId = `workspace_${'1'.repeat(32)}`
const candidateId = `candidate_${'2'.repeat(32)}`
const operationId = `operation_${'3'.repeat(32)}`
const semester = {
  yearLevel: 2,
  term: { key: 'fall', displayName: '2학기' },
} as const
const workspace = {
  workspaceId,
  semester,
  label: 'year-2-semester-2',
} as const
const candidate = {
  candidateId,
  semester,
  label: 'year-2-semester-2',
  initTurn: { state: 'not_started' },
} as const

test('target bootstrap decoder accepts every exact lifecycle variant', () => {
  const variants = [
    {
      state: 'bootstrap',
      activeWorkspace: null,
      candidate: null,
    },
    {
      state: 'active',
      activeWorkspace: workspace,
      candidate: null,
    },
    {
      state: 'transitioning',
      activeWorkspace: workspace,
      candidate: null,
      target: {
        kind: 'bootstrap_candidate',
        candidateId,
      },
    },
    {
      state: 'transitioning',
      activeWorkspace: null,
      candidate,
      target: {
        kind: 'candidate_activation',
        candidateId,
      },
    },
    {
      state: 'transitioning',
      activeWorkspace: workspace,
      candidate: null,
      target: {
        kind: 'active_restart',
        workspaceId,
      },
    },
    {
      state: 'recovery_required',
      activeWorkspace: {
        availability: 'unavailable',
        workspaceId,
        label: 'year-2-semester-2',
      },
      candidate: null,
      reason: 'workspace_unavailable',
      displayMessage: '작업공간을 다시 선택해 주세요.',
    },
    {
      state: 'recovery_required',
      activeWorkspace: {
        availability: 'available',
        ...workspace,
      },
      candidate: null,
      reason: 'runtime_unavailable',
      displayMessage: 'Codex Runtime을 시작할 수 없습니다.',
    },
    {
      state: 'recovery_required',
      activeWorkspace: null,
      candidate: null,
      reason: 'runtime_unavailable',
      displayMessage: 'Codex Runtime을 시작할 수 없습니다.',
    },
    {
      state: 'registry_incompatible',
      activeWorkspace: null,
      candidate: null,
      displayMessage: 'WorkspaceRegistry를 열 수 없습니다.',
    },
  ] as const

  for (const workspaceLifecycle of variants) {
    const value = {
      accountReadiness: { state: 'ready' },
      workspaceLifecycle,
      activeOperation: null,
    } as const
    assert.deepEqual(decodeTargetProductBootstrap(value), value)
  }
})

test('target bootstrap decoder binds active operations to eligible lifecycle state', () => {
  const activeCandidate = {
    ...candidate,
    initTurn: { state: 'active', operationId },
  } as const
  const workspaceInit = {
    accountReadiness: { state: 'ready' },
    workspaceLifecycle: {
      state: 'bootstrap',
      activeWorkspace: workspace,
      candidate: activeCandidate,
    },
    activeOperation: { operationId, kind: 'workspace_init' },
  } as const
  const chat = {
    accountReadiness: { state: 'ready' },
    workspaceLifecycle: {
      state: 'active',
      activeWorkspace: workspace,
      candidate: null,
    },
    activeOperation: { operationId, kind: 'chat' },
  } as const

  assert.deepEqual(decodeTargetProductBootstrap(workspaceInit), workspaceInit)
  assert.deepEqual(decodeTargetProductBootstrap(chat), chat)

  for (const invalid of [
    { ...workspaceInit, activeOperation: null },
    {
      ...workspaceInit,
      activeOperation: {
        operationId: `operation_${'4'.repeat(32)}`,
        kind: 'workspace_init',
      },
    },
    {
      ...workspaceInit,
      activeOperation: { operationId, kind: 'chat' },
    },
    {
      ...chat,
      activeOperation: { operationId, kind: 'workspace_init' },
    },
  ]) {
    assert.throws(
      () => decodeTargetProductBootstrap(invalid),
      ProductContractError,
    )
  }
})

test('target bootstrap decoder rejects cross-field lifecycle mismatches', () => {
  const invalidLifecycles = [
    {
      state: 'active',
      activeWorkspace: workspace,
      candidate,
    },
    {
      state: 'transitioning',
      activeWorkspace: null,
      candidate: null,
      target: { kind: 'candidate_activation', candidateId },
    },
    {
      state: 'transitioning',
      activeWorkspace: {
        ...workspace,
        workspaceId: `workspace_${'4'.repeat(32)}`,
      },
      candidate: null,
      target: { kind: 'active_restart', workspaceId },
    },
    {
      state: 'transitioning',
      activeWorkspace: workspace,
      candidate,
      target: { kind: 'active_restart', workspaceId },
    },
    {
      state: 'recovery_required',
      activeWorkspace: {
        availability: 'available',
        ...workspace,
      },
      candidate: null,
      reason: 'workspace_unavailable',
      displayMessage: 'invalid',
    },
    {
      state: 'recovery_required',
      activeWorkspace: {
        availability: 'unavailable',
        workspaceId,
        label: workspace.label,
      },
      candidate: null,
      reason: 'runtime_unavailable',
      displayMessage: 'invalid',
    },
  ]

  for (const workspaceLifecycle of invalidLifecycles) {
    assert.throws(
      () =>
        decodeTargetProductBootstrap({
          accountReadiness: { state: 'ready' },
          workspaceLifecycle,
          activeOperation: null,
        }),
      ProductContractError,
    )
  }
})

test('target bootstrap decoder enforces bounded Browser-safe identities and labels', () => {
  const baseline = {
    accountReadiness: { state: 'ready' },
    workspaceLifecycle: {
      state: 'active',
      activeWorkspace: workspace,
      candidate: null,
    },
    activeOperation: null,
  } as const

  for (const activeWorkspace of [
    { ...workspace, workspaceId: 'workspace_1' },
    { ...workspace, label: '/Users/student/semester' },
    { ...workspace, label: 'semester\nsecret' },
    { ...workspace, label: '가'.repeat(86) },
    {
      ...workspace,
      semester: { ...semester, yearLevel: 0 },
    },
    {
      ...workspace,
      semester: {
        ...semester,
        term: { ...semester.term, key: 'Fall Term' },
      },
    },
  ]) {
    assert.throws(
      () =>
        decodeTargetProductBootstrap({
          ...baseline,
          workspaceLifecycle: {
            ...baseline.workspaceLifecycle,
            activeWorkspace,
          },
        }),
      ProductContractError,
    )
  }
})

test('target bootstrap decoder preserves exact-key and account-readiness boundaries', () => {
  const baseline = {
    accountReadiness: {
      state: 'not_ready',
      displayMessage: 'Codex 로그인이 필요합니다.',
    },
    workspaceLifecycle: {
      state: 'bootstrap',
      activeWorkspace: null,
      candidate: null,
    },
    activeOperation: null,
  } as const

  assert.deepEqual(decodeTargetProductBootstrap(baseline), baseline)
  assert.throws(
    () => decodeTargetProductBootstrap({ ...baseline, absolutePath: '/tmp/x' }),
    ProductContractError,
  )
  assert.throws(
    () =>
      decodeTargetProductBootstrap({
        ...baseline,
        accountReadiness: {
          ...baseline.accountReadiness,
          retryable: true,
        },
      }),
    ProductContractError,
  )
})
