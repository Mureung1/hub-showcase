import assert from 'node:assert/strict'
import { request as httpRequest } from 'node:http'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  startCodexChatProcessTreeTestFixture,
  type CodexChatProcessTreeTestFixture,
  type CodexChatTestProcessTree,
} from '@ay-ple/codex-chat-runtime/testing'

import {
  codexChatIdentity,
  postJson,
} from './codex-chat-test-support.js'
import { withTestServer } from './test-server.js'

const RUNTIME_ROOT = fileURLToPath(
  new URL(
    '../../../../packages/codex-chat-runtime/.artifacts/production-runtime-darwin-arm64/',
    import.meta.url,
  ),
)

test('Server shutdown refuses fresh intake and reaps the supervised process tree before resolving', async () => {
  let fixture: CodexChatProcessTreeTestFixture | undefined
  try {
    await withTestServer(
      {
        codexChat: {
          ...codexChatIdentity,
          createRuntime: async () => {
            fixture = await startCodexChatProcessTreeTestFixture({
              runtimeRoot: RUNTIME_ROOT,
            })
            return fixture.runtime
          },
        },
      },
      async (baseUrl, application) => {
        try {
          const threadResponse = await postJson(
            `${baseUrl}/api/codex-chat/threads`,
            {},
          )
          assert.equal(threadResponse.status, 201)
          assert.deepEqual(await threadResponse.json(), { threadId: 'thread-1' })

          const activeFixture = fixture
          assert.ok(activeFixture)
          const processTree = await activeFixture.readProcessTree()
          assertProcessTreeRunning(processTree)

          const closing = application.close()
          await withDeadline(
            activeFixture.waitForCloseRequest(),
            3_000,
            'Server shutdown did not request runtime close',
          )
          await assert.rejects(connectWithoutReuse(baseUrl))
          assert.equal(await settlesBeforeImmediate(closing), false)
          assertProcessTreeRunning(processTree)

          await activeFixture.releaseClose()
          await closing
          assertProcessTreeReaped(processTree)
        } finally {
          await fixture?.releaseClose()
        }
      },
    )
  } finally {
    await fixture?.dispose()
  }
})

async function connectWithoutReuse(baseUrl: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = httpRequest(`${baseUrl}/api/codex-chat/status`, {
      agent: false,
    })
    request.once('response', (response) => {
      response.resume()
      resolve()
    })
    request.once('error', reject)
    request.end()
  })
}

async function settlesBeforeImmediate(promise: Promise<void>): Promise<boolean> {
  return Promise.race([
    promise.then(
      () => true,
      () => true,
    ),
    new Promise<false>((resolve) => setImmediate(() => resolve(false))),
  ])
}

async function withDeadline<T>(
  promise: Promise<T>,
  milliseconds: number,
  message: string,
): Promise<T> {
  let timeout: NodeJS.Timeout | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(message)), milliseconds)
      }),
    ])
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

function assertProcessTreeRunning(processTree: CodexChatTestProcessTree): void {
  assert.equal(processExists(processTree.workerPid), true)
  assert.equal(processExists(processTree.nativePid), true)
  assert.equal(processGroupExists(processTree.processGroupId), true)
}

function assertProcessTreeReaped(processTree: CodexChatTestProcessTree): void {
  assert.equal(processExists(processTree.workerPid), false)
  assert.equal(processExists(processTree.nativePid), false)
  assert.equal(processGroupExists(processTree.processGroupId), false)
}

function processExists(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ESRCH') return false
    throw error
  }
}

function processGroupExists(processGroupId: number): boolean {
  try {
    process.kill(-processGroupId, 0)
    return true
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ESRCH') return false
    throw error
  }
}
