import assert from 'node:assert/strict'
import test from 'node:test'

import {
  activateProductWorkspace,
  fetchProductBootstrap,
  fetchProductMaterialPreview,
  ProductApiError,
  refreshProductMaterials,
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

test('rejects internal store metadata across activation, refresh, and preview', async (t) => {
  const materialId = `material_${'a'.repeat(32)}`
  const digest = 'b'.repeat(64)
  t.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url === '/api/product/workspaces/activate') {
      return new Response(
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
      )
    }
    if (url === '/api/product/materials/refresh') {
      return new Response(
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
      )
    }
    return new Response(
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
    )
  })

  for (const operation of [
    () => activateProductWorkspace(),
    () => refreshProductMaterials(),
    () => fetchProductMaterialPreview({ id: materialId, digest }),
  ]) {
    await assert.rejects(
      operation(),
      (error: unknown) =>
        error instanceof ProductApiError && error.code === 'invalid_response',
    )
  }
})
