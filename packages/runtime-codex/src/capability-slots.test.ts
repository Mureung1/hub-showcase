import assert from 'node:assert/strict'
import test from 'node:test'
import type {
  ClientRequest,
  ServerNotification,
} from './internal/codex-app-server-protocol/generated/index.js'
import { listCodexCapabilitySlots } from './index.js'

type GeneratedCodexAppServerMethod =
  | ClientRequest['method']
  | ServerNotification['method']

const requiredMethods = [
  'turn/steer',
  'thread/list',
  'thread/loaded/list',
  'thread/read',
  'thread/resume',
  'thread/fork',
  'thread/archive',
  'thread/approveGuardianDeniedAction',
  'item/autoApprovalReview/started',
  'item/autoApprovalReview/completed',
  'permissionProfile/list',
  'config/read',
  'thread/settings/updated',
  'thread/inject_items',
  'fs/readFile',
  'fuzzyFileSearch',
  'account/read',
  'getAuthStatus',
] satisfies GeneratedCodexAppServerMethod[]

test('Codex capability inventory exposes broad shallow engine slots', () => {
  const slots = listCodexCapabilitySlots()

  assert.deepEqual(
    slots.map((slot) => slot.id),
    [
      'steering',
      'thread-session-read',
      'thread-session-lifecycle',
      'approval',
      'profile-settings',
      'attachment-input',
      'account-profile',
    ],
  )
  assert.ok(slots.every((slot) => slot.productized === false))

  for (const method of requiredMethods) {
    assert.ok(
      slots.some((slot) => slot.methods.includes(method)),
      `expected slot inventory to include ${method}`,
    )
  }
})

test('Codex capability inventory keeps generated schema evidence visible', () => {
  const evidence = listCodexCapabilitySlots().flatMap((slot) => slot.evidence)

  for (const expectedEvidence of [
    'generated/ClientRequest.ts',
    'generated/ServerNotification.ts',
    'generated/v2/TurnSteerParams.ts',
    'generated/v2/ThreadSettings.ts',
    'generated/v2/ActivePermissionProfile.ts',
  ]) {
    assert.ok(
      evidence.some((entry) => entry.includes(expectedEvidence)),
      `expected evidence reference for ${expectedEvidence}`,
    )
  }
})

test('Codex capability inventory returns defensive copies', () => {
  const firstRead = listCodexCapabilitySlots()

  firstRead[0]?.methods.push('mutated')
  firstRead[0]?.evidence.push('mutated')

  const secondRead = listCodexCapabilitySlots()

  assert.equal(secondRead[0]?.methods.includes('mutated'), false)
  assert.equal(secondRead[0]?.evidence.includes('mutated'), false)
})
