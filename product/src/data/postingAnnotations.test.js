import assert from 'node:assert/strict'
import test from 'node:test'
import { getPostingLinePresentation } from './postingAnnotations.js'

test('한 문장의 복수 표식을 하나의 하이라이트와 번호 목록으로 정리한다', () => {
  const result = getPostingLinePresentation(
    { mark_n: 2, note_n: null, base_n: 4 },
    'baseline',
  )

  assert.equal(result.markClass, null)
  assert.deepEqual(result.annotations, [
    { type: 'deviation', number: 2, supClass: 'sup-dev' },
    { type: 'baseline', number: 4, supClass: 'sup-base' },
  ])
})

test('활성 탭의 표식이 있으면 해당 의미색을 우선한다', () => {
  const result = getPostingLinePresentation(
    { mark_n: 1, note_n: 3, base_n: null },
    'signal',
  )

  assert.equal(result.markClass, 'mark--signal')
})

test('표식이 없는 문장은 하이라이트하지 않는다', () => {
  assert.deepEqual(getPostingLinePresentation({ text: '일반 문장' }), {
    annotations: [],
    markClass: null,
  })
})
