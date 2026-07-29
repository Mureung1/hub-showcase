import assert from 'node:assert/strict'
import test from 'node:test'

import * as productContract from '@ay-ple/product-contract'
import {
  PRODUCT_ACTION_FILE_REF_MAX_ENTRIES,
  PRODUCT_WORKSPACE_SOURCE_RELATIVE_PATH_MAX_BYTES,
  ProductContractError,
  decodeProductInteractionAnswerRequest,
  decodeTargetProductActionInvocationRequest,
  decodeTargetProductChatRequest,
  decodeTargetProductOperationFrame,
  isProductOperationId,
} from '@ay-ple/product-contract'

test('package root exposes only the target Browser-safe contract', () => {
  assert.deepEqual(Object.keys(productContract).sort(), [
    'PRODUCT_ACTION_FILE_REF_MAX_ENTRIES',
    'PRODUCT_JSON_ENVELOPE_MAX_BYTES',
    'PRODUCT_REVIEW_CITATIONS_MAX_BYTES',
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
    'decodeTargetProductActionInvocationRequest',
    'decodeTargetProductBootstrap',
    'decodeTargetProductChatRequest',
    'decodeTargetProductOperationFrame',
    'isProductInteractionId',
    'isProductOperationId',
    'isProductQuestionId',
  ])
})

test('target ActionInvocation publishes its maximum file-reference count', () => {
  assert.equal(PRODUCT_ACTION_FILE_REF_MAX_ENTRIES, 16)
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
  assert.throws(
    () =>
      decodeTargetProductChatRequest({
        text: request.text,
        action: 'model_semester',
      }),
    ProductContractError,
  )
  assert.throws(
    () =>
      decodeTargetProductChatRequest({
        text: request.text,
        files: [{ relativePath: '자료.md' }],
      }),
    ProductContractError,
  )
})

test('target ActionInvocation decodes one ordered workspace file reference', () => {
  const request = {
    action: 'model_semester',
    files: [{ relativePath: '운영체제/과제 안내.md' }],
  } as const

  assert.deepEqual(
    decodeTargetProductActionInvocationRequest(request),
    request,
  )
})

test('target ActionInvocation preserves sixteen references and optional Turn settings', () => {
  const request = {
    action: 'model_semester',
    files: Array.from(
      { length: PRODUCT_ACTION_FILE_REF_MAX_ENTRIES },
      (_, index) => ({
        relativePath: `자료/${String(index + 1).padStart(2, '0')}.md`,
      }),
    ),
    codexSettings: {
      model: 'gpt-5.4',
      reasoningEffort: 'medium',
      serviceTier: 'fast',
    },
  } as const

  assert.deepEqual(
    decodeTargetProductActionInvocationRequest(request),
    request,
  )
})

test('target ActionInvocation rejects open, duplicate, unsafe, and oversized input', () => {
  const file = { relativePath: '자료/과제.md' }
  for (const invalid of [
    { action: 'unknown', files: [file] },
    { action: 'model_semester', files: [file], skill: 'unsafe' },
    {
      action: 'model_semester',
      files: [{ ...file, content: 'unsafe' }],
    },
    { action: 'model_semester', files: [] },
    { action: 'model_semester', files: [file, file] },
    {
      action: 'model_semester',
      files: Array.from(
        { length: PRODUCT_ACTION_FILE_REF_MAX_ENTRIES + 1 },
        (_, index) => ({
          relativePath: `자료/${index}.md`,
        }),
      ),
    },
    { action: 'model_semester', files: [{ relativePath: '/자료.md' }] },
    { action: 'model_semester', files: [{ relativePath: '../자료.md' }] },
    {
      action: 'model_semester',
      files: [{ relativePath: '자료\\과제.md' }],
    },
    {
      action: 'model_semester',
      files: [{ relativePath: '자료/\0과제.md' }],
    },
    {
      action: 'model_semester',
      files: [
        {
          relativePath: '가'.repeat(
            PRODUCT_WORKSPACE_SOURCE_RELATIVE_PATH_MAX_BYTES,
          ),
        },
      ],
    },
    {
      action: 'model_semester',
      files: Array.from({ length: 5 }, (_, index) => ({
        relativePath: `${index}-${'a'.repeat(3_900)}.md`,
      })),
    },
    {
      action: 'model_semester',
      files: [file],
      codexSettings: {
        model: 'gpt-5.4',
        reasoningEffort: 'medium',
        serviceTier: 'turbo',
      },
    },
  ]) {
    assert.throws(
      () => decodeTargetProductActionInvocationRequest(invalid),
      ProductContractError,
    )
  }
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
