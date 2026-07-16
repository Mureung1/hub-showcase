import { once } from 'node:events'
import { mkdtemp, rm } from 'node:fs/promises'
import { createServer as createHttpServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  DeterministicCodexChatRuntime,
  type DeterministicCodexChatRuntimeCall,
} from '@ay-ple/codex-chat-runtime/testing'
import type {
  CodexChatEvent,
  CodexChatRuntime,
  CodexChatTurn,
  InterruptTurnInput,
  ReleaseThreadInput,
  StartTurnInput,
} from '@ay-ple/codex-chat-runtime/contract'
import react from '@vitejs/plugin-react'
import { test as base, type Page } from 'playwright/test'
import { createServer as createViteServer, type ViteDevServer } from 'vite'

import {
  createServerApplication,
  type ServerApplication,
} from '../../server/src/server.js'
import { codexChatIdentity } from '../../server/src/testing/codex-chat-test-support.js'

export type ChatScenario =
  | 'nominal'
  | 'retryable-error'
  | 'terminal-failure'
  | 'runtime-failure'
  | 'failed-start'
  | 'unavailable'

export const scenarioPrompts = {
  nominal: '개념 연결을 설명해줘',
  'retryable-error': '연결을 다시 시도해줘',
  'terminal-failure': '실패 상태를 보여줘',
  'runtime-failure': '런타임 실패를 보여줘',
} as const

type ChatShellFixtures = {
  scenario: ChatScenario
  chatHarness: ChatShellHarness
  chatPage: Page
}

type ChatShellHarness = {
  readonly url: string
  readonly calls: () => readonly DeterministicCodexChatRuntimeCall[]
  close(): Promise<void>
}

const chatShellRoot = fileURLToPath(new URL('../', import.meta.url))

export const test = base.extend<ChatShellFixtures>({
  scenario: ['nominal', { option: true }],
  chatHarness: async ({ scenario }, provideHarness) => {
    const harness = await startChatShellHarness(scenario)
    try {
      await provideHarness(harness)
    } finally {
      await harness.close()
    }
  },
  chatPage: async ({ chatHarness, page }, providePage) => {
    try {
      await page.goto(chatHarness.url)
      await providePage(page)
    } finally {
      await page.close()
    }
  },
})

async function startChatShellHarness(
  scenario: ChatScenario,
): Promise<ChatShellHarness> {
  const temporaryRoot = await mkdtemp(
    path.join(tmpdir(), 'ay-ple-chat-shell-e2e-'),
  )
  const frontendServer = createHttpServer()
  let viteServer: ViteDevServer | undefined
  let application: ServerApplication | undefined
  let deterministicRuntime: DeterministicCodexChatRuntime | undefined

  try {
    frontendServer.listen(0, '127.0.0.1')
    await once(frontendServer, 'listening')
    const frontendUrl = serverUrl(frontendServer)

    if (scenario === 'unavailable') {
      application = await createServerApplication({
        codexChatEnvironment: {},
        runtimeHistoryDirectory: path.join(temporaryRoot, 'runs'),
      })
    } else if (scenario === 'failed-start') {
      application = await createServerApplication({
        codexChat: {
          ...codexChatIdentity,
          origin: frontendUrl,
          createRuntime: async () => {
            await delay(180)
            throw new Error('test-only runtime startup failure')
          },
        },
        runtimeHistoryDirectory: path.join(temporaryRoot, 'runs'),
      })
    } else {
      deterministicRuntime = createScenarioRuntime(scenario)
      const runtime = new DelayedRuntime(deterministicRuntime, 180)
      application = await createServerApplication({
        codexChat: {
          ...codexChatIdentity,
          origin: frontendUrl,
          createRuntime: async () => {
            await delay(180)
            return runtime
          },
        },
        runtimeHistoryDirectory: path.join(temporaryRoot, 'runs'),
      })
    }

    const apiAddress = await application.listen(0, '127.0.0.1')
    const apiUrl = `http://127.0.0.1:${apiAddress.port}`
    viteServer = await createViteServer({
      appType: 'spa',
      configFile: false,
      root: chatShellRoot,
      plugins: [react()],
      server: {
        hmr: false,
        middlewareMode: true,
        proxy: {
          '/api': apiUrl,
        },
      },
    })
    frontendServer.on('request', viteServer.middlewares)

    let closed = false
    return {
      url: frontendUrl,
      calls: () => deterministicRuntime?.calls ?? [],
      async close() {
        if (closed) return
        closed = true
        await cleanupHarnessResources({
          frontendServer,
          viteServer,
          application,
          temporaryRoot,
        })
      },
    }
  } catch (error) {
    await cleanupHarnessResources({
      frontendServer,
      viteServer,
      application,
      temporaryRoot,
    }).catch(() => undefined)
    throw error
  }
}

async function cleanupHarnessResources({
  frontendServer,
  viteServer,
  application,
  temporaryRoot,
}: {
  readonly frontendServer: Server
  readonly viteServer: ViteDevServer | undefined
  readonly application: ServerApplication | undefined
  readonly temporaryRoot: string
}): Promise<void> {
  const results = await Promise.allSettled([
    closeHttpServer(frontendServer),
    viteServer?.close() ?? Promise.resolve(),
    application?.close() ?? Promise.resolve(),
  ])
  await rm(temporaryRoot, { force: true, recursive: true })
  const rejected = results.find(
    (result): result is PromiseRejectedResult => result.status === 'rejected',
  )
  if (rejected) throw rejected.reason
}

function createScenarioRuntime(
  scenario: Exclude<ChatScenario, 'failed-start' | 'unavailable'>,
): DeterministicCodexChatRuntime {
  const threadId = `thread-native-${scenario}`
  const turnId = `turn-native-${scenario}-1`
  return new DeterministicCodexChatRuntime({
    threadIds: [threadId],
    turns: [
      {
        input: { threadId, text: scenarioPrompts[scenario] },
        turnId,
        events: scenarioEvents(scenario, threadId, turnId),
      },
    ],
  })
}

function scenarioEvents(
  scenario: Exclude<ChatScenario, 'failed-start' | 'unavailable'>,
  threadId: string,
  turnId: string,
): readonly CodexChatEvent[] {
  if (scenario === 'retryable-error') {
    return [
      {
        type: 'turn.error',
        threadId,
        turnId,
        willRetry: true,
        code: 'httpConnectionFailed',
        displayMessage: 'Codex reported a turn error.',
      },
      {
        type: 'agent_message.delta',
        threadId,
        turnId,
        itemId: 'item-native-retry-1',
        delta: '다시 연결했습니다.',
      },
      {
        type: 'agent_message.completed',
        threadId,
        turnId,
        itemId: 'item-native-retry-1',
        text: '다시 연결한 뒤 답변을 완료했습니다.',
      },
      { type: 'turn.completed', threadId, turnId, status: 'completed' },
    ]
  }
  if (scenario === 'terminal-failure') {
    return [
      {
        type: 'agent_message.delta',
        threadId,
        turnId,
        itemId: 'item-native-failed-1',
        delta: '답변을 준비했지만 ',
      },
      {
        type: 'turn.completed',
        threadId,
        turnId,
        status: 'failed',
        failure: {
          code: 'serverOverloaded',
          displayMessage: 'Codex failed the turn.',
        },
      },
    ]
  }
  if (scenario === 'runtime-failure') {
    return [
      {
        type: 'agent_message.delta',
        threadId,
        turnId,
        itemId: 'item-native-runtime-failed-1',
        delta: '연결이 끊어지기 전 답변',
      },
      {
        type: 'runtime.failed',
        code: 'runtime_lost',
        displayMessage: 'The Codex runtime connection was lost.',
        mutationOutcomeKnown: false,
      },
    ]
  }
  return [
    {
      type: 'agent_message.delta',
      threadId,
      turnId,
      itemId: 'item-native-nominal-1',
      delta: '핵심은 ',
    },
    {
      type: 'agent_message.delta',
      threadId,
      turnId,
      itemId: 'item-native-nominal-1',
      delta: '개념 사이의 연결입니다.',
    },
    {
      type: 'agent_message.completed',
      threadId,
      turnId,
      itemId: 'item-native-nominal-1',
      text: '핵심은 개념 사이의 연결입니다.',
    },
    { type: 'turn.completed', threadId, turnId, status: 'completed' },
  ]
}

class DelayedRuntime implements CodexChatRuntime {
  constructor(
    private readonly delegate: CodexChatRuntime,
    private readonly delayMs: number,
  ) {}

  startThread() {
    return this.delegate.startThread()
  }

  async startTurn(input: StartTurnInput): Promise<CodexChatTurn> {
    const turn = await this.delegate.startTurn(input)
    return {
      ...turn,
      events: delayEvents(turn.events, this.delayMs),
    }
  }

  interrupt(input: InterruptTurnInput) {
    return this.delegate.interrupt(input)
  }

  releaseThread(input: ReleaseThreadInput) {
    return this.delegate.releaseThread(input)
  }

  close() {
    return this.delegate.close()
  }
}

function delayEvents(
  events: AsyncIterable<CodexChatEvent>,
  delayMs: number,
): AsyncIterable<CodexChatEvent> {
  return {
    async *[Symbol.asyncIterator]() {
      for await (const event of events) {
        await delay(delayMs)
        yield event
      }
    },
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function serverUrl(server: Server): string {
  const address = server.address() as AddressInfo | null
  if (!address) throw new Error('Expected server to be listening')
  return `http://127.0.0.1:${address.port}`
}

function closeHttpServer(server: Server): Promise<void> {
  if (!server.listening) return Promise.resolve()
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()))
  })
}
