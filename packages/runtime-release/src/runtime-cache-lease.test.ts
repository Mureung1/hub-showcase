import assert from 'node:assert/strict'
import {
  chmod,
  link,
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

import type {
  RuntimeCacheLeaseOwnerIdentity,
  RuntimeGenerationVerificationReceipt,
} from './runtime-cache-authority.js'
import { RuntimeReleaseAuthorityError } from './runtime-release-authority.js'
import {
  FileRuntimeCacheLeaseCoordinator,
} from './runtime-cache-lease.js'

test('same app-data identity joins one lease and wakes only after durable release', async () => {
  const fixture = await createLeaseFixture()
  try {
    const coordinator = new FileRuntimeCacheLeaseCoordinator()
    const owner = leaseOwner('1', 'a')
    const first = await coordinator.acquireOrJoin({
      lease: fixture.lease,
      owner,
      signal: new AbortController().signal,
    })
    assert.equal(first.kind, 'acquired')
    const durableBytes = await readFile(fixture.lease.path)

    const joined = await coordinator.acquireOrJoin({
      lease: fixture.lease,
      owner: leaseOwner('1', 'b'),
      signal: new AbortController().signal,
    })
    assert.equal(joined.kind, 'joined')
    let joinedSettled = false
    void joined.completion.then(() => {
      joinedSettled = true
    })
    await Promise.resolve()
    assert.equal(joinedSettled, false)

    await assert.rejects(
      coordinator.acquireOrJoin({
        lease: fixture.lease,
        owner: leaseOwner('2', 'c'),
        signal: new AbortController().signal,
      }),
      (error: unknown) =>
        error instanceof RuntimeReleaseAuthorityError &&
        error.failure.code === 'runtime_recovery_required',
    )
    assert.deepEqual(await readFile(fixture.lease.path), durableBytes)

    const receipt = generationReceipt()
    if (first.kind !== 'acquired') assert.fail('expected lease owner')
    await coordinator.complete(first, receipt)
    assert.equal(await pathExists(fixture.lease.path), false)
    assert.deepEqual(await joined.completion, receipt)
    assert.equal(joinedSettled, true)
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('a cancelled joiner detaches without cancelling the lease owner', async () => {
  const fixture = await createLeaseFixture()
  try {
    const coordinator = new FileRuntimeCacheLeaseCoordinator()
    const owner = leaseOwner('3', 'd')
    const first = await coordinator.acquireOrJoin({
      lease: fixture.lease,
      owner,
      signal: new AbortController().signal,
    })
    if (first.kind !== 'acquired') assert.fail('expected lease owner')

    const joinAbort = new AbortController()
    const joined = await coordinator.acquireOrJoin({
      lease: fixture.lease,
      owner: leaseOwner('3', 'e'),
      signal: joinAbort.signal,
    })
    if (joined.kind !== 'joined') assert.fail('expected joined caller')
    joinAbort.abort()
    await assert.rejects(
      joined.completion,
      (error: unknown) =>
        error instanceof RuntimeReleaseAuthorityError &&
        error.failure.code === 'runtime_cancelled',
    )
    assert.equal(await pathExists(fixture.lease.path), true)

    await coordinator.complete(first, generationReceipt())
    assert.equal(await pathExists(fixture.lease.path), false)
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('a pre-existing ambiguous lease is preserved without stale-owner inference', async () => {
  const fixture = await createLeaseFixture()
  try {
    const firstCoordinator = new FileRuntimeCacheLeaseCoordinator()
    const owner = leaseOwner('4', 'f')
    const first = await firstCoordinator.acquireOrJoin({
      lease: fixture.lease,
      owner,
      signal: new AbortController().signal,
    })
    if (first.kind !== 'acquired') assert.fail('expected lease owner')
    const durableBytes = await readFile(fixture.lease.path)

    FileRuntimeCacheLeaseCoordinator.forgetInProcessFlightForTesting(
      fixture.lease,
    )
    const restartedCoordinator = new FileRuntimeCacheLeaseCoordinator()
    await assert.rejects(
      restartedCoordinator.acquireOrJoin({
        lease: fixture.lease,
        owner: leaseOwner('4', '0'),
        signal: new AbortController().signal,
      }),
      (error: unknown) =>
        error instanceof RuntimeReleaseAuthorityError &&
        error.failure.code === 'runtime_recovery_required',
    )
    assert.deepEqual(await readFile(fixture.lease.path), durableBytes)

    await firstCoordinator.abandonForTesting(first)
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('late acquisition cancellation returns an owned handle and never strands an orphan', async () => {
  const fixture = await createLeaseFixture()
  const controller = new AbortController()
  try {
    const coordinator = new FileRuntimeCacheLeaseCoordinator({
      afterCreateDirectorySync: async () => {
        controller.abort()
      },
    })
    const acquired = await coordinator.acquireOrJoin({
      lease: fixture.lease,
      owner: leaseOwner('5', '1'),
      signal: controller.signal,
    })
    assert.equal(acquired.kind, 'acquired')
    assert.equal(controller.signal.aborted, true)
    assert.equal(await pathExists(fixture.lease.path), true)
    await acquired.release()
    assert.equal(await pathExists(fixture.lease.path), false)
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('hostile pre-existing lease forms are preserved and never inferred as stale', async (context) => {
  for (const hostile of [
    'symlink',
    'wrong-mode',
    'hardlink',
    'same-length-invalid-bytes',
  ] as const) {
    await context.test(hostile, async () => {
      const fixture = await createLeaseFixture()
      try {
        const ownerCoordinator =
          new FileRuntimeCacheLeaseCoordinator()
        const owner = await ownerCoordinator.acquireOrJoin({
          lease: fixture.lease,
          owner: leaseOwner('6', '2'),
          signal: new AbortController().signal,
        })
        if (owner.kind !== 'acquired') {
          assert.fail('expected lease owner')
        }
        const durableBytes = await readFile(fixture.lease.path)
        FileRuntimeCacheLeaseCoordinator.forgetInProcessFlightForTesting(
          fixture.lease,
        )
        let outsideCanary: string | undefined
        if (hostile === 'symlink') {
          outsideCanary = path.join(fixture.root, 'outside-canary')
          await writeFile(outsideCanary, 'outside\n', {
            mode: 0o600,
          })
          await unlink(fixture.lease.path)
          await symlink(outsideCanary, fixture.lease.path)
        } else if (hostile === 'wrong-mode') {
          await chmod(fixture.lease.path, 0o644)
        } else if (hostile === 'hardlink') {
          await link(
            fixture.lease.path,
            path.join(fixture.root, 'lease-alias'),
          )
        } else {
          await writeFile(
            fixture.lease.path,
            Buffer.alloc(durableBytes.byteLength, 0x78),
          )
        }
        const before = await lstat(fixture.lease.path, {
          bigint: true,
        })
        const beforeBytes =
          hostile === 'symlink'
            ? undefined
            : await readFile(fixture.lease.path)

        await assert.rejects(
          new FileRuntimeCacheLeaseCoordinator().acquireOrJoin({
            lease: fixture.lease,
            owner: leaseOwner('6', '3'),
            signal: new AbortController().signal,
          }),
          hasFailureCode('runtime_recovery_required'),
        )

        const after = await lstat(fixture.lease.path, {
          bigint: true,
        })
        assert.equal(after.dev, before.dev)
        assert.equal(after.ino, before.ino)
        assert.equal(after.mode, before.mode)
        assert.equal(after.nlink, before.nlink)
        if (beforeBytes !== undefined) {
          assert.deepEqual(
            await readFile(fixture.lease.path),
            beforeBytes,
          )
        }
        if (outsideCanary !== undefined) {
          assert.equal(
            await readFile(outsideCanary, 'utf8'),
            'outside\n',
          )
        }
      } finally {
        await rm(fixture.root, { recursive: true, force: true })
      }
    })
  }
})

test('owner mismatch fails before lease mutation', async () => {
  const fixture = await createLeaseFixture()
  try {
    await assert.rejects(
      new FileRuntimeCacheLeaseCoordinator({
        expectedOwnerUid: process.getuid!() + 1,
      }).acquireOrJoin({
        lease: fixture.lease,
        owner: leaseOwner('7', '4'),
        signal: new AbortController().signal,
      }),
      hasFailureCode('runtime_cache_unsafe'),
    )
    assert.equal(await pathExists(fixture.lease.path), false)
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('unsafe lease ancestors fail without redirecting a create', async (context) => {
  await context.test('owner-only mode drift', async () => {
    const fixture = await createLeaseFixture()
    try {
      await chmod(
        path.join(fixture.root, 'runtime-cache', 'v1'),
        0o755,
      )
      await assert.rejects(
        new FileRuntimeCacheLeaseCoordinator().acquireOrJoin({
          lease: fixture.lease,
          owner: leaseOwner('7', '5'),
          signal: new AbortController().signal,
        }),
        hasFailureCode('runtime_cache_unsafe'),
      )
      assert.equal(await pathExists(fixture.lease.path), false)
    } finally {
      await rm(fixture.root, { recursive: true, force: true })
    }
  })

  await context.test('lease-directory symlink', async () => {
    const fixture = await createLeaseFixture()
    try {
      const leaseDirectory = path.dirname(fixture.lease.path)
      const displaced = `${leaseDirectory}-displaced`
      const outside = path.join(fixture.root, 'outside-leases')
      await rename(leaseDirectory, displaced)
      await mkdir(outside, { mode: 0o700 })
      await symlink(outside, leaseDirectory)
      await assert.rejects(
        new FileRuntimeCacheLeaseCoordinator().acquireOrJoin({
          lease: fixture.lease,
          owner: leaseOwner('7', '6'),
          signal: new AbortController().signal,
        }),
        hasFailureCode('runtime_cache_unsafe'),
      )
      assert.deepEqual(
        await readdir(outside),
        [],
      )
      assert.deepEqual(
        await readdir(displaced),
        [],
      )
    } finally {
      await rm(fixture.root, { recursive: true, force: true })
    }
  })
})

test('create readback rejects a same-name replacement and preserves both inodes', async () => {
  const fixture = await createLeaseFixture()
  const displaced = `${fixture.lease.path}.displaced`
  try {
    const coordinator = new FileRuntimeCacheLeaseCoordinator({
      afterCreateDirectorySync: async () => {
        await rename(fixture.lease.path, displaced)
        await writeFile(
          fixture.lease.path,
          await readFile(displaced),
          { flag: 'wx', mode: 0o600 },
        )
      },
    })
    await assert.rejects(
      coordinator.acquireOrJoin({
        lease: fixture.lease,
        owner: leaseOwner('7', '7'),
        signal: new AbortController().signal,
      }),
      hasFailureCode('runtime_recovery_required'),
    )
    assert.equal(await pathExists(fixture.lease.path), true)
    assert.equal(await pathExists(displaced), true)
    assert.notEqual(
      (await lstat(fixture.lease.path, { bigint: true })).ino,
      (await lstat(displaced, { bigint: true })).ino,
    )
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('same-caller join freshly revalidates durable lease bytes', async () => {
  const fixture = await createLeaseFixture()
  let tamper = false
  try {
    const coordinator = new FileRuntimeCacheLeaseCoordinator({
      beforeJoinReadback: async () => {
        if (!tamper) return
        const bytes = await readFile(fixture.lease.path)
        await writeFile(
          fixture.lease.path,
          Buffer.alloc(bytes.byteLength, 0x78),
        )
      },
    })
    const owner = leaseOwner('8', '5')
    const acquired = await coordinator.acquireOrJoin({
      lease: fixture.lease,
      owner,
      signal: new AbortController().signal,
    })
    if (acquired.kind !== 'acquired') {
      assert.fail('expected lease owner')
    }
    tamper = true
    await assert.rejects(
      coordinator.acquireOrJoin({
        lease: fixture.lease,
        owner: leaseOwner('8', '6'),
        signal: new AbortController().signal,
      }),
      hasFailureCode('runtime_recovery_required'),
    )
    await assert.rejects(
      coordinator.fail(acquired, new Error('owner failed')),
      hasFailureCode('runtime_recovery_required'),
    )
    assert.equal(await pathExists(fixture.lease.path), true)
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('release revalidates the full chain and exact leaf before unlink', async (context) => {
  for (const drift of [
    'app-data-mode',
    'cache-parent-mode',
    'cache-root-mode',
    'lease-directory-mode',
    'lease-file-replacement',
    'lease-file-mode',
    'lease-file-hardlink',
    'lease-file-symlink',
    'lease-file-bytes',
  ] as const) {
    await context.test(drift, async () => {
      const fixture = await createLeaseFixture()
      let durableBytes = Buffer.alloc(0)
      try {
        const coordinator = new FileRuntimeCacheLeaseCoordinator({
          beforeReleaseUnlink: async () => {
            if (drift === 'app-data-mode') {
              await chmod(fixture.root, 0o755)
              return
            }
            if (drift === 'cache-parent-mode') {
              await chmod(
                path.join(fixture.root, 'runtime-cache'),
                0o755,
              )
              return
            }
            if (drift === 'cache-root-mode') {
              await chmod(
                path.join(
                  fixture.root,
                  'runtime-cache',
                  'v1',
                ),
                0o755,
              )
              return
            }
            if (drift === 'lease-directory-mode') {
              await chmod(
                path.dirname(fixture.lease.path),
                0o755,
              )
              return
            }
            if (drift === 'lease-file-mode') {
              await chmod(fixture.lease.path, 0o644)
              return
            }
            if (drift === 'lease-file-hardlink') {
              await link(
                fixture.lease.path,
                `${fixture.lease.path}.alias`,
              )
              return
            }
            if (drift === 'lease-file-bytes') {
              await writeFile(
                fixture.lease.path,
                Buffer.alloc(durableBytes.byteLength, 0x78),
              )
              return
            }
            const displaced = `${fixture.lease.path}.displaced`
            await rename(fixture.lease.path, displaced)
            if (drift === 'lease-file-symlink') {
              const outside = path.join(
                fixture.root,
                'outside-release-canary',
              )
              await writeFile(outside, 'outside\n', {
                mode: 0o600,
              })
              await symlink(outside, fixture.lease.path)
              return
            }
            await writeFile(fixture.lease.path, durableBytes, {
              flag: 'wx',
              mode: 0o600,
            })
          },
        })
        const acquired = await coordinator.acquireOrJoin({
          lease: fixture.lease,
          owner: leaseOwner('9', '7'),
          signal: new AbortController().signal,
        })
        if (acquired.kind !== 'acquired') {
          assert.fail('expected lease owner')
        }
        durableBytes = await readFile(fixture.lease.path)
        const joined = await coordinator.acquireOrJoin({
          lease: fixture.lease,
          owner: leaseOwner('9', '8'),
          signal: new AbortController().signal,
        })
        if (joined.kind !== 'joined') {
          assert.fail('expected joined caller')
        }
        await assert.rejects(
          coordinator.complete(acquired, generationReceipt()),
          hasFailureCode('runtime_recovery_required'),
        )
        await assert.rejects(
          joined.completion,
          hasFailureCode('runtime_recovery_required'),
        )
        assert.equal(await pathExists(fixture.lease.path), true)
        if (
          drift === 'lease-file-replacement' ||
          drift === 'lease-file-symlink'
        ) {
          assert.equal(
            await pathExists(`${fixture.lease.path}.displaced`),
            true,
          )
        }
      } finally {
        await rm(fixture.root, { recursive: true, force: true })
      }
    })
  }
})

test('release sync faults reject owner and joiners without false completion', async (context) => {
  for (const faultPoint of [
    'before-directory-sync',
    'competitor-after-directory-sync',
  ] as const) {
    await context.test(faultPoint, async () => {
      const fixture = await createLeaseFixture()
      let durableBytes = Buffer.alloc(0)
      try {
        const coordinator = new FileRuntimeCacheLeaseCoordinator({
          beforeReleaseDirectorySync: async () => {
            if (faultPoint === 'before-directory-sync') {
              throw new Error('injected directory sync fault')
            }
          },
          afterReleaseDirectorySync: async () => {
            if (
              faultPoint ===
              'competitor-after-directory-sync'
            ) {
              await writeFile(
                fixture.lease.path,
                durableBytes,
                { flag: 'wx', mode: 0o600 },
              )
            }
          },
        })
        const acquired = await coordinator.acquireOrJoin({
          lease: fixture.lease,
          owner: leaseOwner('a', '9'),
          signal: new AbortController().signal,
        })
        if (acquired.kind !== 'acquired') {
          assert.fail('expected lease owner')
        }
        durableBytes = await readFile(fixture.lease.path)
        const joined = await coordinator.acquireOrJoin({
          lease: fixture.lease,
          owner: leaseOwner('a', 'a'),
          signal: new AbortController().signal,
        })
        if (joined.kind !== 'joined') {
          assert.fail('expected joined caller')
        }
        await assert.rejects(
          coordinator.complete(acquired, generationReceipt()),
          hasFailureCode('runtime_recovery_required'),
        )
        await assert.rejects(
          joined.completion,
          hasFailureCode('runtime_recovery_required'),
        )
        assert.equal(
          await pathExists(fixture.lease.path),
          faultPoint === 'competitor-after-directory-sync',
        )
      } finally {
        await rm(fixture.root, { recursive: true, force: true })
      }
    })
  }
})

test('failed owner settlement also propagates release-fsync recovery to joiners', async () => {
  const fixture = await createLeaseFixture()
  try {
    const coordinator = new FileRuntimeCacheLeaseCoordinator({
      beforeReleaseDirectorySync: async () => {
        throw new Error('injected failure release sync fault')
      },
    })
    const acquired = await coordinator.acquireOrJoin({
      lease: fixture.lease,
      owner: leaseOwner('b', 'c'),
      signal: new AbortController().signal,
    })
    if (acquired.kind !== 'acquired') {
      assert.fail('expected lease owner')
    }
    const joined = await coordinator.acquireOrJoin({
      lease: fixture.lease,
      owner: leaseOwner('b', 'd'),
      signal: new AbortController().signal,
    })
    if (joined.kind !== 'joined') {
      assert.fail('expected joined caller')
    }
    await assert.rejects(
      coordinator.fail(acquired, new Error('transaction failed')),
      hasFailureCode('runtime_recovery_required'),
    )
    await assert.rejects(
      joined.completion,
      hasFailureCode('runtime_recovery_required'),
    )
    assert.equal(await pathExists(fixture.lease.path), false)
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('one settlement owns unlink while late same-caller acquires join its completion', async () => {
  const fixture = await createLeaseFixture()
  const unlinkReached = deferred<void>()
  const releaseSettlement = deferred<void>()
  try {
    const coordinator = new FileRuntimeCacheLeaseCoordinator({
      afterReleaseUnlink: async () => {
        unlinkReached.resolve()
        await releaseSettlement.promise
      },
    })
    const ownerIdentity = leaseOwner('c', 'd')
    const acquired = await coordinator.acquireOrJoin({
      lease: fixture.lease,
      owner: ownerIdentity,
      signal: new AbortController().signal,
    })
    if (acquired.kind !== 'acquired') {
      assert.fail('expected lease owner')
    }
    const initialJoin = await coordinator.acquireOrJoin({
      lease: fixture.lease,
      owner: leaseOwner('c', 'e'),
      signal: new AbortController().signal,
    })
    if (initialJoin.kind !== 'joined') {
      assert.fail('expected initial joined caller')
    }
    const receipt = generationReceipt()
    const completion = coordinator.complete(acquired, receipt)
    await unlinkReached.promise
    assert.equal(await pathExists(fixture.lease.path), false)

    const lateJoin = await coordinator.acquireOrJoin({
      lease: fixture.lease,
      owner: leaseOwner('c', 'f'),
      signal: new AbortController().signal,
    })
    if (lateJoin.kind !== 'joined') {
      assert.fail('expected late joined caller')
    }
    let lateSettled = false
    void lateJoin.completion.then(() => {
      lateSettled = true
    })
    await Promise.resolve()
    assert.equal(lateSettled, false)

    await assert.rejects(
      coordinator.fail(
        acquired,
        new Error('concurrent settlement must lose'),
      ),
      hasFailureCode('runtime_recovery_required'),
    )
    assert.equal(lateSettled, false)

    releaseSettlement.resolve()
    await completion
    assert.deepEqual(await initialJoin.completion, receipt)
    assert.deepEqual(await lateJoin.completion, receipt)
    assert.equal(lateSettled, true)
  } finally {
    releaseSettlement.resolve()
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('a settled lease handle cannot complete or fail twice', async () => {
  const fixture = await createLeaseFixture()
  try {
    const coordinator = new FileRuntimeCacheLeaseCoordinator()
    const acquired = await coordinator.acquireOrJoin({
      lease: fixture.lease,
      owner: leaseOwner('b', 'b'),
      signal: new AbortController().signal,
    })
    if (acquired.kind !== 'acquired') {
      assert.fail('expected lease owner')
    }
    await coordinator.complete(acquired, generationReceipt())
    await assert.rejects(
      coordinator.complete(acquired, generationReceipt()),
      hasFailureCode('runtime_recovery_required'),
    )
    await assert.rejects(
      coordinator.fail(acquired, new Error('duplicate failure')),
      hasFailureCode('runtime_recovery_required'),
    )
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

async function createLeaseFixture() {
  const createdRoot = await mkdtemp(
    path.join(tmpdir(), 'ay-ple-lease-'),
  )
  await chmod(createdRoot, 0o700)
  const root = await realpath(createdRoot)
  const leaseDirectory = path.join(
    root,
    'runtime-cache',
    'v1',
    'leases',
  )
  await mkdir(leaseDirectory, { recursive: true, mode: 0o700 })
  await chmod(path.join(root, 'runtime-cache'), 0o700)
  await chmod(path.join(root, 'runtime-cache', 'v1'), 0o700)
  await chmod(leaseDirectory, 0o700)
  const archiveSha256 = 'a'.repeat(64)
  return {
    root,
    lease: {
      kind: 'lease' as const,
      path: path.join(leaseDirectory, `${archiveSha256}.json`),
      archiveSha256,
    },
  }
}

function hasFailureCode(expected: string) {
  return (error: unknown): boolean => {
    assert.equal(
      error instanceof RuntimeReleaseAuthorityError,
      true,
    )
    assert.equal(
      (error as RuntimeReleaseAuthorityError).failure.code,
      expected,
    )
    return true
  }
}

function deferred<T>(): {
  readonly promise: Promise<T>
  resolve(value: T): void
} {
  let resolve: ((value: T) => void) | undefined
  const promise = new Promise<T>((complete) => {
    resolve = complete
  })
  return {
    promise,
    resolve: (value) => resolve!(value),
  }
}

function leaseOwner(
  instanceDigit: string,
  transactionDigit: string,
): RuntimeCacheLeaseOwnerIdentity {
  return {
    applicationInstanceNonce: instanceDigit.repeat(32),
    processId: process.pid,
    processStartIdentity: 'process-start-fixture',
    transactionNonce: transactionDigit.repeat(32),
  }
}

function generationReceipt(): RuntimeGenerationVerificationReceipt {
  return {
    schemaVersion: 1,
    kind: 'runtime_generation_verification',
    release: {
      archiveSha256: 'a'.repeat(64),
      manifestSha256: 'b'.repeat(64),
      releaseId: '0.1.0',
      runtimeContractVersion: 1,
      target: 'darwin-arm64',
    },
    generationIdentity: {
      device: '1',
      inode: '2',
      ownerUid: process.getuid!(),
    },
    manifest: {
      sha256: 'b'.repeat(64),
      payloadRosterSha256: 'c'.repeat(64),
      bundleRosterSha256: 'd'.repeat(64),
    },
  }
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await lstat(targetPath)
    return true
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return false
    }
    throw error
  }
}
