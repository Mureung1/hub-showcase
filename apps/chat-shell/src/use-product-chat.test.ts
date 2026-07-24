import assert from 'node:assert/strict'
import test from 'node:test'

import { isProductChatAvailable } from './use-product-chat.js'

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
