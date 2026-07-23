import { RESOURCE_TYPE } from '@teamflow/shared'
import { describe, expect, it } from 'vitest'

import { isSafeHttpUrl, validateResource } from './resourceValidation.js'

describe('resource validation', () => {
  it('allows only http and https external URLs', () => {
    expect(isSafeHttpUrl('https://example.com/file')).toBe(true)
    expect(isSafeHttpUrl('http://localhost:3000')).toBe(true)
    expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false)
    expect(isSafeHttpUrl('not-a-url')).toBe(false)
  })

  it('requires a URL for link resources', () => {
    expect(validateResource({ name: '기획 링크', type: RESOURCE_TYPE.LINK, url: '' })).toBe('링크 자료에는 URL을 입력해 주세요.')
    expect(validateResource({ name: '기획 링크', type: RESOURCE_TYPE.LINK, url: 'https://example.com' })).toBe('')
  })

  it('allows metadata-only documents but rejects unsafe optional URLs', () => {
    expect(validateResource({ name: '기획서', type: RESOURCE_TYPE.DOCUMENT, url: '' })).toBe('')
    expect(validateResource({ name: '기획서', type: RESOURCE_TYPE.DOCUMENT, url: 'file:///secret' })).toContain('올바른 URL')
  })
})
