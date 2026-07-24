import assert from 'node:assert/strict'
import test from 'node:test'

import {
  decodePublicPreviewSetupProjection,
  type PublicPreviewSetupProjection,
} from '@ay-ple/product-contract'
import type {
  AdmittedSemesterWorkspace,
  SemesterSetupJourneyProjection,
} from '@ay-ple/semester-workspace'

import {
  toPublicPreviewSetupProjection,
  type SetupJourneyProjectionContext,
} from './setup-journey-projection.js'

const privatePath = '/Users/student/private/semester'
const privateDigest = 'a'.repeat(64)
const context: SetupJourneyProjectionContext = {
  parentSelection: {
    selectionId: 'parent_selection_public',
    displayName: '문서',
    safeDisplayLocation: 'Home › Documents',
  },
  suggestedLeafName: '2026-2학기',
  requiredApplicationCommand: 'npx ay-ple@0.0.1',
  accountConnected: false,
  readyAttested: () => true,
  presentReadyWorkspace: () => ({
    semesterLabel: '2학년 2학기',
    workspaceName: '2026-2학기',
    safeDisplayLocation: 'Home › Documents › 2026-2학기',
  }),
}

test('all B2a journey states conform to the Browser setup contract without private authority or Ready', () => {
  const fixtures = [
    { state: 'input_required' },
    {
      state: 'confirmation_required',
      setupPlanId: 'setup_plan_public',
      semesterLabel: '2학년 2학기',
      parentSelection: context.parentSelection!,
      leafName: '2026-2학기',
    },
    { state: 'working', stage: 'preparing_workspace' },
    { state: 'working', stage: 'verifying_environment' },
    {
      state: 'recovery_required',
      recoveryId: 'setup_recovery_owned',
      reason: 'owned_incomplete',
    },
    {
      state: 'recovery_required',
      recoveryId: 'setup_recovery_missing',
      reason: 'bundle_missing',
    },
    {
      state: 'recovery_required',
      recoveryId: 'setup_recovery_bundle',
      reason: 'bundle_conflict',
    },
    {
      state: 'recovery_required',
      recoveryId: 'setup_recovery_context',
      reason: 'context_conflict',
    },
    { state: 'blocked', reason: 'setup_conflict' },
    { state: 'blocked', reason: 'setup_state_conflict' },
    { state: 'blocked', reason: 'setup_release_mismatch' },
  ] as const satisfies readonly SemesterSetupJourneyProjection[]

  for (const fixture of fixtures) {
    const projected = toPublicPreviewSetupProjection(fixture, context)
    assert.deepEqual(
      decodePublicPreviewSetupProjection(projected),
      projected,
      fixture.state,
    )
    assertNoPrivateSetupFields(projected)
  }
})

test('input projection carries only the selected parent presentation and product defaults', () => {
  assert.deepEqual(
    toPublicPreviewSetupProjection(
      { state: 'input_required' },
      context,
    ),
    {
      state: 'input_required',
      yearLevelOptions: [
        { value: 1, label: '1학년' },
        { value: 2, label: '2학년' },
        { value: 3, label: '3학년' },
        { value: 4, label: '4학년' },
      ],
      termOptions: [
        { value: '1', label: '1학기' },
        { value: '2', label: '2학기' },
      ],
      parentSelection: context.parentSelection,
      suggestedLeafName: '2026-2학기',
      allowedCommands: [
        'workspace.parent.select',
        'setup.prepare',
      ],
    },
  )
})

test('B2b protected states map to exact reauth and transition recovery commands', () => {
  assert.deepEqual(
    toPublicPreviewSetupProjection(
      {
        state: 'workspace_reauth',
        recoveryId: 'setup_workspace_reauth',
      },
      context,
    ),
    {
      state: 'account_required',
      reason: 'workspace_reauth',
      resume: 'awaiting_account',
      recoveryId: 'setup_workspace_reauth',
      displayMessage:
        '학기 공간은 그대로 보존되어 있습니다. Codex에 다시 연결해 주세요.',
      allowedCommands: [],
    },
  )
  assert.deepEqual(
    toPublicPreviewSetupProjection(
      {
        state: 'workspace_reauth',
        recoveryId: 'setup_workspace_reauth',
      },
      { ...context, accountConnected: true },
    ),
    {
      state: 'account_required',
      reason: 'workspace_reauth',
      resume: 'available',
      recoveryId: 'setup_workspace_reauth',
      displayMessage:
        'Codex 연결을 확인했습니다. 보존된 학기 공간 준비를 이어가세요.',
      allowedCommands: ['setup.resume'],
    },
  )
  assert.deepEqual(
    toPublicPreviewSetupProjection(
      {
        state: 'transition_blocked',
        reason: 'account_unavailable',
        retry: 'resume',
        recoveryId: 'setup_transition_resume',
      },
      context,
    ),
    {
      state: 'transition_blocked',
      reason: 'account_unavailable',
      retry: 'resume',
      recoveryId: 'setup_transition_resume',
      displayMessage:
        'Codex 연결 상태를 확인한 뒤 학기 공간 준비를 다시 시도해 주세요.',
      allowedCommands: ['setup.resume'],
    },
  )
  assert.deepEqual(
    toPublicPreviewSetupProjection(
      {
        state: 'transition_blocked',
        reason: 'setup_transition_unavailable',
        retry: 'restart_required',
      },
      context,
    ),
    {
      state: 'transition_blocked',
      reason: 'setup_transition_unavailable',
      retry: 'restart_required',
      displayMessage:
        'AY-PLE을 종료한 뒤 같은 명령으로 다시 실행해 주세요.',
      allowedCommands: [],
    },
  )
})

test('Ready projection uses injected safe presentation and never serializes workspace authority', () => {
  const projected = toPublicPreviewSetupProjection(
    {
      state: 'ready',
      recoveryId: 'setup_ready_public',
      workspace: readyWorkspace(),
    },
    { ...context, accountConnected: true },
  )

  assert.deepEqual(projected, {
    state: 'ready',
    semesterLabel: '2학년 2학기',
    workspaceName: '2026-2학기',
    safeDisplayLocation: 'Home › Documents › 2026-2학기',
    checks: {
      account: 'confirmed',
      workspace: 'confirmed',
      ayEnvironment: 'confirmed',
    },
    nextJourney: {
      state: 'coming_next',
      label: '첫 자료 가져오기',
    },
    allowedCommands: [],
  })
  const serialized = JSON.stringify(projected)
  assert.equal(serialized.includes(privatePath), false)
  assert.equal(serialized.includes('workspace_'), false)
  assert.equal(serialized.includes('canonicalRoot'), false)
})

test('Ready projection rejects a presentation port that echoes private authority', () => {
  assert.throws(
    () =>
      toPublicPreviewSetupProjection(
        {
          state: 'ready',
          recoveryId: 'setup_ready_public',
          workspace: readyWorkspace(),
        },
        {
          ...context,
          accountConnected: true,
          presentReadyWorkspace: () => ({
            semesterLabel: '2학년 2학기',
            workspaceName: '2026-2학기',
            safeDisplayLocation: privatePath,
          }),
        },
      ),
    /safe workspace presentation/,
  )
})

test('Ready projection rejects a presenter that echoes private authority in semester copy', () => {
  assert.throws(
    () =>
      toPublicPreviewSetupProjection(
        {
          state: 'ready',
          recoveryId: 'setup_ready_public',
          workspace: readyWorkspace(),
        },
        {
          ...context,
          accountConnected: true,
          presentReadyWorkspace: () => ({
            semesterLabel: `2학년 ${privatePath}`,
            workspaceName: '2026-2학기',
            safeDisplayLocation:
              'Home › Documents › 2026-2학기',
          }),
        },
      ),
    /safe workspace presentation/,
  )
})

test('unattested private Ready remains resumable after logout and reconnect', () => {
  const projection: SemesterSetupJourneyProjection = {
    state: 'ready',
    recoveryId: 'setup_ready_public',
    workspace: readyWorkspace(),
  }

  assert.deepEqual(
    toPublicPreviewSetupProjection(projection, context),
    {
      state: 'account_required',
      reason: 'workspace_reauth',
      resume: 'awaiting_account',
      recoveryId: 'setup_ready_public',
      displayMessage:
        '학기 공간은 그대로 보존되어 있습니다. Codex에 다시 연결해 주세요.',
      allowedCommands: [],
    },
  )
  assert.deepEqual(
    toPublicPreviewSetupProjection(projection, {
      ...context,
      accountConnected: true,
      readyAttested: () => false,
    }),
    {
      state: 'account_required',
      reason: 'workspace_reauth',
      resume: 'available',
      recoveryId: 'setup_ready_public',
      displayMessage:
        'Codex 연결을 확인했습니다. 보존된 학기 공간 준비를 이어가세요.',
      allowedCommands: ['setup.resume'],
    },
  )
})

function readyWorkspace(
  term = { key: '2', displayName: '2학기' },
): AdmittedSemesterWorkspace {
  return {
    canonicalRoot: privatePath,
    workspaceId: `workspace_${'1'.repeat(32)}`,
    formatVersion: 3,
    manifest: {
      workspaceId: `workspace_${'1'.repeat(32)}`,
      semester: {
        yearLevel: 2,
        term,
      },
      courses: [],
    },
  }
}

function assertNoPrivateSetupFields(
  projection: PublicPreviewSetupProjection,
): void {
  const serialized = JSON.stringify(projection)
  for (const forbidden of [
    privatePath,
    privateDigest,
    'canonicalParent',
    'canonicalTarget',
    'canonicalBytesSha256',
    'descriptorSha256',
    'completeTreeSha256',
    'rootFileIdentity',
    '"lifecycle"',
    '"phase"',
    '"ready"',
  ]) {
    assert.equal(
      serialized.includes(forbidden),
      false,
      forbidden,
    )
  }
}
