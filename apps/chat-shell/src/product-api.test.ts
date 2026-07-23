import assert from 'node:assert/strict'
import test from 'node:test'

import {
  PUBLIC_PREVIEW_INVALID_RESPONSE_FIXTURES,
  PUBLIC_PREVIEW_SCENARIO_FIXTURES,
} from '@ay-ple/product-contract/testing'

import {
  activateProductWorkspace,
  executePublicPreviewCommand,
  fetchProductBootstrap,
  fetchProductMaterialPreview,
  fetchPublicPreviewResponse,
  fetchSettledProductBootstrap,
  ProductApiError,
  ProductStreamError,
  refreshProductMaterials,
  streamFirstAssignmentRetry,
  streamProductChat,
  submitProductReview,
} from './product-api.js'

test('observes the strict public preview projection from one additive product route', async (t) => {
  const expected = PUBLIC_PREVIEW_SCENARIO_FIXTURES.find(
    ({ name }) => name === 'ready',
  )!.response
  t.mock.method(globalThis, 'fetch', async (
    input: string | URL | Request,
    init?: RequestInit,
  ) => {
    assert.equal(input, '/api/product/public-preview')
    assert.deepEqual(init, {
      headers: { accept: 'application/json' },
      signal: undefined,
    })
    return new Response(JSON.stringify(expected), { status: 200 })
  })

  assert.deepEqual(await fetchPublicPreviewResponse(), expected)
})

test('posts one exact decoded public preview command without private transport fields', async (t) => {
  const expected = PUBLIC_PREVIEW_SCENARIO_FIXTURES.find(
    ({ name }) => name === 'confirmation_required',
  )!.response
  const command = {
    command: 'setup.prepare',
    input: {
      yearLevel: 2,
      term: '2',
      parentSelectionId: 'parent_selection_primary',
      leafName: '2026-2학기',
    },
  } as const
  t.mock.method(globalThis, 'fetch', async (
    input: string | URL | Request,
    init?: RequestInit,
  ) => {
    assert.equal(input, '/api/product/public-preview')
    assert.equal(init?.method, 'POST')
    assert.deepEqual(init?.headers, {
      accept: 'application/json',
      'content-type': 'application/json',
    })
    assert.deepEqual(JSON.parse(String(init?.body)), command)
    return new Response(JSON.stringify(expected), { status: 200 })
  })

  assert.deepEqual(await executePublicPreviewCommand(command), expected)
})

test('public preview observe fails closed on absent, malformed, or private response fields', async (t) => {
  const invalidValues = [
    undefined,
    '{',
    JSON.stringify(PUBLIC_PREVIEW_INVALID_RESPONSE_FIXTURES[0].value),
    JSON.stringify(
      PUBLIC_PREVIEW_INVALID_RESPONSE_FIXTURES.find(
        ({ name }) => name === 'absolute path',
      )!.value,
    ),
  ]
  let index = 0
  t.mock.method(globalThis, 'fetch', async () => {
    const value = invalidValues[index]
    index += 1
    return new Response(value, { status: 200 })
  })

  for (const _value of invalidValues) {
    await assertInvalidResponse(fetchPublicPreviewResponse())
  }
})

test('decodes a ready product snapshot without persistence metadata', async (t) => {
  const workspace = {
    state: 'ready',
    confirmedRevision: 0,
    course: null,
    materials: [],
    recovery: null,
  } as const
  t.mock.method(
    globalThis,
    'fetch',
    async () =>
      new Response(
        JSON.stringify({
          accountReadiness: { state: 'ready' },
          operationStatus: 'idle',
          workspace,
          history: emptyHistory(),
        }),
        { status: 200 },
      ),
  )

  assert.deepEqual(await fetchProductBootstrap(), {
    accountReadiness: { state: 'ready' },
    operationStatus: 'idle',
    workspace,
    history: emptyHistory(),
  })
})

test('returns one active product snapshot without waiting for settlement', async (t) => {
  let requests = 0
  t.mock.method(globalThis, 'fetch', async () => {
    requests += 1
    return new Response(
      JSON.stringify({
        accountReadiness: { state: 'ready' },
        operationStatus: 'active',
        workspace: null,
        history: emptyHistory(),
      }),
      { status: 200 },
    )
  })

  const bootstrap = await fetchProductBootstrap()

  assert.equal(requests, 1)
  assert.equal(bootstrap.operationStatus, 'active')
})

test('polls an active product operation until one idle bootstrap supplies the final settled read', async (t) => {
  let requests = 0
  t.mock.method(globalThis, 'fetch', async () => {
    requests += 1
    return new Response(
      JSON.stringify({
        accountReadiness: { state: 'ready' },
        operationStatus: requests === 1 ? 'active' : 'idle',
        workspace: null,
        history: emptyHistory(),
      }),
      { status: 200 },
    )
  })

  const bootstrap = await fetchSettledProductBootstrap()

  assert.equal(requests, 2)
  assert.equal(bootstrap.operationStatus, 'idle')
})

test('decodes an actionable incompatible product outcome without store versions', async (t) => {
  const workspace = {
    state: 'incompatible',
    readOnly: true,
    displayMessage: '최신 AY-PLE로 다시 여세요.',
  } as const
  t.mock.method(
    globalThis,
    'fetch',
    async () =>
      new Response(
        JSON.stringify({
          accountReadiness: {
            state: 'unavailable',
            displayMessage: 'Codex 상태를 확인할 수 없습니다.',
          },
          operationStatus: 'idle',
          workspace,
          history: emptyHistory(),
        }),
        { status: 200 },
      ),
  )

  assert.deepEqual((await fetchProductBootstrap()).workspace, workspace)
})

test('decodes only settled product history for reload', async (t) => {
  const courseId = `course_${'a'.repeat(32)}`
  const materialId = `material_${'b'.repeat(32)}`
  const assignmentId = `assignment_${'c'.repeat(32)}`
  const patchId = `patch_${'d'.repeat(32)}`
  const now = '2026-07-20T00:00:00.000Z'
  const bootstrap = {
    accountReadiness: {
      state: 'not_ready',
      displayMessage: 'Codex에 로그인해 주세요.',
    },
    operationStatus: 'idle',
    workspace: {
      state: 'ready',
      confirmedRevision: 1,
      course: { id: courseId, displayName: '알고리즘' },
      materials: [],
      recovery: null,
    },
    history: {
      assignments: [
        {
          id: assignmentId,
          courseId,
          title: '1차 과제',
          dueAt: '2026-07-25T14:59:00.000Z',
          submissionMethod: 'LMS',
          evidence: [
            {
              field: 'title',
              materialId,
              digest: 'e'.repeat(64),
              quote: '1차 과제',
            },
          ],
        },
      ],
      statePatches: [
        {
          id: patchId,
          courseId,
          baseRevision: 0,
          status: 'applied',
          createdAt: now,
          applyOutcome: {
            type: 'applied',
            assignmentId,
            resultingRevision: 1,
          },
        },
      ],
      userConfirmations: [
        {
          id: `confirmation_${'f'.repeat(32)}`,
          patchId,
          decision: 'accepted',
          settledAt: now,
          assignmentId,
          resultingRevision: 1,
          outcome: 'applied',
        },
      ],
      modelingRuns: [
        {
          id: `run_${'1'.repeat(32)}`,
          actionId: `action_${'2'.repeat(32)}`,
          courseId,
          recipe: {
            name: 'first-assignment',
            version: '1',
            requestedSkillName: 'ay-ple-first-assignment',
          },
          sources: [{ materialId, digest: 'e'.repeat(64) }],
          retryOfRunId: null,
          recovery: null,
          status: 'completed',
          validationOutcome: 'passed',
          createdAt: now,
          updatedAt: now,
          settledAt: now,
        },
      ],
    },
  } as const
  t.mock.method(
    globalThis,
    'fetch',
    async () => new Response(JSON.stringify(bootstrap), { status: 200 }),
  )

  assert.deepEqual(await fetchProductBootstrap(), bootstrap)
})

test('rejects persistence metadata in the Browser product contract', async (t) => {
  t.mock.method(
    globalThis,
    'fetch',
    async () =>
      new Response(
        JSON.stringify({
          accountReadiness: { state: 'ready' },
          operationStatus: 'idle',
          workspace: {
            state: 'ready',
            storeFormatVersion: 2,
            confirmedRevision: 0,
            course: null,
            materials: [],
            recovery: null,
          },
          history: emptyHistory(),
        }),
        { status: 200 },
      ),
  )

  await assert.rejects(
    fetchProductBootstrap(),
    (error: unknown) =>
      error instanceof ProductApiError && error.code === 'invalid_response',
  )
})

test('rejects pending or privately correlated product history', async (t) => {
  const courseId = `course_${'a'.repeat(32)}`
  t.mock.method(
    globalThis,
    'fetch',
    async () =>
      new Response(
        JSON.stringify({
          accountReadiness: { state: 'ready' },
          operationStatus: 'idle',
          workspace: {
            state: 'ready',
            confirmedRevision: 0,
            course: { id: courseId, displayName: '알고리즘' },
            materials: [],
            recovery: null,
          },
          history: {
            ...emptyHistory(),
            statePatches: [
              {
                id: `patch_${'b'.repeat(32)}`,
                courseId,
                baseRevision: 0,
                status: 'pending',
                createdAt: '2026-07-20T00:00:00.000Z',
                applyOutcome: null,
                requestKey: 'private-request-key',
              },
            ],
          },
        }),
        { status: 200 },
      ),
  )

  await assertInvalidResponse(fetchProductBootstrap())
})

test('rejects an unreconciled acceptance-unknown ModelingRun as settled history', async (t) => {
  const courseId = `course_${'a'.repeat(32)}`
  const now = '2026-07-20T00:00:00.000Z'
  t.mock.method(
    globalThis,
    'fetch',
    async () =>
      new Response(
        JSON.stringify({
          accountReadiness: { state: 'ready' },
          operationStatus: 'idle',
          workspace: {
            state: 'ready',
            confirmedRevision: 0,
            course: { id: courseId, displayName: '알고리즘' },
            materials: [],
            recovery: null,
          },
          history: {
            ...emptyHistory(),
            modelingRuns: [
              {
                id: `run_${'b'.repeat(32)}`,
                actionId: `action_${'c'.repeat(32)}`,
                courseId,
                recipe: {
                  name: 'first-assignment',
                  version: '1',
                  requestedSkillName: 'ay-ple-first-assignment',
                },
                sources: [],
                status: 'acceptance_unknown',
                validationOutcome: 'unknown',
                createdAt: now,
                updatedAt: now,
                settledAt: now,
              },
            ],
          },
        }),
        { status: 200 },
      ),
  )

  await assertInvalidResponse(fetchProductBootstrap())
})

test('rejects compatibility diagnostics in an activation response', async (t) => {
  t.mock.method(
    globalThis,
    'fetch',
    async () =>
      new Response(
        JSON.stringify({
          status: 'activated',
          workspace: {
            state: 'incompatible',
            readOnly: true,
            displayMessage: '지원되는 AY-PLE로 다시 여세요.',
            compatibilityDiagnostics: { foundStoreFormatVersion: 3 },
          },
        }),
        { status: 200 },
      ),
  )

  await assertInvalidResponse(activateProductWorkspace())
})

test('preserves a cancelled activation so application state can remain intact', async (t) => {
  const response = { status: 'cancelled', workspace: null } as const
  t.mock.method(
    globalThis,
    'fetch',
    async () =>
      new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
  )

  assert.deepEqual(await activateProductWorkspace(), response)
})

test('decodes an explicit source rebaseline response through the shared contract', async (t) => {
  const response = {
    outcome: 'source_rebaselined',
    workspace: {
      state: 'ready',
      confirmedRevision: 0,
      course: null,
      materials: [],
      recovery: null,
    },
  } as const
  t.mock.method(
    globalThis,
    'fetch',
    async () =>
      new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
  )

  assert.deepEqual(await refreshProductMaterials(), response)
})

test('rejects a physical store path in a refresh response', async (t) => {
  t.mock.method(
    globalThis,
    'fetch',
    async () =>
      new Response(
        JSON.stringify({
          outcome: 'refreshed',
          workspace: {
            state: 'ready',
            confirmedRevision: 0,
            course: null,
            materials: [],
            recovery: null,
            storePath: '/private/workspace/.ay-ple/workspace-state.json',
          },
        }),
        { status: 200 },
      ),
  )

  await assertInvalidResponse(refreshProductMaterials())
})

test('rejects a store version in a preview response', async (t) => {
  const materialId = `material_${'a'.repeat(32)}`
  const digest = 'b'.repeat(64)
  t.mock.method(
    globalThis,
    'fetch',
    async () =>
      new Response(
        JSON.stringify({
          materialId,
          relativePath: 'source.txt',
          digest,
          mediaType: 'text/plain; charset=utf-8',
          size: 6,
          text: 'source',
          truncated: false,
          storeFormatVersion: 2,
        }),
        { status: 200 },
      ),
  )

  await assertInvalidResponse(
    fetchProductMaterialPreview({ id: materialId, digest }),
  )
})

test('product Chat sends the shared request and decodes only closed frames', async (t) => {
  const operationId = `chat_${'a'.repeat(32)}`
  const frames = [
    { type: 'operation.preparing', operationId },
    { type: 'operation.terminal', operationId, status: 'completed' },
  ] as const
  t.mock.method(globalThis, 'fetch', async (
    input: string | URL | Request,
    init?: RequestInit,
  ) => {
    assert.equal(input, '/api/product/chat/messages')
    assert.deepEqual(JSON.parse(String(init?.body)), {
      text: '자료를 비교해 줘',
      materials: [],
    })
    return new Response(`${frames.map((frame) => JSON.stringify(frame)).join('\n')}\n`, {
      status: 200,
      headers: { 'content-type': 'application/x-ndjson' },
    })
  })
  const received: unknown[] = []

  await streamProductChat(
    { text: '자료를 비교해 줘', materials: [] },
    (frame) => received.push(frame),
  )

  assert.deepEqual(received, frames)
})

test('first Assignment explicit retry streams the exact prior Run request', async (t) => {
  const courseId = `course_${'a'.repeat(32)}`
  const retryOfRunId = `run_${'b'.repeat(32)}`
  const operationId = `action_${'c'.repeat(32)}`
  const runId = `run_${'d'.repeat(32)}`
  const request = {
    courseId,
    recipeVersion: '2',
    arguments: { timezone: 'Asia/Seoul' },
    materials: [
      { id: `material_${'e'.repeat(32)}`, digest: '1'.repeat(64) },
      { id: `material_${'f'.repeat(32)}`, digest: '2'.repeat(64) },
    ],
    retryOfRunId,
  } as const
  const frames = [
    { type: 'operation.preparing', operationId, runId },
    { type: 'operation.accepted', operationId, runId },
    {
      type: 'operation.recovery',
      operationId,
      runId,
      outcome: 'interrupted',
      retryable: true,
    },
    {
      type: 'operation.terminal',
      operationId,
      runId,
      status: 'interrupted',
      validationOutcome: 'unknown',
    },
  ] as const
  t.mock.method(globalThis, 'fetch', async (
    input: string | URL | Request,
    init?: RequestInit,
  ) => {
    assert.equal(input, '/api/product/actions/first-assignment/retry')
    assert.equal(init?.method, 'POST')
    assert.deepEqual(JSON.parse(String(init?.body)), request)
    return new Response(
      `${frames.map((frame) => JSON.stringify(frame)).join('\n')}\n`,
      {
        status: 200,
        headers: { 'content-type': 'application/x-ndjson' },
      },
    )
  })
  const received: unknown[] = []

  await streamFirstAssignmentRetry(request, (frame) => received.push(frame))

  assert.deepEqual(received, frames)
})

test('submits exact accept, revise feedback, and reject Review requests', async (t) => {
  const interactionId = `interaction_${'a'.repeat(32)}`
  const patchId = `patch_${'b'.repeat(32)}`
  const decisionKey = `decision_${'c'.repeat(32)}`
  const requests = [
    { patchId, decisionKey, decision: 'accept' },
    {
      patchId,
      decisionKey,
      decision: 'revise',
      feedback: '마감을 7월 13일 23:59로 바꿔 주세요.',
    },
    { patchId, decisionKey, decision: 'reject' },
  ] as const
  const responses = [
    {
      patchId,
      decisionKey,
      decision: 'accepted',
      outcome: 'applied',
      confirmedRevision: 1,
      replayed: false,
      continuation: 'continued',
    },
    {
      patchId,
      decisionKey,
      decision: 'revision_requested',
      outcome: 'replacement_pending',
      confirmedRevision: 0,
      replayed: false,
      continuation: 'continued',
    },
    {
      patchId,
      decisionKey,
      decision: 'rejected',
      outcome: 'not_applied',
      confirmedRevision: 0,
      replayed: false,
      continuation: 'continued',
    },
  ] as const
  let requestIndex = 0
  t.mock.method(globalThis, 'fetch', async (
    input: string | URL | Request,
    init?: RequestInit,
  ) => {
    assert.equal(input, `/api/product/reviews/${interactionId}`)
    assert.deepEqual(JSON.parse(String(init?.body)), requests[requestIndex])
    const response = responses[requestIndex]
    requestIndex += 1
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  })

  for (let index = 0; index < requests.length; index += 1) {
    assert.deepEqual(
      await submitProductReview(interactionId, requests[index]!),
      responses[index],
    )
  }
  assert.equal(requestIndex, requests.length)
})

test('product stream rejects private native fields', async (t) => {
  t.mock.method(
    globalThis,
    'fetch',
    async () =>
      new Response(
        `${JSON.stringify({
          type: 'operation.preparing',
          operationId: `chat_${'a'.repeat(32)}`,
          nativeRequestId: 42,
        })}\n`,
        {
          status: 200,
          headers: { 'content-type': 'application/x-ndjson' },
        },
      ),
  )

  await assert.rejects(
    streamProductChat({ text: '질문', materials: [] }, () => undefined),
    ProductStreamError,
  )
})

async function assertInvalidResponse(operation: Promise<unknown>): Promise<void> {
  await assert.rejects(
    operation,
    (error: unknown) =>
      error instanceof ProductApiError && error.code === 'invalid_response',
  )
}

function emptyHistory() {
  return {
    assignments: [],
    statePatches: [],
    userConfirmations: [],
    modelingRuns: [],
  }
}
