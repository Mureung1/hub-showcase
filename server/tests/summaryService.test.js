import test from 'node:test'
import assert from 'node:assert/strict'
import { createMockSummary } from '../services/summaryService.js'

test('mock summary returns the fixed three-field structure', () => {
  const result = createMockSummary('  오늘 처음 보는 도구가 많아서 계속 막혔다.  ')

  assert.equal(result.emotion, '정리되지 않은 피로감')
  assert.match(result.cause, /오늘 처음 보는 도구가 많아서 계속 막혔다/)
  assert.ok(result.action)
  assert.deepEqual(Object.keys(result), ['emotion', 'cause', 'action'])
})
