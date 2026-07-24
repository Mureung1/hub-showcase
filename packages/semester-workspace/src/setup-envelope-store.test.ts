import assert from 'node:assert/strict'
import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import type { SetupStateEnvelope } from './contract.js'
import {
  createSetupEnvelopeStore,
  decodeSetupStateEnvelopeBytes,
  encodeSetupStateEnvelope,
  type SetupEnvelopeStoreFaultPoint,
} from './setup-envelope-store.js'

test('logical empty is a read-only absence until the first approved envelope is durably published', async () => {
  const root = await ownerOnlyTempRoot('logical-empty')
  try {
    const store = createSetupEnvelopeStore({ appDataRoot: root })

    assert.deepEqual(await store.read(), { status: 'absent' })
    assert.deepEqual(await readdir(root), [])

    const approved = approvedEnvelope(1)
    const written = await store.compareAndReplace({
      expectedRevisionToken: null,
      envelope: approved,
    })

    assert.equal(written.status, 'written')
    if (written.status !== 'written') assert.fail('write must succeed')
    assert.deepEqual(written.envelope, approved)
    assert.deepEqual(await store.read(), {
      status: 'current',
      envelope: written.envelope,
      revisionToken: written.revisionToken,
    })
    assert.deepEqual(await readdir(root), ['setup'])
    assert.deepEqual(await readdir(path.join(root, 'setup')), ['v1'])
    assert.deepEqual(await readdir(path.join(root, 'setup', 'v1')), [
      'state.json',
    ])
    assert.equal(
      (await lstat(path.join(root, 'setup'))).mode & 0o777,
      0o700,
    )
    assert.equal(
      (await lstat(path.join(root, 'setup', 'v1', 'state.json'))).mode &
        0o777,
      0o600,
    )
    assert.deepEqual(
      decodeSetupStateEnvelopeBytes(
        await readFile(path.join(root, 'setup', 'v1', 'state.json')),
      ),
      approved,
    )
  } finally {
    await rm(root, { force: true, recursive: true })
  }
})

test('compare-and-replace preserves the observed winner and rejects a stale prior-byte authority', async () => {
  const root = await ownerOnlyTempRoot('compare-and-replace')
  try {
    const store = createSetupEnvelopeStore({ appDataRoot: root })
    const first = await store.compareAndReplace({
      expectedRevisionToken: null,
      envelope: approvedEnvelope(1),
    })
    assert.equal(first.status, 'written')
    if (first.status !== 'written') assert.fail('first write must succeed')

    const prepared = preparedEnvelope(2)
    const second = await store.compareAndReplace({
      expectedRevisionToken: first.revisionToken,
      envelope: prepared,
    })
    assert.equal(second.status, 'written')
    if (second.status !== 'written') assert.fail('replace must succeed')

    assert.deepEqual(
      await store.compareAndReplace({
        expectedRevisionToken: first.revisionToken,
        envelope: approvedEnvelope(3),
      }),
      { status: 'conflict' },
    )
    assert.deepEqual(await store.read(), {
      status: 'current',
      envelope: second.envelope,
      revisionToken: second.revisionToken,
    })
    assert.deepEqual(
      await readFile(path.join(root, 'setup', 'v1', 'state.json')),
      encodeSetupStateEnvelope(prepared),
    )
  } finally {
    await rm(root, { force: true, recursive: true })
  }
})

test('existing setup without one strict current envelope is never guessed to be pristine', async () => {
  const root = await ownerOnlyTempRoot('incompatible')
  try {
    await mkdir(path.join(root, 'setup', 'v1'), {
      mode: 0o700,
      recursive: true,
    })
    await writeFile(
      path.join(root, 'setup', 'v1', 'state.json'),
      '{"formatVersion":1,"revision":1,"state":{"kind":"pending"}}\n',
      { mode: 0o600 },
    )
    const before = await readFile(
      path.join(root, 'setup', 'v1', 'state.json'),
    )
    const store = createSetupEnvelopeStore({ appDataRoot: root })

    assert.deepEqual(await store.read(), {
      status: 'incompatible',
      reason: 'malformed',
    })
    assert.deepEqual(
      await store.compareAndReplace({
        expectedRevisionToken: null,
        envelope: approvedEnvelope(1),
      }),
      { status: 'conflict' },
    )
    assert.deepEqual(
      await readFile(path.join(root, 'setup', 'v1', 'state.json')),
      before,
    )
  } finally {
    await rm(root, { force: true, recursive: true })
  }
})

const stateWriteFaults = [
  'before_temp_create',
  'after_temp_create',
  'before_temp_write',
  'after_temp_write',
  'before_file_sync',
  'after_file_sync',
  'before_prior_compare',
  'after_prior_compare',
  'before_rename',
  'after_rename',
  'before_directory_sync',
  'after_directory_sync',
  'before_readback',
  'after_readback',
] as const satisfies readonly SetupEnvelopeStoreFaultPoint[]

test('every initial state write fault exposes only logical empty or one complete approved envelope', async () => {
  for (const failAt of stateWriteFaults) {
    const root = await ownerOnlyTempRoot(`initial-${failAt}`)
    let armed = true
    const store = createSetupEnvelopeStore({
      appDataRoot: root,
      fault(point) {
        if (armed && point === failAt) {
          armed = false
          throw new Error(`fault:${point}`)
        }
      },
    })
    try {
      await assert.rejects(
        store.compareAndReplace({
          expectedRevisionToken: null,
          envelope: approvedEnvelope(1),
        }),
        new RegExp(`fault:${failAt}`),
        failAt,
      )
      const observed = await createSetupEnvelopeStore({
        appDataRoot: root,
      }).read()
      const renamed = stateWriteFaults.indexOf(failAt) >=
        stateWriteFaults.indexOf('after_rename')
      if (renamed) {
        assert.equal(observed.status, 'current', failAt)
        if (observed.status !== 'current') {
          assert.fail('renamed state must be current')
        }
        assert.deepEqual(observed.envelope, approvedEnvelope(1), failAt)
      } else {
        assert.deepEqual(observed, { status: 'absent' }, failAt)
      }
    } finally {
      await rm(root, { force: true, recursive: true })
    }
  }
})

test('every replacement write fault exposes only the prior approved or next prepared envelope', async () => {
  for (const failAt of stateWriteFaults) {
    const root = await ownerOnlyTempRoot(`replace-${failAt}`)
    try {
      const baselineStore = createSetupEnvelopeStore({
        appDataRoot: root,
      })
      const baseline = await baselineStore.compareAndReplace({
        expectedRevisionToken: null,
        envelope: approvedEnvelope(1),
      })
      assert.equal(baseline.status, 'written', failAt)
      if (baseline.status !== 'written') assert.fail('baseline required')

      let armed = true
      const faultingStore = createSetupEnvelopeStore({
        appDataRoot: root,
        fault(point) {
          if (armed && point === failAt) {
            armed = false
            throw new Error(`fault:${point}`)
          }
        },
      })
      await assert.rejects(
        faultingStore.compareAndReplace({
          expectedRevisionToken: baseline.revisionToken,
          envelope: preparedEnvelope(2),
        }),
        new RegExp(`fault:${failAt}`),
        failAt,
      )
      const observed = await baselineStore.read()
      assert.equal(observed.status, 'current', failAt)
      if (observed.status !== 'current') assert.fail('current required')
      const renamed = stateWriteFaults.indexOf(failAt) >=
        stateWriteFaults.indexOf('after_rename')
      assert.deepEqual(
        observed.envelope,
        renamed ? preparedEnvelope(2) : approvedEnvelope(1),
        failAt,
      )
    } finally {
      await rm(root, { force: true, recursive: true })
    }
  }
})

async function ownerOnlyTempRoot(name: string): Promise<string> {
  const root = await realpath(
    await mkdtemp(
      path.join(tmpdir(), `ay-ple-setup-store-${name}-`),
    ),
  )
  await chmod(root, 0o700)
  return root
}

function approvedEnvelope(revision: number): SetupStateEnvelope {
  return {
    formatVersion: 1,
    revision,
    state: {
      kind: 'pending',
      receipt: {
        setupId: 'setup_transaction_12345678',
        setupPlanId: 'workspace_plan_12345678',
        lifecycle: { phase: 'approved' },
        plan: {
          canonicalBytesSha256: '1'.repeat(64),
          semester: {
            yearLevel: 2,
            term: { key: '2', displayName: '2학기' },
          },
          target: {
            canonicalParent: '/private/tmp/semester-parent',
            parentDevice: '16777230',
            parentInode: '12345',
            leafName: '2026-2학기',
            canonicalTarget:
              '/private/tmp/semester-parent/2026-2학기',
          },
        },
        release: {
          application: {
            packageName: 'ay-ple',
            packageVersion: '0.1.0-preview.1',
          },
          runtime: {
            releaseDescriptorSha256: '2'.repeat(64),
            manifestSha256: '3'.repeat(64),
            releaseId: 'runtime_release_12345678',
            target: 'darwin-arm64',
            runtimeContractVersion: 1,
          },
          bundle: {
            descriptorSha256: '4'.repeat(64),
            completeTreeSha256: '5'.repeat(64),
          },
        },
        workspace: {
          workspaceId: 'workspace_1234567890abcdef1234567890abcdef',
          formatVersion: 3,
          rootMarkerSha256: '6'.repeat(64),
          ownedScaffoldPlanSha256: '7'.repeat(64),
          expectedInitialAggregateSha256: '8'.repeat(64),
        },
      },
    },
  }
}

function preparedEnvelope(revision: number): SetupStateEnvelope {
  const approved = approvedEnvelope(revision)
  if (approved.state.kind !== 'pending') assert.fail('pending required')
  return {
    ...approved,
    state: {
      kind: 'pending',
      receipt: {
        ...approved.state.receipt,
        lifecycle: { phase: 'prepared' },
      },
    },
  }
}
