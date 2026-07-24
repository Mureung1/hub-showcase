import { RESOURCE_TYPE, RESOURCE_UPLOAD } from '@teamflow/shared'
import { describe, expect, it } from 'vitest'

import { isSafeHttpUrl, validateResource, validateUploadFile } from './resourceValidation.js'

const FILE_SIZE_ERROR = `파일은 1바이트 이상 ${RESOURCE_UPLOAD.MAX_BYTES / 1024 / 1024}MB 이하여야 합니다.`

describe('upload file validation', () => {
  it('requires a selected file', () => {
    expect(validateUploadFile(null)).toBe('업로드할 파일을 선택해 주세요.')
  })

  it('rejects empty and oversized files', () => {
    expect(validateUploadFile({ size: 0 })).toBe(FILE_SIZE_ERROR)
    expect(validateUploadFile({ size: RESOURCE_UPLOAD.MAX_BYTES + 1 })).toBe(FILE_SIZE_ERROR)
  })

  it('accepts the inclusive file size boundaries', () => {
    expect(validateUploadFile({ size: 1 })).toBe('')
    expect(validateUploadFile({ size: RESOURCE_UPLOAD.MAX_BYTES })).toBe('')
  })
})

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
