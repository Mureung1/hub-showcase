// 네이버쇼핑 검색 오픈API를 호출하는 fetch 래퍼. Client ID/Secret은 서버 환경변수로만 다룬다
// (CLAUDE.md 개발 원칙 — 절대 프론트엔드에 노출하지 않음).
// 네이버 API의 sort=asc(가격순)는 관련도를 무시해서 스티커·문의용 상품처럼 진짜 싼(관련없는)
// 상품이 최저가로 잡힌다 (실측 확인: "쌀"·"돼지고기" 검색 시 전부 잡동사니). 그래서 기본 정렬인
// 관련도순(sim)으로 넉넉히 받은 뒤, 그 안에서만 우리가 직접 가격순으로 다시 정렬한다.
const JUNK_PRICE_THRESHOLD = 100

export async function searchNaverShop(query) {
  const url = `https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(query)}&display=20`

  const res = await fetch(url, {
    headers: {
      'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID,
      'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET,
    },
  })

  if (!res.ok) {
    const error = new Error('네이버 API 호출에 실패했습니다.')
    error.status = res.status
    throw error
  }

  const data = await res.json()
  return data.items
    .map((item) => ({
      title: item.title.replace(/<\/?b>/g, ''),
      price: Number(item.lprice),
      link: item.link,
      image: item.image,
      mallName: item.mallName,
    }))
    .filter((item) => item.price >= JUNK_PRICE_THRESHOLD)
    .sort((a, b) => a.price - b.price)
    .slice(0, 5)
}
