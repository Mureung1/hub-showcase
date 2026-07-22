// 광고 노출/클릭 로컬 집계(PRD v2.0 FR-3.3: "광고 노출/클릭 수를 로컬 트래킹 — 추후 수익 분석용").
// 서버로 아무 것도 보내지 않는다. storage.js를 쓰지 않는 이유: 이 값은 사용자별로 의미 있는 데이터가
// 아니라 "이 브라우저에서 어떤 광고가 몇 번 보이고 눌렸는지"만 세는 순수 카운터라, 게스트/로그인 구분이나
// dataStore를 거칠 필요가 없다.
//
// 상품 데이터 자체는 src/data/coupangProducts.js, 어떤 상품을 보여줄지 고르는 로직은
// src/utils/adRecommendation.js에 있다 — 이 파일은 집계만 담당한다.
//
// (3주차 이전의 목업 데이터 SUPPLEMENT_ADS / SPONSORED_RESTAURANTS는 제거됐다. 보충제 광고는 쿠팡
// 파트너스 실제 상품 데이터로 대체됐고, 식당 광고는 PRD v2.0 §6에서 이번 릴리즈 스코프 아웃됐다.)

const STATS_KEY = 'mealyze:ad-stats'

function readStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function bump(adId, field) {
  if (!adId) return
  try {
    const stats = readStats()
    const entry = stats[adId] ?? { impressions: 0, clicks: 0 }
    entry[field] = (entry[field] ?? 0) + 1
    entry.lastAt = new Date().toISOString()
    stats[adId] = entry
    localStorage.setItem(STATS_KEY, JSON.stringify(stats))
  } catch (err) {
    // 집계 실패가 광고 표시나 링크 이동을 막아서는 안 된다(사파리 프라이빗 모드 등에서 쓰기가 막힐 수 있다).
    console.error('ad tracking failed:', err)
  }
}

// 배너에 실제로 그려질 때 상품당 1회. 화면이 다시 렌더된다고 중복으로 세지 않도록, 호출부가
// "이번 세션에서 이 상품을 이미 셌는지"를 관리한다(DeficientNutrientAds.jsx의 useEffect 참고).
export function trackAdImpression(adId) {
  bump(adId, 'impressions')
}

export function trackAdClick(adId) {
  bump(adId, 'clicks')
}

// 개발/분석용 조회. { [adId]: { impressions, clicks, lastAt } }
export function getAdStats() {
  return readStats()
}
