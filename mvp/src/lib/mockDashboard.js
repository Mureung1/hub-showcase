/**
 * 대시보드·관심종목 데모용 mock 데이터.
 *
 * 스크롤 리빌 애니메이션·레이아웃 확인용. 실데이터(watchlists/trades)가 비어 있을 때만
 * 폴백으로 쓰인다. 실데이터가 하나라도 있으면 mock은 무시된다.
 *
 * ── 제거 방법 ──────────────────────────────────────────────
 *  · 즉시 끄기:   USE_MOCK_DASHBOARD = false
 *  · 완전 제거:   이 파일 삭제 + DashboardPage.jsx / WatchlistPage.jsx 의
 *                 `// === MOCK ===` 블록과 import 줄 삭제
 * ─────────────────────────────────────────────────────────
 */

export const USE_MOCK_DASHBOARD = true

export const MOCK_WATCHLIST = [
  { symbol: '005930', market: 'KR', exchange: null, name: '삼성전자' },
  { symbol: 'NVDA', market: 'US', exchange: 'NASD', name: '엔비디아' },
  { symbol: 'AAPL', market: 'US', exchange: 'NASD', name: '애플' },
  { symbol: 'TSLA', market: 'US', exchange: 'NASD', name: '테슬라' },
  { symbol: '035720', market: 'KR', exchange: null, name: '카카오' },
  { symbol: 'GOOGL', market: 'US', exchange: 'NASD', name: '알파벳' },
]

// key: `${symbol}|${market}` → { price, changePct, up }
export const MOCK_QUOTES = {
  '005930|KR': { price: 78500, changePct: 1.42, up: true },
  'NVDA|US': { price: 138.24, changePct: 2.81, up: true },
  'AAPL|US': { price: 229.87, changePct: -0.63, up: false },
  'TSLA|US': { price: 251.44, changePct: -1.97, up: false },
  '035720|KR': { price: 41250, changePct: 0.85, up: true },
  'GOOGL|US': { price: 178.32, changePct: 1.12, up: true },
}

export const MOCK_RECENT = [
  { id: 'mock-1', ticker: 'NVDA', market: 'US', side: 'buy', price: 132.1 },
  { id: 'mock-2', ticker: '005930', market: 'KR', side: 'sell', price: 79800 },
  { id: 'mock-3', ticker: 'TSLA', market: 'US', side: 'hold', price: 248.0 },
  { id: 'mock-4', ticker: 'AAPL', market: 'US', side: 'buy', price: 224.5 },
  { id: 'mock-5', ticker: 'GOOGL', market: 'US', side: 'sell', price: 181.9 },
  { id: 'mock-6', ticker: '035720', market: 'KR', side: 'buy', price: 40100 },
]

// MOCK_RECENT 중 복기 완료로 표시할 id
export const MOCK_REVIEWED_IDS = ['mock-1', 'mock-4', 'mock-5']
