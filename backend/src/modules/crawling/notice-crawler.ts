import type { CrawlInput } from './crawler.types.js'
import { fetchHtml } from './html-fetcher.js'
import { extractCategories, extractNotices } from './notice-extractor.js'
import { normalizeNotices } from './notice-normalizer.js'

export async function crawlNotices(input: CrawlInput) {
  const $ = await fetchHtml(input.url)
  const extractedNotices = extractNotices($, input)
  const extractedCategories = extractCategories($, input)

  return normalizeNotices(extractedNotices, extractedCategories, input.url)
}
