import { supabase } from './supabase.js'

/**
 * 종목 검색 — `symbols` 테이블을 ticker/name 부분일치로 조회.
 * trigram GIN 인덱스(symbols_name_trgm_idx)와 RLS(authenticated select 허용)를 활용하며
 * 별도 RPC 없이 anon 클라이언트로 직접 쿼리한다.
 *
 * @param {string} query 검색어(티커 또는 종목명)
 * @param {number} limit 최대 결과 수
 * @returns {Promise<Array<{ticker,market,exchange,name}>>}
 */
export async function searchSymbols(query, limit = 8) {
  const q = (query ?? '').trim()
  if (!supabase || q.length < 1) return []

  const escaped = q.replace(/[%_]/g, (m) => `\\${m}`)
  const { data, error } = await supabase
    .from('symbols')
    .select('ticker, market, exchange, name')
    .or(`ticker.ilike.%${escaped}%,name.ilike.%${escaped}%`)
    .limit(limit)

  if (error) {
    console.error('[symbols] 검색 실패:', error)
    return []
  }
  return data ?? []
}

/**
 * 여러 종목의 표시명을 한 번에 조회. trades는 name 컬럼이 없어(ticker만 저장) 히스토리에서
 * 종목명을 보여주려면 symbols 마스터에서 lookup한다.
 * @param {Array<{ticker:string, market:string}>} items
 * @returns {Promise<Map<string, string>>} key `${ticker}|${market}` → name
 */
export async function resolveSymbolNames(items) {
  const map = new Map()
  if (!supabase || !items?.length) return map
  const tickers = [...new Set(items.map((i) => i.ticker).filter(Boolean))]
  if (tickers.length === 0) return map

  const { data, error } = await supabase.from('symbols').select('ticker, market, name').in('ticker', tickers)
  if (error) {
    console.error('[symbols] 이름 일괄 조회 실패:', error)
    return map
  }
  for (const s of data ?? []) map.set(`${s.ticker}|${s.market}`, s.name)
  return map
}

/**
 * 단일 종목 조회(ticker 기준, market 선택). `/stock/:ticker` 진입 시 종목 메타 확정용.
 */
export async function resolveSymbol(ticker, market) {
  if (!supabase || !ticker) return null
  let builder = supabase
    .from('symbols')
    .select('ticker, market, exchange, name')
    .eq('ticker', ticker.toUpperCase())
  if (market) builder = builder.eq('market', market)
  const { data, error } = await builder.limit(1)
  if (error || !data?.length) return null
  return data[0]
}
