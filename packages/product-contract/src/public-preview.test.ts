import assert from 'node:assert/strict'
import test from 'node:test'

import {
  ProductContractError,
  decodePublicPreviewBootstrap,
  decodePublicPreviewCommand,
  decodePublicPreviewResponse,
} from './index.js'
import {
  PUBLIC_PREVIEW_ACCOUNT_FIXTURES,
  PUBLIC_PREVIEW_COMMAND_FIXTURES,
  PUBLIC_PREVIEW_RESPONSE_FIXTURES,
  PUBLIC_PREVIEW_SCENARIO_FIXTURES,
  PUBLIC_PREVIEW_SETUP_FIXTURES,
} from './testing/index.js'

test('public preview fixtures cover every frozen Account and Setup state', () => {
  assert.deepEqual(
    Object.values(PUBLIC_PREVIEW_ACCOUNT_FIXTURES).map(({ state }) => state),
    [
      'checking',
      'login_required',
      'login_starting',
      'login_pending',
      'verifying',
      'connected',
      'unsupported_account',
      'unavailable',
    ],
  )
  assert.deepEqual(
    Object.values(PUBLIC_PREVIEW_SETUP_FIXTURES).map(({ state }) => state),
    [
      'account_required',
      'account_required',
      'account_required',
      'input_required',
      'confirmation_required',
      'working',
      'transition_blocked',
      'transition_blocked',
      'release_blocked',
      'recovery_required',
      'recovery_required',
      'recovery_required',
      'recovery_required',
      'ready',
    ],
  )
  assert.deepEqual(
    PUBLIC_PREVIEW_SCENARIO_FIXTURES.map(({ name }) => name),
    [
      'signed_out',
      'login_offered',
      'login_pending',
      'auth_cancelled',
      'authenticated',
      'workspace_reauth_awaiting_account',
      'workspace_reauth_available',
      'confirmation_required',
      'working',
      'operation_blocked_during_transition',
      'recovery_required',
      'ready',
      'setup_conflict',
    ],
  )
})

test('producer fixtures and Browser consumer decoders preserve exact JSON values', () => {
  for (const fixture of PUBLIC_PREVIEW_RESPONSE_FIXTURES) {
    assert.deepEqual(
      decodePublicPreviewResponse(JSON.parse(JSON.stringify(fixture))),
      fixture,
    )
  }
  for (const fixture of PUBLIC_PREVIEW_COMMAND_FIXTURES) {
    assert.deepEqual(
      decodePublicPreviewCommand(JSON.parse(JSON.stringify(fixture))),
      fixture,
    )
  }
})

test('bootstrap decoder fails closed for missing, extra, unknown, and private fields', () => {
  const valid = {
    account: PUBLIC_PREVIEW_ACCOUNT_FIXTURES.connected,
    setup: PUBLIC_PREVIEW_SETUP_FIXTURES.ready,
  }

  assert.deepEqual(decodePublicPreviewBootstrap(valid), valid)
  assert.throws(
    () => decodePublicPreviewBootstrap({ account: valid.account }),
    ProductContractError,
  )
  assert.throws(
    () => decodePublicPreviewBootstrap({ ...valid, extra: true }),
    ProductContractError,
  )
  assert.throws(
    () =>
      decodePublicPreviewBootstrap({
        ...valid,
        account: { state: 'mystery', allowedCommands: [] },
      }),
    ProductContractError,
  )
  assert.throws(
    () =>
      decodePublicPreviewBootstrap({
        ...valid,
        setup: { ...valid.setup, absolutePath: '/private/workspace' },
      }),
    ProductContractError,
  )
})

test('login and recovery projections preserve the managed-auth and ownership boundaries', () => {
  const pending = PUBLIC_PREVIEW_ACCOUNT_FIXTURES.loginPending
  const bundleConflict = PUBLIC_PREVIEW_SETUP_FIXTURES.bundleConflictRecovery

  assert.deepEqual(
    decodePublicPreviewBootstrap({
      account: pending,
      setup: bundleConflict,
    }),
    {
      account: pending,
      setup: bundleConflict,
    },
  )
  assert.throws(
    () =>
      decodePublicPreviewBootstrap({
        account: {
          ...pending,
          userCode: 'DEVICE-CODE',
        },
        setup: bundleConflict,
      }),
    ProductContractError,
  )
  assert.throws(
    () =>
      decodePublicPreviewBootstrap({
        account: pending,
        setup: {
          ...bundleConflict,
          allowedCommands: [
            'setup.recover.resume',
            'setup.recover.discard',
          ],
        },
      }),
    ProductContractError,
  )
})

test('mutation commands bind exact transient authority and reject private correlation', () => {
  assert.throws(
    () => decodePublicPreviewCommand({ command: 'setup.resume' }),
    ProductContractError,
  )
  assert.throws(
    () =>
      decodePublicPreviewCommand({
        command: 'setup.resume',
        recoveryId: 'setup_transition_primary',
        receiptPhase: 'prepared',
      }),
    ProductContractError,
  )
  assert.throws(
    () =>
      decodePublicPreviewCommand({
        command: 'account.login.cancel',
        attemptId: 'account_attempt_primary',
        loginId: 'native-login',
      }),
    ProductContractError,
  )
})

test('managed login URL rejects embedded credentials and non-default ports', () => {
  const pending = PUBLIC_PREVIEW_ACCOUNT_FIXTURES.loginPending
  const setup = PUBLIC_PREVIEW_SETUP_FIXTURES.firstConnection

  for (const authUrl of [
    'https://token:secret@auth.openai.com/codex',
    'https://auth.openai.com:8443/codex',
  ]) {
    assert.throws(
      () =>
        decodePublicPreviewBootstrap({
          account: { ...pending, authUrl },
          setup,
        }),
      ProductContractError,
    )
  }
})

test('bootstrap relates Account readiness to Ready and workspace reauth authority', () => {
  const loginRequired = PUBLIC_PREVIEW_ACCOUNT_FIXTURES.loginRequired
  const connected = PUBLIC_PREVIEW_ACCOUNT_FIXTURES.connected
  const unavailable = PUBLIC_PREVIEW_ACCOUNT_FIXTURES.unavailable
  const awaitingAccount =
    PUBLIC_PREVIEW_SETUP_FIXTURES.workspaceReauthAwaitingAccount
  const available = PUBLIC_PREVIEW_SETUP_FIXTURES.workspaceReauthAvailable

  assert.deepEqual(
    decodePublicPreviewBootstrap({
      account: loginRequired,
      setup: awaitingAccount,
    }),
    { account: loginRequired, setup: awaitingAccount },
  )
  assert.deepEqual(
    decodePublicPreviewBootstrap({ account: connected, setup: available }),
    { account: connected, setup: available },
  )
  assert.throws(
    () =>
      decodePublicPreviewBootstrap({
        account: unavailable,
        setup: PUBLIC_PREVIEW_SETUP_FIXTURES.ready,
      }),
    ProductContractError,
  )
  assert.throws(
    () =>
      decodePublicPreviewBootstrap({
        account: loginRequired,
        setup: available,
      }),
    ProductContractError,
  )
  assert.throws(
    () =>
      decodePublicPreviewBootstrap({
        account: connected,
        setup: PUBLIC_PREVIEW_SETUP_FIXTURES.firstConnection,
      }),
    ProductContractError,
  )
  assert.throws(
    () =>
      decodePublicPreviewBootstrap({
        account: loginRequired,
        setup: {
          ...awaitingAccount,
          allowedCommands: ['setup.resume'],
        },
      }),
    ProductContractError,
  )
  assert.throws(
    () =>
      decodePublicPreviewBootstrap({
        account: connected,
        setup: { ...available, allowedCommands: [] },
      }),
    ProductContractError,
  )
  const { resume: _resume, ...ambiguousReauth } = available
  assert.throws(
    () =>
      decodePublicPreviewBootstrap({
        account: connected,
        setup: ambiguousReauth,
      }),
    ProductContractError,
  )
  const { recoveryId: _recoveryId, ...unboundReauth } = available
  assert.throws(
    () =>
      decodePublicPreviewBootstrap({
        account: connected,
        setup: unboundReauth,
      }),
    ProductContractError,
  )
})
