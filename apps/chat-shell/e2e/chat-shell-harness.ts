import { once } from 'node:events'
import { mkdir } from 'node:fs/promises'
import {
  createServer as createHttpServer,
  request as requestHttp,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http'
import type { AddressInfo } from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  DeterministicCodexChatRuntime,
  type DeterministicCodexChatRuntimeCall,
  type DeterministicCodexChatTurn,
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
import {
  createServer as createViteServer,
  type Plugin,
  type ViteDevServer,
} from 'vite'

import {
  createServerApplication,
  type ServerApplication,
} from '../../server/src/server.js'
import { codexChatIdentity } from '../../server/src/testing/codex-chat-test-support.js'
import {
  materializeE2eSemesterWorkspace,
  type E2eSemesterWorkspace,
} from '../../../scripts/semester-workspace-materializer.mjs'

export type ChatScenario =
  | 'nominal'
  | 'retryable-error'
  | 'terminal-failure'
  | 'runtime-failure'
  | 'interrupt-follow-up'
  | 'interrupt-failure'
  | 'failed-start'
  | 'unavailable'

export const scenarioPrompts = {
  nominal: '개념 연결을 설명해줘',
  'retryable-error': '연결을 다시 시도해줘',
  'terminal-failure': '실패 상태를 보여줘',
  'runtime-failure': '런타임 실패를 보여줘',
  'interrupt-follow-up': '긴 답변을 시작해줘',
  'interrupt-failure': '중단 실패 뒤에도 답변해줘',
} as const

export const interruptFollowUpPrompt = '같은 대화에서 짧게 다시 설명해줘'

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
const packageRoot = fileURLToPath(new URL('../../../', import.meta.url))

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
  const frontendServer = createHttpServer()
  let viteServer: ViteDevServer | undefined
  let application: ServerApplication | undefined
  let deterministicRuntime: DeterministicCodexChatRuntime | undefined
  let semesterWorkspace: E2eSemesterWorkspace | undefined

  try {
    semesterWorkspace = await materializeE2eSemesterWorkspace()
    process.stdout.write(
      `E2E SemesterWorkspace: ${semesterWorkspace.workspaceRoot}\n`,
    )
    const appDataRoot = path.join(semesterWorkspace.runRoot, 'app-data')
    await mkdir(appDataRoot)
    const semesterWorkspaceBootstrap = {
      packageRoot,
      appDataRoot,
      chooseDirectory: async () => semesterWorkspace?.workspaceRoot ?? null,
    }
    frontendServer.listen(0, '127.0.0.1')
    await once(frontendServer, 'listening')
    const frontendUrl = serverUrl(frontendServer)

    if (scenario === 'unavailable') {
      application = await createServerApplication({
        codexChatEnvironment: {},
        semesterWorkspace: semesterWorkspaceBootstrap,
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
        semesterWorkspace: semesterWorkspaceBootstrap,
      })
    } else {
      deterministicRuntime = createScenarioRuntime(scenario)
      const scenarioRuntime =
        scenario === 'interrupt-failure'
          ? new InterruptFailingRuntime(deterministicRuntime)
          : deterministicRuntime
      const runtime = new DelayedRuntime(
        scenarioRuntime,
        scenario === 'interrupt-follow-up' || scenario === 'interrupt-failure'
          ? 500
          : 180,
      )
      application = await createServerApplication({
        codexChat: {
          ...codexChatIdentity,
          origin: frontendUrl,
          createRuntime: async () => {
            await delay(180)
            return runtime
          },
        },
        semesterWorkspace: semesterWorkspaceBootstrap,
      })
    }
    const activation = await application.semesterWorkspace?.activate()
    if (
      activation?.status === 'activated' &&
      activation.workspace.state === 'ready'
    ) {
      if (activation.workspace.course === null) {
        await application.semesterWorkspace?.createCourse('문제해결글쓰기')
      }
      await application.semesterWorkspace?.refreshMaterials()
    }

    const apiAddress = await application.listen(0, '127.0.0.1')
    const apiUrl = `http://127.0.0.1:${apiAddress.port}`
    viteServer = await createViteServer({
      appType: 'spa',
      configFile: false,
      root: chatShellRoot,
      plugins: [
        terminalEndHoldPlugin(apiUrl, scenario === 'interrupt-follow-up'),
        react(),
      ],
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
          semesterWorkspace,
        })
      },
    }
  } catch (error) {
    await cleanupHarnessResources({
      frontendServer,
      viteServer,
      application,
      semesterWorkspace,
    }).catch(() => undefined)
    throw error
  }
}

async function cleanupHarnessResources({
  frontendServer,
  viteServer,
  application,
  semesterWorkspace,
}: {
  readonly frontendServer: Server
  readonly viteServer: ViteDevServer | undefined
  readonly application: ServerApplication | undefined
  readonly semesterWorkspace: E2eSemesterWorkspace | undefined
}): Promise<void> {
  const results = await Promise.allSettled([
    closeHttpServer(frontendServer),
    viteServer?.close() ?? Promise.resolve(),
    application?.close() ?? Promise.resolve(),
  ])
  const rejected = results.find(
    (result): result is PromiseRejectedResult => result.status === 'rejected',
  )
  const workspaceCleanup = await Promise.allSettled([
    semesterWorkspace?.cleanup() ?? Promise.resolve(),
  ])
  const cleanupRejected = workspaceCleanup.find(
    (result): result is PromiseRejectedResult => result.status === 'rejected',
  )
  if (rejected) throw rejected.reason
  if (cleanupRejected) throw cleanupRejected.reason
}

function createScenarioRuntime(
  scenario: Exclude<ChatScenario, 'failed-start' | 'unavailable'>,
): DeterministicCodexChatRuntime {
  const threadId = `thread-native-${scenario}`
  const turnId = `turn-native-${scenario}-1`
  const turns: DeterministicCodexChatTurn[] = [
    {
      input: { threadId, text: scenarioPrompts[scenario] },
      turnId,
      events: scenarioEvents(scenario, threadId, turnId),
    },
  ]
  if (scenario === 'interrupt-follow-up') {
    const followUpTurnId = 'turn-native-interrupt-follow-up-2'
    turns.push({
      input: { threadId, text: interruptFollowUpPrompt },
      turnId: followUpTurnId,
      events: [
        {
          type: 'agent_message.delta',
          threadId,
          turnId: followUpTurnId,
          itemId: 'item-native-interrupt-follow-up-2',
          delta: '같은 대화에서 ',
        },
        {
          type: 'agent_message.completed',
          threadId,
          turnId: followUpTurnId,
          itemId: 'item-native-interrupt-follow-up-2',
          text: '같은 대화에서 두 번째 답변을 완료했습니다.',
        },
        {
          type: 'turn.completed',
          threadId,
          turnId: followUpTurnId,
          status: 'completed',
        },
      ],
    })
  }
  return new DeterministicCodexChatRuntime({
    threadIds: [threadId],
    turns,
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
  if (scenario === 'interrupt-follow-up') {
    return [
      {
        type: 'agent_message.delta',
        threadId,
        turnId,
        itemId: 'item-native-interrupt-follow-up-1',
        delta: '중단 전까지 작성한 답변입니다.',
      },
      { type: 'turn.completed', threadId, turnId, status: 'interrupted' },
    ]
  }
  if (scenario === 'interrupt-failure') {
    return [
      {
        type: 'agent_message.delta',
        threadId,
        turnId,
        itemId: 'item-native-interrupt-failure-1',
        delta: '중단 요청과 별개로 ',
      },
      {
        type: 'agent_message.completed',
        threadId,
        turnId,
        itemId: 'item-native-interrupt-failure-1',
        text: '중단 요청과 별개로 답변을 완료했습니다.',
      },
      { type: 'turn.completed', threadId, turnId, status: 'completed' },
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

class InterruptFailingRuntime implements CodexChatRuntime {
  constructor(private readonly delegate: CodexChatRuntime) {}

  get terminal() {
    return this.delegate.terminal
  }

  startThread() {
    return this.delegate.startThread()
  }

  startTurn(input: StartTurnInput) {
    return this.delegate.startTurn(input)
  }

  async interrupt(input: InterruptTurnInput): Promise<void> {
    await this.delegate.interrupt(input)
    throw new Error('test-only interrupt control failure')
  }

  releaseThread(input: ReleaseThreadInput) {
    return this.delegate.releaseThread(input)
  }

  close() {
    return this.delegate.close()
  }
}

class DelayedRuntime implements CodexChatRuntime {
  constructor(
    private readonly delegate: CodexChatRuntime,
    private readonly delayMs: number,
  ) {}

  get terminal() {
    return this.delegate.terminal
  }

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
      const iterator = events[Symbol.asyncIterator]()
      try {
        while (true) {
          await delay(delayMs)
          const result = await iterator.next()
          if (result.done) return
          yield result.value
        }
      } finally {
        await iterator.return?.()
      }
    },
  }
}

function terminalEndHoldPlugin(apiUrl: string, enabled: boolean): Plugin {
  let holdNextTurnResponse = enabled
  return {
    name: 'ay-ple-chat-shell-terminal-end-hold',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const pathname = new URL(request.url ?? '/', apiUrl).pathname
        if (
          !holdNextTurnResponse ||
          request.method !== 'POST' ||
          !/^\/api\/codex-chat\/threads\/[^/]+\/turns$/.test(pathname)
        ) {
          next()
          return
        }
        holdNextTurnResponse = false
        proxyWithDelayedEnd(request, response, apiUrl, 900, next)
      })
    },
  }
}

function proxyWithDelayedEnd(
  request: IncomingMessage,
  response: ServerResponse,
  apiUrl: string,
  endDelayMs: number,
  next: (error?: unknown) => void,
): void {
  const target = new URL(request.url ?? '/', apiUrl)
  const upstreamRequest = requestHttp(
    target,
    {
      method: request.method,
      headers: { ...request.headers, host: target.host },
    },
    (upstreamResponse) => {
      response.statusCode = upstreamResponse.statusCode ?? 502
      for (const [name, value] of Object.entries(upstreamResponse.headers)) {
        if (
          value !== undefined &&
          name !== 'connection' &&
          name !== 'content-length' &&
          name !== 'transfer-encoding'
        ) {
          response.setHeader(name, value)
        }
      }
      upstreamResponse.on('data', (chunk: Buffer) => {
        if (!response.destroyed) response.write(chunk)
      })
      upstreamResponse.on('end', () => {
        setTimeout(() => {
          if (!response.destroyed) response.end()
        }, endDelayMs)
      })
      upstreamResponse.on('error', (error) => {
        if (!response.headersSent) next(error)
        else response.destroy(error)
      })
    },
  )
  upstreamRequest.on('error', (error) => {
    if (!response.headersSent) next(error)
    else response.destroy(error)
  })
  request.on('aborted', () => upstreamRequest.destroy())
  response.on('close', () => {
    if (!response.writableEnded) upstreamRequest.destroy()
  })
  request.pipe(upstreamRequest)
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
