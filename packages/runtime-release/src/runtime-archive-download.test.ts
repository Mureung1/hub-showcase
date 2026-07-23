import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import {
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

import {
  downloadVerifiedRuntimeArchive,
} from './runtime-archive-download.js'
import type {
  ArchiveTransport,
  ArchiveTransportRequest,
  ArchiveTransportResponse,
} from './runtime-archive-transport.js'
import {
  archiveTransportRequestHeaders,
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

type ScriptedResponse = {
  readonly statusCode: number
  readonly headers?: ArchiveTransportResponse['headers']
  readonly chunks?: readonly Uint8Array[]
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
    try {
      return await consume({
        statusCode: scripted!.statusCode,
        headers: scripted!.headers ?? {},
        body: (async function* () {
          for (const chunk of scripted!.chunks ?? []) yield chunk
        })(),
      })
    } finally {
      this.closedResponses += 1
    }
  }

  assertExhausted(): void {
    assert.equal(this.#responses.length, 0)
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

test('fresh 200 retains only the exact verified archive', async () => {
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
    await assert.rejects(readFile(fixture.layout.partial.journalPath), {
      code: 'ENOENT',
    })
    await assert.rejects(readFile(fixture.layout.partial.archivePath), {
      code: 'ENOENT',
    })
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
  } finally {
    await fixture.cleanup()
  }
})

function sha256(value: Uint8Array): string {
  return createHash('sha256').update(value).digest('hex')
}
