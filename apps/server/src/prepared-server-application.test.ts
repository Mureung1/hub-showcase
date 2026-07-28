import assert from 'node:assert/strict'
import { mkdtemp, realpath, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import type {
  AnswerUserInput,
  CancelUserInput,
  CodexChatRuntimeError,
  CodexProductActivity,
  CodexProductTurn,
  CodexWorkspaceRuntime,
  InterruptTurnInput,
  ReleaseThreadInput,
  StartProductTurnInput,
  StartTurnInput,
} from '@ay-ple/codex-chat-runtime'

import { bindServerApplicationListener } from './server-listener.js'
import { createPreparedServerApplication } from './prepared-server-application.js'
import { codexChatIdentity, postJson } from './testing/codex-chat-test-support.js'

test('prepared public composition uses project discovery and exposes only AY Chat plus inline Review', async () => {
  const workspaceRoot = await realpath(
    await mkdtemp(path.join(tmpdir(), 'prepared-public-server-')),
  )
  const runtime = new PreparedRuntime()
  const lifecycle = {
    state: 'active',
    workspace: {
      workspaceId: 'workspace_0123456789abcdef0123456789abcdef',
      semester: {
        yearLevel: 2,
        term: { key: 'fall', displayName: '2학기' },
      },
      label: '2학년 2학기',
    },
  } as const
  let listener:
    | Awaited<ReturnType<typeof bindServerApplicationListener>>
    | undefined
  let lifecycleReader:
    | ReadableStreamDefaultReader<Uint8Array>
    | undefined
  const target = await createPreparedServerApplication({
    codexChat: {
      ...codexChatIdentity,
      createRuntime: async () => runtime,
      acquireProductThread: async (actualRuntime) =>
        (await actualRuntime.startThread()).threadId,
    },
    workspaceRoot,
    readLifecycle: () => lifecycle,
  })
  try {
    listener = await bindServerApplicationListener({
      host: '127.0.0.1',
      port: 0,
      requestHandler: target.application.app,
    })
    const baseUrl = `http://127.0.0.1:${listener.port}`
    const bootstrap = await fetch(`${baseUrl}/api/product/bootstrap`)
    assert.equal(bootstrap.status, 200)
    assert.deepEqual(await bootstrap.json(), {
      accountReadiness: { state: 'ready' },
      activeOperation: null,
      workspaceLifecycle: lifecycle,
    })
    for (const path of [
      '/api/product/workspaces/activate',
      '/api/product/courses',
      '/api/product/materials/refresh',
      '/api/product/actions/first-assignment',
      '/api/product/actions/first-assignment/retry',
      '/api/product-mcp',
    ]) {
      assert.equal(
        (await postJson(`${baseUrl}${path}`, {})).status,
        404,
        path,
      )
    }

    assert.equal(
      (
        await postJson(`${baseUrl}/api/product/chat/messages`, {
          text: '과제 파일을 확인해 줘.',
          materials: [],
        })
      ).status,
      400,
    )
    const stream = await postJson(`${baseUrl}/api/product/chat/messages`, {
      text: '과제 파일을 확인해 줘.',
      codexSettings: {
        model: 'gpt-current',
        reasoningEffort: 'medium',
        serviceTier: 'default',
      },
    })
    assert.equal(stream.status, 200)
    assert.ok(stream.body)
    const trace = new NdjsonTrace(stream.body.getReader())
    await trace.until((frame) => frame.type === 'operation.accepted')
    const activeBootstrap = await fetch(`${baseUrl}/api/product/bootstrap`)
    assert.match(
      String(
        (
          (await activeBootstrap.json()) as {
            activeOperation: { operationId: string }
          }
        ).activeOperation.operationId
      ),
      /^operation_[0-9a-f]{32}$/u,
    )
    assert.equal(runtime.startThreadCalls, 1)
    assert.equal(runtime.productInputs[0]?.permissionProfile, 'workspace_write')
    assert.deepEqual(runtime.productInputs[0]?.settings, {
      model: 'gpt-current',
      reasoningEffort: 'medium',
      serviceTier: 'default',
    })
    assert.equal(Object.hasOwn(runtime.productInputs[0] ?? {}, 'skill'), false)

    const headers = {
      authorization: `Bearer ${target.credentials.token}`,
      'x-ay-ple-runtime-binding': target.credentials.binding,
    }
    assert.equal(
      (
        await postJson(
          `${baseUrl}/api/_private/interaction-mcp/`,
          {
            protocolVersion: 1,
            kind: 'handshake',
            serverName: 'ay_ple_interaction',
            capabilities: ['propose_state_patch'],
          },
          headers,
        )
      ).status,
      200,
    )
    lifecycleReader = await openBrokerLifecycle(
      baseUrl,
      target.credentials,
    )
    const held = postJson(
      `${baseUrl}/api/_private/interaction-mcp/`,
      {
        protocolVersion: 1,
        kind: 'capability_call',
        capability: 'propose_state_patch',
        request: {
          summary: '과제 파일 변경',
          question: '이 변경을 반영할까요?',
          changes: [
            {
              label: '마감',
              description: '마감 정보를 actual file에 반영합니다.',
              before: '미정',
              after: '8월 3일',
            },
          ],
        },
      },
      headers,
    )
    const requested = await trace.until(
      (frame) => frame.type === 'review.requested',
    )
    const interactionId = String(requested.interactionId)
    const answer = postJson(
      `${baseUrl}/api/product/reviews/${interactionId}`,
      { outcome: 'accept' },
    )
    assert.equal((await held).status, 200)
    assert.equal((await answer).status, 204)
    await trace.until(
      (frame) =>
        frame.type === 'review.resolved' &&
        frame.interactionId === interactionId,
    )
    runtime.finish()
    await trace.until((frame) => frame.type === 'operation.terminal')
    const settledBootstrap = await fetch(`${baseUrl}/api/product/bootstrap`)
    assert.equal(
      (
        (await settledBootstrap.json()) as {
          activeOperation: unknown
        }
      ).activeOperation,
      null,
    )
  } finally {
    await target.application.close()
    assert.equal((await lifecycleReader?.read())?.done, true)
    await listener?.close({ signal: new AbortController().signal })
    await rm(workspaceRoot, { force: true, recursive: true })
  }
})

test('prepared Adapter loss preserves transport_failed through the public Review stream', async () => {
  const workspaceRoot = await realpath(
    await mkdtemp(path.join(tmpdir(), 'prepared-adapter-loss-')),
  )
  const runtime = new PreparedRuntime()
  const target = await createPreparedServerApplication({
    codexChat: {
      ...codexChatIdentity,
      createRuntime: async () => runtime,
      acquireProductThread: async (actualRuntime) =>
        (await actualRuntime.startThread()).threadId,
    },
    workspaceRoot,
    readLifecycle: () => ({
      state: 'active',
      workspace: {
        workspaceId: 'workspace_0123456789abcdef0123456789abcdef',
        semester: {
          yearLevel: 2,
          term: { key: 'fall', displayName: '2학기' },
        },
        label: '2학년 2학기',
      },
    }),
  })
  let listener:
    | Awaited<ReturnType<typeof bindServerApplicationListener>>
    | undefined
  let lifecycleReader:
    | ReadableStreamDefaultReader<Uint8Array>
    | undefined
  try {
    listener = await bindServerApplicationListener({
      host: '127.0.0.1',
      port: 0,
      requestHandler: target.application.app,
    })
    const baseUrl = `http://127.0.0.1:${listener.port}`
    const stream = await postJson(`${baseUrl}/api/product/chat/messages`, {
      text: '과제 파일을 확인해 줘.',
      codexSettings: {
        model: 'gpt-current',
        reasoningEffort: 'medium',
        serviceTier: 'default',
      },
    })
    assert.equal(stream.status, 200)
    assert.ok(stream.body)
    const trace = new NdjsonTrace(stream.body.getReader())
    await trace.until((frame) => frame.type === 'operation.accepted')

    const headers = {
      authorization: `Bearer ${target.credentials.token}`,
      'x-ay-ple-runtime-binding': target.credentials.binding,
    }
    assert.equal(
      (
        await postJson(
          `${baseUrl}/api/_private/interaction-mcp/`,
          {
            protocolVersion: 1,
            kind: 'handshake',
            serverName: 'ay_ple_interaction',
            capabilities: ['propose_state_patch'],
          },
          headers,
        )
      ).status,
      200,
    )
    lifecycleReader = await openBrokerLifecycle(
      baseUrl,
      target.credentials,
    )
    const held = postJson(
      `${baseUrl}/api/_private/interaction-mcp/`,
      {
        protocolVersion: 1,
        kind: 'capability_call',
        capability: 'propose_state_patch',
        request: {
          summary: '연결 종료 검증',
          question: '이 변경을 반영할까요?',
          changes: [
            {
              label: '상태',
              description: 'Adapter 연결 종료 사유를 검증합니다.',
              before: '연결됨',
              after: '종료됨',
            },
          ],
        },
      },
      headers,
    )
    const requested = await trace.until(
      (frame) => frame.type === 'review.requested',
    )
    const closing = target.adapterLost()
    const failed = await trace.until(
      (frame) =>
        frame.type === 'review.failed' &&
        frame.interactionId === requested.interactionId,
    )
    assert.equal(failed.reason, 'transport_failed')
    const heldResponse = await held
    assert.equal(heldResponse.status, 503)
    assert.equal(
      (
        (await heldResponse.json()) as {
          code: string
        }
      ).code,
      'interaction_interrupted',
    )
    await closing
    assert.equal((await lifecycleReader.read()).done, true)
  } finally {
    await target.appShutdown()
    await listener?.close({ signal: new AbortController().signal })
    await rm(workspaceRoot, { force: true, recursive: true })
  }
})

test('prepared public composition rejects settings outside the advertised catalog', async () => {
  const workspaceRoot = await realpath(
    await mkdtemp(path.join(tmpdir(), 'prepared-public-settings-')),
  )
  const runtime = new PreparedRuntime()
  const target = await createPreparedServerApplication({
    codexChat: {
      ...codexChatIdentity,
      createRuntime: async () => runtime,
      acquireProductThread: async (actualRuntime) =>
        (await actualRuntime.startThread()).threadId,
    },
    workspaceRoot,
    readLifecycle: () => ({
      state: 'active',
      workspace: {
        workspaceId: 'workspace_0123456789abcdef0123456789abcdef',
        semester: {
          yearLevel: 2,
          term: { key: 'fall', displayName: '2학기' },
        },
        label: '2학년 2학기',
      },
    }),
  })
  let listener:
    | Awaited<ReturnType<typeof bindServerApplicationListener>>
    | undefined
  try {
    listener = await bindServerApplicationListener({
      host: '127.0.0.1',
      port: 0,
      requestHandler: target.application.app,
    })
    const baseUrl = `http://127.0.0.1:${listener.port}`
    for (const codexSettings of [
      {
        model: 'gpt-unknown',
        reasoningEffort: 'medium',
        serviceTier: 'default',
      },
      {
        model: 'gpt-current',
        reasoningEffort: 'unknown',
        serviceTier: 'default',
      },
      {
        model: 'gpt-current',
        reasoningEffort: 'medium',
        serviceTier: 'fast',
      },
    ] as const) {
      const response = await postJson(
        `${baseUrl}/api/product/chat/messages`,
        {
          text: '과제 파일을 확인해 줘.',
          codexSettings,
        },
      )
      assert.equal(response.status, 400)
    }
    assert.equal(runtime.productInputs.length, 0)
  } finally {
    await target.application.close()
    await listener?.close({ signal: new AbortController().signal })
    await rm(workspaceRoot, { force: true, recursive: true })
  }
})

test('Codex settings fail closed without starting Runtime while the workspace is unavailable', async () => {
  const workspaceRoot = await realpath(
    await mkdtemp(path.join(tmpdir(), 'prepared-settings-recovery-')),
  )
  let runtimeRequested = false
  const target = await createPreparedServerApplication({
    codexChat: {
      ...codexChatIdentity,
      createRuntime: () => {
        runtimeRequested = true
        return new Promise<CodexWorkspaceRuntime>(() => undefined)
      },
      acquireProductThread: async () => {
        throw new Error('Product thread must not be requested')
      },
    },
    workspaceRoot,
    readLifecycle: () => ({
      state: 'recovery_required',
      workspace: null,
      reason: 'runtime_unavailable',
      displayMessage: 'Runtime을 사용할 수 없습니다.',
    }),
  })
  let listener:
    | Awaited<ReturnType<typeof bindServerApplicationListener>>
    | undefined
  try {
    listener = await bindServerApplicationListener({
      host: '127.0.0.1',
      port: 0,
      requestHandler: target.application.app,
    })
    const response = await fetch(
      `http://127.0.0.1:${listener.port}/api/product/codex-settings`,
      { signal: AbortSignal.timeout(1_000) },
    )
    assert.equal(response.status, 503)
    assert.deepEqual(await response.json(), {
      code: 'workspace_unavailable',
      displayMessage: 'AY 작업공간을 사용할 수 없습니다.',
    })
    assert.equal(runtimeRequested, false)
  } finally {
    await target.application.close()
    await listener?.close({ signal: new AbortController().signal })
    await rm(workspaceRoot, { force: true, recursive: true })
  }
})

class PreparedRuntime implements CodexWorkspaceRuntime {
  readonly terminal = new Promise<CodexChatRuntimeError>(() => undefined)
  startThreadCalls = 0
  readonly productInputs: StartProductTurnInput[] = []
  private readonly turnGate = deferred<void>()

  readAccountReadiness() {
    return Promise.resolve({ state: 'ready' as const })
  }

  readModelCatalog() {
    return Promise.resolve({
      models: [
        {
          model: 'gpt-current',
          displayName: 'GPT Current',
          description: 'Current model',
          isDefault: true,
          defaultReasoningEffort: 'medium',
          supportedReasoningEfforts: [
            { reasoningEffort: 'medium', description: 'Balanced' },
          ],
          serviceTiers: ['default'],
        },
      ],
    })
  }

  async startThread() {
    this.startThreadCalls += 1
    return { threadId: 'thread-prepared' }
  }

  async startProductTurn(
    input: StartProductTurnInput,
  ): Promise<CodexProductTurn> {
    this.productInputs.push(structuredClone(input))
    const gate = this.turnGate.promise
    return {
      threadId: input.threadId,
      turnId: 'turn-prepared',
      events: (async function* (): AsyncIterable<CodexProductActivity> {
        yield {
          type: 'agent_message.completed',
          threadId: input.threadId,
          turnId: 'turn-prepared',
          itemId: 'item-prepared',
          text: '작업을 확인했습니다.',
        }
        await gate
        yield {
          type: 'turn.completed',
          threadId: input.threadId,
          turnId: 'turn-prepared',
          status: 'completed',
        }
      })(),
    }
  }

  finish() {
    this.turnGate.resolve()
  }

  startTurn(_input: StartTurnInput): Promise<never> {
    return Promise.reject(new Error('legacy turn is not expected'))
  }

  answerUserInput(_input: AnswerUserInput) {
    return Promise.resolve()
  }

  cancelUserInput(_input: CancelUserInput) {
    return Promise.resolve()
  }

  interrupt(_input: InterruptTurnInput) {
    this.finish()
    return Promise.resolve()
  }

  releaseThread(_input: ReleaseThreadInput) {
    return Promise.resolve()
  }

  readEffectiveConfig() {
    return Promise.resolve({
      projectRootMarkers: [],
      globalInstructionsFile: null,
      mcpServers: [],
    })
  }

  listEffectiveSkills() {
    return Promise.resolve([])
  }

  close() {
    this.finish()
    return Promise.resolve()
  }
}

class NdjsonTrace {
  private readonly frames: Array<Record<string, unknown>> = []
  private buffer = ''

  constructor(
    private readonly reader: ReadableStreamDefaultReader<Uint8Array>,
  ) {}

  async until(
    predicate: (frame: Record<string, unknown>) => boolean,
  ): Promise<Record<string, unknown>> {
    for (;;) {
      const found = this.frames.find(predicate)
      if (found) return found
      const next = await this.reader.read()
      if (next.done) throw new Error('NDJSON stream ended before target frame')
      this.buffer += new TextDecoder().decode(next.value, { stream: true })
      const lines = this.buffer.split('\n')
      this.buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (line) this.frames.push(JSON.parse(line))
      }
    }
  }
}

async function openBrokerLifecycle(
  baseUrl: string,
  credentials: { readonly token: string; readonly binding: string },
): Promise<ReadableStreamDefaultReader<Uint8Array>> {
  const response = await fetch(
    `${baseUrl}/api/_private/interaction-mcp/`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${credentials.token}`,
        'content-type': 'application/json',
        'x-ay-ple-runtime-binding': credentials.binding,
      },
      body: JSON.stringify({
        protocolVersion: 1,
        kind: 'lifecycle_open',
      }),
    },
  )
  assert.equal(response.status, 200)
  assert.ok(response.body)
  const reader = response.body.getReader()
  const accepted = await reader.read()
  assert.equal(accepted.done, false)
  assert.deepEqual(
    JSON.parse(new TextDecoder().decode(accepted.value)),
    {
      protocolVersion: 1,
      kind: 'lifecycle_accepted',
    },
  )
  return reader
}

function deferred<T>(): {
  readonly promise: Promise<T>
  readonly resolve: (value?: T) => void
} {
  let resolve!: (value?: T) => void
  const promise = new Promise<T>((settle) => {
    resolve = settle
  })
  return { promise, resolve }
}
