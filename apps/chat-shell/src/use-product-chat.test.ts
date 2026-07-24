import assert from 'node:assert/strict'
import test from 'node:test'

import {
  isProductChatAvailable,
  productChatMaterials,
} from './use-product-chat.js'

test('keeps general AY Chat available before a course is created', () => {
  assert.equal(
    isProductChatAvailable(
      { state: 'ready' },
      {
        state: 'ready',
        confirmedRevision: 0,
        course: null,
        materials: [],
        recovery: null,
      },
    ),
    true,
  )
})

test('omits selected academic materials from course-free general Chat', () => {
  const material = {
    id: 'material_1',
    relativePath: 'note.txt',
    digest: 'a'.repeat(64),
    mediaType: 'text/plain; charset=utf-8',
    size: 4,
  } as const

  assert.deepEqual(
    productChatMaterials(
      {
        state: 'ready',
        confirmedRevision: 0,
        course: null,
        materials: [material],
        recovery: null,
      },
      [material],
    ),
    [],
  )
})
