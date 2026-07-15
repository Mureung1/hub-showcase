// /api/places 프록시 경유 카카오 키워드 장소 검색 헬퍼 (카카오 REST 키는 프론트에서 절대 사용하지 않음)
import { fetchWithTimeout } from './fetchWithTimeout.js'

export async function searchPlaces({ x, y, keyword, radius = 3000 }) {
  if (!x || !y || !keyword) {
    throw new Error('x, y, keyword are required')
  }

  const res = await fetchWithTimeout('/api/places', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ x, y, keyword, radius }),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    throw new Error(data?.error || `Places request failed (${res.status})`)
  }

  return Array.isArray(data) ? data : []
}

// /api/geocode 경유 지역명/주소 -> 좌표 변환. 못 찾으면 서버가 준 에러 메시지를 그대로 던진다.
export async function geocodeLocation(query) {
  if (!query || !query.trim()) {
    throw new Error('위치를 입력해주세요.')
  }

  const res = await fetchWithTimeout('/api/geocode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: query.trim() }),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    throw new Error(data?.error || `Geocode request failed (${res.status})`)
  }

  return data
}

// /api/reverse-geocode 경유 좌표 -> 대략적 지역명(구/군) 변환. 네이버 지역 검색(naverPlaces.js)이
// 반경 파라미터를 지원하지 않아, 검색어에 이 지역명을 섞어 넣어 결과를 사용자 위치 근처로 유도하는 데 쓴다.
// 실패해도 검색 자체를 막을 정도는 아니라 호출부가 null로 폴백할 수 있게 에러를 그대로 던진다.
export async function reverseGeocode({ x, y }) {
  if (!x || !y) {
    throw new Error('x, y are required')
  }

  const res = await fetchWithTimeout('/api/reverse-geocode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ x, y }),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    throw new Error(data?.error || `Reverse geocode request failed (${res.status})`)
  }

  return data?.label || null
}
