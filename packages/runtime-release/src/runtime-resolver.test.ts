import assert from 'node:assert/strict'
import {
  link,
  lstat,
  mkdir,
  open,
  readFile,
  readdir,
  writeFile,
} from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'

import type {
  RuntimeResolveProgress,
  VerifiedRuntime,
} from './contract.js'
import {
  RuntimeReleaseAuthorityError,
} from './runtime-release-authority.js'
import type {
  RuntimeReleaseAdmissionInput,
} from './runtime-release-authority.js'
import {
  FileRuntimeCacheLeaseCoordinator,
} from './runtime-cache-lease.js'
import {
  bootstrapRuntimeCache,
} from './runtime-cache-bootstrap.js'
import type {
  RuntimeCacheLayout,
} from './runtime-cache-authority.js'
import {
  ArchiveTransportNetworkError,
} from './runtime-archive-transport.js'
import {
  createRuntimeResolutionScheduler,
} from './runtime-resolution-control.js'
import {
  createRuntimeResolverBundleForTesting,
} from './runtime-resolver.js'
import type {
  RuntimeResolverBundleInput,
  RuntimeResolverTestingDependencies,
} from './runtime-resolver.js'
import {
  ScriptedArchiveTransport,
  createOwnerOnlyTempAppDataRoot,
  createRuntimeResolverReleaseFixture,
  exactArchiveResponse,
} from './runtime-resolver-fixture.test.js'

test('first resolve installs exact bytes and a valid generation cache hit performs zero network', async () => {
  const fixture = await createRuntimeResolverReleaseFixture()
  const appData = await createOwnerOnlyTempAppDataRoot()
  const transport = new ScriptedArchiveTransport([
    exactArchiveResponse(fixture.archiveBytes, {
      chunks: splitBytes(fixture.archiveBytes, 3),
    }),
  ])
  const bundle = createTestBundle(
    fixture.admissionInput,
    transport,
  )
  const firstProgress: RuntimeResolveProgress[] = []
  try {
    const first = await bundle.resolver.resolve({
      appDataRoot: appData.appDataRoot,
      signal: new AbortController().signal,
      report: (progress) => firstProgress.push(progress),
    })

    assert.equal(transport.requests.length, 1)
    assert.equal(
      first.runtimeRoot,
      path.join(
        appData.appDataRoot,
        'runtime-cache',
        'v1',
        'generations',
        fixture.admission.identity.releaseId,
        fixture.admission.identity.target,
        fixture.admission.identity.archiveSha256,
        'runtime',
      ),
    )
    assert.equal(Object.isFrozen(first), true)
    assert.equal(Object.isFrozen(first.identity), true)
    assert.deepEqual(
      uniquePhases(firstProgress),
      [
        'checking_cache',
        'downloading',
        'verifying_archive',
        'installing',
        'verifying_runtime',
        'ready',
      ],
    )
    assert.deepEqual(
      await bundle.spawnBoundary.verifyForSpawn({
        runtime: first,
        signal: new AbortController().signal,
      }),
      first,
    )

    const secondProgress: RuntimeResolveProgress[] = []
    const second = await bundle.resolver.resolve({
      appDataRoot: appData.appDataRoot,
      signal: new AbortController().signal,
      report: (progress) => secondProgress.push(progress),
    })

    assert.equal(transport.requests.length, 1)
    assert.deepEqual(second, first)
    assert.notEqual(second, first)
    assert.deepEqual(uniquePhases(secondProgress), [
      'checking_cache',
      'verifying_runtime',
      'ready',
    ])
    transport.assertExhausted()
  } finally {
    await appData.cleanup()
  }
})

test('same-identity callers share one transaction and one caller can detach without cancelling the other', async () => {
  const fixture = await createRuntimeResolverReleaseFixture()
  const appData = await createOwnerOnlyTempAppDataRoot()
  const releaseBody = deferred<void>()
  const transport = new ScriptedArchiveTransport([
    {
      ...exactArchiveResponse(fixture.archiveBytes),
      beforeChunks: () => releaseBody.promise,
    },
  ])
  const bundle = createTestBundle(
    fixture.admissionInput,
    transport,
  )
  const firstController = new AbortController()
  const firstProgress: RuntimeResolveProgress[] = []
  const secondProgress: RuntimeResolveProgress[] = []
  const secondDownloading = deferred<void>()
  try {
    const first = bundle.resolver.resolve({
      appDataRoot: appData.appDataRoot,
      signal: firstController.signal,
      report: (progress) => firstProgress.push(progress),
    })
    await waitFor(
      () => transport.requests.length === 1,
      'first transport request',
    )

    const second = bundle.resolver.resolve({
      appDataRoot: appData.appDataRoot,
      signal: new AbortController().signal,
      report: (progress) => {
        secondProgress.push(progress)
        if (progress.phase === 'downloading') {
          secondDownloading.resolve()
        }
      },
    })
    await secondDownloading.promise
    firstController.abort()

    await assert.rejects(
      first,
      hasFailureCode('runtime_cancelled'),
    )
    releaseBody.resolve()
    const runtime = await second

    assert.equal(transport.requests.length, 1)
    assert.equal(
      firstProgress.some(
        (progress) => progress.phase === 'ready',
      ),
      false,
    )
    assert.equal(
      secondProgress.at(-1)?.phase,
      'ready',
    )
    assert.equal(
      await bundle.spawnBoundary.verifyForSpawn({
        runtime,
        signal: new AbortController().signal,
      }),
      runtime,
    )
  } finally {
    releaseBody.resolve()
    await appData.cleanup()
  }
})

test('spawn authority rejects a clone and rejects complete-tree drift on the exact object', async () => {
  const fixture = await createRuntimeResolverReleaseFixture()
  const appData = await createOwnerOnlyTempAppDataRoot()
  const transport = new ScriptedArchiveTransport([
    exactArchiveResponse(fixture.archiveBytes),
  ])
  const bundle = createTestBundle(
    fixture.admissionInput,
    transport,
  )
  try {
    const runtime = await bundle.resolver.resolve({
      appDataRoot: appData.appDataRoot,
      signal: new AbortController().signal,
      report: () => undefined,
    })
    const clone: VerifiedRuntime = {
      runtimeRoot: runtime.runtimeRoot,
      identity: { ...runtime.identity },
    }

    await assert.rejects(
      bundle.spawnBoundary.verifyForSpawn({
        runtime: clone,
        signal: new AbortController().signal,
      }),
      hasFailureCode('runtime_recovery_required'),
    )
    await writeFile(
      path.join(
        runtime.runtimeRoot,
        'bundle',
        'bridge',
        'worker.py',
      ),
      'tampered\n',
    )
    await assert.rejects(
      bundle.spawnBoundary.verifyForSpawn({
        runtime,
        signal: new AbortController().signal,
      }),
      (error: unknown) =>
        error instanceof RuntimeReleaseAuthorityError &&
        (error.failure.code === 'runtime_integrity_failed' ||
          error.failure.code === 'runtime_recovery_required'),
    )
  } finally {
    await appData.cleanup()
  }
})

test('a retained exact archive installs offline and repairs an owned corrupt generation without network', async () => {
  const fixture = await createRuntimeResolverReleaseFixture()
  const appData = await createOwnerOnlyTempAppDataRoot()
  const transport = new ScriptedArchiveTransport()
  const bundle = createTestBundle(
    fixture.admissionInput,
    transport,
  )
  try {
    const cache = await bootstrapRuntimeCache({
      admission: fixture.admission,
      appDataRoot: appData.appDataRoot,
      signal: new AbortController().signal,
    })
    await seedExactRetainedArchivePair(
      cache.layout,
      fixture.archiveBytes,
    )
    const installProgress: RuntimeResolveProgress[] = []
    const installed = await bundle.resolver.resolve({
      appDataRoot: appData.appDataRoot,
      signal: new AbortController().signal,
      report: (progress) => installProgress.push(progress),
    })

    assert.equal(transport.requests.length, 0)
    assert.deepEqual(uniquePhases(installProgress), [
      'checking_cache',
      'verifying_archive',
      'installing',
      'verifying_runtime',
      'ready',
    ])
    await writeFile(
      path.join(
        installed.runtimeRoot,
        'bundle',
        'bridge',
        'worker.py',
      ),
      'owned corruption\n',
    )

    const repaired = await bundle.resolver.resolve({
      appDataRoot: appData.appDataRoot,
      signal: new AbortController().signal,
      report: () => undefined,
    })
    assert.deepEqual(repaired, installed)
    assert.notEqual(repaired, installed)
    assert.equal(transport.requests.length, 0)
    transport.assertExhausted()
  } finally {
    await appData.cleanup()
  }
})

test('a malformed published receipt remains untouched and never triggers network or ready', async () => {
  const fixture = await createRuntimeResolverReleaseFixture()
  const appData = await createOwnerOnlyTempAppDataRoot()
  const malformedReceipt = Buffer.from('not-json\n')
  const transport = new ScriptedArchiveTransport([
    exactArchiveResponse(fixture.archiveBytes),
  ])
  const bundle = createTestBundle(
    fixture.admissionInput,
    transport,
  )
  const failureProgress: RuntimeResolveProgress[] = []
  try {
    const installed = await bundle.resolver.resolve({
      appDataRoot: appData.appDataRoot,
      signal: new AbortController().signal,
      report: () => undefined,
    })
    const receiptPath = path.join(
      path.dirname(installed.runtimeRoot),
      'receipt.json',
    )
    await writeFile(receiptPath, malformedReceipt)

    await assert.rejects(
      bundle.resolver.resolve({
        appDataRoot: appData.appDataRoot,
        signal: new AbortController().signal,
        report: (progress) => failureProgress.push(progress),
      }),
      (error: unknown) =>
        error instanceof RuntimeReleaseAuthorityError &&
        (error.failure.code === 'runtime_integrity_failed' ||
          error.failure.code === 'runtime_recovery_required'),
    )
    assert.equal(transport.requests.length, 1)
    assert.deepEqual(
      await readFile(receiptPath),
      malformedReceipt,
    )
    assert.equal(
      failureProgress.some(
        (progress) => progress.phase === 'ready',
      ),
      false,
    )
  } finally {
    await appData.cleanup()
  }
})

test('a pre-existing ambiguous lease is preserved without mutation, network, or ready', async () => {
  const fixture = await createRuntimeResolverReleaseFixture()
  const appData = await createOwnerOnlyTempAppDataRoot()
  const transport = new ScriptedArchiveTransport([
    exactArchiveResponse(fixture.archiveBytes),
  ])
  const bundle = createTestBundle(
    fixture.admissionInput,
    transport,
  )
  const progress: RuntimeResolveProgress[] = []
  try {
    const cache = await bootstrapRuntimeCache({
      admission: fixture.admission,
      appDataRoot: appData.appDataRoot,
      signal: new AbortController().signal,
    })
    const ambiguousLease = Buffer.from('not-a-lease\n')
    await writeFile(
      cache.layout.lease.path,
      ambiguousLease,
      { flag: 'wx', mode: 0o600 },
    )

    await assert.rejects(
      bundle.resolver.resolve({
        appDataRoot: appData.appDataRoot,
        signal: new AbortController().signal,
        report: (entry) => progress.push(entry),
      }),
      hasFailureCode('runtime_recovery_required'),
    )

    assert.deepEqual(
      await readFile(cache.layout.lease.path),
      ambiguousLease,
    )
    assert.equal(transport.requests.length, 0)
    assert.deepEqual(uniquePhases(progress), [
      'checking_cache',
    ])
    assert.equal(transport.remainingResponses(), 1)
  } finally {
    await appData.cleanup()
  }
})

test('a strict publish readback fault is quarantined and repaired offline by a fresh bundle', async () => {
  const fixture = await createRuntimeResolverReleaseFixture()
  const appData = await createOwnerOnlyTempAppDataRoot()
  const transport = new ScriptedArchiveTransport([
    exactArchiveResponse(fixture.archiveBytes),
  ])
  const failedProgress: RuntimeResolveProgress[] = []
  const repairedProgress: RuntimeResolveProgress[] = []
  try {
    const cache = await bootstrapRuntimeCache({
      admission: fixture.admission,
      appDataRoot: appData.appDataRoot,
      signal: new AbortController().signal,
    })
    const workerPath = path.join(
      cache.layout.generation.runtimeRoot,
      'bundle',
      'bridge',
      'worker.py',
    )
    const faultyBundle = createTestBundle(
      fixture.admissionInput,
      transport,
      {
        generationPublishTestOptions: {
          beforeReadback: async () => {
            await writeFile(
              workerPath,
              'tampered during publish readback\n',
            )
          },
        },
      },
      {
        applicationInstanceNonce: 'a'.repeat(32),
        processStartIdentity: 'publish-fault-owner',
      },
    )

    await assert.rejects(
      faultyBundle.resolver.resolve({
        appDataRoot: appData.appDataRoot,
        signal: new AbortController().signal,
        report: (entry) => failedProgress.push(entry),
      }),
      hasFailureCode('runtime_recovery_required'),
    )
    assert.deepEqual(uniquePhases(failedProgress), [
      'checking_cache',
      'downloading',
      'verifying_archive',
      'installing',
    ])
    assert.equal(
      await readFile(workerPath, 'utf8'),
      'tampered during publish readback\n',
    )
    assert.equal(transport.requests.length, 1)

    const offlineTransport = new ScriptedArchiveTransport()
    const restartedBundle = createTestBundle(
      fixture.admissionInput,
      offlineTransport,
      {},
      {
        applicationInstanceNonce: 'b'.repeat(32),
        processStartIdentity: 'publish-restart-owner',
      },
    )
    const runtime = await restartedBundle.resolver.resolve({
      appDataRoot: appData.appDataRoot,
      signal: new AbortController().signal,
      report: (entry) => repairedProgress.push(entry),
    })

    assert.equal(runtime.runtimeRoot, cache.layout.generation.runtimeRoot)
    assert.equal(offlineTransport.requests.length, 0)
    assert.deepEqual(uniquePhases(repairedProgress), [
      'checking_cache',
      'verifying_archive',
      'installing',
      'verifying_runtime',
      'ready',
    ])
    assert.equal(
      await readFile(workerPath, 'utf8'),
      'print("bridge")\n',
    )
    assert.equal(
      (await readdir(cache.layout.namespaces.quarantine)).length,
      1,
    )
    assert.equal(
      await restartedBundle.spawnBoundary.verifyForSpawn({
        runtime,
        signal: new AbortController().signal,
      }),
      runtime,
    )
    transport.assertExhausted()
    offlineTransport.assertExhausted()
  } finally {
    await appData.cleanup()
  }
})

test('last-caller download cancellation checkpoints a prefix that a fresh bundle resumes', async () => {
  const fixture = await createRuntimeResolverReleaseFixture()
  const appData = await createOwnerOnlyTempAppDataRoot()
  const controller = new AbortController()
  const prefix = fixture.archiveBytes.subarray(0, 128)
  const suffix = fixture.archiveBytes.subarray(prefix.byteLength)
  const etag = '"resolver-restart"'
  let transport: ScriptedArchiveTransport
  transport = new ScriptedArchiveTransport([
    {
      ...exactArchiveResponse(fixture.archiveBytes, {
        chunks: [prefix],
        etag,
      }),
      beforeBodyError: async () => {
        controller.abort()
        await abortObserved(transport.requests[0]!.signal)
      },
      bodyError: new ArchiveTransportNetworkError(false),
    },
    {
      statusCode: 206,
      headers: {
        'content-encoding': ['identity'],
        'content-length': [String(suffix.byteLength)],
        'content-range': [
          `bytes ${prefix.byteLength}-${fixture.archiveBytes.byteLength - 1}/${fixture.archiveBytes.byteLength}`,
        ],
        etag: [etag],
      },
      chunks: [suffix],
    },
  ])
  const cancelledProgress: RuntimeResolveProgress[] = []
  const resumedProgress: RuntimeResolveProgress[] = []
  try {
    const cache = await bootstrapRuntimeCache({
      admission: fixture.admission,
      appDataRoot: appData.appDataRoot,
      signal: new AbortController().signal,
    })
    const firstBundle = createTestBundle(
      fixture.admissionInput,
      transport,
      {},
      {
        applicationInstanceNonce: 'a'.repeat(32),
        processStartIdentity: 'download-cancel-owner',
      },
    )
    await assert.rejects(
      firstBundle.resolver.resolve({
        appDataRoot: appData.appDataRoot,
        signal: controller.signal,
        report: (entry) => cancelledProgress.push(entry),
      }),
      hasFailureCode('runtime_cancelled'),
    )
    await waitFor(
      () => transport.closedResponses === 1,
      'cancelled response close',
    )
    await waitForPathAbsent(cache.layout.lease.path)

    assert.deepEqual(
      await readFile(cache.layout.partial.archivePath),
      prefix,
    )
    const journal = JSON.parse(
      await readFile(
        cache.layout.partial.journalPath,
        'utf8',
      ),
    ) as {
      readonly strongEtag: string
      readonly writtenBytes: number
    }
    assert.equal(journal.strongEtag, etag)
    assert.equal(journal.writtenBytes, prefix.byteLength)
    assert.deepEqual(uniquePhases(cancelledProgress), [
      'checking_cache',
      'downloading',
    ])

    const restartedBundle = createTestBundle(
      fixture.admissionInput,
      transport,
      {},
      {
        applicationInstanceNonce: 'b'.repeat(32),
        processStartIdentity: 'download-restart-owner',
      },
    )
    const runtime = await restartedBundle.resolver.resolve({
      appDataRoot: appData.appDataRoot,
      signal: new AbortController().signal,
      report: (entry) => resumedProgress.push(entry),
    })

    assert.deepEqual(
      transport.requests.map((request) => request.range),
      [
        undefined,
        {
          start: prefix.byteLength,
          ifRange: etag,
        },
      ],
    )
    assert.deepEqual(uniquePhases(resumedProgress), [
      'checking_cache',
      'downloading',
      'verifying_archive',
      'installing',
      'verifying_runtime',
      'ready',
    ])
    assert.deepEqual(
      await readFile(cache.layout.archive.path),
      fixture.archiveBytes,
    )
    assert.equal(
      await restartedBundle.spawnBoundary.verifyForSpawn({
        runtime,
        signal: new AbortController().signal,
      }),
      runtime,
    )
    transport.assertExhausted()
  } finally {
    await appData.cleanup()
  }
})

test('a scripted transient response uses production Retry-After events before the exact retry', async () => {
  const fixture = await createRuntimeResolverReleaseFixture()
  const appData = await createOwnerOnlyTempAppDataRoot()
  const sleeps: number[] = []
  const transport = new ScriptedArchiveTransport([
    {
      statusCode: 503,
      headers: { 'retry-after': ['1'] },
    },
    exactArchiveResponse(fixture.archiveBytes),
  ])
  const bundle = createTestBundle(
    fixture.admissionInput,
    transport,
    {
      scheduler: {
        monotonicNowMs: () => 0,
        wallNowMs: () =>
          Date.parse('2026-07-24T00:00:00Z'),
        sleep: async (delayMs, signal) => {
          if (signal.aborted) {
            throw new Error('unexpected cancellation')
          }
          sleeps.push(delayMs)
        },
        arm: () => () => undefined,
      },
    },
  )
  try {
    const runtime = await bundle.resolver.resolve({
      appDataRoot: appData.appDataRoot,
      signal: new AbortController().signal,
      report: () => undefined,
    })

    assert.equal(
      runtime.identity.releaseId,
      fixture.admission.identity.releaseId,
    )
    assert.deepEqual(sleeps, [1_000])
    assert.equal(transport.requests.length, 2)
    transport.assertExhausted()
  } finally {
    await appData.cleanup()
  }
})

test('an unavailable exact asset never falls back to a synthetic prior generation', async () => {
  const fixture = await createRuntimeResolverReleaseFixture()
  const appData = await createOwnerOnlyTempAppDataRoot()
  const transport = new ScriptedArchiveTransport([
    { statusCode: 404 },
  ])
  const bundle = createTestBundle(
    fixture.admissionInput,
    transport,
  )
  const progress: RuntimeResolveProgress[] = []
  try {
    const cache = await bootstrapRuntimeCache({
      admission: fixture.admission,
      appDataRoot: appData.appDataRoot,
      signal: new AbortController().signal,
    })
    const priorRoot = path.join(
      cache.layout.namespaces.generations,
      '0.0.9',
      'darwin-arm64',
      'f'.repeat(64),
      'runtime',
    )
    await mkdir(priorRoot, {
      mode: 0o700,
      recursive: true,
    })
    const marker = path.join(priorRoot, 'synthetic-prior')
    await writeFile(marker, 'must remain untouched\n')

    await assert.rejects(
      bundle.resolver.resolve({
        appDataRoot: appData.appDataRoot,
        signal: new AbortController().signal,
        report: (entry) => progress.push(entry),
      }),
      hasFailureCode('runtime_release_unavailable'),
    )
    assert.equal(
      await readFile(marker, 'utf8'),
      'must remain untouched\n',
    )
    assert.equal(transport.requests.length, 1)
    assert.equal(
      progress.some((entry) => entry.phase === 'ready'),
      false,
    )
  } finally {
    await appData.cleanup()
  }
})

function createTestBundle(
  admissionInput: RuntimeReleaseAdmissionInput,
  transport: ScriptedArchiveTransport,
  overrides: Partial<RuntimeResolverTestingDependencies> = {},
  owner: RuntimeResolverBundleInput['owner'] = {
    applicationInstanceNonce: 'a'.repeat(32),
    processStartIdentity: 'resolver-test-process-start',
  },
): ReturnType<typeof createRuntimeResolverBundleForTesting> {
  let nonce = 0
  return createRuntimeResolverBundleForTesting(
    {
      ...admissionInput,
      owner,
    },
    {
      lease: new FileRuntimeCacheLeaseCoordinator(),
      nonce: () => {
        nonce += 1
        return nonce.toString(16).padStart(32, '0')
      },
      processId: process.pid,
      scheduler: createRuntimeResolutionScheduler(),
      timeoutMs: 10_000,
      transport,
      ...overrides,
    },
  )
}

function uniquePhases(
  progress: readonly RuntimeResolveProgress[],
): RuntimeResolveProgress['phase'][] {
  return progress
    .map((entry) => entry.phase)
    .filter(
      (phase, index, phases) =>
        index === 0 || phase !== phases[index - 1],
    )
}

function splitBytes(
  value: Uint8Array,
  count: number,
): Uint8Array[] {
  const chunks: Uint8Array[] = []
  const size = Math.ceil(value.byteLength / count)
  for (let offset = 0; offset < value.byteLength; offset += size) {
    chunks.push(value.subarray(offset, offset + size))
  }
  return chunks
}

function hasFailureCode(code: string) {
  return (error: unknown) =>
    error instanceof RuntimeReleaseAuthorityError &&
    error.failure.code === code
}

function deferred<T>(): {
  readonly promise: Promise<T>
  resolve(value?: T): void
} {
  let resolvePromise: (value: T | PromiseLike<T>) => void =
    () => undefined
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve
  })
  return {
    promise,
    resolve: (value?: T) => resolvePromise(value as T),
  }
}

function abortObserved(signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.resolve()
  return new Promise((resolve) => {
    signal.addEventListener('abort', () => resolve(), {
      once: true,
    })
  })
}

async function waitFor(
  predicate: () => boolean,
  label: string,
): Promise<void> {
  const started = Date.now()
  while (!predicate()) {
    if (Date.now() - started > 5_000) {
      throw new Error(`Timed out waiting for ${label}.`)
    }
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
}

async function waitForPathAbsent(targetPath: string): Promise<void> {
  const started = Date.now()
  while (true) {
    try {
      await lstat(targetPath)
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        return
      }
      throw error
    }
    if (Date.now() - started > 5_000) {
      throw new Error(
        `Timed out waiting for path removal: ${targetPath}`,
      )
    }
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
}

async function seedExactRetainedArchivePair(
  layout: RuntimeCacheLayout,
  archiveBytes: Uint8Array,
): Promise<void> {
  await mkdir(layout.partial.root, { mode: 0o700 })
  const archive = await open(
    layout.partial.archivePath,
    'wx',
    0o600,
  )
  try {
    await archive.writeFile(archiveBytes)
    await archive.sync()
  } finally {
    await archive.close()
  }
  await link(
    layout.partial.archivePath,
    layout.archive.path,
  )
}
