import assert from 'node:assert/strict'
import test from 'node:test'

import {
  ProductContractError,
  decodeTargetProductBootstrap,
} from '@ay-ple/product-contract'

const workspaceId = `workspace_${'1'.repeat(32)}`
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

test('prepared workspace lifecycle exposes only starting, active, and recovery states', () => {
  const variants = [
    {
      state: 'starting',
      workspace,
    },
    {
      state: 'active',
      workspace,
    },
    {
      state: 'recovery_required',
      workspace: {
        availability: 'unavailable',
        workspaceId,
        label: workspace.label,
      },
      reason: 'workspace_unavailable',
      displayMessage: '준비된 SemesterWorkspace를 다시 확인해 주세요.',
    },
    {
      state: 'recovery_required',
      workspace: {
        availability: 'available',
        ...workspace,
      },
      reason: 'runtime_unavailable',
      displayMessage: 'Codex Runtime을 시작할 수 없습니다.',
    },
    {
      state: 'recovery_required',
      workspace: null,
      reason: 'prepared_workspace_required',
      displayMessage: '준비된 SemesterWorkspace가 필요합니다.',
    },
    {
      state: 'recovery_required',
      workspace: null,
      reason: 'registry_incompatible',
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

test('active operation represents only a normal product Turn', () => {
  const value = {
    accountReadiness: { state: 'ready' },
    workspaceLifecycle: { state: 'active', workspace },
    activeOperation: { operationId, kind: 'product_turn' },
  } as const

  assert.deepEqual(decodeTargetProductBootstrap(value), value)

  for (const invalid of [
    {
      ...value,
      workspaceLifecycle: { state: 'starting', workspace },
    },
    {
      ...value,
      activeOperation: { operationId, kind: 'workspace_init' },
    },
    {
      ...value,
      activeOperation: {
        operationId: `operation_${'4'.repeat(32)}`,
        kind: 'chat',
      },
    },
  ]) {
    assert.throws(
      () => decodeTargetProductBootstrap(invalid),
      ProductContractError,
    )
  }
})

test('prepared lifecycle rejects obsolete candidate and transition fields', () => {
  for (const workspaceLifecycle of [
    {
      state: 'bootstrap',
      activeWorkspace: null,
      candidate: null,
    },
    {
      state: 'transitioning',
      activeWorkspace: workspace,
      candidate: null,
      target: { kind: 'active_restart', workspaceId },
    },
    {
      state: 'active',
      workspace,
      candidate: null,
    },
    {
      state: 'recovery_required',
      workspace: null,
      candidate: null,
      reason: 'registry_incompatible',
      displayMessage: 'invalid',
    },
  ]) {
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

test('prepared lifecycle enforces Browser-safe exact workspace projections', () => {
  const baseline = {
    accountReadiness: { state: 'ready' },
    workspaceLifecycle: { state: 'active', workspace },
    activeOperation: null,
  } as const

  assert.deepEqual(decodeTargetProductBootstrap(baseline), baseline)
  for (const workspaceLifecycle of [
    {
      state: 'active',
      workspace: { ...workspace, absolutePath: '/private/semester' },
    },
    {
      state: 'active',
      workspace: { ...workspace, label: '../semester' },
    },
    {
      state: 'active',
      workspace: {
        ...workspace,
        semester: {
          yearLevel: 21,
          term: workspace.semester.term,
        },
      },
    },
    {
      state: 'recovery_required',
      workspace: {
        availability: 'unavailable',
        workspaceId,
        label: workspace.label,
        canonicalRoot: '/private/semester',
      },
      reason: 'workspace_unavailable',
      displayMessage: 'invalid',
    },
    {
      state: 'recovery_required',
      workspace: null,
      reason: 'runtime_unavailable',
      displayMessage: 'invalid',
    },
  ]) {
    assert.throws(
      () =>
        decodeTargetProductBootstrap({
          ...baseline,
          workspaceLifecycle,
        }),
      ProductContractError,
    )
  }
})
