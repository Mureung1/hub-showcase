const HUB_DISTANCE_TIER = {
  대구공항: 'near',
  대구역: 'medium',
  동성로: 'medium',
  반월당: 'medium',
  동대구역: 'far',
  서부정류장: 'far',
}

const TIER_BASE_FARE = { near: 6000, medium: 9000, far: 14000 }

export function baseFareForHub(hubName) {
  const tier = HUB_DISTANCE_TIER[hubName] ?? 'medium'
  return TIER_BASE_FARE[tier]
}

export function describeCost(headcount) {
  if (headcount === 1) return { icon: '👑', label: '황제 값' }
  if (headcount === 2) return { icon: '💰', label: '부자 값' }
  if (headcount === 3) return { icon: '🍔', label: '햄버거 한 개 값' }
  return { icon: '🥤', label: '음료 한 잔 값' }
}

// 채팅방에서 실제 1인당 예상 금액을 보여줄 때 쓰는, 실제 시중 가격에 맞춘 세분화된 설명
export function describeCostByAmount(won) {
  if (won <= 2000) return { icon: '🥤', label: '생수 한 병 값' }
  if (won <= 4500) return { icon: '☕', label: '아메리카노 한 잔 값' }
  if (won <= 6000) return { icon: '🍙', label: '삼각김밥+음료 값' }
  if (won <= 8000) return { icon: '🍔', label: '햄버거 세트 값' }
  if (won <= 10000) return { icon: '🍱', label: '편의점 도시락+음료 값' }
  if (won <= 12000) return { icon: '🍜', label: '짜장면 한 그릇 값' }
  if (won <= 14000) return { icon: '🍝', label: '파스타 한 그릇 값' }
  return { icon: '🍗', label: '치킨 한 마리 값' }
}

export function estimateCost(headcount, hubName) {
  const base = baseFareForHub(hubName)
  return Math.round(base / headcount / 100) * 100
}

export function fareTiersFor(hubName) {
  return [1, 2, 3, 4].map((headcount) => {
    const won = estimateCost(headcount, hubName)
    return { headcount, won, ...describeCost(headcount) }
  })
}
