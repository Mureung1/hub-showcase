import * as cheerio from "cheerio"

// 대형 외신 사이트는 기본 Node fetch의 UA("node")를 봇으로 간주해 403을
// 반환하는 경우가 많다 — 일반 브라우저처럼 보이는 UA를 반드시 붙인다.
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

// 스크래핑이 막히거나(403/paywall) 페이지 구조가 달라 파싱에 실패해도 데모가
// 끊기지 않도록 반환하는 더미 기사. prototype/02_reader.html과 동일한 본문.
const FALLBACK_ARTICLE = {
  title: "Tech Stocks Slide as Investors Brace for Bear Market",
  source: "Bloomberg",
  sourceInitial: "BB",
  publishedAt: "2026-07-12T00:00:00+09:00",
  paragraphs: [
    "Shares of major technology companies fell sharply on Friday as investors grew increasingly worried that the market is entering a bear market. The broad sell-off wiped out nearly a trillion dollars in market value across the sector in a single trading session.",
    "The decline accelerated after GlobalTech Corp, whose ticker symbol is GTC, issued weaker-than-expected guidance for the upcoming quarter, citing softening demand and rising component costs. Analysts had expected the company to reaffirm its prior outlook.",
    "Trading desks described the reaction as an emotional sell-off rather than a fundamental shift in the industry, noting that trading volume was roughly triple the 30-day average. Several fund managers said they viewed the drop as a buying opportunity for long-term investors.",
    "Still, market strategists caution that further volatility is likely in the coming weeks as more companies report earnings. \"One weak guidance print doesn't make a trend, but the market is clearly on edge,\" said one senior equity strategist at a major investment bank.",
  ],
}

export async function parseArticle(url) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": BROWSER_USER_AGENT } })
    if (!res.ok) throw new Error(`fetch failed with status ${res.status}`)

    const html = await res.text()
    const $ = cheerio.load(html)
    const title = $("h1").first().text().trim()
    const paragraphs = $("article p, main p")
      .map((_, el) => $(el).text().trim())
      .get()
      .filter((text) => text.length > 40)

    if (!title || paragraphs.length === 0) {
      throw new Error("parsed page had no usable title/paragraphs")
    }

    const hostname = new URL(url).hostname.replace(/^www\./, "")

    return {
      title,
      source: hostname,
      sourceInitial: hostname.split(".")[0].slice(0, 2).toUpperCase(),
      publishedAt: new Date().toISOString(),
      paragraphs,
      url,
    }
  } catch (err) {
    console.warn(`[articleParser] falling back to dummy article for ${url}:`, err.message)
    return { ...FALLBACK_ARTICLE, url }
  }
}
