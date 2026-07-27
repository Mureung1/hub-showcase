import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import test from 'node:test'

import express from 'express'

import {
  AssignmentMcpHostError,
  createAssignmentMcpHost,
  type AssignmentMcpHost,
} from './assignment-mcp-host.js'
import type { StatePatch } from './semester-workspace.js'

const requestKey = 'proposal_11111111111111111111111111111111'
const secondRequestKey = 'proposal_22222222222222222222222222222222'
const workspaceId = 'workspace_33333333333333333333333333333333'
const courseId = 'course_44444444444444444444444444444444'

test('donor characterization: current MCP advertises academic correlation fields that the target discards', async () => {
  const host = createAssignmentMcpHost()
  const anotherHost = createAssignmentMcpHost()

  try {
    assert.match(host.token, /^[A-Za-z0-9_-]{43}$/)
    assert.notEqual(host.token, anotherHost.token)
    assert.deepEqual(host.nativeThreadConfig('http://127.0.0.1:3123/mcp'), {
      url: 'http://127.0.0.1:3123/mcp',
      token: host.token,
    })
    assert.throws(
      () => host.nativeThreadConfig('https://example.test/mcp'),
      (error: unknown) =>
        error instanceof AssignmentMcpHostError &&
        error.code === 'native_url_invalid',
    )

    await withMcpServer(host, async (url) => {
      const forbidden = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(jsonRpc(1, 'tools/list', {})),
      })
      assert.equal(forbidden.status, 403)
      assert.deepEqual(await forbidden.json(), {
        code: 'forbidden',
        displayMessage: 'The MCP request is not allowed.',
      })

      const initialized = await postMcp(
        url,
        host.token,
        jsonRpc(2, 'initialize', {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: { name: 'Codex', version: '1' },
        }),
      )
      assert.equal(initialized.status, 200)
      assert.deepEqual(await initialized.json(), {
        jsonrpc: '2.0',
        id: 2,
        result: {
          protocolVersion: '2025-03-26',
          capabilities: { tools: { listChanged: false } },
          serverInfo: {
            name: 'ay-ple-assignment-state-patch',
            version: '1.0.0',
          },
        },
      })

      const notification = await postMcp(url, host.token, {
        jsonrpc: '2.0',
        method: 'notifications/initialized',
      })
      assert.equal(notification.status, 202)
      assert.equal(await notification.text(), '')

      const listed = await postMcp(
        url,
        host.token,
        jsonRpc('list-1', 'tools/list', {}),
      )
      const listedBody = asRecord(await listed.json())
      const result = asRecord(listedBody.result)
      const tools = result.tools
      assert.ok(Array.isArray(tools))
      assert.equal(tools.length, 1)
      const advertised = asRecord(tools[0])
      assert.equal(advertised.name, 'propose_state_patch')
      const schema = asRecord(advertised.inputSchema)
      assert.equal(schema.additionalProperties, false)
      assert.deepEqual(schema.required, [
        'requestKey',
        'workspaceId',
        'courseId',
        'baseRevision',
        'summary',
        'changes',
        'evidence',
      ])

      const nativeList = await postMcp(
        url,
        host.token,
        jsonRpc('list-native', 'tools/list', {
          _meta: { progressToken: 0 },
        }),
      )
      assert.equal(nativeList.status, 200)
      const nativeListBody = asRecord(await nativeList.json())
      const nativeListResult = asRecord(nativeListBody.result)
      assert.ok(Array.isArray(nativeListResult.tools))
      assert.equal(nativeListResult.tools.length, 1)

      for (const [id, params] of [
        ['list-extra', { cursor: 'unexpected' }],
        ['list-meta-invalid', { _meta: 'unexpected' }],
      ] as const) {
        const invalidList = await postMcp(
          url,
          host.token,
          jsonRpc(id, 'tools/list', params),
        )
        assert.deepEqual(await invalidList.json(), {
          jsonrpc: '2.0',
          id,
          error: { code: -32602, message: 'The MCP request is invalid.' },
        })
      }
    })
  } finally {
    host.close()
    anotherHost.close()
  }
})

test('donor characterization: current call waits for its Turn while durable replay remains donor-only', async () => {
  const host = createAssignmentMcpHost({ bindingWaitMs: 500 })
  let invokedPayload: unknown
  let invokeCount = 0
  let mutationCount = 0
  const patch = fixturePatch(requestKey)
  const session = host.register({
    requestKey,
    async invoke(payload) {
      invokeCount += 1
      if (invokedPayload !== undefined) {
        if (!deepEqual(payload, invokedPayload)) throw new Error('conflict')
        return patch
      }
      invokedPayload = payload
      mutationCount += 1
      return patch
    },
  })
  const payload = fixturePayload(requestKey)

  try {
    await withMcpServer(host, async (url) => {
      const pending = postMcp(
        url,
        host.token,
        jsonRpc(10, 'tools/call', {
          name: 'propose_state_patch',
          arguments: payload,
        }),
      )
      await waitFor(() => true, 15)
      assert.equal(invokeCount, 0)

      session.bindNative({ threadId: 'thread-A', turnId: 'turn-A' })
      const committed = await pending
      assert.equal(committed.status, 200)
      assert.deepEqual(await committed.json(), {
        jsonrpc: '2.0',
        id: 10,
        result: {
          content: [
            {
              type: 'text',
              text: 'The StatePatch was committed for app review.',
            },
          ],
          structuredContent: { patchId: patch.id, status: 'pending' },
          isError: false,
        },
      })
      assert.equal(invokeCount, 1)
      assert.deepEqual(invokedPayload, payload)
      assert.deepEqual(session.latestPatch(), patch)

      const replay = await postMcp(
        url,
        host.token,
        jsonRpc(11, 'tools/call', {
          name: 'propose_state_patch',
          arguments: payload,
        }),
      )
      assert.deepEqual(await replay.json(), {
        jsonrpc: '2.0',
        id: 11,
        result: {
          content: [
            {
              type: 'text',
              text: 'The StatePatch was committed for app review.',
            },
          ],
          structuredContent: { patchId: patch.id, status: 'pending' },
          isError: false,
        },
      })
      assert.equal(invokeCount, 2)
      assert.equal(mutationCount, 1)

      const conflicting = await postMcp(
        url,
        host.token,
        jsonRpc(12, 'tools/call', {
          name: 'propose_state_patch',
          arguments: { ...payload, summary: 'conflicting payload' },
        }),
      )
      assert.equal(
        readToolError(await conflicting.json()),
        'The StatePatch proposal was not committed.',
      )
      assert.equal(invokeCount, 3)
      assert.equal(mutationCount, 1)
    })
  } finally {
    host.close()
  }
})

function deepEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

test('donor characterization: continuity failure stays failure without invoking academic authority', async () => {
  const host = createAssignmentMcpHost({ bindingWaitMs: 40 })
  let invokeCount = 0
  const cancelledSession = host.register({
    requestKey,
    async invoke() {
      invokeCount += 1
      return fixturePatch(requestKey)
    },
  })
  host.register({
    requestKey: secondRequestKey,
    async invoke() {
      invokeCount += 1
      return fixturePatch(secondRequestKey)
    },
  })

  try {
    await withMcpServer(host, async (url) => {
      const cancelledCall = postMcp(
        url,
        host.token,
        jsonRpc(20, 'tools/call', {
          name: 'propose_state_patch',
          arguments: fixturePayload(requestKey),
        }),
      )
      await waitFor(() => true, 10)
      cancelledSession.cancel()
      assert.equal(
        readToolError(await (await cancelledCall).json()),
        'The StatePatch proposal was not committed.',
      )

      const timedOut = await postMcp(
        url,
        host.token,
        jsonRpc(21, 'tools/call', {
          name: 'propose_state_patch',
          arguments: fixturePayload(secondRequestKey),
        }),
      )
      assert.equal(
        readToolError(await timedOut.json()),
        'The StatePatch proposal was not committed.',
      )
      assert.equal(invokeCount, 0)
    })
  } finally {
    host.close()
  }
})

test('malformed, unknown, and failed calls return bounded safe errors without private details', async () => {
  const host = createAssignmentMcpHost()
  const secretPath = '/Users/private/semester/secret.txt'
  const session = host.register({
    requestKey,
    async invoke() {
      throw new Error(`could not read ${secretPath}`)
    },
  })
  session.bindNative({ threadId: 'thread-B', turnId: 'turn-B' })

  try {
    await withMcpServer(host, async (url) => {
      const malformedJson = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-ay-ple-mcp-token': host.token,
        },
        body: '{broken',
      })
      assert.equal(malformedJson.status, 400)
      const malformedText = await malformedJson.text()
      assert.doesNotMatch(malformedText, /broken|SyntaxError|at /)

      const unknownTool = await postMcp(
        url,
        host.token,
        jsonRpc(31, 'tools/call', {
          name: 'read_file',
          arguments: fixturePayload(requestKey),
        }),
      )
      assert.deepEqual(await unknownTool.json(), {
        jsonrpc: '2.0',
        id: 31,
        error: { code: -32601, message: 'The MCP method is not available.' },
      })

      const unknownSession = await postMcp(
        url,
        host.token,
        jsonRpc(32, 'tools/call', {
          name: 'propose_state_patch',
          arguments: fixturePayload(secondRequestKey),
        }),
      )
      assert.deepEqual(await unknownSession.json(), {
        jsonrpc: '2.0',
        id: 32,
        error: {
          code: -32602,
          message: 'The proposal call is not available.',
        },
      })

      const failed = await postMcp(
        url,
        host.token,
        jsonRpc(33, 'tools/call', {
          name: 'propose_state_patch',
          arguments: fixturePayload(requestKey),
        }),
      )
      const failedText = JSON.stringify(await failed.json())
      assert.match(failedText, /not committed/)
      assert.doesNotMatch(failedText, /Users|private|secret|thread-B|turn-B/)
      assert.equal(session.latestPatch(), null)
    })
  } finally {
    host.close()
  }
})

async function withMcpServer(
  host: AssignmentMcpHost,
  body: (url: string) => Promise<void>,
): Promise<void> {
  const app = express()
  app.use('/mcp', host.router)
  const server = createServer(app)
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  assert.ok(address && typeof address === 'object')
  try {
    await body(`http://127.0.0.1:${address.port}/mcp`)
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()))
    })
  }
}

function postMcp(
  url: string,
  token: string,
  body: unknown,
): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-ay-ple-mcp-token': token,
    },
    body: JSON.stringify(body),
  })
}

function jsonRpc(
  id: number | string,
  method: string,
  params: Record<string, unknown>,
): Record<string, unknown> {
  return { jsonrpc: '2.0', id, method, params }
}

function fixturePayload(key: string): Record<string, unknown> {
  return {
    requestKey: key,
    workspaceId,
    courseId,
    baseRevision: 0,
    summary: '근거가 있는 Assignment 변경 제안',
    changes: {
      operation: 'assignment.upsert',
      values: {
        title: '개요 작성하기',
        dueAt: '2026-07-12T23:59:00+09:00',
        submissionMethod: 'LMS 과제함 업로드',
      },
    },
    evidence: [
      {
        field: 'title',
        rawMaterialId: 'material_55555555555555555555555555555555',
        digest: '6'.repeat(64),
        quote: '과제: 개요 작성하기',
      },
    ],
  }
}

function fixturePatch(key: string): StatePatch {
  return {
    id: 'patch_77777777777777777777777777777777',
    workspaceId,
    courseId,
    requestKey: key,
    baseRevision: 0,
    summary: '근거가 있는 Assignment 변경 제안',
    changes: {
      operation: 'assignment.upsert',
      values: {
        title: '개요 작성하기',
        dueAt: '2026-07-12T23:59:00+09:00',
        submissionMethod: 'LMS 과제함 업로드',
      },
    },
    evidence: [
      {
        field: 'title',
        rawMaterialId: 'material_55555555555555555555555555555555',
        digest: '6'.repeat(64),
        quote: '과제: 개요 작성하기',
      },
    ],
    status: 'pending',
    createdAt: '2026-07-20T00:00:00.000Z',
    applyOutcome: null,
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  assert.ok(typeof value === 'object' && value !== null && !Array.isArray(value))
  return value as Record<string, unknown>
}

function readToolError(value: unknown): string {
  const body = asRecord(value)
  const result = asRecord(body.result)
  const content = result.content
  assert.ok(Array.isArray(content))
  return String(asRecord(content[0]).text)
}

async function waitFor(
  predicate: () => boolean,
  delayMs: number,
): Promise<void> {
  if (predicate()) {
    await new Promise<void>((resolve) => setTimeout(resolve, delayMs))
  }
}
