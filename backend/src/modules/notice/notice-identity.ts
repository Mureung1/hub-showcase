import { createHash } from 'node:crypto'

export function normalizeNoticeLink(link: string) {
  const url = new URL(link)

  url.hash = ''
  url.protocol = url.protocol.toLowerCase()
  url.hostname = url.hostname.toLowerCase()

  if (
    (url.protocol === 'http:' && url.port === '80') ||
    (url.protocol === 'https:' && url.port === '443')
  ) {
    url.port = ''
  }

  return url.toString()
}

export function createNoticeHashKey(noticeSiteId: number, normalizedLink: string) {
  return createHash('sha256').update(`${noticeSiteId}:${normalizedLink}`).digest('hex')
}
