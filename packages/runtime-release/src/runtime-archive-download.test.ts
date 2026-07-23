import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import {
  link,
  lstat,
  mkdir,
  mkdtemp,
  open,
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
  downloadVerifiedRuntimeArchive,
  hashRuntimeArchiveFile,
} from './runtime-archive-download.js'
import type {
  ArchiveTransport,
  ArchiveTransportRequest,
  ArchiveTransportResponse,
} from './runtime-archive-transport.js'
import {
  archiveTransportRequestHeaders,
  ArchiveTransportNetworkError,
} from './runtime-archive-transport.js'
import {
  createRuntimeCacheLayout,
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

type ScriptedResponse = {
  readonly statusCode: number
  readonly headers?: ArchiveTransportResponse['headers']
  readonly chunks?: readonly Uint8Array[]
  readonly beforeChunks?: () => void | Promise<void>
  readonly afterChunks?: () => void | Promise<void>
  readonly bodyError?: Error
  readonly beforeBodyError?: () => void
  readonly requestError?: Error
}

class ScriptedArchiveTransport implements ArchiveTransport {
  readonly requests: ArchiveTransportRequest[] = []
  closedResponses = 0
  readonly #responses: ScriptedResponse[]

  constructor(responses: readonly ScriptedResponse[]) {
    this.#responses = [...responses]
  }

  async exchange<T>(
    request: ArchiveTransportRequest,
    consume: (response: ArchiveTransportResponse) => Promise<T>,
  ): Promise<T> {
    this.requests.push(request)
    const scripted = this.#responses.shift()
    assert.notEqual(scripted, undefined, 'unexpected transport request')
    if (scripted!.requestError !== undefined) {
      throw scripted!.requestError
    }
    try {
      return await consume({
        statusCode: scripted!.statusCode,
        headers: scripted!.headers ?? {},
        body: (async function* () {
          await scripted!.beforeChunks?.()
          for (const chunk of scripted!.chunks ?? []) yield chunk
          await scripted!.afterChunks?.()
          if (scripted!.bodyError !== undefined) {
            scripted!.beforeBodyError?.()
            throw scripted!.bodyError
          }
        })(),
      })
    } finally {
      this.closedResponses += 1
    }
  }

  assertExhausted(): void {
    assert.equal(this.#responses.length, 0)
  }

  remainingResponses(): number {
    return this.#responses.length
  }
}

type DownloadFixture = {
  readonly admission: RuntimeReleaseAdmission
  readonly appDataRoot: string
  readonly layout: RuntimeCacheLayout
  readonly mutationAuthority: RuntimeCacheMutationAuthority
  cleanup(): Promise<void>
}

async function createDownloadFixture(
  archiveBytes: Uint8Array,
): Promise<DownloadFixture> {
  const appDataRoot = await realpath(
    await mkdtemp(path.join(tmpdir(), 'runtime-download-test-')),
  )
  const archiveSha256 = sha256(archiveBytes)
  const admission = {
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
        bytes: archiveBytes.byteLength,
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
  const layout = createRuntimeCacheLayout(appDataRoot, admission)
  await mkdir(path.dirname(layout.cacheRoot), { mode: 0o700 })
  await mkdir(layout.cacheRoot, { mode: 0o700 })
  await mkdir(layout.namespaces.archives, { mode: 0o700 })
  await mkdir(layout.namespaces.partials, { mode: 0o700 })
  const inspection = await inspectRuntimeCacheRoot({ appDataRoot })
  const mutationAuthority =
    await revalidateRuntimeCacheRootForMutation(inspection)
  return {
    admission,
    appDataRoot,
    layout,
    mutationAuthority,
    cleanup: async () => {
      await rm(appDataRoot, { recursive: true, force: true })
    },
  }
}

test('fresh 200 retains the verified archive and a valid strong partial', async () => {
  const archiveBytes = Buffer.from('exact runtime archive bytes')
  const fixture = await createDownloadFixture(archiveBytes)
  const transport = new ScriptedArchiveTransport([
    {
      statusCode: 200,
      headers: {
        'content-encoding': ['identity'],
        'content-length': [String(archiveBytes.byteLength)],
        etag: ['"runtime-v1"'],
      },
      chunks: [
        archiveBytes.subarray(0, 7),
        archiveBytes.subarray(7),
      ],
    },
  ])

  try {
    const result = await downloadVerifiedRuntimeArchive({
      admission: fixture.admission,
      layout: fixture.layout,
      mutationAuthority: fixture.mutationAuthority,
      signal: new AbortController().signal,
      transport,
    })

    assert.equal(result.kind, 'runtime_archive_verification_snapshot')
    assert.equal(result.archivePath, fixture.layout.archive.path)
    assert.equal(result.bytes, archiveBytes.byteLength)
    assert.equal(result.sha256, sha256(archiveBytes))
    assert.deepEqual(await readFile(result.archivePath), archiveBytes)
    const archiveStats = await lstat(result.archivePath)
    assert.equal(archiveStats.isFile(), true)
    assert.equal(archiveStats.mode & 0o7777, 0o600)
    assert.equal(archiveStats.nlink, 2)
    assert.deepEqual(
      await readFile(fixture.layout.partial.archivePath),
      archiveBytes,
    )
    const partialStats = await lstat(
      fixture.layout.partial.archivePath,
    )
    assert.equal(partialStats.nlink, 2)
    assert.equal(partialStats.dev, archiveStats.dev)
    assert.equal(partialStats.ino, archiveStats.ino)
    const retainedJournal = JSON.parse(
      await readFile(fixture.layout.partial.journalPath, 'utf8'),
    ) as {
      readonly strongEtag: string
      readonly writtenBytes: number
    }
    assert.equal(retainedJournal.strongEtag, '"runtime-v1"')
    assert.equal(
      retainedJournal.writtenBytes,
      archiveBytes.byteLength,
    )
    assert.deepEqual(
      transport.requests.map((request) => ({
        headers: archiveTransportRequestHeaders(request),
        range: request.range,
        url: request.url,
      })),
      [
        {
          headers: {
            accept: 'application/octet-stream',
            'accept-encoding': 'identity',
          },
          range: undefined,
          url: fixture.admission.descriptor.archive.url,
        },
      ],
    )
    assert.equal(transport.closedResponses, 1)
    transport.assertExhausted()

    const offlineTransport = new ScriptedArchiveTransport([])
    const retained = await downloadVerifiedRuntimeArchive({
      admission: fixture.admission,
      layout: fixture.layout,
      mutationAuthority: fixture.mutationAuthority,
      signal: new AbortController().signal,
      transport: offlineTransport,
    })
    assert.deepEqual(await readFile(retained.archivePath), archiveBytes)
    assert.equal(offlineTransport.requests.length, 0)
  } finally {
    await fixture.cleanup()
  }
})

test('strong ETag resumes an interrupted prefix with one exact 206', async () => {
  const archiveBytes = Buffer.from('resume this exact runtime archive')
  const prefixBytes = archiveBytes.subarray(0, 12)
  const suffixBytes = archiveBytes.subarray(prefixBytes.byteLength)
  const fixture = await createDownloadFixture(archiveBytes)
  const transport = new ScriptedArchiveTransport([
    {
      statusCode: 200,
      headers: {
        'content-encoding': ['identity'],
        'content-length': [String(archiveBytes.byteLength)],
        etag: ['"runtime-v1"'],
      },
      chunks: [prefixBytes],
      bodyError: new ArchiveTransportNetworkError(false),
    },
    {
      statusCode: 206,
      headers: {
        'content-encoding': ['identity'],
        'content-length': [String(suffixBytes.byteLength)],
        'content-range': [
          `bytes ${prefixBytes.byteLength}-${archiveBytes.byteLength - 1}/${archiveBytes.byteLength}`,
        ],
        etag: ['"runtime-v1"'],
      },
      chunks: [suffixBytes],
    },
  ])

  try {
    await assertRuntimeFailure(
      downloadVerifiedRuntimeArchive({
        admission: fixture.admission,
        layout: fixture.layout,
        mutationAuthority: fixture.mutationAuthority,
        signal: new AbortController().signal,
        transport,
      }),
      'runtime_network_unavailable',
    )
    assert.deepEqual(
      await readFile(fixture.layout.partial.archivePath),
      prefixBytes,
    )
    assert.deepEqual(
      JSON.parse(
        await readFile(
          fixture.layout.partial.journalPath,
          'utf8',
        ),
      ),
      {
        schemaVersion: 1,
        kind: 'runtime_archive_partial',
        descriptor: {
          archiveAssetName:
            fixture.admission.descriptor.archive.assetName,
          archiveBytes: archiveBytes.byteLength,
          archiveSha256: sha256(archiveBytes),
          descriptorSha256: sha256(
            Buffer.from(
              JSON.stringify(fixture.admission.descriptor),
            ),
          ),
          launcherPackageName: 'ay-ple',
          launcherVersion: '0.1.0-preview.1',
          manifestSha256:
            fixture.admission.identity.manifestSha256,
          releaseId: fixture.admission.identity.releaseId,
          runtimeContractVersion:
            fixture.admission.identity.runtimeContractVersion,
          target: 'darwin-arm64',
        },
        strongEtag: '"runtime-v1"',
        writtenBytes: prefixBytes.byteLength,
      },
    )

    const result = await downloadVerifiedRuntimeArchive({
      admission: fixture.admission,
      layout: fixture.layout,
      mutationAuthority: fixture.mutationAuthority,
      signal: new AbortController().signal,
      transport,
    })

    assert.deepEqual(await readFile(result.archivePath), archiveBytes)
    assert.deepEqual(
      transport.requests.map((request) => ({
        headers: archiveTransportRequestHeaders(request),
        range: request.range,
        url: request.url,
      })),
      [
        {
          headers: {
            accept: 'application/octet-stream',
            'accept-encoding': 'identity',
          },
          range: undefined,
          url: fixture.admission.descriptor.archive.url,
        },
        {
          headers: {
            accept: 'application/octet-stream',
            'accept-encoding': 'identity',
            range: `bytes=${prefixBytes.byteLength}-`,
            'if-range': '"runtime-v1"',
          },
          range: {
            start: prefixBytes.byteLength,
            ifRange: '"runtime-v1"',
          },
          url: fixture.admission.descriptor.archive.url,
        },
      ],
    )
    assert.equal(transport.closedResponses, 2)
    transport.assertExhausted()
  } finally {
    await fixture.cleanup()
  }
})

test('exact 206 continuity still requires a full-file digest match', async () => {
  const archiveBytes = Buffer.from('resume digest must cover prefix and suffix')
  const prefixBytes = archiveBytes.subarray(0, 10)
  const corruptSuffix = Buffer.from(
    archiveBytes.subarray(prefixBytes.byteLength),
  )
  corruptSuffix[0] ^= 0x01
  const fixture = await createDownloadFixture(archiveBytes)
  const transport = new ScriptedArchiveTransport([
    {
      statusCode: 200,
      headers: {
        'content-length': [String(archiveBytes.byteLength)],
        etag: ['"runtime-v1"'],
      },
      chunks: [prefixBytes],
      bodyError: new ArchiveTransportNetworkError(false),
    },
    {
      statusCode: 206,
      headers: {
        'content-length': [String(corruptSuffix.byteLength)],
        'content-range': [
          `bytes ${prefixBytes.byteLength}-${archiveBytes.byteLength - 1}/${archiveBytes.byteLength}`,
        ],
        etag: ['"runtime-v1"'],
      },
      chunks: [corruptSuffix],
    },
  ])

  try {
    await assertRuntimeFailure(
      downloadVerifiedRuntimeArchive({
        admission: fixture.admission,
        layout: fixture.layout,
        mutationAuthority: fixture.mutationAuthority,
        signal: new AbortController().signal,
        transport,
      }),
      'runtime_network_unavailable',
    )
    await assertRuntimeFailure(
      downloadVerifiedRuntimeArchive({
        admission: fixture.admission,
        layout: fixture.layout,
        mutationAuthority: fixture.mutationAuthority,
        signal: new AbortController().signal,
        transport,
      }),
      'runtime_integrity_failed',
    )
    await assert.rejects(readFile(fixture.layout.archive.path), {
      code: 'ENOENT',
    })
    assert.equal(
      (await lstat(fixture.layout.partial.archivePath)).size,
      0,
    )
    const journal = JSON.parse(
      await readFile(fixture.layout.partial.journalPath, 'utf8'),
    ) as { readonly writtenBytes: number }
    assert.equal(journal.writtenBytes, 0)
  } finally {
    await fixture.cleanup()
  }
})

test('weak or absent ETag never authorizes append after interruption', async (t) => {
  for (const validator of [
    { name: 'weak ETag', etag: ['W/"runtime-v1"'] },
    { name: 'absent ETag', etag: undefined },
  ] as const) {
    await t.test(validator.name, async () => {
      const archiveBytes = Buffer.from(
        `fresh restart for ${validator.name}`,
      )
      const fixture = await createDownloadFixture(archiveBytes)
      const transport = new ScriptedArchiveTransport([
        {
          statusCode: 200,
          headers: {
            'content-encoding': ['identity'],
            'content-length': [String(archiveBytes.byteLength)],
            ...(validator.etag === undefined
              ? {}
              : { etag: validator.etag }),
          },
          chunks: [archiveBytes.subarray(0, 5)],
          bodyError: new ArchiveTransportNetworkError(false),
        },
        {
          statusCode: 200,
          headers: {
            'content-length': [String(archiveBytes.byteLength)],
          },
          chunks: [archiveBytes],
        },
      ])

      try {
        await assertRuntimeFailure(
          downloadVerifiedRuntimeArchive({
            admission: fixture.admission,
            layout: fixture.layout,
            mutationAuthority: fixture.mutationAuthority,
            signal: new AbortController().signal,
            transport,
          }),
          'runtime_network_unavailable',
        )
        await assert.rejects(
          readFile(fixture.layout.partial.journalPath),
          { code: 'ENOENT' },
        )

        const result = await downloadVerifiedRuntimeArchive({
          admission: fixture.admission,
          layout: fixture.layout,
          mutationAuthority: fixture.mutationAuthority,
          signal: new AbortController().signal,
          transport,
        })

        assert.deepEqual(await readFile(result.archivePath), archiveBytes)
        const archiveStats = await lstat(result.archivePath)
        const partialStats = await lstat(
          fixture.layout.partial.archivePath,
        )
        assert.equal(archiveStats.nlink, 2)
        assert.equal(partialStats.nlink, 2)
        assert.equal(partialStats.dev, archiveStats.dev)
        assert.equal(partialStats.ino, archiveStats.ino)
        assert.deepEqual(
          await readFile(fixture.layout.partial.archivePath),
          archiveBytes,
        )
        await assert.rejects(
          readFile(fixture.layout.partial.journalPath),
          { code: 'ENOENT' },
        )
        assert.deepEqual(
          transport.requests.map(({ range }) => range),
          [undefined, undefined],
        )
        assert.equal(transport.closedResponses, 2)
        transport.assertExhausted()

        const offlineTransport = new ScriptedArchiveTransport([])
        await downloadVerifiedRuntimeArchive({
          admission: fixture.admission,
          layout: fixture.layout,
          mutationAuthority: fixture.mutationAuthority,
          signal: new AbortController().signal,
          transport: offlineTransport,
        })
        assert.equal(offlineTransport.requests.length, 0)
      } finally {
        await fixture.cleanup()
      }
    })
  }
})

test('range-ignored weak replacement interruption resets a prior strong checkpoint', async () => {
  const archiveBytes = Buffer.from(
    'strong checkpoint replaced by weak response',
  )
  const firstPrefix = archiveBytes.subarray(0, 7)
  const weakPrefix = archiveBytes.subarray(0, 11)
  const fixture = await createDownloadFixture(archiveBytes)
  const transport = new ScriptedArchiveTransport([
    {
      statusCode: 200,
      headers: {
        'content-length': [String(archiveBytes.byteLength)],
        etag: ['"runtime-v1"'],
      },
      chunks: [firstPrefix],
      bodyError: new ArchiveTransportNetworkError(false),
    },
    {
      statusCode: 200,
      headers: {
        'content-length': [String(archiveBytes.byteLength)],
        etag: ['W/"runtime-v2"'],
      },
      chunks: [weakPrefix],
      bodyError: new ArchiveTransportNetworkError(false),
    },
    {
      statusCode: 200,
      headers: {
        'content-length': [String(archiveBytes.byteLength)],
      },
      chunks: [archiveBytes],
    },
  ])

  try {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await assertRuntimeFailure(
        downloadVerifiedRuntimeArchive({
          admission: fixture.admission,
          layout: fixture.layout,
          mutationAuthority: fixture.mutationAuthority,
          signal: new AbortController().signal,
          transport,
        }),
        'runtime_network_unavailable',
      )
    }
    assert.equal(
      (await lstat(fixture.layout.partial.archivePath)).size,
      0,
    )
    const resetJournal = JSON.parse(
      await readFile(fixture.layout.partial.journalPath, 'utf8'),
    ) as { readonly writtenBytes: number }
    assert.equal(resetJournal.writtenBytes, 0)

    const result = await downloadVerifiedRuntimeArchive({
      admission: fixture.admission,
      layout: fixture.layout,
      mutationAuthority: fixture.mutationAuthority,
      signal: new AbortController().signal,
      transport,
    })
    assert.deepEqual(await readFile(result.archivePath), archiveBytes)
    assert.deepEqual(
      transport.requests.map(({ range }) => range),
      [
        undefined,
        {
          start: firstPrefix.byteLength,
          ifRange: '"runtime-v1"',
        },
        undefined,
      ],
    )
  } finally {
    await fixture.cleanup()
  }
})

test('a missing final turns a full weak alias into a fresh nlink-one restart', async () => {
  const archiveBytes = Buffer.from('weak alias restart archive')
  const fixture = await createDownloadFixture(archiveBytes)
  const transport = new ScriptedArchiveTransport([
    {
      statusCode: 200,
      headers: {
        'content-length': [String(archiveBytes.byteLength)],
      },
      chunks: [archiveBytes],
    },
    {
      statusCode: 200,
      headers: {
        'content-length': [String(archiveBytes.byteLength)],
      },
      chunks: [archiveBytes],
    },
  ])

  try {
    await downloadVerifiedRuntimeArchive({
      admission: fixture.admission,
      layout: fixture.layout,
      mutationAuthority: fixture.mutationAuthority,
      signal: new AbortController().signal,
      transport,
    })
    await unlink(fixture.layout.archive.path)
    const unlinkedPartial = await lstat(
      fixture.layout.partial.archivePath,
    )
    assert.equal(unlinkedPartial.nlink, 1)
    assert.equal(unlinkedPartial.size, archiveBytes.byteLength)

    const result = await downloadVerifiedRuntimeArchive({
      admission: fixture.admission,
      layout: fixture.layout,
      mutationAuthority: fixture.mutationAuthority,
      signal: new AbortController().signal,
      transport,
    })
    assert.deepEqual(await readFile(result.archivePath), archiveBytes)
    assert.deepEqual(
      transport.requests.map(({ range }) => range),
      [undefined, undefined],
    )
    const finalStats = await lstat(result.archivePath)
    const partialStats = await lstat(
      fixture.layout.partial.archivePath,
    )
    assert.equal(finalStats.nlink, 2)
    assert.equal(partialStats.nlink, 2)
    assert.equal(finalStats.ino, partialStats.ino)
    transport.assertExhausted()
  } finally {
    await fixture.cleanup()
  }
})

test('range-ignored 200 truncates the retained prefix before writing', async () => {
  const archiveBytes = Buffer.from('range ignored full representation')
  const prefixBytes = archiveBytes.subarray(0, 8)
  const fixture = await createDownloadFixture(archiveBytes)
  const transport = new ScriptedArchiveTransport([
    {
      statusCode: 200,
      headers: {
        'content-length': [String(archiveBytes.byteLength)],
        etag: ['"runtime-v1"'],
      },
      chunks: [prefixBytes],
      bodyError: new ArchiveTransportNetworkError(false),
    },
    {
      statusCode: 200,
      headers: {
        'content-length': [String(archiveBytes.byteLength)],
        etag: ['"runtime-v1"'],
      },
      chunks: [archiveBytes],
    },
  ])

  try {
    await assertRuntimeFailure(
      downloadVerifiedRuntimeArchive({
        admission: fixture.admission,
        layout: fixture.layout,
        mutationAuthority: fixture.mutationAuthority,
        signal: new AbortController().signal,
        transport,
      }),
      'runtime_network_unavailable',
    )
    const result = await downloadVerifiedRuntimeArchive({
      admission: fixture.admission,
      layout: fixture.layout,
      mutationAuthority: fixture.mutationAuthority,
      signal: new AbortController().signal,
      transport,
    })

    assert.deepEqual(await readFile(result.archivePath), archiveBytes)
    assert.deepEqual(
      transport.requests.map(({ range }) => range),
      [
        undefined,
        { start: prefixBytes.byteLength, ifRange: '"runtime-v1"' },
      ],
    )
    assert.equal(transport.closedResponses, 2)
  } finally {
    await fixture.cleanup()
  }
})

test('invalid 206 continuity consumes one fresh restart without stale bytes', async (t) => {
  const cases = [
    {
      name: 'validator mismatch',
      headers: (start: number, total: number) => ({
        'content-length': [String(total - start)],
        'content-range': [`bytes ${start}-${total - 1}/${total}`],
        etag: ['"different-runtime"'],
      }),
    },
    {
      name: 'range start mismatch',
      headers: (start: number, total: number) => ({
        'content-length': [String(total - start + 1)],
        'content-range': [
          `bytes ${start - 1}-${total - 1}/${total}`,
        ],
        etag: ['"runtime-v1"'],
      }),
    },
    {
      name: 'range total mismatch',
      headers: (start: number, total: number) => ({
        'content-length': [String(total - start)],
        'content-range': [
          `bytes ${start}-${total - 1}/${total + 1}`,
        ],
        etag: ['"runtime-v1"'],
      }),
    },
    {
      name: 'suffix length mismatch',
      headers: (start: number, total: number) => ({
        'content-length': [String(total - start - 1)],
        'content-range': [`bytes ${start}-${total - 1}/${total}`],
        etag: ['"runtime-v1"'],
      }),
    },
    {
      name: 'duplicate validator',
      headers: (start: number, total: number) => ({
        'content-length': [String(total - start)],
        'content-range': [`bytes ${start}-${total - 1}/${total}`],
        etag: ['"runtime-v1"', '"runtime-v1"'],
      }),
    },
  ] as const

  for (const testCase of cases) {
    await t.test(testCase.name, async () => {
      const archiveBytes = Buffer.from(
        `invalid resume ${testCase.name} exact archive`,
      )
      const prefixBytes = archiveBytes.subarray(0, 9)
      const fixture = await createDownloadFixture(archiveBytes)
      const transport = new ScriptedArchiveTransport([
        {
          statusCode: 200,
          headers: {
            'content-length': [String(archiveBytes.byteLength)],
            etag: ['"runtime-v1"'],
          },
          chunks: [prefixBytes],
          bodyError: new ArchiveTransportNetworkError(false),
        },
        {
          statusCode: 206,
          headers: testCase.headers(
            prefixBytes.byteLength,
            archiveBytes.byteLength,
          ),
          chunks: [archiveBytes.subarray(prefixBytes.byteLength)],
        },
        {
          statusCode: 200,
          headers: {
            'content-length': [String(archiveBytes.byteLength)],
            etag: ['"runtime-v2"'],
          },
          chunks: [archiveBytes],
        },
      ])

      try {
        await assertRuntimeFailure(
          downloadVerifiedRuntimeArchive({
            admission: fixture.admission,
            layout: fixture.layout,
            mutationAuthority: fixture.mutationAuthority,
            signal: new AbortController().signal,
            transport,
          }),
          'runtime_network_unavailable',
        )
        const result = await downloadVerifiedRuntimeArchive({
          admission: fixture.admission,
          layout: fixture.layout,
          mutationAuthority: fixture.mutationAuthority,
          signal: new AbortController().signal,
          transport,
        })

        assert.deepEqual(await readFile(result.archivePath), archiveBytes)
        assert.deepEqual(
          transport.requests.map(({ range }) => range),
          [
            undefined,
            {
              start: prefixBytes.byteLength,
              ifRange: '"runtime-v1"',
            },
            undefined,
          ],
        )
        assert.equal(transport.closedResponses, 3)
        transport.assertExhausted()
      } finally {
        await fixture.cleanup()
      }
    })
  }
})

test('a reversed completed 206 range consumes one fresh restart', async () => {
  const archiveBytes = Buffer.from('reversed completed range archive')
  const fixture = await createDownloadFixture(archiveBytes)
  await seedStrongPartial(fixture, archiveBytes, archiveBytes)
  const transport = new ScriptedArchiveTransport([
    {
      statusCode: 206,
      headers: {
        'content-length': ['0'],
        'content-range': [
          `bytes ${archiveBytes.byteLength}-${archiveBytes.byteLength - 1}/${archiveBytes.byteLength}`,
        ],
        etag: ['"runtime-v1"'],
      },
      chunks: [],
    },
    {
      statusCode: 200,
      headers: {
        'content-length': [String(archiveBytes.byteLength)],
        etag: ['"runtime-v2"'],
      },
      chunks: [archiveBytes],
    },
  ])

  try {
    const result = await downloadVerifiedRuntimeArchive({
      admission: fixture.admission,
      layout: fixture.layout,
      mutationAuthority: fixture.mutationAuthority,
      signal: new AbortController().signal,
      transport,
    })

    assert.deepEqual(await readFile(result.archivePath), archiveBytes)
    assert.deepEqual(
      transport.requests.map(({ range }) => range),
      [
        {
          start: archiveBytes.byteLength,
          ifRange: '"runtime-v1"',
        },
        undefined,
      ],
    )
    transport.assertExhausted()
  } finally {
    await fixture.cleanup()
  }
})

test('416 reuses a complete strong-validator partial only after full hash', async () => {
  const archiveBytes = Buffer.from('complete partial reconciled by 416')
  const fixture = await createDownloadFixture(archiveBytes)
  const transport = new ScriptedArchiveTransport([
    {
      statusCode: 200,
      headers: {
        'content-length': [String(archiveBytes.byteLength)],
        etag: ['"runtime-v1"'],
      },
      chunks: [archiveBytes],
      bodyError: new ArchiveTransportNetworkError(false),
    },
    {
      statusCode: 416,
      headers: {
        'content-range': [`bytes */${archiveBytes.byteLength}`],
      },
      chunks: [Buffer.from('range explanation, not archive bytes')],
    },
  ])

  try {
    await assertRuntimeFailure(
      downloadVerifiedRuntimeArchive({
        admission: fixture.admission,
        layout: fixture.layout,
        mutationAuthority: fixture.mutationAuthority,
        signal: new AbortController().signal,
        transport,
      }),
      'runtime_network_unavailable',
    )
    const result = await downloadVerifiedRuntimeArchive({
      admission: fixture.admission,
      layout: fixture.layout,
      mutationAuthority: fixture.mutationAuthority,
      signal: new AbortController().signal,
      transport,
    })

    assert.deepEqual(await readFile(result.archivePath), archiveBytes)
    assert.deepEqual(
      transport.requests.map(({ range }) => range),
      [
        undefined,
        {
          start: archiveBytes.byteLength,
          ifRange: '"runtime-v1"',
        },
      ],
    )
    assert.equal(transport.closedResponses, 2)
    transport.assertExhausted()
  } finally {
    await fixture.cleanup()
  }
})

test('416 never promotes a same-length corrupt completed partial', async () => {
  const archiveBytes = Buffer.from('416 full digest authority')
  const corruptBytes = Buffer.from(archiveBytes)
  corruptBytes[0] ^= 0x01
  const fixture = await createDownloadFixture(archiveBytes)
  const transport = new ScriptedArchiveTransport([
    {
      statusCode: 200,
      headers: {
        'content-length': [String(archiveBytes.byteLength)],
        etag: ['"runtime-v1"'],
      },
      chunks: [corruptBytes],
      bodyError: new ArchiveTransportNetworkError(false),
    },
    {
      statusCode: 416,
      headers: {
        'content-range': [`bytes */${archiveBytes.byteLength}`],
      },
      chunks: [Buffer.from('not archive content')],
    },
  ])

  try {
    await assertRuntimeFailure(
      downloadVerifiedRuntimeArchive({
        admission: fixture.admission,
        layout: fixture.layout,
        mutationAuthority: fixture.mutationAuthority,
        signal: new AbortController().signal,
        transport,
      }),
      'runtime_network_unavailable',
    )
    await assertRuntimeFailure(
      downloadVerifiedRuntimeArchive({
        admission: fixture.admission,
        layout: fixture.layout,
        mutationAuthority: fixture.mutationAuthority,
        signal: new AbortController().signal,
        transport,
      }),
      'runtime_integrity_failed',
    )
    await assert.rejects(readFile(fixture.layout.archive.path), {
      code: 'ENOENT',
    })
    assert.equal(
      (await lstat(fixture.layout.partial.archivePath)).size,
      0,
    )
  } finally {
    await fixture.cleanup()
  }
})

test('invalid 416 consumes one fresh restart and never reuses a short prefix', async () => {
  const archiveBytes = Buffer.from('short partial cannot satisfy 416')
  const prefixBytes = archiveBytes.subarray(0, 6)
  const fixture = await createDownloadFixture(archiveBytes)
  const transport = new ScriptedArchiveTransport([
    {
      statusCode: 200,
      headers: {
        'content-length': [String(archiveBytes.byteLength)],
        etag: ['"runtime-v1"'],
      },
      chunks: [prefixBytes],
      bodyError: new ArchiveTransportNetworkError(false),
    },
    {
      statusCode: 416,
      headers: {
        'content-range': [`bytes */${archiveBytes.byteLength}`],
      },
    },
    {
      statusCode: 200,
      headers: {
        'content-length': [String(archiveBytes.byteLength)],
        etag: ['"runtime-v2"'],
      },
      chunks: [archiveBytes],
    },
  ])

  try {
    await assertRuntimeFailure(
      downloadVerifiedRuntimeArchive({
        admission: fixture.admission,
        layout: fixture.layout,
        mutationAuthority: fixture.mutationAuthority,
        signal: new AbortController().signal,
        transport,
      }),
      'runtime_network_unavailable',
    )
    const result = await downloadVerifiedRuntimeArchive({
      admission: fixture.admission,
      layout: fixture.layout,
      mutationAuthority: fixture.mutationAuthority,
      signal: new AbortController().signal,
      transport,
    })

    assert.deepEqual(await readFile(result.archivePath), archiveBytes)
    assert.deepEqual(
      transport.requests.map(({ range }) => range),
      [
        undefined,
        {
          start: prefixBytes.byteLength,
          ifRange: '"runtime-v1"',
        },
        undefined,
      ],
    )
    assert.equal(transport.closedResponses, 3)
    transport.assertExhausted()
  } finally {
    await fixture.cleanup()
  }
})

test('follows a cross-origin HTTPS redirect with only archive headers', async () => {
  const archiveBytes = Buffer.from('redirected exact archive')
  const fixture = await createDownloadFixture(archiveBytes)
  const redirectedUrl =
    'https://objects.example.test/releases/runtime/archive.tar.gz?signature=opaque'
  const transport = new ScriptedArchiveTransport([
    {
      statusCode: 302,
      headers: { location: [redirectedUrl] },
    },
    {
      statusCode: 200,
      headers: {
        'content-length': [String(archiveBytes.byteLength)],
        etag: ['"runtime-v1"'],
      },
      chunks: [archiveBytes],
    },
  ])

  try {
    const result = await downloadVerifiedRuntimeArchive({
      admission: fixture.admission,
      layout: fixture.layout,
      mutationAuthority: fixture.mutationAuthority,
      signal: new AbortController().signal,
      transport,
    })

    assert.deepEqual(await readFile(result.archivePath), archiveBytes)
    assert.deepEqual(
      transport.requests.map((request) => ({
        headers: archiveTransportRequestHeaders(request),
        url: request.url,
      })),
      [
        {
          headers: {
            accept: 'application/octet-stream',
            'accept-encoding': 'identity',
          },
          url: fixture.admission.descriptor.archive.url,
        },
        {
          headers: {
            accept: 'application/octet-stream',
            'accept-encoding': 'identity',
          },
          url: redirectedUrl,
        },
      ],
    )
    assert.equal(transport.closedResponses, 2)
    transport.assertExhausted()
  } finally {
    await fixture.cleanup()
  }
})

test('redirect downgrade, cycle, duplicate location, and hop overflow fail closed', async (t) => {
  const cases = [
    {
      name: 'HTTPS downgrade',
      responses: () => [
        {
          statusCode: 302,
          headers: {
            location: ['http://objects.example.test/archive.tar.gz'],
          },
        },
      ],
      expectedRequests: 1,
    },
    {
      name: 'cycle',
      responses: (initialUrl: string) => [
        {
          statusCode: 302,
          headers: { location: [initialUrl] },
        },
      ],
      expectedRequests: 1,
    },
    {
      name: 'duplicate location',
      responses: () => [
        {
          statusCode: 302,
          headers: {
            location: [
              'https://objects.example.test/one',
              'https://objects.example.test/two',
            ],
          },
        },
      ],
      expectedRequests: 1,
    },
    {
      name: 'hop overflow',
      responses: () =>
        Array.from({ length: 6 }, (_, index) => ({
          statusCode: 302,
          headers: {
            location: [
              `https://objects.example.test/hop-${index + 1}`,
            ],
          },
        })),
      expectedRequests: 6,
    },
  ] as const

  for (const testCase of cases) {
    await t.test(testCase.name, async () => {
      const archiveBytes = Buffer.from(`redirect ${testCase.name}`)
      const fixture = await createDownloadFixture(archiveBytes)
      const transport = new ScriptedArchiveTransport(
        testCase.responses(
          fixture.admission.descriptor.archive.url,
        ),
      )
      try {
        await assertRuntimeFailure(
          downloadVerifiedRuntimeArchive({
            admission: fixture.admission,
            layout: fixture.layout,
            mutationAuthority: fixture.mutationAuthority,
            signal: new AbortController().signal,
            transport,
          }),
          'runtime_integrity_failed',
        )
        assert.equal(
          transport.requests.length,
          testCase.expectedRequests,
        )
        assert.equal(
          transport.closedResponses,
          testCase.expectedRequests,
        )
        transport.assertExhausted()
      } finally {
        await fixture.cleanup()
      }
    })
  }
})

test('one transient request interruption retries the exact URL once', async () => {
  const archiveBytes = Buffer.from('one transient retry archive')
  const fixture = await createDownloadFixture(archiveBytes)
  const transport = new ScriptedArchiveTransport([
    {
      statusCode: 0,
      requestError: new ArchiveTransportNetworkError(true),
    },
    {
      statusCode: 200,
      headers: {
        'content-length': [String(archiveBytes.byteLength)],
      },
      chunks: [archiveBytes],
    },
  ])

  try {
    const result = await downloadVerifiedRuntimeArchive({
      admission: fixture.admission,
      layout: fixture.layout,
      mutationAuthority: fixture.mutationAuthority,
      signal: new AbortController().signal,
      transport,
    })

    assert.deepEqual(await readFile(result.archivePath), archiveBytes)
    assert.deepEqual(
      transport.requests.map(({ url }) => url),
      [
        fixture.admission.descriptor.archive.url,
        fixture.admission.descriptor.archive.url,
      ],
    )
    assert.equal(transport.closedResponses, 1)
    transport.assertExhausted()
  } finally {
    await fixture.cleanup()
  }
})

test('one transient body interruption resumes the fsynced strong-ETag prefix', async () => {
  const archiveBytes = Buffer.from('transient stream resume archive')
  const prefixBytes = archiveBytes.subarray(0, 11)
  const suffixBytes = archiveBytes.subarray(prefixBytes.byteLength)
  const fixture = await createDownloadFixture(archiveBytes)
  const transport = new ScriptedArchiveTransport([
    {
      statusCode: 200,
      headers: {
        'content-length': [String(archiveBytes.byteLength)],
        etag: ['"runtime-v1"'],
      },
      chunks: [prefixBytes],
      bodyError: new ArchiveTransportNetworkError(true),
    },
    {
      statusCode: 206,
      headers: {
        'content-length': [String(suffixBytes.byteLength)],
        'content-range': [
          `bytes ${prefixBytes.byteLength}-${archiveBytes.byteLength - 1}/${archiveBytes.byteLength}`,
        ],
        etag: ['"runtime-v1"'],
      },
      chunks: [suffixBytes],
    },
  ])

  try {
    const result = await downloadVerifiedRuntimeArchive({
      admission: fixture.admission,
      layout: fixture.layout,
      mutationAuthority: fixture.mutationAuthority,
      signal: new AbortController().signal,
      transport,
    })
    assert.deepEqual(await readFile(result.archivePath), archiveBytes)
    assert.deepEqual(
      transport.requests.map(({ range }) => range),
      [
        undefined,
        {
          start: prefixBytes.byteLength,
          ifRange: '"runtime-v1"',
        },
      ],
    )
    assert.equal(transport.closedResponses, 2)
    transport.assertExhausted()
  } finally {
    await fixture.cleanup()
  }
})

test('allowlisted transient HTTP statuses share the one-retry budget', async (t) => {
  for (const statusCode of [408, 429, 500, 502, 503, 504]) {
    await t.test(String(statusCode), async () => {
      const archiveBytes = Buffer.from(`HTTP ${statusCode} retry`)
      const fixture = await createDownloadFixture(archiveBytes)
      const transport = new ScriptedArchiveTransport([
        { statusCode },
        {
          statusCode: 200,
          headers: {
            'content-length': [String(archiveBytes.byteLength)],
          },
          chunks: [archiveBytes],
        },
      ])
      try {
        const result = await downloadVerifiedRuntimeArchive({
          admission: fixture.admission,
          layout: fixture.layout,
          mutationAuthority: fixture.mutationAuthority,
          signal: new AbortController().signal,
          transport,
        })
        assert.deepEqual(await readFile(result.archivePath), archiveBytes)
        assert.equal(transport.requests.length, 2)
        assert.equal(transport.closedResponses, 2)
        transport.assertExhausted()
      } finally {
        await fixture.cleanup()
      }
    })
  }

  await t.test('budget exhausted', async () => {
    const archiveBytes = Buffer.from('HTTP retry budget exhausted')
    const fixture = await createDownloadFixture(archiveBytes)
    const transport = new ScriptedArchiveTransport([
      { statusCode: 503 },
      { statusCode: 503 },
    ])
    try {
      await assertRuntimeFailure(
        downloadVerifiedRuntimeArchive({
          admission: fixture.admission,
          layout: fixture.layout,
          mutationAuthority: fixture.mutationAuthority,
          signal: new AbortController().signal,
          transport,
        }),
        'runtime_network_unavailable',
      )
      assert.equal(transport.requests.length, 2)
      assert.equal(transport.closedResponses, 2)
      transport.assertExhausted()
    } finally {
      await fixture.cleanup()
    }
  })
})

test('access and exact-release HTTP failures are stable and never retried', async (t) => {
  for (const testCase of [
    { statusCode: 401, code: 'runtime_access_denied' },
    { statusCode: 403, code: 'runtime_access_denied' },
    { statusCode: 404, code: 'runtime_release_unavailable' },
    { statusCode: 410, code: 'runtime_release_unavailable' },
  ] as const) {
    await t.test(String(testCase.statusCode), async () => {
      const archiveBytes = Buffer.from(
        `HTTP ${testCase.statusCode} unavailable`,
      )
      const fixture = await createDownloadFixture(archiveBytes)
      const transport = new ScriptedArchiveTransport([
        { statusCode: testCase.statusCode },
      ])
      try {
        await assertRuntimeFailure(
          downloadVerifiedRuntimeArchive({
            admission: fixture.admission,
            layout: fixture.layout,
            mutationAuthority: fixture.mutationAuthority,
            signal: new AbortController().signal,
            transport,
          }),
          testCase.code,
        )
        assert.equal(transport.requests.length, 1)
        assert.equal(transport.closedResponses, 1)
        transport.assertExhausted()
      } finally {
        await fixture.cleanup()
      }
    })
  }
})

test('encoding, length, stream bound, and hash drift never become verified archives', async (t) => {
  const exactBytes = Buffer.from('exact integrity-bound archive')
  const cases: readonly {
    readonly name: string
    readonly response: ScriptedResponse
  }[] = [
    {
      name: 'non-identity encoding',
      response: {
        statusCode: 200,
        headers: {
          'content-encoding': ['gzip'],
          'content-length': [String(exactBytes.byteLength)],
        },
        chunks: [exactBytes],
      },
    },
    {
      name: 'declared length mismatch',
      response: {
        statusCode: 200,
        headers: {
          'content-length': [String(exactBytes.byteLength - 1)],
        },
        chunks: [exactBytes],
      },
    },
    {
      name: 'duplicate content length',
      response: {
        statusCode: 200,
        headers: {
          'content-length': [
            String(exactBytes.byteLength),
            String(exactBytes.byteLength),
          ],
        },
        chunks: [exactBytes],
      },
    },
    {
      name: 'short body',
      response: {
        statusCode: 200,
        headers: { etag: ['"runtime-v1"'] },
        chunks: [exactBytes.subarray(0, exactBytes.byteLength - 1)],
      },
    },
    {
      name: 'streamed oversize',
      response: {
        statusCode: 200,
        chunks: [exactBytes, Buffer.from('!')],
      },
    },
    {
      name: 'wrong hash',
      response: {
        statusCode: 200,
        headers: {
          'content-length': [String(exactBytes.byteLength)],
        },
        chunks: [Buffer.alloc(exactBytes.byteLength, 0x78)],
      },
    },
    {
      name: 'overlong validator',
      response: {
        statusCode: 200,
        headers: {
          etag: [`"${'x'.repeat(1025)}"`],
        },
        chunks: [exactBytes],
      },
    },
    {
      name: 'validator with CRLF',
      response: {
        statusCode: 200,
        headers: {
          etag: ['"runtime-v1"\r\nx-injected: true'],
        },
        chunks: [exactBytes],
      },
    },
  ]

  for (const testCase of cases) {
    await t.test(testCase.name, async () => {
      const fixture = await createDownloadFixture(exactBytes)
      const transport = new ScriptedArchiveTransport([
        testCase.response,
      ])
      try {
        await assertRuntimeFailure(
          downloadVerifiedRuntimeArchive({
            admission: fixture.admission,
            layout: fixture.layout,
            mutationAuthority: fixture.mutationAuthority,
            signal: new AbortController().signal,
            transport,
          }),
          'runtime_integrity_failed',
        )
        await assert.rejects(readFile(fixture.layout.archive.path), {
          code: 'ENOENT',
        })
        assert.equal(transport.requests.length, 1)
        assert.equal(transport.closedResponses, 1)
        transport.assertExhausted()
      } finally {
        await fixture.cleanup()
      }
    })
  }
})

test('cancellation closes the response and preserves only a resumable checkpoint', async () => {
  const archiveBytes = Buffer.from('cancel and resume exact archive')
  const prefixBytes = archiveBytes.subarray(0, 10)
  const suffixBytes = archiveBytes.subarray(prefixBytes.byteLength)
  const fixture = await createDownloadFixture(archiveBytes)
  const cancellation = new AbortController()
  const transport = new ScriptedArchiveTransport([
    {
      statusCode: 200,
      headers: {
        'content-length': [String(archiveBytes.byteLength)],
        etag: ['"runtime-v1"'],
      },
      chunks: [prefixBytes],
      beforeBodyError: () => cancellation.abort(),
      bodyError: new DOMException('cancelled', 'AbortError'),
    },
    {
      statusCode: 206,
      headers: {
        'content-length': [String(suffixBytes.byteLength)],
        'content-range': [
          `bytes ${prefixBytes.byteLength}-${archiveBytes.byteLength - 1}/${archiveBytes.byteLength}`,
        ],
        etag: ['"runtime-v1"'],
      },
      chunks: [suffixBytes],
    },
  ])

  try {
    await assertRuntimeFailure(
      downloadVerifiedRuntimeArchive({
        admission: fixture.admission,
        layout: fixture.layout,
        mutationAuthority: fixture.mutationAuthority,
        signal: cancellation.signal,
        transport,
      }),
      'runtime_cancelled',
    )
    assert.deepEqual(
      await readFile(fixture.layout.partial.archivePath),
      prefixBytes,
    )
    const journal = JSON.parse(
      await readFile(fixture.layout.partial.journalPath, 'utf8'),
    ) as { readonly strongEtag: string; readonly writtenBytes: number }
    assert.deepEqual(journal, {
      ...journal,
      strongEtag: '"runtime-v1"',
      writtenBytes: prefixBytes.byteLength,
    })
    assert.equal(transport.closedResponses, 1)

    const result = await downloadVerifiedRuntimeArchive({
      admission: fixture.admission,
      layout: fixture.layout,
      mutationAuthority: fixture.mutationAuthority,
      signal: new AbortController().signal,
      transport,
    })
    assert.deepEqual(await readFile(result.archivePath), archiveBytes)
    assert.equal(transport.closedResponses, 2)
    transport.assertExhausted()
  } finally {
    await fixture.cleanup()
  }
})

test('cancellation after the last body chunk checkpoints the complete partial', async () => {
  const archiveBytes = Buffer.from('cancel after final response chunk')
  const fixture = await createDownloadFixture(archiveBytes)
  const cancellation = new AbortController()
  const transport = new ScriptedArchiveTransport([
    {
      statusCode: 200,
      headers: {
        'content-length': [String(archiveBytes.byteLength)],
        etag: ['"runtime-v1"'],
      },
      chunks: [archiveBytes],
      afterChunks: () => cancellation.abort(),
    },
    {
      statusCode: 416,
      headers: {
        'content-range': [`bytes */${archiveBytes.byteLength}`],
      },
      chunks: [Buffer.from('ignored 416 explanation')],
    },
  ])

  try {
    await assertRuntimeFailure(
      downloadVerifiedRuntimeArchive({
        admission: fixture.admission,
        layout: fixture.layout,
        mutationAuthority: fixture.mutationAuthority,
        signal: cancellation.signal,
        transport,
      }),
      'runtime_cancelled',
    )
    assert.deepEqual(
      await readFile(fixture.layout.partial.archivePath),
      archiveBytes,
    )
    const journal = JSON.parse(
      await readFile(fixture.layout.partial.journalPath, 'utf8'),
    ) as { readonly writtenBytes: number }
    assert.equal(journal.writtenBytes, archiveBytes.byteLength)

    const result = await downloadVerifiedRuntimeArchive({
      admission: fixture.admission,
      layout: fixture.layout,
      mutationAuthority: fixture.mutationAuthority,
      signal: new AbortController().signal,
      transport,
    })
    assert.deepEqual(await readFile(result.archivePath), archiveBytes)
    transport.assertExhausted()
  } finally {
    await fixture.cleanup()
  }
})

test('pre-aborted cancellation performs no network or partial mutation', async () => {
  const archiveBytes = Buffer.from('pre-aborted archive')
  const fixture = await createDownloadFixture(archiveBytes)
  const transport = new ScriptedArchiveTransport([])
  const cancellation = new AbortController()
  cancellation.abort()

  try {
    await assertRuntimeFailure(
      downloadVerifiedRuntimeArchive({
        admission: fixture.admission,
        layout: fixture.layout,
        mutationAuthority: fixture.mutationAuthority,
        signal: cancellation.signal,
        transport,
      }),
      'runtime_cancelled',
    )
    assert.equal(transport.requests.length, 0)
    await assert.rejects(lstat(fixture.layout.partial.root), {
      code: 'ENOENT',
    })
  } finally {
    await fixture.cleanup()
  }
})

test('structural cache-layout drift fails before mutation or network', async (t) => {
  const archiveBytes = Buffer.from('layout binding archive')
  const cases: readonly {
    readonly name: string
    mutate(layout: RuntimeCacheLayout): RuntimeCacheLayout
  }[] = [
    {
      name: 'descriptor partial leaf',
      mutate: (layout) => {
        const root = path.join(
          layout.namespaces.partials,
          'different-digest',
        )
        return {
          ...layout,
          partial: {
            ...layout.partial,
            root,
            archivePath: path.join(root, 'archive.part'),
            journalPath: path.join(root, 'journal.json'),
          },
        }
      },
    },
    {
      name: 'archive namespace',
      mutate: (layout) => {
        const archives = path.join(
          layout.cacheRoot,
          'other-archives',
        )
        return {
          ...layout,
          archive: {
            ...layout.archive,
            path: path.join(
              archives,
              path.basename(layout.archive.path),
            ),
          },
          namespaces: {
            ...layout.namespaces,
            archives,
          },
        }
      },
    },
  ]

  for (const testCase of cases) {
    await t.test(testCase.name, async () => {
      const fixture = await createDownloadFixture(archiveBytes)
      const transport = new ScriptedArchiveTransport([])
      const layout = testCase.mutate(fixture.layout)
      try {
        await assertRuntimeFailure(
          downloadVerifiedRuntimeArchive({
            admission: fixture.admission,
            layout,
            mutationAuthority: fixture.mutationAuthority,
            signal: new AbortController().signal,
            transport,
          }),
          'runtime_cache_unsafe',
        )
        assert.equal(transport.requests.length, 0)
        await assert.rejects(lstat(layout.partial.root), {
          code: 'ENOENT',
        })
      } finally {
        await fixture.cleanup()
      }
    })
  }
})

test('cancellation raised inside archive hashing keeps its stable code', async () => {
  const directory = await mkdtemp(
    path.join(tmpdir(), 'runtime-hash-cancel-test-'),
  )
  const filePath = path.join(directory, 'archive.part')
  await writeFile(filePath, 'x', { mode: 0o600 })
  const handle = await open(filePath, 'r')
  const cancellation = new AbortController()
  cancellation.abort()

  try {
    await assertRuntimeFailure(
      hashRuntimeArchiveFile(handle, 1, cancellation.signal),
      'runtime_cancelled',
    )
  } finally {
    await handle.close()
    await rm(directory, { recursive: true, force: true })
  }
})

test('weak archive hash cancellation leaves only a zero fresh checkpoint', async () => {
  const archiveBytes = Buffer.from('weak hash cancellation')
  const fixture = await createDownloadFixture(archiveBytes)
  const cancellation = new AbortController()
  const transport = new ScriptedArchiveTransport([
    {
      statusCode: 200,
      headers: {
        'content-length': [String(archiveBytes.byteLength)],
      },
      chunks: [archiveBytes],
    },
    {
      statusCode: 200,
      headers: {
        'content-length': [String(archiveBytes.byteLength)],
      },
      chunks: [archiveBytes],
    },
  ])

  try {
    await assertRuntimeFailure(
      downloadVerifiedRuntimeArchive({
        admission: fixture.admission,
        layout: fixture.layout,
        mutationAuthority: fixture.mutationAuthority,
        signal: cancellation.signal,
        testOptions: {
          beforeArchiveHash: () => cancellation.abort(),
        },
        transport,
      }),
      'runtime_cancelled',
    )
    assert.equal(
      (await lstat(fixture.layout.partial.archivePath)).size,
      0,
    )
    await assert.rejects(
      readFile(fixture.layout.partial.journalPath),
      { code: 'ENOENT' },
    )

    const result = await downloadVerifiedRuntimeArchive({
      admission: fixture.admission,
      layout: fixture.layout,
      mutationAuthority: fixture.mutationAuthority,
      signal: new AbortController().signal,
      transport,
    })
    assert.deepEqual(await readFile(result.archivePath), archiveBytes)
    assert.deepEqual(
      transport.requests.map(({ range }) => range),
      [undefined, undefined],
    )
  } finally {
    await fixture.cleanup()
  }
})

test('weak cancellation immediately after the final chunk resets the completed partial', async () => {
  const archiveBytes = Buffer.from('weak final chunk cancellation')
  const fixture = await createDownloadFixture(archiveBytes)
  const cancellation = new AbortController()
  const transport = new ScriptedArchiveTransport([
    {
      statusCode: 200,
      headers: {
        'content-length': [String(archiveBytes.byteLength)],
      },
      chunks: [archiveBytes],
      afterChunks: () => cancellation.abort(),
    },
    {
      statusCode: 200,
      headers: {
        'content-length': [String(archiveBytes.byteLength)],
      },
      chunks: [archiveBytes],
    },
  ])

  try {
    await assertRuntimeFailure(
      downloadVerifiedRuntimeArchive({
        admission: fixture.admission,
        layout: fixture.layout,
        mutationAuthority: fixture.mutationAuthority,
        signal: cancellation.signal,
        transport,
      }),
      'runtime_cancelled',
    )
    assert.equal(
      (await lstat(fixture.layout.partial.archivePath)).size,
      0,
    )
    await assert.rejects(
      readFile(fixture.layout.partial.journalPath),
      { code: 'ENOENT' },
    )

    const result = await downloadVerifiedRuntimeArchive({
      admission: fixture.admission,
      layout: fixture.layout,
      mutationAuthority: fixture.mutationAuthority,
      signal: new AbortController().signal,
      transport,
    })
    assert.deepEqual(await readFile(result.archivePath), archiveBytes)
    assert.deepEqual(
      transport.requests.map(({ range }) => range),
      [undefined, undefined],
    )
  } finally {
    await fixture.cleanup()
  }
})

test('cancellation is deferred after no-clobber archive commit begins', async () => {
  const archiveBytes = Buffer.from('deferred publish cancellation')
  const fixture = await createDownloadFixture(archiveBytes)
  const cancellation = new AbortController()
  const transport = new ScriptedArchiveTransport([
    {
      statusCode: 200,
      headers: {
        'content-length': [String(archiveBytes.byteLength)],
        etag: ['"runtime-v1"'],
      },
      chunks: [archiveBytes],
    },
  ])

  try {
    const result = await downloadVerifiedRuntimeArchive({
      admission: fixture.admission,
      layout: fixture.layout,
      mutationAuthority: fixture.mutationAuthority,
      signal: cancellation.signal,
      testOptions: {
        afterArchivePublishStarted: () => cancellation.abort(),
      },
      transport,
    })

    assert.equal(cancellation.signal.aborted, true)
    assert.deepEqual(await readFile(result.archivePath), archiveBytes)
    assert.deepEqual(
      await readFile(fixture.layout.partial.archivePath),
      archiveBytes,
    )
    transport.assertExhausted()
  } finally {
    await fixture.cleanup()
  }
})

test('an existing exact archive is verified without network', async () => {
  const archiveBytes = Buffer.from('offline retained archive')
  const fixture = await createDownloadFixture(archiveBytes)
  const transport = new ScriptedArchiveTransport([])

  try {
    await writeFile(fixture.layout.archive.path, archiveBytes, {
      mode: 0o600,
    })
    const result = await downloadVerifiedRuntimeArchive({
      admission: fixture.admission,
      layout: fixture.layout,
      mutationAuthority: fixture.mutationAuthority,
      signal: new AbortController().signal,
      transport,
    })

    assert.deepEqual(await readFile(result.archivePath), archiveBytes)
    assert.equal(transport.requests.length, 0)
    await assert.rejects(lstat(fixture.layout.partial.root), {
      code: 'ENOENT',
    })
  } finally {
    await fixture.cleanup()
  }
})

test('an invalid retained archive fails closed before network', async () => {
  const archiveBytes = Buffer.from('expected retained archive')
  const fixture = await createDownloadFixture(archiveBytes)
  const transport = new ScriptedArchiveTransport([])

  try {
    await writeFile(
      fixture.layout.archive.path,
      Buffer.alloc(archiveBytes.byteLength, 0x78),
      { mode: 0o600 },
    )
    await assertRuntimeFailure(
      downloadVerifiedRuntimeArchive({
        admission: fixture.admission,
        layout: fixture.layout,
        mutationAuthority: fixture.mutationAuthority,
        signal: new AbortController().signal,
        transport,
      }),
      'runtime_recovery_required',
    )
    assert.equal(transport.requests.length, 0)
  } finally {
    await fixture.cleanup()
  }
})

test('a retained archive with an unknown hardlink alias fails before network', async () => {
  const archiveBytes = Buffer.from('foreign retained archive alias')
  const fixture = await createDownloadFixture(archiveBytes)
  const foreignAlias = path.join(
    fixture.layout.namespaces.archives,
    'foreign-alias',
  )
  const transport = new ScriptedArchiveTransport([])

  try {
    await writeFile(fixture.layout.archive.path, archiveBytes, {
      mode: 0o600,
    })
    await link(fixture.layout.archive.path, foreignAlias)
    await assertRuntimeFailure(
      downloadVerifiedRuntimeArchive({
        admission: fixture.admission,
        layout: fixture.layout,
        mutationAuthority: fixture.mutationAuthority,
        signal: new AbortController().signal,
        transport,
      }),
      'runtime_recovery_required',
    )
    assert.equal(transport.requests.length, 0)
    assert.deepEqual(await readFile(foreignAlias), archiveBytes)
  } finally {
    await fixture.cleanup()
  }
})

test('a valid archive pair with a third hardlink alias fails before network', async () => {
  const archiveBytes = Buffer.from('third archive alias')
  const fixture = await createDownloadFixture(archiveBytes)
  const foreignAlias = path.join(
    fixture.layout.namespaces.archives,
    'third-alias',
  )
  const transport = new ScriptedArchiveTransport([
    {
      statusCode: 200,
      headers: {
        'content-length': [String(archiveBytes.byteLength)],
        etag: ['"runtime-v1"'],
      },
      chunks: [archiveBytes],
    },
  ])

  try {
    await downloadVerifiedRuntimeArchive({
      admission: fixture.admission,
      layout: fixture.layout,
      mutationAuthority: fixture.mutationAuthority,
      signal: new AbortController().signal,
      transport,
    })
    await link(fixture.layout.archive.path, foreignAlias)
    const retainedTransport = new ScriptedArchiveTransport([])
    await assertRuntimeFailure(
      downloadVerifiedRuntimeArchive({
        admission: fixture.admission,
        layout: fixture.layout,
        mutationAuthority: fixture.mutationAuthority,
        signal: new AbortController().signal,
        transport: retainedTransport,
      }),
      'runtime_recovery_required',
    )
    assert.equal(retainedTransport.requests.length, 0)
    assert.equal((await lstat(foreignAlias)).nlink, 3)
  } finally {
    await fixture.cleanup()
  }
})

test('a competing final archive is never clobbered', async () => {
  const archiveBytes = Buffer.from('verified candidate archive')
  const competingBytes = Buffer.from('competing archive residue')
  const fixture = await createDownloadFixture(archiveBytes)
  const transport = new ScriptedArchiveTransport([
    {
      statusCode: 200,
      headers: {
        'content-length': [String(archiveBytes.byteLength)],
        etag: ['"runtime-v1"'],
      },
      chunks: [archiveBytes],
      afterChunks: async () => {
        await writeFile(
          fixture.layout.archive.path,
          competingBytes,
          { flag: 'wx', mode: 0o600 },
        )
      },
    },
  ])

  try {
    await assertRuntimeFailure(
      downloadVerifiedRuntimeArchive({
        admission: fixture.admission,
        layout: fixture.layout,
        mutationAuthority: fixture.mutationAuthority,
        signal: new AbortController().signal,
        transport,
      }),
      'runtime_recovery_required',
    )
    assert.deepEqual(
      await readFile(fixture.layout.archive.path),
      competingBytes,
    )
    assert.deepEqual(
      await readFile(fixture.layout.partial.archivePath),
      archiveBytes,
    )
    transport.assertExhausted()
  } finally {
    await fixture.cleanup()
  }
})

test('final-name replacement during readback cannot change the returned archive', async () => {
  const archiveBytes = Buffer.from('point in time archive binding')
  const decoyBytes = Buffer.alloc(archiveBytes.byteLength, 0x78)
  const fixture = await createDownloadFixture(archiveBytes)
  const preservedArchive = `${fixture.layout.archive.path}.preserved`
  const transport = new ScriptedArchiveTransport([
    {
      statusCode: 200,
      headers: {
        'content-length': [String(archiveBytes.byteLength)],
        etag: ['"runtime-v1"'],
      },
      chunks: [archiveBytes],
    },
  ])

  try {
    await assertRuntimeFailure(
      downloadVerifiedRuntimeArchive({
        admission: fixture.admission,
        layout: fixture.layout,
        mutationAuthority: fixture.mutationAuthority,
        signal: new AbortController().signal,
        testOptions: {
          beforeArchivePathReadback: async () => {
            await rename(
              fixture.layout.archive.path,
              preservedArchive,
            )
            await writeFile(
              fixture.layout.archive.path,
              decoyBytes,
              { flag: 'wx', mode: 0o600 },
            )
          },
        },
        transport,
      }),
      'runtime_recovery_required',
    )

    assert.deepEqual(
      await readFile(preservedArchive),
      archiveBytes,
    )
    assert.deepEqual(
      await readFile(fixture.layout.archive.path),
      decoyBytes,
    )
  } finally {
    await fixture.cleanup()
  }
})

test('partial root substitution cannot redirect a journal or publish a canonical archive', async () => {
  const archiveBytes = Buffer.from('anchored partial archive')
  const fixture = await createDownloadFixture(archiveBytes)
  const preservedRoot = `${fixture.layout.partial.root}.preserved`
  const canary = Buffer.from('same-owner canary')
  const transport = new ScriptedArchiveTransport([
    {
      statusCode: 200,
      headers: {
        'content-length': [String(archiveBytes.byteLength)],
        etag: ['"runtime-v1"'],
      },
      beforeChunks: async () => {
        await rename(fixture.layout.partial.root, preservedRoot)
        await mkdir(fixture.layout.partial.root, { mode: 0o700 })
        await writeFile(
          fixture.layout.partial.journalPath,
          canary,
          { mode: 0o600 },
        )
      },
      chunks: [archiveBytes],
    },
  ])

  try {
    await assertRuntimeFailure(
      downloadVerifiedRuntimeArchive({
        admission: fixture.admission,
        layout: fixture.layout,
        mutationAuthority: fixture.mutationAuthority,
        signal: new AbortController().signal,
        transport,
      }),
      'runtime_recovery_required',
    )
    assert.deepEqual(
      await readFile(fixture.layout.partial.journalPath),
      canary,
    )
    await assert.rejects(
      readFile(fixture.layout.archive.path),
      { code: 'ENOENT' },
    )
    assert.deepEqual(
      await readFile(path.join(preservedRoot, 'archive.part')),
      archiveBytes,
    )
  } finally {
    await fixture.cleanup()
  }
})

test('partial source substitution before link leaves the canonical archive absent', async () => {
  const archiveBytes = Buffer.from('bound partial source archive')
  const fixture = await createDownloadFixture(archiveBytes)
  const preservedPartial =
    `${fixture.layout.partial.archivePath}.preserved`
  const transport = new ScriptedArchiveTransport([
    {
      statusCode: 200,
      headers: {
        'content-length': [String(archiveBytes.byteLength)],
        etag: ['"runtime-v1"'],
      },
      chunks: [archiveBytes],
    },
  ])

  try {
    await assertRuntimeFailure(
      downloadVerifiedRuntimeArchive({
        admission: fixture.admission,
        layout: fixture.layout,
        mutationAuthority: fixture.mutationAuthority,
        signal: new AbortController().signal,
        testOptions: {
          beforeArchiveLink: async () => {
            await rename(
              fixture.layout.partial.archivePath,
              preservedPartial,
            )
            await writeFile(
              fixture.layout.partial.archivePath,
              archiveBytes,
              { flag: 'wx', mode: 0o600 },
            )
          },
        },
        transport,
      }),
      'runtime_recovery_required',
    )
    await assert.rejects(
      readFile(fixture.layout.archive.path),
      { code: 'ENOENT' },
    )
    assert.deepEqual(await readFile(preservedPartial), archiveBytes)
    assert.deepEqual(
      await readFile(fixture.layout.partial.archivePath),
      archiveBytes,
    )
  } finally {
    await fixture.cleanup()
  }
})

test('journal schema drift and unknown partial residue fail before network', async (t) => {
  await t.test('journal schema drift', async () => {
    const archiveBytes = Buffer.from('journal drift archive')
    const fixture = await createDownloadFixture(archiveBytes)
    const seed = new ScriptedArchiveTransport([
      {
        statusCode: 200,
        headers: {
          'content-length': [String(archiveBytes.byteLength)],
          etag: ['"runtime-v1"'],
        },
        chunks: [archiveBytes.subarray(0, 5)],
        bodyError: new ArchiveTransportNetworkError(false),
      },
    ])

    try {
      await assertRuntimeFailure(
        downloadVerifiedRuntimeArchive({
          admission: fixture.admission,
          layout: fixture.layout,
          mutationAuthority: fixture.mutationAuthority,
          signal: new AbortController().signal,
          transport: seed,
        }),
        'runtime_network_unavailable',
      )
      const journal = JSON.parse(
        await readFile(fixture.layout.partial.journalPath, 'utf8'),
      ) as Record<string, unknown>
      await writeFile(
        fixture.layout.partial.journalPath,
        `${JSON.stringify({ ...journal, unexpected: true })}\n`,
      )
      const transport = new ScriptedArchiveTransport([])
      await assertRuntimeFailure(
        downloadVerifiedRuntimeArchive({
          admission: fixture.admission,
          layout: fixture.layout,
          mutationAuthority: fixture.mutationAuthority,
          signal: new AbortController().signal,
          transport,
        }),
        'runtime_recovery_required',
      )
      assert.equal(transport.requests.length, 0)
    } finally {
      await fixture.cleanup()
    }
  })

  await t.test('unknown residue', async () => {
    const archiveBytes = Buffer.from('unknown residue archive')
    const fixture = await createDownloadFixture(archiveBytes)
    const transport = new ScriptedArchiveTransport([])

    try {
      await mkdir(fixture.layout.partial.root, { mode: 0o700 })
      await writeFile(
        path.join(fixture.layout.partial.root, 'unknown'),
        'preserve me',
        { mode: 0o600 },
      )
      await assertRuntimeFailure(
        downloadVerifiedRuntimeArchive({
          admission: fixture.admission,
          layout: fixture.layout,
          mutationAuthority: fixture.mutationAuthority,
          signal: new AbortController().signal,
          transport,
        }),
        'runtime_recovery_required',
      )
      assert.equal(transport.requests.length, 0)
      assert.equal(
        await readFile(
          path.join(fixture.layout.partial.root, 'unknown'),
          'utf8',
        ),
        'preserve me',
      )
    } finally {
      await fixture.cleanup()
    }
  })
})

test('journal descriptor and written-byte drift fail before network', async (t) => {
  const cases: readonly {
    readonly name: string
    mutate(
      journal: Record<string, unknown>,
      prefixBytes: number,
    ): void
  }[] = [
    {
      name: 'descriptor identity',
      mutate: (journal) => {
        const descriptor = journal.descriptor as Record<
          string,
          unknown
        >
        descriptor.releaseId = 'different-release'
      },
    },
    {
      name: 'written bytes versus file size',
      mutate: (journal, prefixBytes) => {
        journal.writtenBytes = prefixBytes + 1
      },
    },
  ]

  for (const testCase of cases) {
    await t.test(testCase.name, async () => {
      const archiveBytes = Buffer.from(
        `journal drift ${testCase.name}`,
      )
      const prefixBytes = archiveBytes.subarray(0, 5)
      const fixture = await createDownloadFixture(archiveBytes)
      try {
        await seedStrongPartial(fixture, archiveBytes, prefixBytes)
        const journal = JSON.parse(
          await readFile(
            fixture.layout.partial.journalPath,
            'utf8',
          ),
        ) as Record<string, unknown>
        testCase.mutate(journal, prefixBytes.byteLength)
        await writeFile(
          fixture.layout.partial.journalPath,
          `${JSON.stringify(journal)}\n`,
        )
        const transport = new ScriptedArchiveTransport([])

        await assertRuntimeFailure(
          downloadVerifiedRuntimeArchive({
            admission: fixture.admission,
            layout: fixture.layout,
            mutationAuthority: fixture.mutationAuthority,
            signal: new AbortController().signal,
            transport,
          }),
          'runtime_recovery_required',
        )
        assert.equal(transport.requests.length, 0)
      } finally {
        await fixture.cleanup()
      }
    })
  }
})

test('journal binds a digest of the full canonical descriptor', async () => {
  const archiveBytes = Buffer.from('full descriptor journal binding')
  const prefixBytes = archiveBytes.subarray(0, 8)
  const fixture = await createDownloadFixture(archiveBytes)
  await seedStrongPartial(fixture, archiveBytes, prefixBytes)
  const alternateRepository =
    'https://github.com/ay-ple/alternate-runtime'
  const changedAdmission: RuntimeReleaseAdmission = {
    ...fixture.admission,
    descriptor: {
      ...fixture.admission.descriptor,
      distribution: {
        ...fixture.admission.descriptor.distribution,
        repository: alternateRepository,
      },
      archive: {
        ...fixture.admission.descriptor.archive,
        url:
          `${alternateRepository}/releases/download/` +
          `${fixture.admission.descriptor.distribution.runtimeAssetReleaseTag}/` +
          fixture.admission.descriptor.archive.assetName,
      },
    },
  }
  const transport = new ScriptedArchiveTransport([])

  try {
    await assertRuntimeFailure(
      downloadVerifiedRuntimeArchive({
        admission: changedAdmission,
        layout: fixture.layout,
        mutationAuthority: fixture.mutationAuthority,
        signal: new AbortController().signal,
        transport,
      }),
      'runtime_recovery_required',
    )
    assert.equal(transport.requests.length, 0)
  } finally {
    await fixture.cleanup()
  }
})

test('exact asset unavailability never falls back to another response', async () => {
  const archiveBytes = Buffer.from('no fallback archive')
  const fixture = await createDownloadFixture(archiveBytes)
  const transport = new ScriptedArchiveTransport([
    { statusCode: 404 },
    {
      statusCode: 200,
      chunks: [archiveBytes],
    },
  ])

  try {
    await assertRuntimeFailure(
      downloadVerifiedRuntimeArchive({
        admission: fixture.admission,
        layout: fixture.layout,
        mutationAuthority: fixture.mutationAuthority,
        signal: new AbortController().signal,
        transport,
      }),
      'runtime_release_unavailable',
    )
    assert.deepEqual(
      transport.requests.map(({ url }) => url),
      [fixture.admission.descriptor.archive.url],
    )
    assert.equal(transport.remainingResponses(), 1)
  } finally {
    await fixture.cleanup()
  }
})

async function seedStrongPartial(
  fixture: DownloadFixture,
  archiveBytes: Uint8Array,
  prefixBytes: Uint8Array,
): Promise<void> {
  const transport = new ScriptedArchiveTransport([
    {
      statusCode: 200,
      headers: {
        'content-length': [String(archiveBytes.byteLength)],
        etag: ['"runtime-v1"'],
      },
      chunks: [prefixBytes],
      bodyError: new ArchiveTransportNetworkError(false),
    },
  ])
  await assertRuntimeFailure(
    downloadVerifiedRuntimeArchive({
      admission: fixture.admission,
      layout: fixture.layout,
      mutationAuthority: fixture.mutationAuthority,
      signal: new AbortController().signal,
      transport,
    }),
    'runtime_network_unavailable',
  )
}

function sha256(value: Uint8Array): string {
  return createHash('sha256').update(value).digest('hex')
}

async function assertRuntimeFailure(
  promise: Promise<unknown>,
  code: RuntimeReleaseAuthorityError['failure']['code'],
): Promise<void> {
  await assert.rejects(promise, (error: unknown) => {
    assert.equal(error instanceof RuntimeReleaseAuthorityError, true)
    assert.equal(
      (error as RuntimeReleaseAuthorityError).failure.code,
      code,
    )
    return true
  })
}
