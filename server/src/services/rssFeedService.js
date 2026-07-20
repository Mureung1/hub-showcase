import Parser from "rss-parser"
import { BROWSER_USER_AGENT } from "../constants/httpHeaders.js"

// CNBC 단일 소스로 고정(2026-07-20). 이전엔 MarketWatch/Yahoo Finance도
// 폴링했지만, 소스마다 제각각인 본문 마크업 때문에 2단계(본문 스크래핑)
// 선별 기준을 일관되게 적용하기 어려워 CNBC 하나로 좁혔다. 개별 피드가
// 죽어도 나머지로 계속 진행하므로(fetchCandidateHeadlines의 try/catch 참고)
// CNBC 섹션 피드를 늘리는 건 이 배열에 항목만 추가하면 된다.
const FEEDS = [
  { url: "https://www.cnbc.com/id/10001147/device/rss/rss.html", source: "CNBC", sourceInitial: "CN" },
  { url: "https://www.cnbc.com/id/10000664/device/rss/rss.html", source: "CNBC Markets", sourceInitial: "CN" },
]

const CANDIDATE_LIMIT = 60

// 1단계 필터 중 URL 형태 필터(비용 $0) — CNBC 특화. 텍스트 기사가 아니거나
// (영상/팟캐스트/라이브블로그) 라이프스타일 콘텐츠(select), 또는 스크래핑이
// 불가능한 페이월 기사(cnbc-pro)는 본문을 가져올 필요도 없이 제외한다.
const EXCLUDED_URL_PATTERNS = ["/video/", "/podcasts/", "/live-blog/", "/select/", "/cnbc-pro/"]

// 1단계 필터 중 제목 키워드 필터(비용 $0). 화이트리스트에 하나도 안 걸리면
// 제외, 블랙리스트에 걸리면 화이트리스트 매칭 여부와 무관하게 제외한다.
// 초보 투자자 학습용 서비스 취지에 맞는 "시장에 영향을 주는 기사"만 남기고
// 개인 자산관리 칼럼·가십성 기사를 걸러내기 위함 — 필요시 목록만 늘리면 된다.
const TITLE_WHITELIST_KEYWORDS = [
  // 거시경제
  "fed", "federal reserve", "inflation", "cpi", "rate cut", "rate hike", "interest rate",
  // 주요 지수
  "s&p", "s&p 500", "nasdaq", "dow jones", "dow",
  // 기업 실적
  "earnings", "revenue", "guidance", "quarterly", "profit", "forecast",
  // 주요 섹터/기업명
  "tech", "semiconductor", "chip", "ai", "nvda", "nvidia", "aapl", "apple",
  "msft", "microsoft", "amzn", "amazon", "googl", "google", "meta", "tsla", "tesla",
  "stock", "shares", "market", "ipo",
]
const TITLE_BLACKLIST_KEYWORDS = [
  "opinion", "how to spend", "op-ed", "scandal", "sport", "sports", "celebrity",
]

const parser = new Parser({ headers: { "User-Agent": BROWSER_USER_AGENT } })

function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function passesUrlFilter(link) {
  return !EXCLUDED_URL_PATTERNS.some((pattern) => link.includes(pattern))
}

function passesTitleKeywordFilter(title) {
  const lower = title.toLowerCase()
  if (TITLE_BLACKLIST_KEYWORDS.some((keyword) => lower.includes(keyword))) return false
  return TITLE_WHITELIST_KEYWORDS.some((keyword) => lower.includes(keyword))
}

// CNBC RSS 피드를 폴링해 1단계(메타데이터) 필터를 통과한 후보 헤드라인만
// 모은다 — URL 형태, 최신성(freshness), 제목 키워드 순으로 검사해 스크래핑
// 이전에 비용 $0으로 80% 이상을 걸러낸다. 개별 피드가 실패해도(네트워크
// 오류, 구조 변경 등) 나머지 피드로 계속 진행한다 — articleParser.js의
// "실패해도 데모가 끊기지 않는다" 원칙과 동일.
//
// windowHours 기본값 24h(2026-07-20, 6h→24h 조정): 파이프라인은 하루
// 한 번(캐시 경계 기준 KST 06:30, dashboardCurationService.js 참고)만
// 실행되므로, 6h처럼 좁은 창을 쓰면 그 이전 18시간 동안 나온 주요 기사가
// 통째로 누락된다. 24h로 넓혀 전날 하루치 후보를 모두 평가 대상에 올린다.
export async function fetchCandidateHeadlines({ windowHours = 24 } = {}) {
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
      if (!passesUrlFilter(item.link)) continue
      if (!passesTitleKeywordFilter(item.title)) continue

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
