import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import type { RequestListener } from 'node:http'
import {
  createConnection,
  createServer as createNetServer,
} from 'node:net'
import path from 'node:path'
import test from 'node:test'

import { DeterministicCodexProductRuntime } from '@ay-ple/codex-chat-runtime/testing'

import {
  materializeE2eSemesterWorkspace,
} from '../../../scripts/semester-workspace-materializer.mjs'
import { createServerApplication } from './server-application.js'
import {
  bindServerApplicationListener,
  listenToServerApplication,
} from './server-listener.js'
import { configuredBootstrap } from './testing/codex-chat-test-support.js'

test('the TCP listener composes around the host application and refuses intake after close', async () => {
  const application = await createServerApplication()
  const started = await listenToServerApplication(application, {
    host: '127.0.0.1',
    port: 0,
  })
  const baseUrl = `http://127.0.0.1:${started.port}`

  try {
    const response = await fetch(`${baseUrl}/api/product/bootstrap`)
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), {
      accountReadiness: {
        state: 'unavailable',
        displayMessage:
          'Codex 상태를 확인할 수 없습니다. 자료 작업공간은 계속 사용할 수 있습니다.',
      },
      operationStatus: 'idle',
      workspace: null,
      history: {
        assignments: [],
        statePatches: [],
        userConfirmations: [],
        modelingRuns: [],
      },
    })

    const firstClose = started.application.close()
    const secondClose = started.application.close()
    assert.equal(secondClose, firstClose)
    await firstClose
    await assert.rejects(fetch(`${baseUrl}/api/product/bootstrap`))
  } finally {
    await started.application.close()
  }
})

test('a pre-bound listener serves a bootstrap delegate before attaching one application', async () => {
  let requestHandler: RequestListener = (_request, response) => {
    response.statusCode = 503
    response.setHeader('content-type', 'text/plain; charset=utf-8')
    response.end('starting')
  }
  const listener = await bindServerApplicationListener({
    host: '127.0.0.1',
    port: 0,
    requestHandler: (request, response) =>
      requestHandler(request, response),
  })
  const baseUrl = `http://127.0.0.1:${listener.port}`
  const application = await createServerApplication()

  try {
    const starting = await fetch(`${baseUrl}/`)
    assert.equal(starting.status, 503)
    assert.equal(await starting.text(), 'starting')

    const attached = listener.attach(application)
    requestHandler = application.app
    assert.equal(attached.application, application)
    assert.equal(attached.port, listener.port)
    assert.throws(
      () => listener.attach(application),
      /already attached/u,
    )

    const ready = await fetch(`${baseUrl}/api/product/bootstrap`)
    assert.equal(ready.status, 200)

    const closeSignal = new AbortController().signal
    assert.deepEqual(
      await attached.close({ signal: closeSignal }),
      { status: 'closed', processTreeGone: true },
    )
    await assert.rejects(fetch(`${baseUrl}/api/product/bootstrap`))
  } finally {
    await listener.close({
      signal: new AbortController().signal,
    })
    await application.close()
  }
})

test('a pre-bound listener can close before application attachment and rejects late attach', async () => {
  const listener = await bindServerApplicationListener({
    host: '127.0.0.1',
    port: 0,
    requestHandler: (_request, response) => {
      response.statusCode = 503
      response.end()
    },
  })
  const application = await createServerApplication()
  const baseUrl = `http://127.0.0.1:${listener.port}`

  try {
    assert.equal((await fetch(baseUrl)).status, 503)
    const firstClose = listener.close({
      signal: new AbortController().signal,
    })
    assert.throws(
      () => listener.attach(application),
      /listener is closing/u,
    )
    const secondClose = listener.close({
      signal: new AbortController().signal,
    })
    assert.equal(secondClose, firstClose)
    assert.deepEqual(
      await firstClose,
      { status: 'closed', processTreeGone: true },
    )
    await assert.rejects(fetch(baseUrl))
  } finally {
    await listener.close({
      signal: new AbortController().signal,
    })
    await application.close()
  }
})

test('pre-attachment close force-closes an incomplete local connection', async () => {
  const listener = await bindServerApplicationListener({
    host: '127.0.0.1',
    port: 0,
    requestHandler: (_request, response) => {
      response.statusCode = 503
      response.end()
    },
  })
  const socket = createConnection({
    host: '127.0.0.1',
    port: listener.port,
  })
  await new Promise<void>((resolve, reject) => {
    socket.once('connect', resolve)
    socket.once('error', reject)
  })

  try {
    const result = await settleWithin(
      listener.close({
        signal: new AbortController().signal,
      }),
      250,
    )
    assert.deepEqual(
      result,
      { status: 'closed', processTreeGone: true },
    )
  } finally {
    socket.destroy()
    await listener.close({
      signal: new AbortController().signal,
    })
  }
})

test('a pre-bound listener preserves bind refusal without attaching an application', async () => {
  const blocker = createNetServer()
  await new Promise<void>((resolve, reject) => {
    blocker.once('error', reject)
    blocker.listen(0, '127.0.0.1', resolve)
  })
  const address = blocker.address()
  assert.ok(address && typeof address === 'object')

  try {
    await assert.rejects(
      bindServerApplicationListener({
        host: '127.0.0.1',
        port: address.port,
        requestHandler: (_request, response) => {
          response.statusCode = 503
          response.end()
        },
      }),
      (error) => {
        assert.ok(error instanceof Error)
        assert.equal(
          (error as NodeJS.ErrnoException).code,
          'EADDRINUSE',
        )
        return true
      },
    )
  } finally {
    await new Promise<void>((resolve, reject) => {
      blocker.close((error) => error ? reject(error) : resolve())
    })
  }
})

test('a pre-bound listener cannot steal an application claimed by another listener', async () => {
  const application = await createServerApplication()
  const existing = await listenToServerApplication(application, {
    host: '127.0.0.1',
    port: 0,
  })
  const pending = await bindServerApplicationListener({
    host: '127.0.0.1',
    port: 0,
    requestHandler: (_request, response) => {
      response.statusCode = 503
      response.end()
    },
  })

  try {
    assert.throws(
      () => pending.attach(application),
      /listener lifecycle is already claimed/u,
    )
    assert.equal(
      (
        await fetch(
          `http://127.0.0.1:${existing.port}/api/product/bootstrap`,
        )
      ).status,
      200,
    )
    assert.equal(
      (await fetch(`http://127.0.0.1:${pending.port}/`)).status,
      503,
    )
  } finally {
    await pending.close({
      signal: new AbortController().signal,
    })
    await existing.application.close()
  }
})

test('one Server application can claim only one listener lifecycle', async () => {
  const application = await createServerApplication()
  const started = await listenToServerApplication(application, {
    host: '127.0.0.1',
    port: 0,
  })

  try {
    await assert.rejects(
      listenToServerApplication(application, {
        host: '127.0.0.1',
        port: 0,
      }),
      /listener lifecycle is already claimed/u,
    )
    assert.equal(
      (
        await fetch(
          `http://127.0.0.1:${started.port}/api/product/bootstrap`,
        )
      ).status,
      200,
    )
  } finally {
    await started.application.close()
  }
})

test('a closing Server application rejects its first listener claim', async () => {
  const application = await createServerApplication()
  const closing = application.close()

  await assert.rejects(
    listenToServerApplication(application, {
      host: '127.0.0.1',
      port: 0,
    }),
    /Server application is closing/u,
  )
  await closing
})

test('listener refusal preserves the bind failure after complete application cleanup', async () => {
  const blocker = createNetServer()
  await new Promise<void>((resolve, reject) => {
    blocker.once('error', reject)
    blocker.listen(0, '127.0.0.1', resolve)
  })
  const address = blocker.address()
  assert.ok(address && typeof address === 'object')
  const application = await createServerApplication()

  try {
    await assert.rejects(
      listenToServerApplication(application, {
        host: '127.0.0.1',
        port: address.port,
      }),
      (error) => {
        assert.ok(error instanceof Error)
        assert.equal(
          (error as NodeJS.ErrnoException).code,
          'EADDRINUSE',
        )
        return true
      },
    )
  } finally {
    await application.close()
    await new Promise<void>((resolve, reject) => {
      blocker.close((error) => error ? reject(error) : resolve())
    })
  }
})

test('application close refuses listener intake before Runtime close completes', async () => {
  const materialized = await materializeE2eSemesterWorkspace()
  const runtime = new DeferredCloseRuntime({
    accountReadiness: [{ state: 'ready' }],
  })
  const packageRoot = path.join(materialized.runRoot, 'package')
  const appDataRoot = path.join(materialized.runRoot, 'app-data')
  await Promise.all([packageRoot, appDataRoot].map((root) => mkdir(root)))
  const application = await createServerApplication({
    codexChat: configuredBootstrap(runtime),
    semesterWorkspace: {
      appDataRoot,
      packageRoot,
      chooseDirectory: async () => materialized.workspaceRoot,
    },
  })
  const activation = await application.semesterWorkspace?.activate()
  assert.equal(activation?.status, 'activated')
  const started = await listenToServerApplication(application, {
    host: '127.0.0.1',
    port: 0,
  })
  const baseUrl = `http://127.0.0.1:${started.port}`

  try {
    assert.equal((await fetch(`${baseUrl}/api/product/bootstrap`)).status, 200)

    const closing = application.close()
    await runtime.closeStarted
    await assert.rejects(fetch(`${baseUrl}/api/product/bootstrap`))
    assert.equal(await settlesBeforeImmediate(closing), false)

    runtime.releaseClose()
    await closing
  } finally {
    runtime.releaseClose()
    try {
      await started.application.close()
    } finally {
      await materialized.cleanup()
    }
  }
})

class DeferredCloseRuntime extends DeterministicCodexProductRuntime {
  private readonly closeStartedDeferred = deferred<void>()
  private readonly closeReleased = deferred<void>()

  get closeStarted(): Promise<void> {
    return this.closeStartedDeferred.promise
  }

  releaseClose(): void {
    this.closeReleased.resolve()
  }

  override async close(): Promise<void> {
    this.closeStartedDeferred.resolve()
    await this.closeReleased.promise
    await super.close()
  }
}

function deferred<T>(): {
  readonly promise: Promise<T>
  resolve(value?: T): void
} {
  let resolve!: (value?: T) => void
  const promise = new Promise<T>((settle) => {
    resolve = (value) => settle(value as T)
  })
  return { promise, resolve }
}

function settlesBeforeImmediate(promise: Promise<void>): Promise<boolean> {
  return Promise.race([
    promise.then(
      () => true,
      () => true,
    ),
    new Promise<false>((resolve) => setImmediate(() => resolve(false))),
  ])
}

function settleWithin<T>(
  promise: Promise<T>,
  milliseconds: number,
): Promise<T | 'timeout'> {
  return new Promise<T | 'timeout'>((resolve, reject) => {
    const timeout = setTimeout(() => resolve('timeout'), milliseconds)
    promise.then(
      (value) => {
        clearTimeout(timeout)
        resolve(value)
      },
      (error: unknown) => {
        clearTimeout(timeout)
        reject(error)
      },
    )
  })
}
