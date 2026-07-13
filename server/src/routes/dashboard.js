import { Router } from "express"

const router = Router()

// 오늘의 핵심 외신 3개 (기능① 진입점). 현재는 더미 응답 — 실제 큐레이션
// 로직(외신 수집·선별)은 아직 붙지 않았다.
const ARTICLES = [
  {
    id: "fed-guidance",
    source: "The New York Times",
    sourceInitial: "NYT",
    headline: "Fed Signals Rate Path as Inflation Guidance Shifts",
    translation: "연준, 인플레이션 가이던스 변화에 따라 금리 방향 시사",
    tickers: ["$SPX", "$TLT"],
    url: "https://www.nytimes.com/2026/07/12/business/fed-rate-path-guidance.html",
  },
  {
    id: "bear-market",
    source: "Bloomberg",
    sourceInitial: "BB",
    headline: "Tech Stocks Slide as Investors Brace for Bear Market",
    translation: "기술주 하락, 투자자들 베어마켓 우려에 대비",
    tickers: ["$GTC", "$QQQ"],
    url: "https://www.bloomberg.com/news/articles/2026-07-12/tech-stocks-bear-market",
  },
  {
    id: "ev-ticker",
    source: "Reuters",
    sourceInitial: "RT",
    headline: "EV Maker's Ticker Jumps 8% on Strong Delivery Numbers",
    translation: "전기차 업체, 강한 인도량 실적에 티커 8% 급등",
    tickers: ["$EVCO"],
    url: "https://www.reuters.com/business/autos/ev-maker-ticker-jumps-2026-07-12",
  },
]

// GET /api/dashboard
router.get("/", (_req, res) => {
  res.json({ success: true, data: { articles: ARTICLES } })
})

export default router
