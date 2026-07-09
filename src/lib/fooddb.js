// /api/fooddb 프록시 경유 식약처 전국통합식품영양성분정보(음식) 검색 헬퍼

export async function searchFoodDB(foodName) {
  if (!foodName || typeof foodName !== 'string' || !foodName.trim()) {
    throw new Error('foodName is required')
  }

  const res = await fetch('/api/fooddb', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ foodName: foodName.trim() }),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    throw new Error(data?.error || `FoodDB request failed (${res.status})`)
  }

  return Array.isArray(data) ? data : []
}
