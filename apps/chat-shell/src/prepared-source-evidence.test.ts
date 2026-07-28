import assert from 'node:assert/strict'
import test from 'node:test'

import { resolvePreparedEvidenceHighlight } from './prepared-source-evidence.js'

const target = {
  relativePath: 'assignment.txt',
  contentDigest: 'digest-1',
  quote: '마감은 8월 3일입니다.',
  occurrence: 2,
}

test('prepared source evidence highlights the requested non-overlapping occurrence', () => {
  assert.deepEqual(
    resolvePreparedEvidenceHighlight(
      'assignment.txt',
      {
        digest: 'digest-1',
        text:
          '마감은 8월 3일입니다.\n강의계획서: 마감은 8월 3일입니다.',
        truncated: false,
      },
      target,
    ),
    {
      state: 'focused',
      quoteIndex: 21,
    },
  )
})

test('prepared source evidence distinguishes digest drift from a truncated locator', () => {
  assert.deepEqual(
    resolvePreparedEvidenceHighlight(
      'assignment.txt',
      {
        digest: 'digest-2',
        text: target.quote,
        truncated: false,
      },
      target,
    ),
    { state: 'digest_mismatch' },
  )
  assert.deepEqual(
    resolvePreparedEvidenceHighlight(
      'assignment.txt',
      {
        digest: 'digest-1',
        text: '안전한 미리보기 앞부분',
        truncated: true,
      },
      target,
    ),
    { state: 'outside_preview' },
  )
})

test('prepared source evidence reports a locator mismatch only after a complete read', () => {
  assert.deepEqual(
    resolvePreparedEvidenceHighlight(
      'assignment.txt',
      {
        digest: 'digest-1',
        text: '마감 정보가 없습니다.',
        truncated: false,
      },
      target,
    ),
    { state: 'locator_mismatch' },
  )
  assert.deepEqual(
    resolvePreparedEvidenceHighlight(
      'other.txt',
      {
        digest: 'digest-1',
        text: target.quote,
        truncated: false,
      },
      target,
    ),
    { state: 'none' },
  )
})
