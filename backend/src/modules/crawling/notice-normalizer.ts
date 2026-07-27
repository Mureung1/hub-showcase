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
    throw new AppError(400, `Notice ${fieldName} could not be extracted`)
  }
}

function parseDate(dateText: string) {
  const parsedDate = new Date(dateText)

  if (Number.isNaN(parsedDate.getTime())) {
    throw new AppError(400, `Notice date could not be parsed: ${dateText}`)
  }

  return parsedDate.toISOString()
}

function toAbsoluteUrl(link: string, baseUrl: string) {
  try {
    return new URL(link, baseUrl).toString()
  } catch {
    throw new AppError(400, `Notice link could not be parsed: ${link}`)
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
    throw new AppError(400, 'No notices could be extracted')
  }

  const normalizedNotices = notices.map((notice) => normalizeNotice(notice, baseUrl))
  const normalizedCategories = [...new Set(categories)]

  if (normalizedCategories.length === 0) {
    throw new AppError(400, 'No categories could be extracted')
  }

  return {
    notices: normalizedNotices,
    categories: normalizedCategories,
  }
}

export function toNoticePreview<TNotice>(notices: TNotice[]) {
  return notices.slice(0, maxPreviewNoticeCount)
}
