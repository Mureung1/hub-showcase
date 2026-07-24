import assert from 'node:assert/strict'
import test from 'node:test'

import type {
  AdmittedSemesterWorkspace,
  LaunchBinding,
  SetupEnvelopeRead,
  SetupEnvelopeStore,
} from '@ay-ple/semester-workspace'

import {
  createSetupEnvelopeActionReadiness,
} from './setup-envelope-action-readiness.js'

const workspace = {
  canonicalRoot: '/private/semester',
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
} as const satisfies AdmittedSemesterWorkspace

const release = {
  application: {
    packageName: 'ay-ple',
    packageVersion: '0.0.1',
  },
  runtime: {
    releaseDescriptorSha256: '1'.repeat(64),
    manifestSha256: '2'.repeat(64),
    releaseId: 'release_action_readiness',
    target: 'darwin-arm64',
    runtimeContractVersion: 1,
  },
  bundle: {
    descriptorSha256: '3'.repeat(64),
    completeTreeSha256: '4'.repeat(64),
  },
} as const satisfies LaunchBinding

test('setup envelope action readiness admits only the exact active Ready workspace and release', async () => {
  let current: SetupEnvelopeRead = { status: 'absent' }
  const readiness = createSetupEnvelopeActionReadiness({
    stateStore: store(() => current),
    release,
    transitionAttestation: confirmedAttestation(),
  })

  assert.equal(await readiness.read(workspace), 'workspace_not_ready')
  current = {
    status: 'current',
    revisionToken: 'pending',
    envelope: {
      formatVersion: 1,
      revision: 1,
      state: {
        kind: 'pending',
        receipt: {
          setupId: 'setup_pending',
          setupPlanId: 'setup_plan_pending',
          lifecycle: { phase: 'prepared' },
          plan: {
            canonicalBytesSha256: '5'.repeat(64),
            semester: workspace.manifest.semester,
            target: {
              canonicalParent: '/private',
              parentDevice: '1',
              parentInode: '2',
              leafName: 'semester',
              canonicalTarget: workspace.canonicalRoot,
            },
          },
          release,
          workspace: {
            workspaceId: workspace.workspaceId,
            formatVersion: 3,
            rootMarkerSha256: '6'.repeat(64),
            ownedScaffoldPlanSha256: '7'.repeat(64),
            expectedInitialAggregateSha256: '8'.repeat(64),
          },
        },
      },
    },
  }
  assert.equal(
    await readiness.read(workspace),
    'workspace_not_ready',
  )
  current = readyRead()
  assert.equal(await readiness.read(workspace), 'ready')
  assert.equal(
    await readiness.read({
      ...workspace,
      workspaceId: `workspace_${'f'.repeat(32)}`,
      manifest: {
        ...workspace.manifest,
        workspaceId: `workspace_${'f'.repeat(32)}`,
      },
    }),
    'workspace_not_ready',
  )
})

test('setup envelope readiness fails closed for release drift and storage failure', async () => {
  const drifted = createSetupEnvelopeActionReadiness({
    stateStore: store(() => readyRead()),
    release: {
      ...release,
      application: {
        packageName: 'ay-ple',
        packageVersion: '0.0.2',
      },
    },
    transitionAttestation: confirmedAttestation(),
  })
  const unavailable = createSetupEnvelopeActionReadiness({
    stateStore: {
      async read() {
        throw new Error('storage unavailable')
      },
      async compareAndReplace() {
        return { status: 'conflict' }
      },
    },
    release,
    transitionAttestation: confirmedAttestation(),
  })

  assert.equal(await drifted.read(workspace), 'workspace_not_ready')
  assert.equal(
    await unavailable.read(workspace),
    'workspace_not_ready',
  )
})

function readyRead(): SetupEnvelopeRead {
  return {
    status: 'current',
    revisionToken: 'ready',
    envelope: {
      formatVersion: 1,
      revision: 2,
      state: {
        kind: 'active_ready',
        pointer: {
          setupId: 'setup_ready',
          release,
          workspace: {
            canonicalRoot: workspace.canonicalRoot,
            workspaceId: workspace.workspaceId,
            formatVersion: 3,
          },
        },
      },
    },
  }
}

function store(read: () => SetupEnvelopeRead): SetupEnvelopeStore {
  return {
    async read() {
      return read()
    },
    async compareAndReplace() {
      return { status: 'conflict' }
    },
  }
}

function confirmedAttestation() {
  const observed = readyRead()
  if (
    observed.status !== 'current' ||
    observed.envelope.state.kind !== 'active_ready'
  ) {
    assert.fail('active Ready fixture required')
  }
  return {
    read: () => ({
      state: 'confirmed' as const,
      ready: observed.envelope.state.pointer,
    }),
  }
}
