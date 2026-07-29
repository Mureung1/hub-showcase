export type MarketDirection = 'rise' | 'fall' | 'unchanged'

export interface WatchlistItem {
  id: string
  name: string
  symbol: string
  changeRate: number
  market: MarketDirection
}

export const WATCHLIST_ITEMS: WatchlistItem[] = [
  {
    id: 'samsung-electronics',
    name: '삼성전자',
    symbol: '005930',
    changeRate: 1.2,
    market: 'rise',
  },
  { id: 'nvidia', name: 'NVIDIA', symbol: 'NVDA', changeRate: 1.24, market: 'rise' },
  { id: 'tesla', name: 'Tesla', symbol: 'TSLA', changeRate: 0.42, market: 'rise' },
  { id: 'apple', name: 'Apple', symbol: 'AAPL', changeRate: 0.89, market: 'rise' },
  { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', changeRate: -0.8, market: 'fall' },
]
