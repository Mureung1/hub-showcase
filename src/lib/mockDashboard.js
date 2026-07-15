/**
 * 대시보드 "최근 기록" 데모용 mock 데이터.
 *
 * 스크롤 리빌 애니메이션·레이아웃 확인용. 실데이터(trades)가 비어 있을 때만
 * 폴백으로 쓰인다. 실데이터가 하나라도 있으면 mock은 무시된다.
 * (관심종목 mock은 제거됨 — watchlists는 항상 실데이터만 표시.)
 *
 * ── 제거 방법 ──────────────────────────────────────────────
 *  · 즉시 끄기:   USE_MOCK_DASHBOARD = false
 *  · 완전 제거:   이 파일 삭제 + DashboardPage.jsx의 `// === MOCK ===` 블록과 import 줄 삭제
 * ─────────────────────────────────────────────────────────
 */

export const USE_MOCK_DASHBOARD = true

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
