import assert from 'node:assert/strict'
import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
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
