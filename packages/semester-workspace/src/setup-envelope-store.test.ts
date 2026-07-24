import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  symlink,
  unlink,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

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

test('initial publication never replaces a competing final directory identity or bytes', async () => {
  const root = await ownerOnlyTempRoot('competing-final')
  const sentinel = path.join(root, 'setup', 'sentinel.txt')
  let competingIdentity:
    | { readonly device: number; readonly inode: number }
    | undefined
  try {
    const store = createSetupEnvelopeStore({
      appDataRoot: root,
      async fault(point) {
        if (point !== 'before_temp_create' || competingIdentity) return
        await mkdir(path.join(root, 'setup'), { mode: 0o700 })
        await writeFile(sentinel, 'competing-owner\n', { mode: 0o600 })
        const stats = await lstat(path.join(root, 'setup'))
        competingIdentity = {
          device: stats.dev,
          inode: stats.ino,
        }
      },
    })

    assert.deepEqual(
      await store.compareAndReplace({
        expectedRevisionToken: null,
        envelope: approvedEnvelope(1),
      }),
      { status: 'conflict' },
    )
    assert.ok(competingIdentity)
    const after = await lstat(path.join(root, 'setup'))
    assert.deepEqual(
      { device: after.dev, inode: after.ino },
      competingIdentity,
    )
    assert.equal(await readFile(sentinel, 'utf8'), 'competing-owner\n')
    assert.deepEqual(await readdir(root), ['setup'])
  } finally {
    await rm(root, { force: true, recursive: true })
  }
})

test('a competitor that publishes state after the prior compare keeps its identity and leaves no writer residue', async () => {
  const root = await ownerOnlyTempRoot('competing-pre-link-state')
  const statePath = path.join(root, 'setup', 'v1', 'state.json')
  const competitorBytes = encodeSetupStateEnvelope(preparedEnvelope(9))
  let competitorIdentity:
    | { readonly device: number; readonly inode: number }
    | undefined
  try {
    const store = createSetupEnvelopeStore({
      appDataRoot: root,
      async fault(point) {
        if (point !== 'after_prior_compare' || competitorIdentity) return
        await writeFile(statePath, competitorBytes, {
          flag: 'wx',
          mode: 0o600,
        })
        const stats = await lstat(statePath)
        competitorIdentity = {
          device: stats.dev,
          inode: stats.ino,
        }
      },
    })

    assert.deepEqual(
      await store.compareAndReplace({
        expectedRevisionToken: null,
        envelope: approvedEnvelope(1),
      }),
      { status: 'conflict' },
    )
    assert.ok(competitorIdentity)
    const after = await lstat(statePath)
    assert.deepEqual(
      { device: after.dev, inode: after.ino },
      competitorIdentity,
    )
    assert.deepEqual(await readFile(statePath), competitorBytes)
    assert.deepEqual(await readdir(path.dirname(statePath)), [
      'state.json',
    ])
    assert.deepEqual(await readdir(root), ['setup'])
  } finally {
    await rm(root, { force: true, recursive: true })
  }
})

test('concurrent initial writers preserve exactly one complete winner', async () => {
  const root = await ownerOnlyTempRoot('concurrent-initial')
  try {
    const stores = [
      createSetupEnvelopeStore({ appDataRoot: root }),
      createSetupEnvelopeStore({ appDataRoot: root }),
    ]
    const candidates = [approvedEnvelope(1), preparedEnvelope(2)]
    const results = await Promise.all(
      stores.map((store, index) =>
        store.compareAndReplace({
          expectedRevisionToken: null,
          envelope: candidates[index]!,
        }),
      ),
    )

    assert.equal(
      results.filter((result) => result.status === 'written').length,
      1,
    )
    assert.equal(
      results.filter((result) => result.status === 'conflict').length,
      1,
    )
    const winner = results.find((result) => result.status === 'written')
    assert.ok(winner)
    assert.deepEqual(await stores[0]!.read(), {
      status: 'current',
      envelope: winner.envelope,
      revisionToken: winner.revisionToken,
    })
    assert.deepEqual(
      await readdir(path.join(root, 'setup', 'v1')),
      ['state.json'],
    )
  } finally {
    await rm(root, { force: true, recursive: true })
  }
})

test('concurrent replacements cannot both claim the same observed bytes', async () => {
  const root = await ownerOnlyTempRoot('concurrent-replacement')
  try {
    const baselineStore = createSetupEnvelopeStore({
      appDataRoot: root,
    })
    const baseline = await baselineStore.compareAndReplace({
      expectedRevisionToken: null,
      envelope: approvedEnvelope(1),
    })
    assert.equal(baseline.status, 'written')
    if (baseline.status !== 'written') assert.fail('baseline required')
    const stores = [
      createSetupEnvelopeStore({ appDataRoot: root }),
      createSetupEnvelopeStore({ appDataRoot: root }),
    ]
    const candidates = [preparedEnvelope(2), approvedEnvelope(3)]
    const results = await Promise.all(
      stores.map((store, index) =>
        store.compareAndReplace({
          expectedRevisionToken: baseline.revisionToken,
          envelope: candidates[index]!,
        }),
      ),
    )

    assert.equal(
      results.filter((result) => result.status === 'written').length,
      1,
    )
    assert.equal(
      results.filter((result) => result.status === 'conflict').length,
      1,
    )
    const winner = results.find((result) => result.status === 'written')
    assert.ok(winner)
    assert.deepEqual(await baselineStore.read(), {
      status: 'current',
      envelope: winner.envelope,
      revisionToken: winner.revisionToken,
    })
    assert.deepEqual(
      await readdir(path.join(root, 'setup', 'v1')),
      ['state.json'],
    )
  } finally {
    await rm(root, { force: true, recursive: true })
  }
})

test('replacement rebind preserves a post-compare competitor and removes only intent-bound residue', async () => {
  const root = await ownerOnlyTempRoot('replacement-rebind')
  const statePath = path.join(root, 'setup', 'v1', 'state.json')
  const competitorPath = path.join(
    root,
    'setup',
    'v1',
    '.competitor-state',
  )
  const competitorBytes = encodeSetupStateEnvelope(approvedEnvelope(9))
  let competitorIdentity:
    | { readonly device: number; readonly inode: number }
    | undefined
  try {
    const baselineStore = createSetupEnvelopeStore({
      appDataRoot: root,
    })
    const baseline = await baselineStore.compareAndReplace({
      expectedRevisionToken: null,
      envelope: approvedEnvelope(1),
    })
    assert.equal(baseline.status, 'written')
    if (baseline.status !== 'written') assert.fail('baseline required')
    const replacingStore = createSetupEnvelopeStore({
      appDataRoot: root,
      async fault(point) {
        if (point !== 'after_prior_compare' || competitorIdentity) return
        await writeFile(competitorPath, competitorBytes, {
          flag: 'wx',
          mode: 0o600,
        })
        await rename(competitorPath, statePath)
        const stats = await lstat(statePath)
        competitorIdentity = {
          device: stats.dev,
          inode: stats.ino,
        }
      },
    })

    await assert.rejects(
      replacingStore.compareAndReplace({
        expectedRevisionToken: baseline.revisionToken,
        envelope: preparedEnvelope(2),
      }),
      /setup state store is unavailable/i,
    )
    assert.ok(competitorIdentity)
    const after = await lstat(statePath)
    assert.deepEqual(
      { device: after.dev, inode: after.ino },
      competitorIdentity,
    )
    assert.deepEqual(await readFile(statePath), competitorBytes)
    assert.deepEqual(await readdir(path.dirname(statePath)), [
      'state.json',
    ])
    assert.deepEqual(await readdir(root), ['setup'])
  } finally {
    await rm(root, { force: true, recursive: true })
  }
})

test('launch reconciliation preserves a same-name temporary inode that replaced intent-bound ownership', async () => {
  const root = await ownerOnlyTempRoot('replaced-temp-inode')
  try {
    await runCrashWriter({
      root,
      expectedRevisionToken: null,
      envelope: approvedEnvelope(1),
      faultPoint: 'after_temp_create',
    })
    const versionPath = path.join(root, 'setup', 'v1')
    const temporaryName = (await readdir(versionPath)).find((entry) =>
      entry.endsWith('.tmp'),
    )
    assert.ok(temporaryName)
    const temporaryPath = path.join(versionPath, temporaryName)
    await unlink(temporaryPath)
    await writeFile(temporaryPath, 'unknown replacement\n', {
      mode: 0o600,
    })
    const replacement = await lstat(temporaryPath)
    const before = await captureStoreTree(root)

    const store = createSetupEnvelopeStore({ appDataRoot: root })
    assert.deepEqual(await store.reconcileAbandonedWrite(), {
      status: 'incompatible',
      reason: 'missing_state',
    })
    assert.deepEqual(await captureStoreTree(root), before)
    const after = await lstat(temporaryPath)
    assert.equal(after.ino, replacement.ino)
    assert.equal(
      await readFile(temporaryPath, 'utf8'),
      'unknown replacement\n',
    )
  } finally {
    await rm(root, { force: true, recursive: true })
  }
})

test('pre-existing setup and version symlinks fail closed without mutating their targets', async () => {
  for (const unsafeAncestor of ['setup', 'version'] as const) {
    const root = await ownerOnlyTempRoot(`symlink-${unsafeAncestor}`)
    const external = await ownerOnlyTempRoot(
      `symlink-target-${unsafeAncestor}`,
    )
    try {
      if (unsafeAncestor === 'setup') {
        await symlink(external, path.join(root, 'setup'))
      } else {
        await mkdir(path.join(root, 'setup'), { mode: 0o700 })
        await symlink(external, path.join(root, 'setup', 'v1'))
      }
      const before = await captureStoreTree(external)
      const store = createSetupEnvelopeStore({ appDataRoot: root })
      assert.deepEqual(await store.read(), {
        status: 'incompatible',
        reason: 'missing_state',
      })
      assert.deepEqual(
        await store.compareAndReplace({
          expectedRevisionToken: null,
          envelope: approvedEnvelope(1),
        }),
        { status: 'conflict' },
      )
      assert.deepEqual(await captureStoreTree(external), before)
    } finally {
      await rm(root, { force: true, recursive: true })
      await rm(external, { force: true, recursive: true })
    }
  }
})

test('a live writer PID is only an availability hint and cannot authorize mutation', async () => {
  const root = await ownerOnlyTempRoot('live-writer-hint')
  let child: ReturnType<typeof spawn> | undefined
  try {
    child = spawnCrashWorker({
      root,
      expectedRevisionToken: null,
      envelope: approvedEnvelope(1),
      faultPoint: 'after_lease_publish',
      mode: 'pause',
    })
    await waitForWorkerPause(child)
    const before = await captureStoreTree(root)
    const store = createSetupEnvelopeStore({ appDataRoot: root })

    assert.deepEqual(await store.reconcileAbandonedWrite(), {
      status: 'incompatible',
      reason: 'missing_state',
    })
    assert.deepEqual(await captureStoreTree(root), before)

    child.kill('SIGKILL')
    await waitForChildClose(child)
    child = undefined
    assert.deepEqual(await store.reconcileAbandonedWrite(), {
      status: 'absent',
    })
    assert.deepEqual(await readdir(root), [])
  } finally {
    child?.kill('SIGKILL')
    await rm(root, { force: true, recursive: true })
  }
})

test('observe is read-only across an abandoned initial hard-link commit and launch reconciliation finishes it', async () => {
  const root = await ownerOnlyTempRoot('crash-initial-hard-link')
  try {
    await runCrashWriter({
      root,
      expectedRevisionToken: null,
      envelope: approvedEnvelope(1),
      faultPoint: 'after_rename',
    })
    const versionPath = path.join(root, 'setup', 'v1')
    const entriesBefore = (await readdir(versionPath)).sort()
    assert.equal(entriesBefore.length, 2)
    assert.ok(entriesBefore.includes('state.json'))
    const temporaryName = entriesBefore.find(
      (entry) => entry !== 'state.json',
    )
    assert.ok(temporaryName)
    const [stateBefore, temporaryBefore] = await Promise.all([
      lstat(path.join(versionPath, 'state.json')),
      lstat(path.join(versionPath, temporaryName)),
    ])
    assert.equal(stateBefore.nlink, 2)
    assert.equal(temporaryBefore.nlink, 2)
    assert.equal(stateBefore.ino, temporaryBefore.ino)

    const store = createSetupEnvelopeStore({ appDataRoot: root })
    assert.deepEqual(await store.read(), {
      status: 'incompatible',
      reason: 'missing_state',
    })
    assert.deepEqual((await readdir(versionPath)).sort(), entriesBefore)

    const reconciled = await store.reconcileAbandonedWrite()
    assert.equal(reconciled.status, 'current')
    if (reconciled.status !== 'current') {
      assert.fail('launch reconciliation must finish the committed state')
    }
    assert.deepEqual(reconciled.envelope, approvedEnvelope(1))
    assert.deepEqual(await readdir(versionPath), ['state.json'])
    assert.equal(
      (await lstat(path.join(versionPath, 'state.json'))).nlink,
      1,
    )
    assert.deepEqual(await readdir(root), ['setup'])
  } finally {
    await rm(root, { force: true, recursive: true })
  }
})

test('launch reconciliation classifies both guarded-old and renamed-new replacement crash shapes', async () => {
  for (const faultPoint of [
    'after_compare_guard',
    'after_rename',
  ] as const) {
    const root = await ownerOnlyTempRoot(`crash-replace-${faultPoint}`)
    try {
      const store = createSetupEnvelopeStore({ appDataRoot: root })
      const baseline = await store.compareAndReplace({
        expectedRevisionToken: null,
        envelope: approvedEnvelope(1),
      })
      assert.equal(baseline.status, 'written', faultPoint)
      if (baseline.status !== 'written') assert.fail('baseline required')

      await runCrashWriter({
        root,
        expectedRevisionToken: baseline.revisionToken,
        envelope: preparedEnvelope(2),
        faultPoint,
      })
      const versionPath = path.join(root, 'setup', 'v1')
      const before = (await readdir(versionPath)).sort()
      assert.ok(
        before.includes('.state.json.compare-guard'),
        faultPoint,
      )
      assert.deepEqual(await store.read(), {
        status: 'incompatible',
        reason: 'missing_state',
      })
      assert.deepEqual((await readdir(versionPath)).sort(), before)

      const reconciled = await store.reconcileAbandonedWrite()
      assert.equal(reconciled.status, 'current', faultPoint)
      if (reconciled.status !== 'current') {
        assert.fail('launch reconciliation must return current')
      }
      assert.deepEqual(
        reconciled.envelope,
        preparedEnvelope(2),
        faultPoint,
      )
      assert.deepEqual(await readdir(versionPath), ['state.json'])
      assert.equal(
        (await lstat(path.join(versionPath, 'state.json'))).nlink,
        1,
        faultPoint,
      )
    } finally {
      await rm(root, { force: true, recursive: true })
    }
  }
})

const initialCrashEquivalencePoints = [
  'after_lease_stage_create',
  'after_intent_file_create',
  'after_intent_file_write',
  'after_intent_file_sync',
  'after_lease_intent_sync',
  'after_lease_publish',
  'after_temp_create',
  'before_temp_write',
  'after_temp_write',
  'before_file_sync',
  'after_file_sync',
  'before_rename',
  'after_rename',
  'after_temp_unlink',
  'after_directory_sync',
  'after_readback',
  'before_lease_retire',
  'after_lease_retire',
  'after_ownership_unlink',
  'after_intent_unlink',
  'after_lease_remove',
] as const satisfies readonly SetupEnvelopeStoreFaultPoint[]

test('actual SIGKILL at every initial durable shape is observe-read-only and launch-convergent', async () => {
  for (const faultPoint of initialCrashEquivalencePoints) {
    const root = await ownerOnlyTempRoot(`kill-initial-${faultPoint}`)
    try {
      await runCrashWriter({
        root,
        expectedRevisionToken: null,
        envelope: approvedEnvelope(1),
        faultPoint,
      })
      const beforeObserve = await captureStoreTree(root)
      const store = createSetupEnvelopeStore({ appDataRoot: root })
      const observed = await store.read()
      assert.ok(
        observed.status === 'incompatible' ||
          observed.status === 'current' ||
          observed.status === 'absent',
        faultPoint,
      )
      assert.deepEqual(
        await captureStoreTree(root),
        beforeObserve,
        faultPoint,
      )

      const reconciled = await store.reconcileAbandonedWrite()
      assert.ok(
        reconciled.status === 'absent' ||
          reconciled.status === 'current',
        faultPoint,
      )
      if (reconciled.status === 'current') {
        assert.deepEqual(
          reconciled.envelope,
          approvedEnvelope(1),
          faultPoint,
        )
        assert.deepEqual(
          await readdir(path.join(root, 'setup', 'v1')),
          ['state.json'],
          faultPoint,
        )
      } else {
        assert.deepEqual(await readdir(root), [], faultPoint)
      }
      assert.equal(
        (await readdir(root)).some((entry) =>
          entry.startsWith('.setup-state-writer'),
        ),
        false,
        faultPoint,
      )
    } finally {
      await rm(root, { force: true, recursive: true })
    }
  }
})

const replacementCrashEquivalencePoints = [
  'after_lease_stage_create',
  'after_intent_file_create',
  'after_intent_file_write',
  'after_intent_file_sync',
  'after_lease_intent_sync',
  'after_lease_publish',
  'after_temp_create',
  'before_temp_write',
  'after_temp_write',
  'before_file_sync',
  'after_file_sync',
  'before_compare_guard',
  'after_compare_guard',
  'after_prior_compare',
  'before_rename',
  'after_rename',
  'after_directory_sync',
  'after_guard_unlink',
  'after_readback',
  'before_lease_retire',
  'after_lease_retire',
  'after_ownership_unlink',
  'after_intent_unlink',
  'after_lease_remove',
] as const satisfies readonly SetupEnvelopeStoreFaultPoint[]

test('actual SIGKILL at every replacement durable shape preserves one complete old-or-new envelope', async () => {
  for (const faultPoint of replacementCrashEquivalencePoints) {
    const root = await ownerOnlyTempRoot(`kill-replace-${faultPoint}`)
    try {
      const baselineStore = createSetupEnvelopeStore({
        appDataRoot: root,
      })
      const baseline = await baselineStore.compareAndReplace({
        expectedRevisionToken: null,
        envelope: approvedEnvelope(1),
      })
      assert.equal(baseline.status, 'written', faultPoint)
      if (baseline.status !== 'written') assert.fail('baseline required')
      await runCrashWriter({
        root,
        expectedRevisionToken: baseline.revisionToken,
        envelope: preparedEnvelope(2),
        faultPoint,
      })
      const beforeObserve = await captureStoreTree(root)
      const observed = await baselineStore.read()
      assert.ok(
        observed.status === 'incompatible' ||
          observed.status === 'current',
        faultPoint,
      )
      assert.deepEqual(
        await captureStoreTree(root),
        beforeObserve,
        faultPoint,
      )

      const reconciled =
        await baselineStore.reconcileAbandonedWrite()
      assert.equal(reconciled.status, 'current', faultPoint)
      if (reconciled.status !== 'current') {
        assert.fail('replacement must retain a current envelope')
      }
      assert.ok(
        [
          JSON.stringify(approvedEnvelope(1)),
          JSON.stringify(preparedEnvelope(2)),
        ].includes(JSON.stringify(reconciled.envelope)),
        faultPoint,
      )
      assert.deepEqual(
        await readdir(path.join(root, 'setup', 'v1')),
        ['state.json'],
        faultPoint,
      )
      assert.equal(
        (await lstat(
          path.join(root, 'setup', 'v1', 'state.json'),
        )).nlink,
        1,
        faultPoint,
      )
      assert.deepEqual(await readdir(root), ['setup'], faultPoint)
    } finally {
      await rm(root, { force: true, recursive: true })
    }
  }
})

const stateWriteFaults = [
  'after_lease_stage_create',
  'after_intent_file_create',
  'after_intent_file_write',
  'after_intent_file_sync',
  'after_lease_intent_sync',
  'after_lease_publish',
  'before_temp_create',
  'after_temp_create',
  'before_temp_write',
  'after_temp_write',
  'before_file_sync',
  'after_file_sync',
  'before_compare_guard',
  'after_compare_guard',
  'before_prior_compare',
  'after_prior_compare',
  'before_rename',
  'after_rename',
  'before_temp_unlink',
  'after_temp_unlink',
  'before_guard_unlink',
  'after_guard_unlink',
  'before_directory_sync',
  'after_directory_sync',
  'before_readback',
  'after_readback',
] as const satisfies readonly SetupEnvelopeStoreFaultPoint[]

const initialStateWriteFaults = stateWriteFaults.filter(
  (point) =>
    ![
      'before_compare_guard',
      'after_compare_guard',
      'before_guard_unlink',
      'after_guard_unlink',
    ].includes(point),
)

const replacementStateWriteFaults = stateWriteFaults.filter(
  (point) =>
    !['before_temp_unlink', 'after_temp_unlink'].includes(point),
)

test('every initial state write fault exposes only logical empty or one complete approved envelope without residue', async () => {
  for (const failAt of initialStateWriteFaults) {
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
      if (observed.status === 'current') {
        assert.equal(observed.status, 'current', failAt)
        assert.deepEqual(observed.envelope, approvedEnvelope(1), failAt)
      } else {
        assert.deepEqual(observed, { status: 'absent' }, failAt)
      }
      assert.equal(
        (await readdir(root)).includes('.setup-state-writer'),
        false,
        failAt,
      )
      if (observed.status === 'current') {
        assert.deepEqual(
          await readdir(path.join(root, 'setup', 'v1')),
          ['state.json'],
          failAt,
        )
        assert.equal(
          (await lstat(
            path.join(root, 'setup', 'v1', 'state.json'),
          )).nlink,
          1,
          failAt,
        )
      }
    } finally {
      await rm(root, { force: true, recursive: true })
    }
  }
})

test('every replacement write fault exposes only the prior approved or next prepared envelope without residue', async () => {
  for (const failAt of replacementStateWriteFaults) {
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
      assert.ok(
        [
          JSON.stringify(approvedEnvelope(1)),
          JSON.stringify(preparedEnvelope(2)),
        ].includes(JSON.stringify(observed.envelope)),
        failAt,
      )
      assert.deepEqual(
        await readdir(path.join(root, 'setup', 'v1')),
        ['state.json'],
        failAt,
      )
      assert.equal(
        (await lstat(
          path.join(root, 'setup', 'v1', 'state.json'),
        )).nlink,
        1,
        failAt,
      )
      assert.equal(
        (await readdir(root)).includes('.setup-state-writer'),
        false,
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

async function runCrashWriter(input: {
  readonly root: string
  readonly expectedRevisionToken: string | null
  readonly envelope: SetupStateEnvelope
  readonly faultPoint: SetupEnvelopeStoreFaultPoint
}): Promise<void> {
  const child = spawnCrashWorker({ ...input, mode: 'kill' })
  let stderr = ''
  child.stderr.setEncoding('utf8')
  child.stderr.on('data', (chunk: string) => {
    stderr += chunk
  })
  const exit = await waitForChildClose(child)
  assert.ok(
    (exit.code === null && exit.signal === 'SIGKILL') ||
      (exit.code === 137 && exit.signal === null),
    stderr || JSON.stringify(exit),
  )
}

function spawnCrashWorker(input: {
  readonly root: string
  readonly expectedRevisionToken: string | null
  readonly envelope: SetupStateEnvelope
  readonly faultPoint: SetupEnvelopeStoreFaultPoint
  readonly mode: 'kill' | 'pause'
}): ReturnType<typeof spawn> {
  const worker = fileURLToPath(
    new URL(
      './testing/setup-envelope-store-crash-worker.ts',
      import.meta.url,
    ),
  )
  const encodedEnvelope = Buffer.from(
    JSON.stringify(input.envelope),
    'utf8',
  ).toString('base64url')
  const child = spawn(
    fileURLToPath(
      new URL('../../../node_modules/.bin/tsx', import.meta.url),
    ),
    [
      worker,
      input.root,
      input.expectedRevisionToken ?? 'null',
      input.faultPoint,
      encodedEnvelope,
      input.mode,
    ],
    {
      cwd: fileURLToPath(new URL('../../..', import.meta.url)),
      env: {
        ...process.env,
        NODE_OPTIONS: '--conditions=development',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )
  return child
}

function waitForChildClose(
  child: ReturnType<typeof spawn>,
): Promise<{
    readonly code: number | null
    readonly signal: NodeJS.Signals | null
  }> {
  return new Promise((resolve, reject) => {
    child.once('error', reject)
    child.once('close', (code, signal) => resolve({ code, signal }))
  })
}

function waitForWorkerPause(
  child: ReturnType<typeof spawn>,
): Promise<void> {
  return new Promise((resolve, reject) => {
    let output = ''
    const timer = setTimeout(() => {
      reject(new Error('Crash worker did not pause.'))
      child.kill('SIGKILL')
    }, 10_000)
    child.once('error', reject)
    child.stdout.setEncoding('utf8')
    child.stdout.on('data', (chunk: string) => {
      output += chunk
      if (output.includes('paused\n')) {
        clearTimeout(timer)
        resolve()
      }
    })
  })
}

async function captureStoreTree(
  root: string,
  relative = '',
): Promise<readonly unknown[]> {
  const directory = path.join(root, relative)
  const entries = (await readdir(directory)).sort()
  const captured: unknown[] = []
  for (const entry of entries) {
    const relativePath = relative
      ? path.join(relative, entry)
      : entry
    const target = path.join(root, relativePath)
    const stats = await lstat(target)
    if (stats.isDirectory() && !stats.isSymbolicLink()) {
      captured.push({
        path: relativePath,
        type: 'directory',
        device: stats.dev,
        inode: stats.ino,
        entries: await captureStoreTree(root, relativePath),
      })
    } else if (stats.isFile() && !stats.isSymbolicLink()) {
      captured.push({
        path: relativePath,
        type: 'file',
        device: stats.dev,
        inode: stats.ino,
        links: stats.nlink,
        bytes: (await readFile(target)).toString('base64'),
      })
    } else {
      captured.push({
        path: relativePath,
        type: 'other',
        device: stats.dev,
        inode: stats.ino,
      })
    }
  }
  return captured
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
