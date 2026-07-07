// 쿠팡/네이버 파트너스 API 승인 전까지 사용하는 임시 방식: 실제 가격 대신 검색 결과로 연결하는 딥링크만 제공한다.
export function buildNaverSearchUrl(query) {
  return `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(query)}`
}

export function buildCoupangSearchUrl(query) {
  return `https://www.coupang.com/np/search?component=&q=${encodeURIComponent(query)}`
}
