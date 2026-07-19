import { fetchCandidateHeadlines } from "./rssFeedService.js"
import { selectTopArticles } from "./llmService.js"

// RSS+LLM 파이프라인이 실패하면(피드 전멸, LLM 에러 등) 데모가 끊기지
// 않도록 반환하는 고정 3건. articleParser.js의 FALLBACK_ARTICLE과 동일한
// "실패해도 데모는 계속된다" 원칙 — 예전 dashboard.js의 하드코딩 배열을
// 그대로 옮긴 것.
const FALLBACK_ARTICLES = [
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

// 하루 1회만 RSS 폴링+LLM 선별이 돌도록 서버 프로세스 메모리에 캐시한다.
// 날짜 비교는 KST 고정(서버 배포 타임존과 무관하게 "오늘"을 일관되게 판단).
let cache = null // { date: "2026-07-19", articles: [...] }

function todayKST() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" })
}

export async function getTodaysArticles() {
  const today = todayKST()
  if (cache?.date === today) return cache.articles

  try {
    const candidates = await fetchCandidateHeadlines()
    if (candidates.length === 0) throw new Error("no RSS candidates available")

    const articles = await selectTopArticles(candidates)
    cache = { date: today, articles }
    return articles
  } catch (err) {
    console.warn("[dashboardCurationService] falling back to fixed articles:", err.message)
    // 폴백은 캐시하지 않는다 — 다음 요청에서 정상 경로를 다시 시도할 기회를 준다.
    return FALLBACK_ARTICLES
  }
}
