import assert from 'node:assert/strict'
import test from 'node:test'

import {
  activateProductWorkspace,
  fetchProductBootstrap,
  fetchProductMaterialPreview,
  ProductApiError,
  ProductStreamError,
  refreshProductMaterials,
  streamProductChat,
} from './product-api.js'

test('decodes a ready product snapshot without persistence metadata', async (t) => {
  const workspace = {
    state: 'ready',
    confirmedRevision: 0,
    course: null,
    materials: [],
  } as const
  t.mock.method(
    globalThis,
    'fetch',
    async () =>
      new Response(
        JSON.stringify({
          accountReadiness: { state: 'ready' },
          workspace,
          history: emptyHistory(),
        }),
        { status: 200 },
      ),
  )

  assert.deepEqual(await fetchProductBootstrap(), {
    accountReadiness: { state: 'ready' },
    workspace,
    history: emptyHistory(),
  })
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
    workspace: {
      state: 'ready',
      confirmedRevision: 1,
      course: { id: courseId, displayName: '알고리즘' },
      materials: [],
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
          workspace: {
            state: 'ready',
            storeFormatVersion: 2,
            confirmedRevision: 0,
            course: null,
            materials: [],
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
          workspace: {
            state: 'ready',
            confirmedRevision: 0,
            course: { id: courseId, displayName: '알고리즘' },
            materials: [],
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
          workspace: {
            state: 'ready',
            confirmedRevision: 0,
            course: { id: courseId, displayName: '알고리즘' },
            materials: [],
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

test('rejects a physical store path in a refresh response', async (t) => {
  t.mock.method(
    globalThis,
    'fetch',
    async () =>
      new Response(
        JSON.stringify({
          workspace: {
            state: 'ready',
            confirmedRevision: 0,
            course: null,
            materials: [],
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
