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

export function describeCost(won) {
  if (won <= 3500) return { icon: '🥤', label: '음료 한 잔 값' }
  if (won <= 5000) return { icon: '☕', label: '커피 한 잔 값' }
  if (won <= 8000) return { icon: '🍔', label: '햄버거 한 개 값' }
  return { icon: '🍗', label: '치킨 한 마리 값' }
}

export function estimateCost(headcount, hubName) {
  const base = baseFareForHub(hubName)
  return Math.round(base / headcount / 100) * 100
}

export function fareTiersFor(hubName) {
  return [1, 2, 3, 4].map((headcount) => {
    const won = estimateCost(headcount, hubName)
    return { headcount, won, ...describeCost(won) }
  })
}
