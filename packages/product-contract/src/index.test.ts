import assert from 'node:assert/strict'
import test from 'node:test'

import * as productContract from '@ay-ple/product-contract'
import {
  ProductContractError,
  decodeProductInteractionAnswerRequest,
  decodeTargetProductChatRequest,
  decodeTargetProductOperationFrame,
  isProductOperationId,
} from '@ay-ple/product-contract'

test('package root exposes only the target Browser-safe contract', () => {
  assert.deepEqual(Object.keys(productContract).sort(), [
    'PRODUCT_JSON_ENVELOPE_MAX_BYTES',
    'PRODUCT_REVIEW_EVIDENCE_MAX_BYTES',
    'PRODUCT_REVIEW_REQUESTED_FRAME_MAX_BYTES',
    'PRODUCT_WORKSPACE_SOURCE_LIST_MAX_BYTES',
    'PRODUCT_WORKSPACE_SOURCE_LIST_MAX_ENTRIES',
    'PRODUCT_WORKSPACE_SOURCE_RELATIVE_PATH_MAX_BYTES',
    'PRODUCT_WORKSPACE_TEXT_PREVIEW_MAX_BYTES',
    'PRODUCT_WORKSPACE_TEXT_PREVIEW_MAX_JSON_BYTES',
    'ProductContractError',
    'decodeBrowserSafeSemanticReview',
    'decodeEmptyProductRequest',
    'decodeProductAccountReadiness',
    'decodeProductCodexSettings',
    'decodeProductCodexTurnSettings',
    'decodeProductError',
    'decodeProductInteractionAnswerRequest',
    'decodeProductReviewFrame',
    'decodeProductReviewResult',
    'decodeProductWorkspaceLifecycle',
    'decodeProductWorkspaceSourceList',
    'decodeProductWorkspaceTextPreview',
    'decodeTargetProductBootstrap',
    'decodeTargetProductChatRequest',
    'decodeTargetProductOperationFrame',
    'isProductInteractionId',
    'isProductOperationId',
    'isProductQuestionId',
  ])
})

test('target Chat request excludes academic material selection', () => {
  const request = {
    text: '학기 작업을 도와 줘.',
    codexSettings: {
      model: 'gpt-5.4',
      reasoningEffort: 'medium',
      serviceTier: 'fast',
    },
  } as const
  assert.deepEqual(decodeTargetProductChatRequest(request), request)
  assert.throws(
    () => decodeTargetProductChatRequest({ text: request.text, materials: [] }),
    ProductContractError,
  )
})

test('target operation decoder accepts target ids and rejects academic ids', () => {
  const operationId = `operation_${'1'.repeat(32)}`
  const target = {
    type: 'operation.accepted',
    operationId,
  } as const
  assert.equal(isProductOperationId(operationId), true)
  assert.deepEqual(decodeTargetProductOperationFrame(target), target)
  for (const oldId of [
    `chat_${'2'.repeat(32)}`,
    `action_${'3'.repeat(32)}`,
  ]) {
    assert.equal(isProductOperationId(oldId), false)
    assert.throws(
      () =>
        decodeTargetProductOperationFrame({
          type: 'operation.accepted',
          operationId: oldId,
        }),
      ProductContractError,
    )
  }
})

test('general clarification answers remain Browser-safe', () => {
  const request = {
    answers: {
      [`question_${'4'.repeat(32)}`]: ['선택'],
    },
  }
  assert.deepEqual(
    decodeProductInteractionAnswerRequest(request).answers[
      `question_${'4'.repeat(32)}`
    ],
    ['선택'],
  )
})
