import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BizinfoAnnouncement } from './bizinfo-client.js'
import { downloadAttachment, parseAttachment } from './attachment.js'

const baseItem = {
  printFileNm: '공고문.pdf',
  printFlpthNm: 'https://www.bizinfo.go.kr/cmm/fms/getImageFile.do?atchFileId=FILE_000000000123&fileSn=1',
} as BizinfoAnnouncement

describe('parseAttachment', () => {
  it('PDF 확장자면 format을 pdf로 판단하고 atchFileId를 뽑는다', () => {
    const result = parseAttachment(baseItem)
    expect(result).toEqual({
      atchFileId: 'FILE_000000000123',
      format: 'pdf',
      downloadUrl: baseItem.printFlpthNm,
    })
  })

  it('HWPX 확장자(대소문자 무관)면 format을 hwpx로 판단한다', () => {
    const result = parseAttachment({ ...baseItem, printFileNm: '공고문.HWPX' })
    expect(result?.format).toBe('hwpx')
  })

  it('HWP(구버전)나 그 외 확장자는 unsupported로 판단한다', () => {
    expect(parseAttachment({ ...baseItem, printFileNm: '공고문.hwp' })?.format).toBe('unsupported')
    expect(parseAttachment({ ...baseItem, printFileNm: '공고문.doc' })?.format).toBe('unsupported')
  })

  it('첨부파일 필드가 없으면 null을 반환한다', () => {
    expect(parseAttachment({ ...baseItem, printFileNm: undefined })).toBeNull()
    expect(parseAttachment({ ...baseItem, printFlpthNm: undefined })).toBeNull()
  })

  it('URL에 atchFileId 쿼리가 없으면 null을 반환한다', () => {
    expect(parseAttachment({ ...baseItem, printFlpthNm: 'https://example.com/no-id-here' })).toBeNull()
  })
})

describe('downloadAttachment', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('성공하면 Buffer를 반환한다', async () => {
    const bytes = new Uint8Array([1, 2, 3, 4])
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, arrayBuffer: () => Promise.resolve(bytes.buffer) }),
    )
    const buffer = await downloadAttachment('https://example.com/file.pdf')
    expect(buffer).toBeInstanceOf(Buffer)
    expect([...buffer]).toEqual([1, 2, 3, 4])
  })

  it('HTTP 오류 응답이면 에러를 던진다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' }))
    await expect(downloadAttachment('https://example.com/missing.pdf')).rejects.toThrow('404')
  })
})
