import { z } from 'zod'
import type { MarketNewsCategory, MarketNewsItem } from '../types/market.types'

export const naverNewsItemSchema = z.object({
  title: z.string(),
  originallink: z.string().optional(),
  link: z.string(),
  description: z.string(),
  pubDate: z.string(),
})

export const naverNewsResponseSchema = z.object({
  items: z.array(naverNewsItemSchema),
})

export type NaverNewsRawItem = z.infer<typeof naverNewsItemSchema>

export function mapNaverNewsItem(
  item: NaverNewsRawItem,
  category: MarketNewsCategory,
  symbols: string[],
): MarketNewsItem | null {
  const originalUrl = normalizeUrl(item.originallink ?? item.link)
  const providerUrl = normalizeUrl(item.link)

  if (!originalUrl) return null

  const title = decodeHtmlEntities(stripHtmlTags(item.title)).trim()
  const summary = decodeHtmlEntities(stripHtmlTags(item.description)).trim()

  return {
    id: createNewsId(originalUrl, title),
    title,
    summary,
    originalUrl,
    providerUrl: providerUrl && providerUrl !== originalUrl ? providerUrl : undefined,
    source: getHostname(originalUrl),
    category,
    symbols,
    publishedAt: new Date(item.pubDate).toISOString(),
    provider: 'NAVER',
  }
}

export function stripHtmlTags(value: string): string {
  return value.replace(/<[^>]*>/g, '')
}

export function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (entity, token: string) => {
    if (token.startsWith('#x') || token.startsWith('#X')) {
      return String.fromCodePoint(Number.parseInt(token.slice(2), 16))
    }

    if (token.startsWith('#')) {
      return String.fromCodePoint(Number.parseInt(token.slice(1), 10))
    }

    const namedEntities: Record<string, string> = {
      amp: '&',
      apos: "'",
      gt: '>',
      lt: '<',
      nbsp: ' ',
      quot: '"',
    }

    return namedEntities[token] ?? entity
  })
}

export function dedupeMarketNews(items: MarketNewsItem[]): MarketNewsItem[] {
  const seenUrls = new Set<string>()
  const seenTitles: string[] = []
  const deduped: MarketNewsItem[] = []

  for (const item of items) {
    const normalizedUrl = item.originalUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')
    const normalizedTitle = normalizeTitle(item.title)

    if (seenUrls.has(normalizedUrl)) continue
    if (seenTitles.some((seenTitle) => isNearDuplicateTitle(seenTitle, normalizedTitle))) continue

    seenUrls.add(normalizedUrl)
    seenTitles.push(normalizedTitle)
    deduped.push(item)
  }

  return deduped
}

function normalizeUrl(value: string): string | null {
  try {
    const url = new URL(value)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.toString()
  } catch {
    return null
  }
}

function createNewsId(url: string, title: string): string {
  return Buffer.from(`${url}:${title}`).toString('base64url')
}

function getHostname(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return undefined
  }
}

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')
}

function isNearDuplicateTitle(left: string, right: string): boolean {
  if (left === right) return true
  if (left.length < 8 || right.length < 8) return false
  if (left.includes(right) || right.includes(left)) return true

  const leftTokens = new Set(left.match(/.{1,2}/g) ?? [])
  const rightTokens = new Set(right.match(/.{1,2}/g) ?? [])
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length
  const union = new Set([...leftTokens, ...rightTokens]).size

  return union > 0 && intersection / union >= 0.85
}
