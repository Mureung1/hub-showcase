import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeUserFacingCopy } from './userFacingCopy.js'

test('API payload의 사용자 문구만 포스터 용어로 바꾼다', () => {
  const source = {
    baseline: '기준선 · 공통 항목',
    deviations: ['기업군 편차', '편차 1 · 추가 준비'],
    nested: { label: '직무 베이스라인의 편차' },
  }

  const result = normalizeUserFacingCopy(source)

  assert.deepEqual(result, {
    baseline: '직무 공통 기대치 · 공통 항목',
    deviations: ['기업군별 추가 요구', '추가 요구 1 · 추가 준비'],
    nested: { label: '직무 공통 기대치와의 차이' },
  })
  assert.notEqual(result, source)
  assert.equal(source.baseline, '기준선 · 공통 항목')
})

test('숫자·불리언·null과 내부 키는 그대로 둔다', () => {
  assert.deepEqual(normalizeUserFacingCopy({ is_deviation: true, dev_n: 2, value: null }), {
    is_deviation: true,
    dev_n: 2,
    value: null,
  })
})
