import type * as cheerio from 'cheerio'
import type { AnyNode } from 'domhandler'
import type { CrawlInput } from './crawler.types.js'

export type ExtractedNotice = {
  title: string
  link: string
  dateText: string
  category: string
}

function readText(element: cheerio.Cheerio<AnyNode>, selector: string) {
  return element.find(selector).first().text().trim()
}

function readLink(element: cheerio.Cheerio<AnyNode>, selector: string) {
  const linkElement = element.find(selector).first()

  return (linkElement.attr('href') ?? linkElement.text()).trim()
}

export function extractNotices($: cheerio.CheerioAPI, input: CrawlInput) {
  const notices: ExtractedNotice[] = []

  $(input.listSelector).each((_index, element) => {
    const item = $(element)

    notices.push({
      title: readText(item, input.titleSelector),
      link: readLink(item, input.linkSelector),
      dateText: readText(item, input.dateSelector),
      category: readText(item, input.categorySelector),
    })
  })

  return notices
}

export function extractCategories($: cheerio.CheerioAPI, input: CrawlInput) {
  return $(input.categoryListSelector)
    .map((_index, element) => $(element).text().trim())
    .get()
    .filter(Boolean)
}
