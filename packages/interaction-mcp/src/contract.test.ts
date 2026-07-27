import assert from 'node:assert/strict'
import test from 'node:test'

import {
  INTERACTION_BROKER_BODY_MAX_BYTES,
  InteractionContractError,
  decodeProposeStatePatchRequest,
  decodeProposeStatePatchResult,
  parseInteractionBrokerRequest,
  parseInteractionBrokerResponse,
} from './index.js'

const validRequest = {
  summary: '과제 마감 정보를 정리합니다.',
  question: '이 변경 방향을 반영할까요?',
  changes: [
    {
      label: '마감 일시',
      description: '강의계획서의 마감 안내를 반영합니다.',
      before: '미정',
      after: '2026-08-03 23:59',
      evidence: [
        {
          relativePath: 'materials/syllabus.txt',
          contentDigest: 'a'.repeat(64),
          locator: {
            type: 'text_quote',
            quote: '8월 3일 23:59까지 제출',
            occurrence: 1,
          },
        },
      ],
    },
  ],
} as const

test('public capability contract accepts one exact semantic Review request and its closed results', () => {
  assert.deepEqual(decodeProposeStatePatchRequest(validRequest), validRequest)

  for (const result of [
    { outcome: 'accept' },
    { outcome: 'revise', feedback: '제출 형식도 함께 적어 주세요.' },
    { outcome: 'reject' },
    { outcome: 'reject', feedback: '이번에는 반영하지 않습니다.' },
  ] as const) {
    assert.deepEqual(decodeProposeStatePatchResult(result), result)
  }
})

test('target contract rejects donor academic durability and double-confirmation fields', () => {
  for (const invalid of [
    { ...validRequest, requestKey: `proposal_${'1'.repeat(32)}` },
    { ...validRequest, workspaceId: `workspace_${'2'.repeat(32)}` },
    { ...validRequest, courseId: `course_${'3'.repeat(32)}` },
    { ...validRequest, baseRevision: 0 },
    { ...validRequest, patchId: `patch_${'4'.repeat(32)}` },
    { ...validRequest, nativeTurnId: 'turn-private' },
    { ...validRequest, browserInteractionId: `interaction_${'5'.repeat(32)}` },
    { outcome: 'accept', confirmationRequired: true },
    { outcome: 'cancel' },
  ]) {
    assert.throws(
      () =>
        'outcome' in invalid
          ? decodeProposeStatePatchResult(invalid)
          : decodeProposeStatePatchRequest(invalid),
      InteractionContractError,
    )
  }
})

test('private Broker wire decodes only exact handshake, call, result, and safe error envelopes', () => {
  const handshake = {
    protocolVersion: 1,
    kind: 'handshake',
    serverName: 'ay_ple_interaction',
    capabilities: ['propose_state_patch'],
  } as const
  const capabilityCall = {
    protocolVersion: 1,
    kind: 'capability_call',
    capability: 'propose_state_patch',
    request: validRequest,
  } as const
  const responses = [
    { protocolVersion: 1, kind: 'handshake_accepted' },
    {
      protocolVersion: 1,
      kind: 'capability_result',
      capability: 'propose_state_patch',
      result: { outcome: 'accept' },
    },
    {
      protocolVersion: 1,
      kind: 'error',
      code: 'interaction_interrupted',
      displayMessage: 'The interaction was interrupted.',
    },
  ] as const

  assert.deepEqual(
    parseInteractionBrokerRequest(JSON.stringify(handshake)),
    handshake,
  )
  assert.deepEqual(
    parseInteractionBrokerRequest(JSON.stringify(capabilityCall)),
    capabilityCall,
  )
  for (const response of responses) {
    assert.deepEqual(
      parseInteractionBrokerResponse(JSON.stringify(response)),
      response,
    )
  }

  for (const invalid of [
    { ...handshake, capabilities: ['propose_state_patch', 'other'] },
    { ...capabilityCall, operationId: `operation_${'1'.repeat(32)}` },
    { ...responses[1], result: { outcome: 'timeout' } },
    { ...responses[2], code: 'raw_transport_error' },
    { ...responses[2], nativeTurnId: 'turn-private' },
  ]) {
    assert.throws(
      () =>
        invalid.kind === 'handshake' || invalid.kind === 'capability_call'
          ? parseInteractionBrokerRequest(JSON.stringify(invalid))
          : parseInteractionBrokerResponse(JSON.stringify(invalid)),
      InteractionContractError,
    )
  }
  assert.throws(
    () =>
      parseInteractionBrokerResponse(
        `"${'x'.repeat(INTERACTION_BROKER_BODY_MAX_BYTES)}"`,
      ),
    InteractionContractError,
  )
})

test('public codecs enforce UTF-8 byte, cardinality, path, and union bounds', () => {
  const evidence = validRequest.changes[0].evidence[0]
  const change = validRequest.changes[0]
  const invalidRequests: unknown[] = [
    { ...validRequest, summary: '가'.repeat(683) },
    { ...validRequest, changes: [] },
    {
      ...validRequest,
      changes: Array.from({ length: 33 }, () => ({
        label: '변경',
        description: '설명',
        after: '값',
      })),
    },
    {
      ...validRequest,
      changes: [{ label: '변경', description: '설명' }],
    },
    {
      ...validRequest,
      changes: [{ ...change, before: '같음', after: '같음' }],
    },
    {
      ...validRequest,
      changes: [{ ...change, evidence: [] }],
    },
    {
      ...validRequest,
      changes: [
        {
          ...change,
          evidence: Array.from({ length: 9 }, () => evidence),
        },
      ],
    },
    {
      ...validRequest,
      changes: Array.from({ length: 3 }, (_, index) => ({
        ...change,
        label: `변경 ${index}`,
        evidence: Array.from(
          { length: index === 2 ? 1 : 8 },
          () => evidence,
        ),
      })),
    },
  ]
  for (const relativePath of [
    '/absolute.txt',
    'materials//source.txt',
    'materials/../source.txt',
    'materials\\source.txt',
    'materials/\0source.txt',
  ]) {
    invalidRequests.push({
      ...validRequest,
      changes: [
        {
          ...change,
          evidence: [{ ...evidence, relativePath }],
        },
      ],
    })
  }
  for (const locator of [
    { ...evidence.locator, quote: '' },
    { ...evidence.locator, occurrence: 0 },
    { ...evidence.locator, occurrence: 1025 },
    { ...evidence.locator, occurrence: 1.5 },
  ]) {
    invalidRequests.push({
      ...validRequest,
      changes: [
        {
          ...change,
          evidence: [{ ...evidence, locator }],
        },
      ],
    })
  }
  invalidRequests.push({
    ...validRequest,
    changes: [
      {
        ...change,
        evidence: [
          { ...evidence, contentDigest: evidence.contentDigest.toUpperCase() },
        ],
      },
    ],
  })

  for (const invalid of invalidRequests) {
    assert.throws(
      () => decodeProposeStatePatchRequest(invalid),
      InteractionContractError,
    )
  }
  for (const invalid of [
    { outcome: 'revise', feedback: ' ' },
    { outcome: 'revise', feedback: '가'.repeat(2731) },
    { outcome: 'reject', feedback: '가'.repeat(2731) },
    { outcome: 'accept', feedback: 'extra' },
  ]) {
    assert.throws(
      () => decodeProposeStatePatchResult(invalid),
      InteractionContractError,
    )
  }
})
