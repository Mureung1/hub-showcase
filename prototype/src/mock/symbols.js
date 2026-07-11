// 공용 종목 목록 (프로토타입 목데이터). candles.js 의 키와 일치.
export const SYMBOLS = [
  { symbol: '005930', name: '삼성전자', market: 'KRX' },
  { symbol: 'NVDA', name: 'NVIDIA', market: 'NASDAQ' },
  { symbol: 'TSLA', name: 'Tesla', market: 'NASDAQ' },
]

export function getSymbol(symbol) {
  return SYMBOLS.find((s) => s.symbol === symbol) ?? SYMBOLS[0]
}

// 티커/한글명/부분일치로 종목 검색.
export function searchSymbols(query) {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return SYMBOLS.filter(
    (s) =>
      s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q),
  )
}

// 입력 문자열을 종목 심볼로 해석. 매칭 없으면 null.
export function resolveSymbol(query) {
  const found = searchSymbols(query)
  return found.length > 0 ? found[0].symbol : null
}

export function formatPrice(symbol, price) {
  if (price == null) return '—'
  return symbol === '005930'
    ? `${price.toLocaleString()}원`
    : `$${price.toLocaleString()}`
}
