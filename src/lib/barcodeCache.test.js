import { describe, it, expect, beforeEach } from 'vitest'
import { getCachedProduct, cacheProduct } from './barcodeCache.js'

const SAMPLE_PRODUCT = {
  items: [{ name: '테스트 도시락', brand: null, nutrients: { calories: 500 }, source: 'label' }],
  total: { calories: 500 },
}

describe('barcodeCache', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('캐시가 없으면 null을 반환한다', () => {
    expect(getCachedProduct('8801234567890')).toBeNull()
  })

  it('저장한 제품을 그대로 다시 읽을 수 있다', () => {
    cacheProduct('8801234567890', SAMPLE_PRODUCT)
    expect(getCachedProduct('8801234567890')).toEqual(SAMPLE_PRODUCT)
  })

  it('서로 다른 바코드는 독립적으로 저장된다', () => {
    cacheProduct('111', { items: [], total: { calories: 1 } })
    cacheProduct('222', { items: [], total: { calories: 2 } })
    expect(getCachedProduct('111').total.calories).toBe(1)
    expect(getCachedProduct('222').total.calories).toBe(2)
  })

  it('ean이 없으면 조회·저장 모두 조용히 아무 것도 하지 않는다', () => {
    expect(getCachedProduct(null)).toBeNull()
    expect(getCachedProduct('')).toBeNull()
    expect(() => cacheProduct(null, SAMPLE_PRODUCT)).not.toThrow()
    expect(() => cacheProduct('', SAMPLE_PRODUCT)).not.toThrow()
  })

  it('product가 없으면 저장하지 않는다', () => {
    expect(() => cacheProduct('333', null)).not.toThrow()
    expect(getCachedProduct('333')).toBeNull()
  })
})
