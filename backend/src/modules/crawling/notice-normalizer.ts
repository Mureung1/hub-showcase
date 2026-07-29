import { AppError } from '../../shared/errors/app-error.js'
import type { ExtractedNotice } from './notice-extractor.js'

const maxPreviewNoticeCount = 5

export type CrawledNotice = {
  title: string
  link: string
  date: string
  category: string
}

function assertRequired(value: string, fieldName: string) {
  if (!value) {
    throw new AppError(400, `공지 ${fieldName} 값을 추출할 수 없습니다.`)
  }
}

function parseDate(dateText: string) {
  const parsedDate = new Date(dateText)

  if (Number.isNaN(parsedDate.getTime())) {
    throw new AppError(400, `공지 날짜를 해석할 수 없습니다: ${dateText}`)
  }

  return parsedDate.toISOString()
}

function toAbsoluteUrl(link: string, baseUrl: string) {
  try {
    return new URL(link, baseUrl).toString()
  } catch {
    throw new AppError(400, `공지 링크를 해석할 수 없습니다: ${link}`)
  }
}

export function normalizeNotice(notice: ExtractedNotice, baseUrl: string): CrawledNotice {
  assertRequired(notice.title, 'title')
  assertRequired(notice.link, 'link')
  assertRequired(notice.dateText, 'date')
  assertRequired(notice.category, 'category')

  return {
    title: notice.title,
    link: toAbsoluteUrl(notice.link, baseUrl),
    date: parseDate(notice.dateText),
    category: notice.category,
  }
}

export function normalizeNotices(notices: ExtractedNotice[], categories: string[], baseUrl: string) {
  if (notices.length === 0) {
    throw new AppError(400, '추출된 공지가 없습니다.')
  }

  const normalizedNotices = notices.map((notice) => normalizeNotice(notice, baseUrl))
  const normalizedCategories = [...new Set(categories)]

  if (normalizedCategories.length === 0) {
    throw new AppError(400, '추출된 카테고리가 없습니다.')
  }

  return {
    notices: normalizedNotices,
    categories: normalizedCategories,
  }
}

export function toNoticePreview<TNotice>(notices: TNotice[]) {
  return notices.slice(0, maxPreviewNoticeCount)
}
