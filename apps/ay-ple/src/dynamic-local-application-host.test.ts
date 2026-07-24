import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { request } from 'node:http'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import type { VerifiedRuntime } from '@ay-ple/runtime-release'
import {
  ServerStartupCleanupError,
  createServerApplication,
  type BoundServerApplicationListener,
  type ServerApplication,
} from '@ay-ple/server'

import type {
  ApplicationStartupAdmission,
  PreparedApplicationStartup,
} from './application-startup.js'
import {
  startDynamicLocalApplicationHost,
  startDynamicLocalApplicationHostForTesting,
} from './dynamic-local-application-host.js'
import type { DynamicLocalOrigin } from './host-contract.js'

const indexHtml = '<!doctype html><title>AY-PLE test shell</title>'
const hashedAssetPath = 'assets/index-AbCdEf12.js'
const hashedAssetBody = 'globalThis.__AY_PLE_TEST__ = true'

test('one dynamic listener stays 503 until it serves same-origin API, static assets, and SPA navigation', async () => {
  const application = await createServerApplication()
  const composition = deferred<void>()
  const originObserved = deferred<DynamicLocalOrigin>()
  const startup = startDynamicLocalApplicationHost({
    prepared: preparedApplication(async (origin) => {
      originObserved.resolve(origin)
      await composition.promise
      return application
    }),
    signal: new AbortController().signal,
  })
  const origin = await originObserved.promise
  let host:
    | Awaited<ReturnType<typeof startDynamicLocalApplicationHost>>
    | undefined

  try {
    const starting = await fetch(`${origin}/`)
    assert.equal(starting.status, 503)
    assert.equal(starting.headers.get('cache-control'), 'no-store')
    assert.equal(starting.headers.get('retry-after'), '1')
    assert.equal(await starting.text(), 'AY-PLE is starting.\n')

    composition.resolve()
    host = await startup
    assert.equal(host.origin, origin)
    assert.equal(origin, `http://127.0.0.1:${host.port}`)

    const index = await fetch(`${origin}/`)
    assert.equal(index.status, 200)
    assert.equal(
      index.headers.get('content-type'),
      'text/html; charset=utf-8',
    )
    assert.equal(index.headers.get('cache-control'), 'no-store')
    assert.equal(await index.text(), indexHtml)

    const asset = await fetch(`${origin}/${hashedAssetPath}?v=ignored`)
    assert.equal(asset.status, 200)
    assert.equal(
      asset.headers.get('cache-control'),
      'public, max-age=31536000, immutable',
    )
    assert.equal(await asset.text(), hashedAssetBody)

    const navigation = await fetch(`${origin}/semester/setup`)
    assert.equal(navigation.status, 200)
    assert.equal(await navigation.text(), indexHtml)

    const api = await fetch(`${origin}/api/product/bootstrap`)
    assert.equal(api.status, 200)
    assert.match(
      api.headers.get('content-type') ?? '',
      /^application\/json/u,
    )
    assert.equal(
      (await api.json() as { operationStatus?: unknown })
        .operationStatus,
      'idle',
    )
  } finally {
    composition.resolve()
    if (host) {
      await host.close({
        signal: new AbortController().signal,
      })
    } else {
      await startup
        .then((started) =>
          started.close({
            signal: new AbortController().signal,
          }),
        )
        .catch(() => application.close())
    }
  }
})

test('API and static namespaces fail closed without SPA fallback', async () => {
  const host = await startDynamicLocalApplicationHost({
    prepared: preparedApplication(async (origin) =>
      createServerApplication({
        codexChat: {
          origin,
          sourceCommit: 'host-route-test',
          runtimeVersion: 'host-route-test',
          createRuntime: async () => {
            throw new Error('Runtime must not start in this test')
          },
        },
      }),
    ),
    signal: new AbortController().signal,
  })

  try {
    for (const pathname of [
      '/api',
      '/api/unsupported',
      '/api/codex-chat/status',
      '/api/runtime/status',
      '/api%2Funsupported',
      '/assets/missing.js',
      '/manifest.json',
    ]) {
      const response = await fetch(`${host.origin}${pathname}`)
      assert.equal(response.status, 404, pathname)
      assert.notEqual(await response.text(), indexHtml, pathname)
    }

    const method = await fetch(`${host.origin}/semester/setup`, {
      method: 'POST',
    })
    assert.equal(method.status, 405)
    assert.equal(method.headers.get('allow'), 'GET, HEAD')
    assert.notEqual(await method.text(), indexHtml)

    const wrongOrigin = await fetch(
      `${host.origin}/api/product/workspaces/activate`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: 'http://127.0.0.1:1',
        },
        body: '{}',
      },
    )
    assert.equal(wrongOrigin.status, 403)
    const exactOrigin = await fetch(
      `${host.origin}/api/product/workspaces/activate`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: host.origin,
        },
        body: '{}',
      },
    )
    assert.equal(exactOrigin.status, 503)
  } finally {
    await host.close({
      signal: new AbortController().signal,
    })
  }
})

test('static HEAD and non-hashed resources preserve bytes and cache policy', async () => {
  const application = await createServerApplication()
  const host = await startDynamicLocalApplicationHost({
    prepared: preparedApplication(async () => application),
    signal: new AbortController().signal,
  })

  try {
    const head = await fetch(`${host.origin}/${hashedAssetPath}`, {
      method: 'HEAD',
    })
    assert.equal(head.status, 200)
    assert.equal(
      head.headers.get('content-length'),
      String(Buffer.byteLength(hashedAssetBody)),
    )
    assert.equal(await head.text(), '')

    const icon = await fetch(`${host.origin}/favicon.svg`)
    assert.equal(icon.status, 200)
    assert.equal(icon.headers.get('content-type'), 'image/svg+xml')
    assert.equal(
      icon.headers.get('cache-control'),
      'public, max-age=0, must-revalidate',
    )
  } finally {
    await host.close({
      signal: new AbortController().signal,
    })
  }
})

test('unexpected Host authority is rejected before API or SPA routing', async () => {
  const application = await createServerApplication()
  const host = await startDynamicLocalApplicationHost({
    prepared: preparedApplication(async () => application),
    signal: new AbortController().signal,
  })

  try {
    for (const pathname of ['/', '/api/product/bootstrap']) {
      const response = await rawRequest({
        hostHeader: `localhost:${host.port}`,
        pathname,
        port: host.port,
      })
      assert.equal(response.statusCode, 421)
      assert.equal(response.body, 'Invalid request.\n')
    }
  } finally {
    await host.close({
      signal: new AbortController().signal,
    })
  }
})

test('raw API-like traversal and ambiguous origin-form targets never become SPA HTML', async () => {
  const application = await createServerApplication()
  const host = await startDynamicLocalApplicationHost({
    prepared: preparedApplication(async () => application),
    signal: new AbortController().signal,
  })

  try {
    for (const pathname of [
      '/api/../semester/setup',
      '/api/%2e%2e/semester/setup',
      '/api\\..\\semester/setup',
      '/%2Fapi/product/bootstrap',
      '//api/product/bootstrap',
      '/api/%zz',
    ]) {
      const response = await rawRequest({
        hostHeader: `127.0.0.1:${host.port}`,
        pathname,
        port: host.port,
      })
      assert.equal(response.statusCode, 400, pathname)
      assert.notEqual(response.body, indexHtml, pathname)
    }
  } finally {
    await host.close({
      signal: new AbortController().signal,
    })
  }
})

test('listener binding ignores cwd, PORT, and ambient static files', async () => {
  const originalCwd = process.cwd()
  const originalPort = process.env.PORT
  const hostileCwd = await mkdtemp(
    path.join(os.tmpdir(), 'ay-ple-hostile-cwd-'),
  )
  await writeFile(
    path.join(hostileCwd, 'index.html'),
    'hostile ambient index',
  )
  await writeFile(path.join(hostileCwd, '.env'), 'PORT=1\n')
  process.env.PORT = '1'
  process.chdir(hostileCwd)
  const application = await createServerApplication()
  const host = await startDynamicLocalApplicationHost({
    prepared: preparedApplication(async () => application),
    signal: new AbortController().signal,
  })

  try {
    assert.notEqual(host.port, 1)
    assert.equal((await fetch(`${host.origin}/`)).status, 200)
    assert.equal(
      await (await fetch(`${host.origin}/`)).text(),
      indexHtml,
    )
  } finally {
    process.chdir(originalCwd)
    if (originalPort === undefined) {
      delete process.env.PORT
    } else {
      process.env.PORT = originalPort
    }
    await host.close({
      signal: new AbortController().signal,
    })
    await rm(hostileCwd, { recursive: true })
  }
})

test('listener refusal happens before Server composition', async () => {
  const refusal = Object.assign(new Error('occupied'), {
    code: 'EADDRINUSE',
  })
  let compositionCount = 0

  await assert.rejects(
    startDynamicLocalApplicationHostForTesting(
      {
        prepared: preparedApplication(async () => {
          compositionCount += 1
          return createServerApplication()
        }),
        signal: new AbortController().signal,
      },
      {
        bindServerApplicationListener: async () => {
          throw refusal
        },
      },
    ),
    (error) => error === refusal,
  )
  assert.equal(compositionCount, 0)
})

test('composition failure closes the already-bound listener and preserves the error', async () => {
  const failure = new Error('composition failed')
  const originObserved = deferred<DynamicLocalOrigin>()

  await assert.rejects(
    startDynamicLocalApplicationHost({
      prepared: preparedApplication(async (origin) => {
        originObserved.resolve(origin)
        throw failure
      }),
      signal: new AbortController().signal,
    }),
    (error) => error === failure,
  )

  const origin = await originObserved.promise
  await assert.rejects(fetch(origin))
})

test('a Server cleanup failure remains retryable after the unattached listener closes', async () => {
  let cleanupCount = 0
  const cleanupError = new ServerStartupCleanupError(async () => {
    cleanupCount += 1
    return { status: 'closed', processTreeGone: true }
  })

  let exposed: unknown
  try {
    await startDynamicLocalApplicationHost({
      prepared: preparedApplication(async () => {
        throw cleanupError
      }),
      signal: new AbortController().signal,
    })
  } catch (error) {
    exposed = error
  }
  assert.equal(exposed, cleanupError)
  assert.deepEqual(
    await cleanupError.close({
      signal: new AbortController().signal,
    }),
    { status: 'closed', processTreeGone: true },
  )
  assert.equal(cleanupCount, 1)
})

test('post-composition cancellation attaches first and closes through caller signal authority', async () => {
  const application = await createServerApplication()
  const cancellation = new Error('cancelled after composition')
  const controller = new AbortController()
  const order: string[] = []
  let publicCloseCount = 0
  const originalClose = application.close.bind(application)
  application.close = async () => {
    publicCloseCount += 1
    return originalClose()
  }
  let observedCloseSignal: AbortSignal | undefined
  const bound = fakeBoundListener({
    application,
    onAttach() {
      order.push('attach')
    },
    onClose(signal) {
      order.push('close')
      observedCloseSignal = signal
      return { status: 'closed', processTreeGone: true }
    },
  })

  try {
    await assert.rejects(
      startDynamicLocalApplicationHostForTesting(
        {
          prepared: preparedApplication(async () => {
            order.push('compose')
            controller.abort(cancellation)
            return application
          }),
          signal: controller.signal,
        },
        {
          bindServerApplicationListener: async () => bound,
        },
      ),
      (error) => error === cancellation,
    )
    assert.deepEqual(order, ['compose', 'attach', 'close'])
    assert.equal(observedCloseSignal, controller.signal)
    assert.equal(observedCloseSignal?.aborted, true)
    assert.equal(publicCloseCount, 0)
  } finally {
    await originalClose()
  }
})

test('ambiguous attached cancellation exposes the same cleanup for a fresh-signal retry', async () => {
  const application = await createServerApplication()
  const controller = new AbortController()
  const cancellation = new Error('cancelled after composition')
  const closeSignals: AbortSignal[] = []
  const bound = fakeBoundListener({
    application,
    onClose(signal) {
      closeSignals.push(signal)
      return closeSignals.length === 1
        ? { status: 'ambiguous', processTreeGone: false }
        : { status: 'closed', processTreeGone: true }
    },
  })

  let exposed: unknown
  try {
    await startDynamicLocalApplicationHostForTesting(
      {
        prepared: preparedApplication(async () => {
          controller.abort(cancellation)
          return application
        }),
        signal: controller.signal,
      },
      {
        bindServerApplicationListener: async () => bound,
      },
    )
  } catch (error) {
    exposed = error
  }

  try {
    assert.ok(exposed instanceof ServerStartupCleanupError)
    const retrySignal = new AbortController().signal
    assert.deepEqual(
      await exposed.close({ signal: retrySignal }),
      { status: 'closed', processTreeGone: true },
    )
    assert.deepEqual(closeSignals, [controller.signal, retrySignal])
  } finally {
    await application.close()
  }
})

test('a missing verified index fails before listener bind or composition', async () => {
  let bindCount = 0
  let compositionCount = 0

  await assert.rejects(
    startDynamicLocalApplicationHostForTesting(
      {
        prepared: preparedApplication(
          async () => {
            compositionCount += 1
            return createServerApplication()
          },
          staticSite({ omitIndex: true }),
        ),
        signal: new AbortController().signal,
      },
      {
        bindServerApplicationListener: async () => {
          bindCount += 1
          throw new Error('must not bind')
        },
      },
    ),
    /verified static site is incomplete/u,
  )
  assert.equal(bindCount, 0)
  assert.equal(compositionCount, 0)
})

function preparedApplication(
  createServerAtOrigin: (
    origin: DynamicLocalOrigin,
  ) => Promise<ServerApplication>,
  verifiedStaticSite: ApplicationStartupAdmission['staticSite'] =
    staticSite(),
): PreparedApplicationStartup {
  return {
    runtime: {} as VerifiedRuntime,
    staticSite: verifiedStaticSite,
    createServerAtOrigin,
  }
}

function staticSite(
  options: { readonly omitIndex?: boolean } = {},
): ApplicationStartupAdmission['staticSite'] {
  const entries = new Map<string, Uint8Array>([
    [hashedAssetPath, Buffer.from(hashedAssetBody)],
    ['favicon.svg', Buffer.from('<svg></svg>')],
  ])
  if (!options.omitIndex) {
    entries.set('index.html', Buffer.from(indexHtml))
  }
  return {
    entryPaths: Object.freeze([...entries.keys()]),
    completeTreeSha256: 'a'.repeat(64),
    has(relativePath) {
      return entries.has(relativePath)
    },
    read(relativePath) {
      const bytes = entries.get(relativePath)
      return bytes ? Uint8Array.from(bytes) : null
    },
  }
}

function deferred<T>(): {
  readonly promise: Promise<T>
  resolve(value: T): void
} {
  let resolvePromise: ((value: T) => void) | undefined
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve
  })
  return {
    promise,
    resolve(value) {
      resolvePromise?.(value)
    },
  }
}

function rawRequest(input: {
  readonly hostHeader: string
  readonly pathname: string
  readonly port: number
}): Promise<{
  readonly body: string
  readonly statusCode: number | undefined
}> {
  return new Promise((resolve, reject) => {
    const outgoing = request(
      {
        host: '127.0.0.1',
        port: input.port,
        path: input.pathname,
        headers: {
          host: input.hostHeader,
        },
      },
      (response) => {
        const chunks: Buffer[] = []
        response.on('data', (chunk: Buffer) => chunks.push(chunk))
        response.on('end', () => {
          resolve({
            body: Buffer.concat(chunks).toString('utf8'),
            statusCode: response.statusCode,
          })
        })
      },
    )
    outgoing.once('error', reject)
    outgoing.end()
  })
}

function fakeBoundListener(input: {
  readonly application: ServerApplication
  readonly onAttach?: () => void
  readonly onClose: (
    signal: AbortSignal,
  ) =>
    | { readonly status: 'closed'; readonly processTreeGone: true }
    | {
        readonly status: 'ambiguous'
        readonly processTreeGone: false
      }
}): BoundServerApplicationListener {
  return {
    port: 43_123,
    attach(application) {
      assert.equal(application, input.application)
      input.onAttach?.()
      return {
        application,
        port: 43_123,
        close: async ({ signal }) => input.onClose(signal),
      }
    },
    close: async ({ signal }) => input.onClose(signal),
  }
}
