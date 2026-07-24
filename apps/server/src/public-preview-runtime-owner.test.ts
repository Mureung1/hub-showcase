import assert from 'node:assert/strict'
import test from 'node:test'

import {
  DeterministicCodexChatRuntime,
} from '@ay-ple/codex-chat-runtime/testing'

import {
  createPublicPreviewRuntimeOwner,
  type PublicPreviewExpectedRuntimeBinding,
  type PublicPreviewRuntimeBootstrap,
} from './public-preview-runtime-owner.js'

const runtimeIdentity = {
  releaseId: '0.144.4',
  target: 'darwin-arm64',
  runtimeContractVersion: 1,
} as const

const expectedBinding = {
  applicationVersion: '0.0.1',
  runtime: runtimeIdentity,
} as const satisfies PublicPreviewExpectedRuntimeBinding

test('rejected exact Runtime capability prevents every native spawn', async () => {
  let spawnCalls = 0
  const bootstrap = runtimeBootstrap(async () => {
    throw new Error('runtime_spawn_authority_missing')
  })

  await assert.rejects(
    createPublicPreviewRuntimeOwner(
      bootstrap,
      expectedBinding,
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
    return {
      runtimeRoot: '/verified/runtime',
      identity: runtimeIdentity,
    }
  })
  const owner = await createPublicPreviewRuntimeOwner(
    bootstrap,
    expectedBinding,
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
        identity: runtimeIdentity,
      })),
      expectedBinding,
      async () => runtime,
    ),
    /auth-only Runtime role changed/,
  )
  assert.deepEqual(
    runtime.calls.map(({ operation }) => operation),
    ['closeAccount'],
  )
})

test('a mismatched initial release identity prevents the auth-only spawn', async () => {
  let spawnCalls = 0

  await assert.rejects(
    createPublicPreviewRuntimeOwner(
      runtimeBootstrap(async () => ({
        runtimeRoot: '/verified/runtime',
        identity: {
          ...runtimeIdentity,
          releaseId: '0.145.0',
        },
      })),
      expectedBinding,
      async () => {
        spawnCalls += 1
        return new DeterministicCodexChatRuntime()
      },
    ),
    /release was not authorized/,
  )
  assert.equal(spawnCalls, 0)
})

test('every workspace generation rechecks the expected release before spawn', async () => {
  let verification = 0
  const roles: string[] = []
  const owner = await createPublicPreviewRuntimeOwner(
    runtimeBootstrap(async () => {
      verification += 1
      return {
        runtimeRoot: '/verified/runtime',
        identity:
          verification === 1
            ? runtimeIdentity
            : { ...runtimeIdentity, runtimeContractVersion: 2 },
      }
    }),
    expectedBinding,
    async ({ role }) => {
      roles.push(role.role)
      return new DeterministicCodexChatRuntime({ role })
    },
  )
  await owner.closeAuthOnly({ signal: signal() })

  await assert.rejects(
    owner.startWorkspace({
      workspace: {
        canonicalRoot: '/semester/workspace',
        workspaceId: `workspace_${'2'.repeat(32)}`,
        formatVersion: 3,
        manifest: {
          workspaceId: `workspace_${'2'.repeat(32)}`,
          semester: {
            yearLevel: 2,
            term: { key: '2', displayName: '2학기' },
          },
          courses: [],
        },
      },
      signal: signal(),
    }),
    /release was not authorized/,
  )
  assert.deepEqual(roles, ['auth-only'])
  assert.equal(verification, 2)
})

function runtimeBootstrap(
  verifyRuntimeForSpawn:
    PublicPreviewRuntimeBootstrap['spawn']['verifyRuntimeForSpawn'],
): PublicPreviewRuntimeBootstrap {
  return {
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
