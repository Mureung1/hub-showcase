import assert from 'node:assert/strict'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { createServer, type Server } from 'node:http'
import test from 'node:test'

import type {
  InteractionBrokerRequest,
  InteractionBrokerResponse,
} from './index.js'

const validRequest = {
  summary: '과제 마감 정보를 정리합니다.',
  question: '이 변경 방향을 반영할까요?',
  changes: [
    {
      label: '마감 일시',
      description: '강의계획서의 마감 안내를 반영합니다.',
      after: '2026-08-03 23:59',
    },
  ],
} as const

test('built STDIO Adapter handshakes before initialize and maps one held POST to one structured result', async () => {
  let releaseCall: ((response: InteractionBrokerResponse) => void) | undefined
  const heldResponse = new Promise<InteractionBrokerResponse>((resolve) => {
    releaseCall = resolve
  })
  const broker = await startBroker(async (request) => {
    if (request.kind === 'handshake') {
      return { protocolVersion: 1, kind: 'handshake_accepted' }
    }
    return heldResponse
  })
  const client = startAdapter(broker.url)
  try {
    client.send({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'interaction-test', version: '1' },
      },
    })
    const initialized = await client.read()
    assert.equal(initialized.id, 1)
    assert.equal(
      (initialized.result as { protocolVersion: string }).protocolVersion,
      '2025-06-18',
    )
    assert.equal(broker.requests[0]?.kind, 'handshake')

    client.send({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {},
    })
    const listed = await client.read()
    assert.deepEqual(
      (listed.result as { tools: { name: string }[] }).tools.map(
        (tool) => tool.name,
      ),
      ['propose_state_patch'],
    )

    client.send({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: { name: 'propose_state_patch', arguments: validRequest },
    })
    await broker.waitForRequests(2)
    assert.equal(broker.requests.length, 2)
    assert.deepEqual(broker.requests[1], {
      protocolVersion: 1,
      kind: 'capability_call',
      capability: 'propose_state_patch',
      request: validRequest,
    })
    assert.equal(client.pendingOutputCount(), 0)

    releaseCall?.({
      protocolVersion: 1,
      kind: 'capability_result',
      capability: 'propose_state_patch',
      result: { outcome: 'accept' },
    })
    const called = await client.read()
    assert.deepEqual(
      (
        called.result as {
          structuredContent: unknown
          isError: boolean
        }
      ).structuredContent,
      { outcome: 'accept' },
    )
    assert.equal(
      (called.result as { isError: boolean }).isError,
      false,
    )
    assert.equal(broker.requests.length, 2)
  } finally {
    await client.close()
    await broker.close()
  }
})

test('invalid environment and rejected handshake never produce a successful initialize', async () => {
  const invalidClient = startAdapter('http://example.com/private')
  try {
    invalidClient.send({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'interaction-test', version: '1' },
      },
    })
    const response = await invalidClient.read()
    assert.equal(response.id, 1)
    assert.equal(response.result, undefined)
    assert.match(
      (response.error as { message: string }).message,
      /unavailable/i,
    )
    assert.doesNotMatch(JSON.stringify(response), /test-token|runtime_/)
  } finally {
    await invalidClient.close()
  }

  const broker = await startBroker(async () => ({
    protocolVersion: 1,
    kind: 'error',
    code: 'forbidden',
    displayMessage: 'The Broker rejected the handshake.',
  }))
  const rejectedClient = startAdapter(broker.url)
  try {
    rejectedClient.send({
      jsonrpc: '2.0',
      id: 2,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'interaction-test', version: '1' },
      },
    })
    const response = await rejectedClient.read()
    assert.equal(response.result, undefined)
    assert.match(
      (response.error as { message: string }).message,
      /unavailable/i,
    )
  } finally {
    await rejectedClient.close()
    await broker.close()
  }
})

test('Broker failure and transport loss are bounded MCP failures without retry or normal result', async () => {
  let calls = 0
  const broker = await startBroker(async (request, rawResponse) => {
    if (request.kind === 'handshake') {
      return { protocolVersion: 1, kind: 'handshake_accepted' }
    }
    calls += 1
    if (calls === 1) {
      return {
        protocolVersion: 1,
        kind: 'error',
        code: 'busy',
        displayMessage: 'Another interaction is already pending.',
      }
    }
    rawResponse.destroy()
    return null
  })
  const client = startAdapter(broker.url)
  try {
    await initialize(client)
    client.send({
      jsonrpc: '2.0',
      id: 10,
      method: 'tools/call',
      params: { name: 'propose_state_patch', arguments: validRequest },
    })
    const busy = await client.read()
    assert.equal((busy.result as { isError: boolean }).isError, true)
    assert.equal(
      (busy.result as { structuredContent?: unknown }).structuredContent,
      undefined,
    )

    client.send({
      jsonrpc: '2.0',
      id: 11,
      method: 'tools/call',
      params: { name: 'propose_state_patch', arguments: validRequest },
    })
    const lost = await client.read()
    assert.equal((lost.result as { isError: boolean }).isError, true)
    assert.equal(
      (lost.result as { structuredContent?: unknown }).structuredContent,
      undefined,
    )
    assert.equal(calls, 2)
  } finally {
    await client.close()
    await broker.close()
  }
})

test('MCP cancellation aborts the held POST without retry or a normal result', async () => {
  const broker = await startBroker(async (request) => {
    if (request.kind === 'handshake') {
      return { protocolVersion: 1, kind: 'handshake_accepted' }
    }
    return new Promise<InteractionBrokerResponse>(() => undefined)
  })
  const client = startAdapter(broker.url)
  try {
    await initialize(client)
    client.send({
      jsonrpc: '2.0',
      id: 20,
      method: 'tools/call',
      params: { name: 'propose_state_patch', arguments: validRequest },
    })
    await broker.waitForRequests(2)
    client.send({
      jsonrpc: '2.0',
      method: 'notifications/cancelled',
      params: { requestId: 20, reason: 'native timeout' },
    })
    const cancelled = await client.read()
    assert.equal(
      (cancelled.result as { isError: boolean }).isError,
      true,
    )
    assert.equal(
      (cancelled.result as { structuredContent?: unknown }).structuredContent,
      undefined,
    )
    assert.equal(broker.requests.length, 2)
  } finally {
    await client.close()
    await broker.close()
  }
})

async function initialize(client: AdapterClient): Promise<void> {
  client.send({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'interaction-test', version: '1' },
    },
  })
  const response = await client.read()
  assert.ok(response.result)
}

type JsonRpcResponse = {
  readonly id?: number | string | null
  readonly result?: unknown
  readonly error?: unknown
}

type AdapterClient = {
  send(value: unknown): void
  read(): Promise<JsonRpcResponse>
  pendingOutputCount(): number
  close(): Promise<void>
}

function startAdapter(brokerUrl: string): AdapterClient {
  const child = spawn(process.execPath, ['dist/stdio.js'], {
    cwd: new URL('..', import.meta.url),
    env: {
      ...process.env,
      AY_PLE_INTERACTION_BROKER_URL: brokerUrl,
      AY_PLE_INTERACTION_BROKER_TOKEN:
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopq',
      AY_PLE_INTERACTION_RUNTIME_BINDING:
        `runtime_${'a'.repeat(32)}`,
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  const output: JsonRpcResponse[] = []
  const waiters: ((value: JsonRpcResponse) => void)[] = []
  let buffer = ''
  child.stdout.setEncoding('utf8')
  child.stdout.on('data', (chunk: string) => {
    buffer += chunk
    while (true) {
      const newline = buffer.indexOf('\n')
      if (newline < 0) break
      const line = buffer.slice(0, newline)
      buffer = buffer.slice(newline + 1)
      if (line.length === 0) continue
      const value = JSON.parse(line) as JsonRpcResponse
      const waiter = waiters.shift()
      if (waiter) waiter(value)
      else output.push(value)
    }
  })
  return {
    send(value) {
      child.stdin.write(`${JSON.stringify(value)}\n`)
    },
    read() {
      const value = output.shift()
      if (value) return Promise.resolve(value)
      return new Promise((resolve) => waiters.push(resolve))
    },
    pendingOutputCount() {
      return output.length
    },
    async close() {
      await closeChild(child)
    },
  }
}

async function closeChild(
  child: ChildProcessWithoutNullStreams,
): Promise<void> {
  if (child.exitCode !== null) return
  child.stdin.end()
  await new Promise<void>((resolve) => {
    child.once('exit', () => resolve())
    setTimeout(() => {
      child.kill('SIGKILL')
    }, 2_000).unref()
  })
}

type TestBroker = {
  readonly url: string
  readonly requests: InteractionBrokerRequest[]
  waitForRequests(count: number): Promise<void>
  close(): Promise<void>
}

async function startBroker(
  respond: (
    request: InteractionBrokerRequest,
    response: import('node:http').ServerResponse,
  ) =>
    | InteractionBrokerResponse
    | null
    | Promise<InteractionBrokerResponse | null>,
): Promise<TestBroker> {
  const requests: InteractionBrokerRequest[] = []
  const requestWaiters: (() => void)[] = []
  const server = createServer(async (request, response) => {
    assert.equal(request.method, 'POST')
    assert.equal(
      request.headers.authorization,
      'Bearer ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopq',
    )
    assert.equal(
      request.headers['x-ay-ple-runtime-binding'],
      `runtime_${'a'.repeat(32)}`,
    )
    const chunks: Buffer[] = []
    for await (const chunk of request) chunks.push(Buffer.from(chunk))
    const value = JSON.parse(Buffer.concat(chunks).toString('utf8')) as
      InteractionBrokerRequest
    requests.push(value)
    for (const waiter of requestWaiters.splice(0)) waiter()
    const result = await respond(value, response)
    if (!result || response.destroyed) return
    response.writeHead(200, { 'content-type': 'application/json' })
    response.end(JSON.stringify(result))
  })
  await listen(server)
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  return {
    url: `http://127.0.0.1:${address.port}/api/_private/interaction-mcp`,
    requests,
    async waitForRequests(count) {
      while (requests.length < count) {
        await new Promise<void>((resolve) => requestWaiters.push(resolve))
      }
    },
    close: () => closeServer(server),
  }
}

async function listen(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject)
      resolve()
    })
  })
}

async function closeServer(server: Server): Promise<void> {
  server.closeAllConnections()
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error)
      else resolve()
    })
  })
}
