import assert from 'node:assert/strict'
import test from 'node:test'

import {
  ProductContractError,
  decodeBrowserSafeSemanticReview,
  decodeProductReviewFrame,
  decodeProductReviewResult,
} from '@ay-ple/product-contract'

const review = {
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
          quote: '8월 3일 23:59까지 제출',
          occurrence: 1,
          contextBefore: '과제 안내: ',
          contextAfter: ' (LMS)',
        },
      ],
    },
  ],
} as const

test('Browser-safe semantic Review and closed result preserve exact visible meaning', () => {
  assert.deepEqual(decodeBrowserSafeSemanticReview(review), review)
  for (const result of [
    { outcome: 'accept' },
    { outcome: 'revise', feedback: '제출 형식도 함께 적어 주세요.' },
    { outcome: 'reject' },
    { outcome: 'reject', feedback: '이번에는 반영하지 않습니다.' },
  ] as const) {
    assert.deepEqual(decodeProductReviewResult(result), result)
  }
})

test('Review frame decoder accepts only requested, resolved, and continuity failure', () => {
  const binding = {
    operationId: `operation_${'1'.repeat(32)}`,
    interactionId: `interaction_${'2'.repeat(32)}`,
  } as const
  const frames = [
    { type: 'review.requested', ...binding, review },
    {
      type: 'review.resolved',
      ...binding,
      result: { outcome: 'revise', feedback: '마감을 다시 확인해 주세요.' },
    },
    {
      type: 'review.failed',
      ...binding,
      reason: 'transport_failed',
    },
  ] as const

  for (const frame of frames) {
    assert.deepEqual(decodeProductReviewFrame(frame), frame)
  }
  for (const invalid of [
    { ...frames[0], brokerToken: 'private' },
    { ...frames[0], runtimeBinding: `runtime_${'3'.repeat(32)}` },
    { ...frames[0], nativeTurnId: 'turn-private' },
    { ...frames[0], patchId: `patch_${'4'.repeat(32)}` },
    { ...frames[0], baseRevision: 0 },
    { ...frames[2], reason: 'rejected' },
    {
      ...frames[0],
      review: {
        ...review,
        changes: [
          {
            ...review.changes[0],
            evidence: [
              {
                ...review.changes[0].evidence[0],
                locator: { type: 'text_quote', occurrence: 1 },
              },
            ],
          },
        ],
      },
    },
  ]) {
    assert.throws(() => decodeProductReviewFrame(invalid), ProductContractError)
  }
})

test('Browser Review rejects UTF-8, cardinality, evidence projection, and requested-frame overflow', () => {
  const change = review.changes[0]
  const evidence = change.evidence[0]
  const invalidReviews: unknown[] = [
    { ...review, question: '가'.repeat(683) },
    { ...review, changes: [] },
    {
      ...review,
      changes: [{ label: '변경', description: '설명' }],
    },
    {
      ...review,
      changes: [{ ...change, before: '같음', after: '같음' }],
    },
    {
      ...review,
      changes: [
        {
          ...change,
          evidence: [
            {
              ...evidence,
              contextBefore: '가'.repeat(1366),
            },
          ],
        },
      ],
    },
    {
      ...review,
      changes: [
        {
          ...change,
          evidence: Array.from({ length: 8 }, () => ({
            ...evidence,
            quote: '가'.repeat(5461),
            contextBefore: '가'.repeat(1365),
            contextAfter: '가'.repeat(1365),
          })),
        },
        {
          ...change,
          label: '두 번째 변경',
          evidence: Array.from({ length: 8 }, () => ({
            ...evidence,
            quote: '나'.repeat(5461),
            contextBefore: '나'.repeat(1365),
            contextAfter: '나'.repeat(1365),
          })),
        },
      ],
    },
  ]
  for (const invalid of invalidReviews) {
    assert.throws(
      () => decodeBrowserSafeSemanticReview(invalid),
      ProductContractError,
    )
  }

  const oversizedFrame = {
    type: 'review.requested',
    operationId: `operation_${'1'.repeat(32)}`,
    interactionId: `interaction_${'2'.repeat(32)}`,
    review: {
      ...review,
      changes: Array.from({ length: 32 }, (_, index) => ({
        label: `변경 ${index}`,
        description: '설명',
        before: '가'.repeat(2730),
        after: '나'.repeat(2730),
      })),
    },
  }
  assert.throws(
    () => decodeProductReviewFrame(oversizedFrame),
    ProductContractError,
  )
})
