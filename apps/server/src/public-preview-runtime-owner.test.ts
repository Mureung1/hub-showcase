import assert from 'node:assert/strict'
import test from 'node:test'

import {
  DeterministicCodexChatRuntime,
} from '@ay-ple/codex-chat-runtime/testing'

import {
  createPublicPreviewRuntimeOwner,
  type PublicPreviewRuntimeBootstrap,
} from './public-preview-runtime-owner.js'

test('rejected exact Runtime capability prevents every native spawn', async () => {
  let spawnCalls = 0
  const bootstrap = runtimeBootstrap(async () => {
    throw new Error('runtime_spawn_authority_missing')
  })

  await assert.rejects(
    createPublicPreviewRuntimeOwner(
      bootstrap,
      async () => {
        spawnCalls += 1
        return new DeterministicCodexChatRuntime()
      },
    ),
    /runtime_spawn_authority_missing/,
  )
  assert.equal(spawnCalls, 0)
})

test('auth-only and workspace generations each consume a fresh spawn capability verification', async () => {
  const verifications: string[] = []
  const roles: string[] = []
  const bootstrap = runtimeBootstrap(async () => {
    verifications.push('verify')
    return { runtimeRoot: '/verified/runtime' }
  })
  const owner = await createPublicPreviewRuntimeOwner(
    bootstrap,
    async ({ role }) => {
      roles.push(role.role)
      return new DeterministicCodexChatRuntime({ role })
    },
  )

  assert.equal(
    (await owner.current({ signal: signal() })).role.role,
    'auth-only',
  )
  assert.deepEqual(
    await owner.closeAuthOnly({ signal: signal() }),
    { status: 'closed', processTreeGone: true },
  )
  await owner.startWorkspace({
    workspace: {
      canonicalRoot: '/semester/workspace',
      workspaceId: `workspace_${'1'.repeat(32)}`,
      formatVersion: 3,
      manifest: {
        workspaceId: `workspace_${'1'.repeat(32)}`,
        semester: {
          yearLevel: 2,
          term: { key: '2', displayName: '2학기' },
        },
        courses: [],
      },
    },
    signal: signal(),
  })

  assert.deepEqual(verifications, ['verify', 'verify'])
  assert.deepEqual(roles, ['auth-only', 'workspace'])
  assert.deepEqual(
    await owner.closeCurrent({ signal: signal() }),
    { status: 'closed', processTreeGone: true },
  )
})

test('a changed auth-only Runtime role is closed before owner creation fails', async () => {
  const runtime = new DeterministicCodexChatRuntime({
    role: {
      role: 'workspace',
      workspaceRoot: '/unexpected/workspace',
    },
  })

  await assert.rejects(
    createPublicPreviewRuntimeOwner(
      runtimeBootstrap(async () => ({
        runtimeRoot: '/verified/runtime',
      })),
      async () => runtime,
    ),
    /auth-only Runtime role changed/,
  )
  assert.deepEqual(
    runtime.calls.map(({ operation }) => operation),
    ['closeAccount'],
  )
})

function runtimeBootstrap(
  verifyRuntimeForSpawn:
    PublicPreviewRuntimeBootstrap['spawn']['verifyRuntimeForSpawn'],
): PublicPreviewRuntimeBootstrap {
  return {
    applicationVersion: '0.0.1',
    authOnlyBootstrapCwd: '/controlled/bootstrap',
    environment: {
      home: '/controlled/home',
      codexHome: '/controlled/codex-home',
      codexSqliteHome: '/controlled/codex-sqlite-home',
      tempDirectory: '/controlled/temp',
    },
    spawn: { verifyRuntimeForSpawn },
  }
}

function signal(): AbortSignal {
  return new AbortController().signal
}
