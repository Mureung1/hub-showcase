import assert from 'node:assert/strict'
import test from 'node:test'

import type {
  CodexRuntimeRole,
} from '@ay-ple/codex-chat-runtime'
import {
  DeterministicCodexChatRuntime,
} from '@ay-ple/codex-chat-runtime/testing'
import type {
  AdmittedSemesterWorkspace,
} from '@ay-ple/semester-workspace'

import {
  PublicPreviewRuntimeStartError,
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

test('an ambiguous auth-only role cleanup surfaces a stable Runtime start failure', async () => {
  const closeCalls = { count: 0 }
  const runtime = runtimeWithCloseSequence(
    {
      role: 'workspace',
      workspaceRoot: '/unexpected/workspace',
    },
    closeCalls,
    [{ status: 'ambiguous', processTreeGone: false }],
  )

  await assert.rejects(
    createPublicPreviewRuntimeOwner(
      runtimeBootstrap(async () => ({
        runtimeRoot: '/verified/runtime',
        identity: runtimeIdentity,
      })),
      expectedBinding,
      async () => runtime,
    ),
    (error) => {
      assert.ok(error instanceof PublicPreviewRuntimeStartError)
      assert.equal(
        error.code,
        'public_preview_runtime_cleanup_ambiguous',
      )
      return true
    },
  )
  assert.equal(closeCalls.count, 1)
})

test('a rejected workspace role cleanup stays owned for a later close retry', async () => {
  const closeCalls = { count: 0 }
  const authRuntime = new DeterministicCodexChatRuntime({
    role: {
      role: 'auth-only',
      bootstrapCwd: '/controlled/bootstrap',
    },
  })
  const changedWorkspaceRuntime = runtimeWithCloseSequence(
    {
      role: 'auth-only',
      bootstrapCwd: '/unexpected/bootstrap',
    },
    closeCalls,
    [
      new Error('synthetic workspace cleanup failure'),
      { status: 'closed', processTreeGone: true },
    ],
  )
  let generation = 0
  const owner = await createPublicPreviewRuntimeOwner(
    runtimeBootstrap(async () => ({
      runtimeRoot: '/verified/runtime',
      identity: runtimeIdentity,
    })),
    expectedBinding,
    async () => {
      generation += 1
      return generation === 1 ? authRuntime : changedWorkspaceRuntime
    },
  )
  await owner.closeAuthOnly({ signal: signal() })

  await assert.rejects(
    owner.startWorkspace({
      workspace: semesterWorkspace('3'),
      signal: signal(),
    }),
    (error) => {
      assert.ok(error instanceof PublicPreviewRuntimeStartError)
      assert.equal(
        error.code,
        'public_preview_runtime_cleanup_ambiguous',
      )
      return true
    },
  )
  assert.equal(closeCalls.count, 1)
  assert.deepEqual(
    await owner.closeCurrent({ signal: signal() }),
    { status: 'closed', processTreeGone: true },
  )
  assert.equal(closeCalls.count, 2)
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

function semesterWorkspace(
  digit: string,
): AdmittedSemesterWorkspace {
  const workspaceId = `workspace_${digit.repeat(32)}`
  return {
    canonicalRoot: '/semester/workspace',
    workspaceId,
    formatVersion: 3,
    manifest: {
      workspaceId,
      semester: {
        yearLevel: 2,
        term: { key: '2', displayName: '2학기' },
      },
      courses: [],
    },
  }
}

function runtimeWithCloseSequence(
  role: CodexRuntimeRole,
  calls: { count: number },
  outcomes: readonly (
    | Error
    | {
        readonly status: 'closed'
        readonly processTreeGone: true
      }
    | {
        readonly status: 'ambiguous'
        readonly processTreeGone: false
      }
  )[],
): DeterministicCodexChatRuntime {
  const runtime = new DeterministicCodexChatRuntime({ role })
  const remaining = [...outcomes]
  Object.defineProperty(runtime, 'close', {
    value: async () => {
      calls.count += 1
      const outcome = remaining.shift()
      if (!outcome) throw new Error('Unexpected Runtime close')
      if (outcome instanceof Error) throw outcome
      return outcome
    },
  })
  return runtime
}
