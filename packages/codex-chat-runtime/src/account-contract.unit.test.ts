import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CODEX_BROWSER_LOGIN_ATTEMPT_TIMEOUT_MS,
  CODEX_BROWSER_LOGIN_OPTIONS,
} from './account-contract.js'
import type {
  CodexAccountLifecycle,
  CodexBrowserLoginAttempt,
  CodexRuntimeRole,
} from './account-contract.js'

type Assert<T extends true> = T
type HasAccountLifecycleRoster = Assert<
  keyof CodexAccountLifecycle extends
    | 'role'
    | 'readAccount'
    | 'startBrowserLogin'
    | 'readBrowserLoginAttempt'
    | 'cancelBrowserLogin'
    | 'releaseBrowserLoginAttempt'
    | 'logout'
    | 'close'
    ? true
    : false
>

const roles = [
  { role: 'auth-only', bootstrapCwd: '/private/bootstrap' },
  { role: 'workspace', workspaceRoot: '/private/workspace' },
] as const satisfies readonly CodexRuntimeRole[]

const attempts = [
  { status: 'pending', attemptId: 'attempt_a' },
  { status: 'completed', attemptId: 'attempt_a' },
  { status: 'cancelled', attemptId: 'attempt_a' },
  { status: 'expired', attemptId: 'attempt_a' },
] as const satisfies readonly CodexBrowserLoginAttempt[]

test('private account contract freezes both Runtime roles and terminal attempts', () => {
  const _interfaceRoster: HasAccountLifecycleRoster = true
  assert.equal(_interfaceRoster, true)
  assert.deepEqual(
    roles.map(({ role }) => role),
    ['auth-only', 'workspace'],
  )
  assert.deepEqual(
    attempts.map(({ status }) => status),
    ['pending', 'completed', 'cancelled', 'expired'],
  )
  assert.equal(CODEX_BROWSER_LOGIN_ATTEMPT_TIMEOUT_MS, 600_000)
  assert.deepEqual(CODEX_BROWSER_LOGIN_OPTIONS, {
    useHostedLoginSuccessPage: true,
    appBrand: 'codex',
  })
})
