import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { createServer as createNetServer } from 'node:net'
import path from 'node:path'
import test from 'node:test'

import { DeterministicCodexProductRuntime } from '@ay-ple/codex-chat-runtime/testing'

import {
  materializeE2eSemesterWorkspace,
} from '../../../scripts/semester-workspace-materializer.mjs'
import { createServerApplication } from './server-application.js'
import {
  ServerListenerStartError,
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

test('listener refusal surfaces a stable failure when application cleanup rejects', async () => {
  const blocker = createNetServer()
  await new Promise<void>((resolve, reject) => {
    blocker.once('error', reject)
    blocker.listen(0, '127.0.0.1', resolve)
  })
  const address = blocker.address()
  assert.ok(address && typeof address === 'object')
  const application = await createServerApplication()
  const closeApplication = application.close.bind(application)
  Object.defineProperty(application, 'close', {
    value: async () => {
      await closeApplication()
      throw new Error('synthetic application cleanup failure')
    },
  })

  try {
    await assert.rejects(
      listenToServerApplication(application, {
        host: '127.0.0.1',
        port: address.port,
      }),
      (error) => {
        assert.ok(error instanceof ServerListenerStartError)
        assert.equal(
          error.code,
          'server_listener_startup_cleanup_ambiguous',
        )
        return true
      },
    )
  } finally {
    await closeApplication()
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
