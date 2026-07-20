import assert from 'node:assert/strict'
import test from 'node:test'

import { fetchProductBootstrap, ProductApiError } from './product-api.js'

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
    async () => new Response(JSON.stringify({ workspace }), { status: 200 }),
  )

  assert.deepEqual(await fetchProductBootstrap(), workspace)
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
    async () => new Response(JSON.stringify({ workspace }), { status: 200 }),
  )

  assert.deepEqual(await fetchProductBootstrap(), workspace)
})

test('rejects persistence metadata in the Browser product contract', async (t) => {
  t.mock.method(
    globalThis,
    'fetch',
    async () =>
      new Response(
        JSON.stringify({
          workspace: {
            state: 'ready',
            storeFormatVersion: 2,
            confirmedRevision: 0,
            course: null,
            materials: [],
          },
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
