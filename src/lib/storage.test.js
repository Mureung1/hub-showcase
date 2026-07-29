// 안정성 점검(Phase B) — set()이 localStorage 용량 초과 등으로 실패했을 때 예외를 삼키고 조용히
// "성공"인 척하지 않는지가 이 파일의 핵심 계약이다. 그 실패를 진짜 사용자에게 알려야 하는 호출부
// (mealStore.js 등)는 이 반환값(boolean)을 보고 명시적으로 던진다.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { get, remove, set } from './storage.js'

describe('storage', () => {
  afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('정상 상황에서 set은 true를 반환하고 get으로 그대로 읽힌다', () => {
    expect(set('k', { a: 1 })).toBe(true)
    expect(get('k')).toEqual({ a: 1 })
  })

  it('localStorage.setItem이 예외를 던지면(용량 초과 등) set은 던지지 않고 false를 반환한다', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('exceeded quota', 'QuotaExceededError')
    })
    expect(() => set('k', { a: 1 })).not.toThrow()
    expect(set('k', { a: 1 })).toBe(false)
  })

  it('저장이 실패해도 이전 값이 그대로 남아있다(부분 쓰기로 깨지지 않음)', () => {
    set('k', { a: 1 })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    set('k', { a: 2 })
    expect(get('k')).toEqual({ a: 1 })
  })

  it('get은 저장된 적 없는 키에 대해 기본값을 반환한다', () => {
    expect(get('missing', 'fallback')).toBe('fallback')
  })

  it('remove는 해당 키만 지운다', () => {
    set('k1', 1)
    set('k2', 2)
    remove('k1')
    expect(get('k1')).toBeNull()
    expect(get('k2')).toBe(2)
  })

  it('remove가 예외를 던져도(스토리지 접근 자체가 막힌 환경 등) 던지지 않고 조용히 넘어간다', () => {
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(() => remove('k1')).not.toThrow()
  })
})
