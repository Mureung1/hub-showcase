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

test('Server producer emits the shared public preview fixture roster exactly', () => {
  for (const fixture of PUBLIC_PREVIEW_SCENARIO_FIXTURES) {
    const produced = JSON.parse(JSON.stringify(fixture.response))
    assert.deepEqual(
      decodePublicPreviewResponse(produced),
      fixture.response,
      fixture.name,
    )
  }
})

test('Server producer contract rejects the shared invalid family', () => {
  for (const fixture of PUBLIC_PREVIEW_INVALID_RESPONSE_FIXTURES) {
    assert.throws(
      () => decodePublicPreviewResponse(fixture.value),
      ProductContractError,
      fixture.name,
    )
  }
})
