import { inflateRawSync } from 'node:zlib'
import type { CorporateDisclosure, DartCompanyCode } from '../types/market.types'

export class OpenDartBusinessError extends Error {
  constructor(
    readonly status: string,
    message: string,
  ) {
    super(message)
  }
}

export type OpenDartRawResponse = Record<string, unknown>

export function assertOpenDartSuccess(response: OpenDartRawResponse): void {
  const status = typeof response.status === 'string' ? response.status : undefined

  if (status && status !== '000') {
    const message =
      typeof response.message === 'string' ? response.message : 'OpenDART business error.'
    throw new OpenDartBusinessError(status, message)
  }
}

export function mapOpenDartDisclosure(item: Record<string, unknown>): CorporateDisclosure {
  const receiptNo = getString(item.rcept_no)
  const stockCode = getString(item.stock_code)
  const detailType = getString(item.rm)

  return {
    id: receiptNo,
    corpCode: getString(item.corp_code),
    stockCode: stockCode || undefined,
    companyName: getString(item.corp_name),
    reportName: getString(item.report_nm),
    submittedAt: toKstIsoDate(getString(item.rcept_dt)),
    submitter: getString(item.flr_nm),
    disclosureType: classifyDisclosureType(detailType),
    detailType: detailType || undefined,
    originalUrl: `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${receiptNo}`,
    provider: 'OPENDART',
  }
}

export function parseDartCompanyCodeZip(arrayBuffer: ArrayBuffer): DartCompanyCode[] {
  const buffer = Buffer.from(arrayBuffer)
  const xml = extractFirstZipFileText(buffer)
  const listBlocks = [...xml.matchAll(/<list>([\s\S]*?)<\/list>/g)].map((match) => match[1])

  return listBlocks
    .map((block) => ({
      corpCode: readXmlTag(block, 'corp_code'),
      corpName: readXmlTag(block, 'corp_name'),
      stockCode: readXmlTag(block, 'stock_code') || undefined,
      modifiedAt: toIsoDate(readXmlTag(block, 'modify_date')),
    }))
    .filter((company) => company.corpCode && company.corpName)
}

function extractFirstZipFileText(buffer: Buffer): string {
  const eocdOffset = findSignatureFromEnd(buffer, 0x06054b50)

  if (eocdOffset < 0) {
    throw new Error('OpenDART corp code ZIP is invalid.')
  }

  const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16)
  const localHeaderOffset = buffer.readUInt32LE(centralDirectoryOffset + 42)
  const compressionMethod = buffer.readUInt16LE(centralDirectoryOffset + 10)
  const compressedSize = buffer.readUInt32LE(centralDirectoryOffset + 20)
  const localNameLength = buffer.readUInt16LE(localHeaderOffset + 26)
  const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28)
  const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength
  const compressed = buffer.subarray(dataStart, dataStart + compressedSize)

  if (compressionMethod === 0) return compressed.toString('utf8')
  if (compressionMethod === 8) return inflateRawSync(compressed).toString('utf8')

  throw new Error(`Unsupported OpenDART ZIP compression method: ${compressionMethod}`)
}

function findSignatureFromEnd(buffer: Buffer, signature: number): number {
  for (let index = buffer.length - 4; index >= 0; index -= 1) {
    if (buffer.readUInt32LE(index) === signature) return index
  }

  return -1
}

function readXmlTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`))
  return decodeXml(match?.[1]?.trim() ?? '')
}

function decodeXml(value: string): string {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
}

function getString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function toKstIsoDate(value: string): string {
  if (!/^\d{8}$/.test(value)) return new Date().toISOString()
  return new Date(
    `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T00:00:00+09:00`,
  ).toISOString()
}

function toIsoDate(value: string): string {
  if (!/^\d{8}$/.test(value)) return new Date().toISOString()
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`
}

function classifyDisclosureType(detailType: string): string {
  if (detailType.includes('거')) return 'EXCHANGE'
  if (detailType.includes('공')) return 'FAIR_TRADE'
  if (detailType.includes('정')) return 'CORRECTION'
  return detailType || 'GENERAL'
}
