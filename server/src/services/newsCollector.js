// Feature A — 관심종목/섹터 기반 뉴스 큐레이션 (docs/plan.md 기능 A).
// TODO: replace with a real Yahoo Finance fetch, scoped to the signed-in
// user's watch-list tickers/sectors, picking the single most recently
// published article across all of them (see plan.md 기능 A "구체적 동작").

/** Today's curated article for the current user. Currently returns fixture data. */
export async function getTodayArticle() {
  return {
    ticker: "AAPL",
    company: "Apple Inc.",
    headline: "Apple Raises iPhone Production Forecast as AI Feature Demand Surges",
    source: "Yahoo Finance",
    publishedAt: "2026-07-08T09:12:00+09:00",
    sourceUrl: "https://finance.yahoo.com",
  }
}
