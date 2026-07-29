// 네이버쇼핑 검색 오픈API를 호출하는 fetch 래퍼. Client ID/Secret은 서버 환경변수로만 다룬다
// (CLAUDE.md 개발 원칙 — 절대 프론트엔드에 노출하지 않음).
// 네이버 API의 sort=asc(가격순)는 관련도를 무시해서 스티커·문의용 상품처럼 진짜 싼(관련없는)
// 상품이 최저가로 잡힌다 (실측 확인: "쌀"·"돼지고기" 검색 시 전부 잡동사니). 그래서 기본 정렬인
// 관련도순(sim)으로 넉넉히 받은 뒤, 그 안에서만 우리가 직접 가격순으로 다시 정렬한다.
const JUNK_PRICE_THRESHOLD = 100

// title만으로 "여러 상품을 묶어 파는 상품"인지 판정하는 휴리스틱. 완벽하진 않음(예: 같은 브랜드의
// 여러 맛을 묶은 상품은 못 잡음) — 실측 샘플(짜파게티/신라면/참치캔 등 35건)로 검증, 오탐 0건.
const BUNDLE_KEYWORD_PATTERN = /세트|멀티팩|골라담기|모음|혼합|외\s*\d+종/

function isBundleCandidate(title) {
  if (BUNDLE_KEYWORD_PATTERN.test(title)) return true
  const plusParts = title.split('+').map((part) => part.trim()).filter(Boolean)
  return plusParts.length >= 2
}

// title에 적힌 개수(예: "4개", "4입", "20구")를 뽑는다. "각1개 4개입"처럼 숫자+개가 여러 번
// 나오는 제목은 마지막 것이 진짜 개수인 경우가 많아서 matchAll로 모은 뒤 마지막 것만 쓴다.
function parseCount(title) {
  const countMatches = [...title.matchAll(/(\d+)\s*(개입|개|입|구)(?!\S)/g)]
  const countMatch = countMatches.at(-1)
  return countMatch ? Number(countMatch[1]) : null
}

// 라면 한 봉지 같은 재료는 레시피 하나에 보통 1~2개만 필요해서, 10개·20개·40개 같은 대용량/도매용
// 묶음은 한 레시피 장보기에 안 맞는다. 4~5개들이(이벤트 팩 포함)까지는 정상 범위로 보고, 그보다
// 많으면 "대용량"으로 분류해 우선순위를 낮춘다(완전히 제외하진 않음 — 다른 옵션이 없을 수도 있어서).
const SMALL_PACK_MAX_COUNT = 6

function isBulkPack(title) {
  const count = parseCount(title)
  return count !== null && count > SMALL_PACK_MAX_COUNT
}

// title에 적힌 용량/개수로 개당(또는 100g/100ml당) 가격을 계산.
function parseUnitPrice(title, price) {
  const count = parseCount(title)
  if (count && count > 0) return { label: '개당', value: Math.round(price / count) }

  const weightMatch = title.match(/(\d+(?:\.\d+)?)\s*(kg|g)\b/i)
  if (weightMatch) {
    const grams = weightMatch[2].toLowerCase() === 'kg' ? Number(weightMatch[1]) * 1000 : Number(weightMatch[1])
    if (grams > 0) return { label: '100g당', value: Math.round((price / grams) * 100) }
  }

  const volumeMatch = title.match(/(\d+(?:\.\d+)?)\s*(l|ml)\b/i)
  if (volumeMatch) {
    const ml = volumeMatch[2].toLowerCase() === 'l' ? Number(volumeMatch[1]) * 1000 : Number(volumeMatch[1])
    if (ml > 0) return { label: '100ml당', value: Math.round((price / ml) * 100) }
  }

  return null
}

export async function searchNaverShop(query) {
  const url = `https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(query)}&display=30`

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
  const items = data.items
    .map((item) => ({
      title: item.title.replace(/<\/?b>/g, ''),
      price: Number(item.lprice),
      link: item.link,
      image: item.image,
      mallName: item.mallName,
      // productType 1·3은 네이버가 여러 판매처를 하나로 묶어 검증한 "카탈로그(가격비교)" 상품,
      // 그 외(주로 2)는 개별 판매처가 자유 텍스트로 올린 상품 — brand 필드는 판매처가 대충 입력하는
      // 경우가 많아(예: 라면 묶음상품에 "농심수미칩" 브랜드가 찍히기도 함) 신뢰할 수 없어서 안 쓴다.
      isCatalogMatch: item.productType === '1' || item.productType === '3',
    }))
    .filter((item) => item.price >= JUNK_PRICE_THRESHOLD)
    .sort((a, b) => a.price - b.price)

  // 적당한 크기(6개 이하)의 단일상품이 하나라도 있으면 그것만 보여준다 — 레시피 하나 사려고
  // 대용량/묶음까지 억지로 섞어 채우지 않는다. 소용량 옵션이 아예 없을 때만
  // 대용량 단일상품 → 묶음상품 순으로 폴백한다(검색결과가 비지 않도록).
  // 후보 개수는 5개로 제한 — 재료샵처럼 패널이 화면 안에 다 들어와야 하는 곳에서
  // 목록이 너무 길어져 스크롤이 필요해지지 않도록 한다.
  const singleItems = items.filter((item) => !isBundleCandidate(item.title))
  const bundleItems = items.filter((item) => isBundleCandidate(item.title))
  const reasonableSizeItems = singleItems.filter((item) => !isBulkPack(item.title))
  const bulkItems = singleItems.filter((item) => isBulkPack(item.title))
  const picked = (reasonableSizeItems.length > 0 ? reasonableSizeItems : [...bulkItems, ...bundleItems]).slice(0, 5)

  return picked.map((item) => ({
    ...item,
    unitPrice: isBundleCandidate(item.title) ? null : parseUnitPrice(item.title, item.price),
  }))
}
