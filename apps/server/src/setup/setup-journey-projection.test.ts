import assert from 'node:assert/strict'
import test from 'node:test'

import {
  decodePublicPreviewSetupProjection,
  type PublicPreviewSetupProjection,
} from '@ay-ple/product-contract'
import type {
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
