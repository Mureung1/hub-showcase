import { fetchCandidateHeadlines } from "./rssFeedService.js"
import { filterByBodyQuality } from "./articleQualityFilter.js"
import { evaluateAndSelectArticles } from "./llmService.js"

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
    readabilityScore: 4,
  },
  {
    id: "bear-market",
    source: "Bloomberg",
    sourceInitial: "BB",
    headline: "Tech Stocks Slide as Investors Brace for Bear Market",
    translation: "기술주 하락, 투자자들 베어마켓 우려에 대비",
    tickers: ["$GTC", "$QQQ"],
    url: "https://www.bloomberg.com/news/articles/2026-07-12/tech-stocks-bear-market",
    readabilityScore: 5,
  },
  {
    id: "ev-ticker",
    source: "Reuters",
    sourceInitial: "RT",
    headline: "EV Maker's Ticker Jumps 8% on Strong Delivery Numbers",
    translation: "전기차 업체, 강한 인도량 실적에 티커 8% 급등",
    tickers: ["$EVCO"],
    url: "https://www.reuters.com/business/autos/ev-maker-ticker-jumps-2026-07-12",
    readabilityScore: 3,
  },
]

// 하루 1회만 RSS 폴링+LLM 선별이 돌도록 서버 프로세스 메모리에 캐시한다.
// 날짜 비교는 KST 고정(서버 배포 타임존과 무관하게 "오늘"을 일관되게 판단).
let cache = null // { date: "2026-07-19", articles: [...] }

// 캐시 미스 상태에서 동시에 들어온 요청들이 파이프라인을 각자 재실행하면
// 서로 다른(운 나쁘면 카드 수가 적은) 결과가 캐시를 덮어쓰는 레이스가
// 생긴다(GitHub #17). 진행 중인 실행이 있으면 그 Promise를 그대로
// 공유해서 파이프라인이 항상 한 번만 돈다.
let inFlight = null

// 캐시 경계를 자정이 아니라 KST 06:30로 둔다(2026-07-20). 미국 정규장
// 마감(KST 새벽 5~6시)과 애프터마켓 실적 발표가 끝난 직후가 오늘자 기사가
// 가장 신선하게 갖춰지는 시점이다 — 자정 기준이면 새벽 1~2시에 들어온
// 요청이 아직 마감도 안 된 어제 상태로 파이프라인을 돌려 캐시를 선점해
// 버린다. 06:30 이전 요청은 "큐레이션 일자"를 전날로 취급해 이전 캐시를
// 그대로 재사용하고, 06:30을 넘긴 첫 요청이 그날의 파이프라인을 새로 돈다.
const CURATION_BOUNDARY_HOUR_KST = 6
const CURATION_BOUNDARY_MINUTE_KST = 30
const CURATION_BOUNDARY_MS = (CURATION_BOUNDARY_HOUR_KST * 60 + CURATION_BOUNDARY_MINUTE_KST) * 60 * 1000

function curationDateKST() {
  const shifted = new Date(Date.now() - CURATION_BOUNDARY_MS)
  return shifted.toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" })
}

async function runPipeline(today) {
  try {
    // 1단계: RSS 메타데이터 필터(비용 $0) → 2단계: 본문 스크래핑/분량 필터
    // (비용 $0) → 3단계: LLM 스마트 평가+카드 생성. 앞 단계에서 걸러질수록
    // 뒤 단계의 스크래핑/토큰 비용이 줄어드는 직렬 구조.
    const candidates = await fetchCandidateHeadlines()
    console.info(`[dashboardCurationService] stage1 RSS candidates: ${candidates.length}`)
    if (candidates.length === 0) throw new Error("no RSS candidates passed stage 1 metadata filter")

    const qualityCandidates = await filterByBodyQuality(candidates)
    console.info(`[dashboardCurationService] stage2 quality-passed candidates: ${qualityCandidates.length}`)
    if (qualityCandidates.length === 0) throw new Error("no candidates passed stage 2 body quality filter")

    const articles = await evaluateAndSelectArticles(qualityCandidates)
    console.info(`[dashboardCurationService] stage3 final articles: ${articles.length}`)
    cache = { date: today, articles }
    return articles
  } catch (err) {
    console.warn("[dashboardCurationService] falling back to fixed articles:", err.message)
    // 폴백은 캐시하지 않는다 — 다음 요청에서 정상 경로를 다시 시도할 기회를 준다.
    return FALLBACK_ARTICLES
  }
}

export async function getTodaysArticles() {
  const today = curationDateKST()
  if (cache?.date === today) return cache.articles
  if (inFlight) return inFlight

  inFlight = runPipeline(today).finally(() => {
    inFlight = null
  })
  return inFlight
}
