import assert from 'node:assert/strict'
import test from 'node:test'

import {
  ProductContractError,
  decodePublicPreviewResponse,
} from '@ay-ple/product-contract'
import {
  PUBLIC_PREVIEW_INVALID_RESPONSE_FIXTURES,
  PUBLIC_PREVIEW_SCENARIO_FIXTURES,
} from '@ay-ple/product-contract/testing'

test('Browser consumer preserves the shared public preview fixture roster', () => {
  for (const fixture of PUBLIC_PREVIEW_SCENARIO_FIXTURES) {
    const wireValue = JSON.parse(JSON.stringify(fixture.response))
    assert.deepEqual(
      decodePublicPreviewResponse(wireValue),
      fixture.response,
      fixture.name,
    )
  }
})

test('Browser consumer rejects the shared missing extra unknown and private family', () => {
  for (const fixture of PUBLIC_PREVIEW_INVALID_RESPONSE_FIXTURES) {
    assert.throws(
      () => decodePublicPreviewResponse(fixture.value),
      ProductContractError,
      fixture.name,
    )
  }
})
