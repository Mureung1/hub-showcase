import type { BizinfoAnnouncement } from './bizinfo-client.js'

export type AttachmentFormat = 'pdf' | 'hwpx' | 'unsupported'

export interface AttachmentInfo {
  atchFileId: string
  format: AttachmentFormat
  downloadUrl: string
}

/** printFlpthNm은 `.../getImageFile.do?atchFileId=FILE_xxx&fileSn=N` 형태 — 쿼리에서 뽑아낸다 */
const ATCH_FILE_ID_PATTERN = /[?&]atchFileId=([^&]+)/

/** 첨부파일 URL·확장자에서 처리 가능 여부와 포맷을 판단한다. 첨부파일이 없으면 null */
export function parseAttachment(item: BizinfoAnnouncement): AttachmentInfo | null {
  if (!item.printFlpthNm || !item.printFileNm) return null

  const idMatch = item.printFlpthNm.match(ATCH_FILE_ID_PATTERN)
  if (!idMatch) return null

  const lowerName = item.printFileNm.toLowerCase()
  const format: AttachmentFormat = lowerName.endsWith('.pdf')
    ? 'pdf'
    : lowerName.endsWith('.hwpx')
      ? 'hwpx'
      : 'unsupported'

  return { atchFileId: idMatch[1], format, downloadUrl: item.printFlpthNm }
}

/** 첨부파일을 다운로드해 Buffer로 반환한다. 실패 시 에러를 던진다(호출부에서 개별 처리) */
export async function downloadAttachment(url: string): Promise<Buffer> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`첨부파일 다운로드 실패: ${res.status} ${res.statusText}`)
  }
  return Buffer.from(await res.arrayBuffer())
}
