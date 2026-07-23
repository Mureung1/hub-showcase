import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import {
  chmod,
  link,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rename,
  rm,
  unlink,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  createRuntimeCacheLayout,
  createRuntimeQuarantineIdentity,
  inspectRuntimeCacheRoot,
  revalidateRuntimeCacheRootForMutation,
} from './runtime-cache-authority.js'
import type {
  RuntimeCacheLayout,
  RuntimeCacheMutationAuthority,
} from './runtime-cache-authority.js'
import type {
  RuntimeReleaseAdmission,
} from './runtime-release-authority.js'
import {
  RuntimeReleaseAuthorityError,
} from './runtime-release-authority.js'
import {
  inspectRetainedRuntimeArchive,
  quarantineRetainedRuntimeArchive,
} from './runtime-retained-archive.js'

type RetainedFixture = Awaited<
  ReturnType<typeof createRetainedFixture>
>

test('retained archive classification separates absence, verified bytes, and owned corruption', async (t) => {
  await t.test('absent', async () => {
    const fixture = await createRetainedFixture(
      Buffer.from('expected archive'),
    )
    try {
      assert.deepEqual(await inspect(fixture), { kind: 'absent' })
    } finally {
      await fixture.cleanup()
    }
  })

  await t.test('verified nlink-one', async () => {
    const bytes = Buffer.from('verified archive')
    const fixture = await createRetainedFixture(bytes)
    try {
      await writeArchive(fixture, bytes)
      const state = await inspect(fixture)
      assert.equal(state.kind, 'verified')
      if (state.kind !== 'verified') assert.fail('expected verified')
      assert.equal(state.archive.sha256, sha256(bytes))
      assert.equal((await lstat(fixture.layout.archive.path)).nlink, 1)
    } finally {
      await fixture.cleanup()
    }
  })

  await t.test('owned-invalid nlink-one', async () => {
    const expected = Buffer.from('expected archive')
    const corrupt = Buffer.alloc(expected.byteLength, 0x78)
    const fixture = await createRetainedFixture(expected)
    try {
      await writeArchive(fixture, corrupt)
      const state = await inspect(fixture)
      assert.equal(state.kind, 'owned-invalid')
      if (state.kind !== 'owned-invalid') {
        assert.fail('expected owned-invalid')
      }
      assert.equal(state.authority.form, 'single')
      const nonce = '1'.repeat(32)
      const result = await quarantineRetainedRuntimeArchive({
        ...resolveInput(fixture),
        authority: state.authority,
        transactionNonce: nonce,
      })
      assert.equal(result.cancelledAfterCommit, false)
      assert.deepEqual(await inspect(fixture), { kind: 'absent' })
      assert.deepEqual(
        await readFile(
          createRuntimeQuarantineIdentity(
            fixture.layout,
            nonce,
            'archive',
          ).path,
        ),
        corrupt,
      )
    } finally {
      await fixture.cleanup()
    }
  })
})

test('an exact nlink-two pair is verified while semantic journal corruption is quarantinable', async (t) => {
  await t.test('valid pair without a journal', async () => {
    const bytes = Buffer.from('valid paired archive')
    const fixture = await createRetainedFixture(bytes)
    try {
      await createPair(fixture, bytes)
      const state = await inspect(fixture)
      assert.equal(state.kind, 'verified')
      assert.equal((await lstat(fixture.layout.archive.path)).nlink, 2)
    } finally {
      await fixture.cleanup()
    }
  })

  await t.test('semantic journal corruption', async () => {
    const bytes = Buffer.from('journal-bound archive')
    const fixture = await createRetainedFixture(bytes)
    try {
      await createPair(fixture, bytes)
      await writeFile(
        fixture.layout.partial.journalPath,
        '{"unexpected":true}\n',
        { mode: 0o600 },
      )
      const state = await inspect(fixture)
      assert.equal(state.kind, 'owned-invalid')
      if (state.kind !== 'owned-invalid') {
        assert.fail('expected owned-invalid')
      }
      assert.equal(state.authority.form, 'exact-pair')
    } finally {
      await fixture.cleanup()
    }
  })
})

test('paired quarantine resumes its original nonce after the first durable rename', async () => {
  const expected = Buffer.from('expected paired archive')
  const corrupt = Buffer.alloc(expected.byteLength, 0x78)
  const fixture = await createRetainedFixture(expected)
  const originalNonce = '2'.repeat(32)
  try {
    await createPair(fixture, corrupt)
    const initial = await inspect(fixture)
    if (initial.kind !== 'owned-invalid') {
      assert.fail('expected owned-invalid')
    }
    await assert.rejects(
      quarantineRetainedRuntimeArchive(
        {
          ...resolveInput(fixture),
          authority: initial.authority,
          transactionNonce: originalNonce,
        },
        {
          afterPartialSync: async () => {
            throw new Error('simulated process fault')
          },
        },
      ),
      isRecoveryFailure,
    )
    assert.equal(await pathExists(fixture.layout.partial.root), false)
    assert.equal(await pathExists(fixture.layout.archive.path), true)

    const resumed = await inspect(fixture)
    if (resumed.kind !== 'owned-invalid') {
      assert.fail('expected resumable owned-invalid')
    }
    assert.equal(resumed.authority.form, 'exact-pair')
    if (resumed.authority.form !== 'exact-pair') {
      assert.fail('expected paired authority')
    }
    assert.equal(resumed.authority.phase, 'partial-quarantined')
    assert.equal(
      resumed.authority.transactionNonce,
      originalNonce,
    )

    const result = await quarantineRetainedRuntimeArchive({
      ...resolveInput(fixture),
      authority: resumed.authority,
      transactionNonce: '3'.repeat(32),
    })
    assert.equal(result.transactionNonce, originalNonce)
    assert.deepEqual(await inspect(fixture), { kind: 'absent' })
    const archiveDestination = createRuntimeQuarantineIdentity(
      fixture.layout,
      originalNonce,
      'archive',
    ).path
    const partialDestination = createRuntimeQuarantineIdentity(
      fixture.layout,
      originalNonce,
      'partial',
    ).path
    const archiveStats = await lstat(archiveDestination)
    const partialStats = await lstat(
      path.join(partialDestination, 'archive.part'),
    )
    assert.equal(archiveStats.nlink, 2)
    assert.equal(partialStats.nlink, 2)
    assert.equal(archiveStats.ino, partialStats.ino)
  } finally {
    await fixture.cleanup()
  }
})

test('unknown aliases and missing canonical pairs are ambiguous and untouched', async (t) => {
  await t.test('nlink three', async () => {
    const bytes = Buffer.from('three-link archive')
    const fixture = await createRetainedFixture(bytes)
    try {
      await createPair(fixture, bytes)
      const foreign = path.join(
        fixture.layout.namespaces.archives,
        'foreign',
      )
      await link(fixture.layout.archive.path, foreign)
      await assert.rejects(inspect(fixture), isRecoveryFailure)
      assert.equal((await lstat(foreign)).nlink, 3)
      assert.deepEqual(
        await readFile(fixture.layout.archive.path),
        bytes,
      )
    } finally {
      await fixture.cleanup()
    }
  })

  await t.test('nlink two without canonical pair', async () => {
    const bytes = Buffer.from('missing pair archive')
    const fixture = await createRetainedFixture(bytes)
    try {
      await writeArchive(fixture, bytes)
      const foreign = path.join(
        fixture.layout.namespaces.archives,
        'foreign',
      )
      await link(fixture.layout.archive.path, foreign)
      await assert.rejects(inspect(fixture), isRecoveryFailure)
      assert.deepEqual(await readFile(foreign), bytes)
      assert.equal(await pathExists(fixture.layout.partial.root), false)
    } finally {
      await fixture.cleanup()
    }
  })
})

test('classification remains read-only when a paired final disappears after hashing', async () => {
  const bytes = Buffer.from('read-only classification archive')
  const fixture = await createRetainedFixture(bytes)
  try {
    await createPair(fixture, bytes)
    await assert.rejects(
      inspectRetainedRuntimeArchive(resolveInput(fixture), {
        afterArchiveHash: async () => {
          await unlink(fixture.layout.archive.path)
        },
      }),
      isRecoveryFailure,
    )
    assert.deepEqual(
      await readFile(fixture.layout.partial.archivePath),
      bytes,
    )
    const partialStats = await lstat(
      fixture.layout.partial.archivePath,
    )
    assert.equal(partialStats.nlink, 1)
    assert.equal(partialStats.size, bytes.byteLength)
  } finally {
    await fixture.cleanup()
  }
})

test('quarantine refuses destination, pair, namespace, and cancellation drift', async (t) => {
  await t.test('destination collision', async () => {
    const expected = Buffer.from('destination collision')
    const corrupt = Buffer.alloc(expected.byteLength, 0x78)
    const fixture = await createRetainedFixture(expected)
    const nonce = '4'.repeat(32)
    const destination = createRuntimeQuarantineIdentity(
      fixture.layout,
      nonce,
      'archive',
    ).path
    try {
      await writeArchive(fixture, corrupt)
      const state = await inspect(fixture)
      if (state.kind !== 'owned-invalid') {
        assert.fail('expected owned-invalid')
      }
      await assert.rejects(
        quarantineRetainedRuntimeArchive(
          {
            ...resolveInput(fixture),
            authority: state.authority,
            transactionNonce: nonce,
          },
          {
            beforeArchiveRename: async () => {
              await writeFile(destination, 'canary\n', {
                flag: 'wx',
                mode: 0o600,
              })
            },
          },
        ),
        isRecoveryFailure,
      )
      assert.equal(await readFile(destination, 'utf8'), 'canary\n')
      assert.deepEqual(
        await readFile(fixture.layout.archive.path),
        corrupt,
      )
    } finally {
      await fixture.cleanup()
    }
  })

  await t.test('partial quarantine replacement', async () => {
    const expected = Buffer.from('partial replacement')
    const corrupt = Buffer.alloc(expected.byteLength, 0x78)
    const fixture = await createRetainedFixture(expected)
    const nonce = '5'.repeat(32)
    const partialDestination = createRuntimeQuarantineIdentity(
      fixture.layout,
      nonce,
      'partial',
    ).path
    const displaced = `${partialDestination}.displaced`
    try {
      await createPair(fixture, corrupt)
      const state = await inspect(fixture)
      if (state.kind !== 'owned-invalid') {
        assert.fail('expected owned-invalid')
      }
      await assert.rejects(
        quarantineRetainedRuntimeArchive(
          {
            ...resolveInput(fixture),
            authority: state.authority,
            transactionNonce: nonce,
          },
          {
            afterPartialSync: async () => {
              await rename(partialDestination, displaced)
              await mkdir(partialDestination, { mode: 0o700 })
            },
          },
        ),
        isRecoveryFailure,
      )
      assert.deepEqual(
        await readFile(path.join(displaced, 'archive.part')),
        corrupt,
      )
      assert.deepEqual(
        await readFile(fixture.layout.archive.path),
        corrupt,
      )
    } finally {
      await fixture.cleanup()
    }
  })

  await t.test('namespace replacement after sync', async () => {
    const expected = Buffer.from('namespace replacement')
    const corrupt = Buffer.alloc(expected.byteLength, 0x78)
    const fixture = await createRetainedFixture(expected)
    const displaced =
      `${fixture.layout.namespaces.quarantine}.displaced`
    try {
      await writeArchive(fixture, corrupt)
      const state = await inspect(fixture)
      if (state.kind !== 'owned-invalid') {
        assert.fail('expected owned-invalid')
      }
      await assert.rejects(
        quarantineRetainedRuntimeArchive(
          {
            ...resolveInput(fixture),
            authority: state.authority,
            transactionNonce: '6'.repeat(32),
          },
          {
            afterArchiveSync: async () => {
              await rename(
                fixture.layout.namespaces.quarantine,
                displaced,
              )
              await mkdir(
                fixture.layout.namespaces.quarantine,
                { mode: 0o700 },
              )
            },
          },
        ),
        isRecoveryFailure,
      )
    } finally {
      await fixture.cleanup()
    }
  })

  await t.test('pre-commit cancellation', async () => {
    const expected = Buffer.from('cancel before quarantine')
    const corrupt = Buffer.alloc(expected.byteLength, 0x78)
    const fixture = await createRetainedFixture(expected)
    const cancellation = new AbortController()
    try {
      await writeArchive(fixture, corrupt)
      const state = await inspect(fixture)
      if (state.kind !== 'owned-invalid') {
        assert.fail('expected owned-invalid')
      }
      await assert.rejects(
        quarantineRetainedRuntimeArchive(
          {
            admission: fixture.admission,
            authority: state.authority,
            layout: fixture.layout,
            mutationAuthority: fixture.mutationAuthority,
            signal: cancellation.signal,
            transactionNonce: '7'.repeat(32),
          },
          {
            beforeArchiveRename: async () => {
              cancellation.abort()
            },
          },
        ),
        (error: unknown) =>
          error instanceof RuntimeReleaseAuthorityError &&
          error.failure.code === 'runtime_cancelled',
      )
      assert.deepEqual(
        await readFile(fixture.layout.archive.path),
        corrupt,
      )
    } finally {
      await fixture.cleanup()
    }
  })
})

async function createRetainedFixture(expected: Buffer) {
  const createdRoot = await mkdtemp(
    path.join(tmpdir(), 'ay-ple-retained-'),
  )
  await chmod(createdRoot, 0o700)
  const root = await realpath(createdRoot)
  const admission = admissionFor(expected)
  const layout = createRuntimeCacheLayout(root, admission)
  for (const directory of [
    path.dirname(layout.cacheRoot),
    layout.cacheRoot,
    ...Object.values(layout.namespaces),
  ]) {
    await mkdir(directory, { recursive: true, mode: 0o700 })
    await chmod(directory, 0o700)
  }
  const mutationAuthority =
    await revalidateRuntimeCacheRootForMutation(
      await inspectRuntimeCacheRoot({ appDataRoot: root }),
    )
  return {
    admission,
    layout,
    mutationAuthority,
    root,
    cleanup: () => rm(root, { recursive: true, force: true }),
  }
}

function admissionFor(bytes: Buffer): RuntimeReleaseAdmission {
  const archiveSha256 = sha256(bytes)
  return {
    descriptor: {
      schemaVersion: 1,
      launcher: {
        packageName: 'ay-ple',
        version: '0.1.0-preview.1',
      },
      distribution: {
        repository: 'https://github.com/ay-ple/ay-ple',
        applicationReleaseTag: 'v0.1.0-preview.1',
        runtimeAssetReleaseTag: 'runtime-v0.1.0',
      },
      runtime: {
        releaseId: '0.1.0',
        target: 'darwin-arm64',
        runtimeContractVersion: 1,
      },
      archive: {
        format: 'ay-ple-runtime-tar-gzip-v1',
        assetName: 'ay-ple-runtime-0.1.0-darwin-arm64.tar.gz',
        url: 'https://github.com/ay-ple/ay-ple/releases/download/runtime-v0.1.0/ay-ple-runtime-0.1.0-darwin-arm64.tar.gz',
        bytes: bytes.byteLength,
        sha256: archiveSha256,
      },
      manifest: {
        packageResource: 'resources/runtime/manifest.json',
        schemaVersion: 2,
        bytes: 1,
        sha256: 'b'.repeat(64),
      },
    },
    manifest: {
      payload: { roster_sha256: 'c'.repeat(64) },
      bundle: { roster_sha256: 'd'.repeat(64) },
    },
    identity: {
      archiveSha256,
      manifestSha256: 'b'.repeat(64),
      releaseId: '0.1.0',
      runtimeContractVersion: 1,
      target: 'darwin-arm64',
    },
  } as RuntimeReleaseAdmission
}

async function createPair(
  fixture: RetainedFixture,
  bytes: Buffer,
): Promise<void> {
  await mkdir(fixture.layout.partial.root, { mode: 0o700 })
  await writeFile(fixture.layout.partial.archivePath, bytes, {
    flag: 'wx',
    mode: 0o600,
  })
  await link(
    fixture.layout.partial.archivePath,
    fixture.layout.archive.path,
  )
}

async function writeArchive(
  fixture: RetainedFixture,
  bytes: Buffer,
): Promise<void> {
  await writeFile(fixture.layout.archive.path, bytes, {
    flag: 'wx',
    mode: 0o600,
  })
}

function resolveInput(fixture: RetainedFixture): {
  readonly admission: RuntimeReleaseAdmission
  readonly layout: RuntimeCacheLayout
  readonly mutationAuthority: RuntimeCacheMutationAuthority
  readonly signal: AbortSignal
} {
  return {
    admission: fixture.admission,
    layout: fixture.layout,
    mutationAuthority: fixture.mutationAuthority,
    signal: new AbortController().signal,
  }
}

function inspect(fixture: RetainedFixture) {
  return inspectRetainedRuntimeArchive(resolveInput(fixture))
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

function isRecoveryFailure(error: unknown): boolean {
  return (
    error instanceof RuntimeReleaseAuthorityError &&
    error.failure.code === 'runtime_recovery_required'
  )
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
