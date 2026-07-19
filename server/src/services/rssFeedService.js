import Parser from "rss-parser"
import { BROWSER_USER_AGENT } from "../constants/httpHeaders.js"

// 무료·공개 RSS만 사용(Reuters는 2020년 공개 RSS를 중단해 제외). 개별 피드가
// 죽어도 나머지로 계속 진행하므로(fetchCandidateHeadlines의 try/catch 참고)
// 목록을 늘리는 건 이 배열에 항목만 추가하면 된다.
const FEEDS = [
  { url: "https://www.cnbc.com/id/10001147/device/rss/rss.html", source: "CNBC", sourceInitial: "CN" },
  { url: "https://www.cnbc.com/id/10000664/device/rss/rss.html", source: "CNBC Markets", sourceInitial: "CN" },
  { url: "https://feeds.content.dowjones.io/public/rss/mw_topstories", source: "MarketWatch", sourceInitial: "MW" },
  { url: "https://finance.yahoo.com/news/rssindex", source: "Yahoo Finance", sourceInitial: "YF" },
]

const CANDIDATE_LIMIT = 60

const parser = new Parser({ headers: { "User-Agent": BROWSER_USER_AGENT } })

function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

// 4개 무료 RSS 피드를 폴링해 최근 후보 헤드라인을 모은다. 개별 피드가
// 실패해도(네트워크 오류, 구조 변경 등) 나머지 피드로 계속 진행한다 —
// articleParser.js의 "실패해도 데모가 끊기지 않는다" 원칙과 동일.
export async function fetchCandidateHeadlines({ windowHours = 48 } = {}) {
  const cutoff = Date.now() - windowHours * 60 * 60 * 1000
  const seen = new Map()

  for (const feed of FEEDS) {
    let parsed
    try {
      parsed = await parser.parseURL(feed.url)
    } catch (err) {
      console.warn(`[rssFeedService] skipping feed ${feed.url}:`, err.message)
      continue
    }

    for (const item of parsed.items ?? []) {
      if (!item.title || !item.link) continue

      const pubDateMs = item.isoDate ? Date.parse(item.isoDate) : Date.parse(item.pubDate ?? "")
      if (!Number.isFinite(pubDateMs) || pubDateMs < cutoff) continue

      const key = normalizeTitle(item.title)
      if (seen.has(key)) continue

      seen.set(key, {
        title: item.title.trim(),
        link: item.link,
        source: feed.source,
        sourceInitial: feed.sourceInitial,
        publishedAt: new Date(pubDateMs).toISOString(),
      })
    }
  }

  return Array.from(seen.values()).slice(0, CANDIDATE_LIMIT)
}
