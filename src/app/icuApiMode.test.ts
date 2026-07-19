import { describe, expect, it } from 'vitest'
import { resolveIcuApiMode, shouldUseServerApi } from './icuApiMode'

describe('icuApiMode', () => {
  it('uses mock mode by default', () => {
    expect(resolveIcuApiMode(undefined)).toBe('mock')
    expect(shouldUseServerApi(undefined)).toBe(false)
  })

  it('uses server mode only when explicitly enabled', () => {
    expect(resolveIcuApiMode('server')).toBe('server')
    expect(shouldUseServerApi('server')).toBe(true)
    expect(resolveIcuApiMode('mock')).toBe('mock')
  })
})