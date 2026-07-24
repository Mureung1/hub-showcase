import assert from 'node:assert/strict'
import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  realpath,
  rename,
  rm,
  symlink,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import type { RuntimeReleaseAdmission } from './runtime-release-authority.js'
import {
  RuntimeReleaseAuthorityError,
} from './runtime-release-authority.js'
import {
  bootstrapRuntimeCache,
  createOwnedRuntimeStagingRoot,
} from './runtime-cache-bootstrap.js'

const NAMESPACE_NAMES = [
  'archives',
  'generations',
  'leases',
  'partials',
  'quarantine',
  'staging',
] as const

test('cold bootstrap creates the exact durable cache hierarchy and mutation authority', async () => {
  await withAppDataRoot(async (appDataRoot) => {
    const admission = fixtureAdmission()
    const result = await bootstrapRuntimeCache({
      admission,
      appDataRoot,
      signal: new AbortController().signal,
    })
    const generationReleaseRoot = path.join(
      result.layout.namespaces.generations,
      admission.identity.releaseId,
    )
    const generationTargetRoot = path.dirname(
      result.layout.generation.root,
    )
    const directories = [
      path.join(appDataRoot, 'runtime-cache'),
      result.layout.cacheRoot,
      ...Object.values(result.layout.namespaces),
      generationReleaseRoot,
      generationTargetRoot,
    ]

    assert.deepEqual(
      await readdir(result.layout.cacheRoot),
      NAMESPACE_NAMES,
    )
    for (const directory of directories) {
      const stats = await lstat(directory, { bigint: true })
      assert.equal(stats.isDirectory(), true)
      assert.equal(stats.isSymbolicLink(), false)
      assert.equal(Number(stats.mode & 0o7777n), 0o700)
      assert.equal(Number(stats.uid), currentUid())
      assert.equal(String(stats.dev), String(
        (await lstat(appDataRoot, { bigint: true })).dev,
      ))
      assert.equal(await realpath(directory), directory)
    }
    assert.equal(
      result.mutationAuthority.kind,
      'runtime_cache_mutation_authority',
    )
    assert.equal(
      result.mutationAuthority.snapshot.state,
      'present',
    )
    assert.deepEqual(
      Object.keys(
        result.mutationAuthority.snapshot.namespaceIdentities,
      ).sort(),
      [...NAMESPACE_NAMES],
    )
  })
})

test('bootstrap is idempotent and fills an owned partial hierarchy', async () => {
  await withAppDataRoot(async (appDataRoot) => {
    const runtimeCacheParent = path.join(
      appDataRoot,
      'runtime-cache',
    )
    const cacheRoot = path.join(runtimeCacheParent, 'v1')
    await mkdir(runtimeCacheParent, { mode: 0o700 })
    await mkdir(cacheRoot, { mode: 0o700 })
    await mkdir(path.join(cacheRoot, 'archives'), {
      mode: 0o700,
    })

    const first = await bootstrapRuntimeCache({
      admission: fixtureAdmission(),
      appDataRoot,
      signal: new AbortController().signal,
    })
    const firstIdentity = await directoryIdentity(
      first.layout.cacheRoot,
    )
    const second = await bootstrapRuntimeCache({
      admission: fixtureAdmission(),
      appDataRoot,
      signal: new AbortController().signal,
    })

    assert.deepEqual(
      await directoryIdentity(second.layout.cacheRoot),
      firstIdentity,
    )
    assert.deepEqual(
      await readdir(second.layout.cacheRoot),
      NAMESPACE_NAMES,
    )
    assert.deepEqual(
      second.mutationAuthority.snapshot.cacheRootIdentity,
      first.mutationAuthority.snapshot.cacheRootIdentity,
    )
  })
})

test('unsafe existing namespace fails before bootstrap creates siblings', async () => {
  await withAppDataRoot(async (appDataRoot) => {
    const cacheRoot = path.join(
      appDataRoot,
      'runtime-cache',
      'v1',
    )
    const outside = path.join(appDataRoot, 'outside')
    await mkdir(cacheRoot, { recursive: true, mode: 0o700 })
    await chmod(path.dirname(cacheRoot), 0o700)
    await chmod(cacheRoot, 0o700)
    await mkdir(outside, { mode: 0o700 })
    await symlink(outside, path.join(cacheRoot, 'archives'))

    await assert.rejects(
      bootstrapRuntimeCache({
        admission: fixtureAdmission(),
        appDataRoot,
        signal: new AbortController().signal,
      }),
      hasFailureCode('runtime_cache_unsafe'),
    )
    assert.deepEqual(await readdir(cacheRoot), ['archives'])
  })
})

test('bootstrap rejects a directory inode substitution during creation', async () => {
  await withAppDataRoot(async (appDataRoot) => {
    let replaced = false
    await assert.rejects(
      bootstrapRuntimeCache(
        {
          admission: fixtureAdmission(),
          appDataRoot,
          signal: new AbortController().signal,
        },
        {
          afterDirectoryCreate: async ({ directory }) => {
            if (path.basename(directory) !== 'generations') return
            replaced = true
            await rename(
              directory,
              `${directory}-displaced`,
            )
            await mkdir(directory, { mode: 0o700 })
          },
        },
      ),
      hasFailureCode('runtime_recovery_required'),
    )
    assert.equal(replaced, true)
  })
})

test('cancelled bootstrap leaves only owned retryable directories', async () => {
  await withAppDataRoot(async (appDataRoot) => {
    const controller = new AbortController()
    await assert.rejects(
      bootstrapRuntimeCache(
        {
          admission: fixtureAdmission(),
          appDataRoot,
          signal: controller.signal,
        },
        {
          afterDirectoryCreate: async ({ directory }) => {
            if (path.basename(directory) === 'v1') {
              controller.abort()
            }
          },
        },
      ),
      hasFailureCode('runtime_cancelled'),
    )

    const completed = await bootstrapRuntimeCache({
      admission: fixtureAdmission(),
      appDataRoot,
      signal: new AbortController().signal,
    })
    assert.deepEqual(
      await readdir(completed.layout.cacheRoot),
      NAMESPACE_NAMES,
    )
  })
})

test('staging creation is exclusive, empty, durable, and lease-scoped by its caller', async () => {
  await withAppDataRoot(async (appDataRoot) => {
    const bootstrapped = await bootstrapRuntimeCache({
      admission: fixtureAdmission(),
      appDataRoot,
      signal: new AbortController().signal,
    })
    const staging = await createOwnedRuntimeStagingRoot({
      layout: bootstrapped.layout,
      mutationAuthority: bootstrapped.mutationAuthority,
      signal: new AbortController().signal,
      transactionNonce: '1'.repeat(32),
    })
    const stats = await lstat(staging.path, { bigint: true })
    assert.equal(stats.isDirectory(), true)
    assert.equal(stats.isSymbolicLink(), false)
    assert.equal(Number(stats.mode & 0o7777n), 0o700)
    assert.equal(Number(stats.uid), currentUid())
    assert.deepEqual(await readdir(staging.path), [])

    await assert.rejects(
      createOwnedRuntimeStagingRoot({
        layout: bootstrapped.layout,
        mutationAuthority: bootstrapped.mutationAuthority,
        signal: new AbortController().signal,
        transactionNonce: '1'.repeat(32),
      }),
      hasFailureCode('runtime_recovery_required'),
    )
    assert.deepEqual(await readdir(staging.path), [])
  })
})

test('staging cancellation after create preserves only an owned empty retryable root', async () => {
  await withAppDataRoot(async (appDataRoot) => {
    const bootstrapped = await bootstrapRuntimeCache({
      admission: fixtureAdmission(),
      appDataRoot,
      signal: new AbortController().signal,
    })
    const controller = new AbortController()
    const transactionNonce = '2'.repeat(32)
    await assert.rejects(
      createOwnedRuntimeStagingRoot(
        {
          layout: bootstrapped.layout,
          mutationAuthority: bootstrapped.mutationAuthority,
          signal: controller.signal,
          transactionNonce,
        },
        {
          afterDirectoryCreate: async () => {
            controller.abort()
          },
        },
      ),
      hasFailureCode('runtime_cancelled'),
    )
    const staging = path.join(
      bootstrapped.layout.namespaces.staging,
      `${bootstrapped.layout.identity.archiveSha256}-${transactionNonce}`,
    )
    const stats = await lstat(staging, { bigint: true })
    assert.equal(Number(stats.mode & 0o7777n), 0o700)
    assert.deepEqual(await readdir(staging), [])
  })
})

function fixtureAdmission(): RuntimeReleaseAdmission {
  return {
    descriptor: {} as RuntimeReleaseAdmission['descriptor'],
    identity: {
      archiveSha256: 'a'.repeat(64),
      manifestSha256: 'b'.repeat(64),
      releaseId: '0.1.0',
      runtimeContractVersion: 1,
      target: 'darwin-arm64',
    },
    manifest: {
      bundle: {
        roster_sha256: 'c'.repeat(64),
      },
      payload: {
        roster_sha256: 'd'.repeat(64),
      },
    } as RuntimeReleaseAdmission['manifest'],
  }
}

async function withAppDataRoot(
  run: (appDataRoot: string) => Promise<void>,
): Promise<void> {
  const temporary = await mkdtemp(
    path.join(tmpdir(), 'runtime-cache-bootstrap-'),
  )
  const appDataRoot = await realpath(temporary)
  await chmod(appDataRoot, 0o700)
  try {
    await run(appDataRoot)
  } finally {
    await rm(appDataRoot, { force: true, recursive: true })
  }
}

function currentUid(): number {
  const uid = process.getuid?.()
  assert.notEqual(uid, undefined)
  return uid as number
}

async function directoryIdentity(directory: string): Promise<{
  readonly device: string
  readonly inode: string
  readonly ownerUid: number
}> {
  const stats = await lstat(directory, { bigint: true })
  return {
    device: String(stats.dev),
    inode: String(stats.ino),
    ownerUid: Number(stats.uid),
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
