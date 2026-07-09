// 네이버는 검색 오픈API(/api/naver/search)로 실제 상품·가격을 가져온다.
// 쿠팡은 쿠팡파트너스 승인 전까지 실제 가격 대신 검색 결과로 연결하는 딥링크만 제공한다.
export function buildNaverSearchUrl(query) {
  return `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(query)}`
}

export function buildCoupangSearchUrl(query) {
  return `https://www.coupang.com/np/search?component=&q=${encodeURIComponent(query)}`
}

export async function fetchNaverProducts(query) {
  const res = await fetch(`/api/naver/search?query=${encodeURIComponent(query)}`)
  if (!res.ok) {
    throw new Error('네이버 검색에 실패했습니다.')
  }
  const data = await res.json()
  return data.items
}

// 쿠팡파트너스 승인 전까지 쓰는 대략적인 추정가 (네이버 최저가 대비 소폭 마진). 실제 가격 아님.
export function estimateCoupangPrice(naverPrice) {
  return Math.round((naverPrice * 1.02) / 100) * 100
}
