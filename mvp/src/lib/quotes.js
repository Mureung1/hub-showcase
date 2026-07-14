import { supabase } from './supabase.js'

/** 종목 표시가격 포맷 (US=$ / KR=원). */
export function formatPrice(price, market) {
  const value = Number(price)
  if (!Number.isFinite(value)) return '-'
  return market === 'US'
    ? `$${value.toLocaleString('en-US')}`
    : `${value.toLocaleString('ko-KR')}원`
}

/** quotes 맵 키. */
export function symbolKey(ticker, market) {
  return `${ticker}|${market}`
}

/**
 * market-data 캔들에서 최신가·등락률 계산.
 * @param {{symbol:string, market:string, exchange?:string|null}} item
 * @returns {Promise<{price:number, changePct:number, up:boolean}|null>}
 */
export async function fetchQuote(item) {
  if (!supabase) return null
  try {
    const { data, error } = await supabase.functions.invoke('market-data', {
      body: { ticker: item.symbol, market: item.market, exchange: item.exchange ?? null },
    })
    if (error || data?.error) return null
    const candles = data?.candles ?? []
    if (candles.length === 0) return null
    const last = candles[candles.length - 1]
    const prev = candles[candles.length - 2] ?? last
    const changePct = prev.close ? ((last.close - prev.close) / prev.close) * 100 : 0
    return { price: last.close, changePct, up: last.close >= prev.close }
  } catch {
    return null
  }
}
