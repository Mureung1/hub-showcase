// 재료샵에서 재료별로 조회한 네이버 최저가 결과(사진·가격)를 저장하는 모듈.
// 성공한(status: 'done') 결과만 저장한다 — loading/error는 재방문 시 다시 시도해야 하므로 캐시 대상이 아님.
// 지금은 한 번 불러온 재료는 만료 없이 계속 재사용한다(재조회 안 함) — 나중에 필요해지면 유효기간을 추가할 것.
// 지금은 localStorage지만, 추후 로그인+DB로 바뀌면 이 파일의 구현만 교체한다 (CLAUDE.md 개발 원칙, fridgeStorage.js와 동일 패턴).
const STORAGE_KEY = 'kkinipick.ingredientProducts'

export function loadIngredientProductsCache() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    if (typeof parsed !== 'object' || parsed === null) return {}

    const cached = {}
    Object.entries(parsed).forEach(([id, entry]) => {
      if (entry) {
        cached[id] = { status: 'done', items: entry.items }
      }
    })
    return cached
  } catch {
    return {}
  }
}

// productsByIngredientId 전체(loading/error 포함)를 받아서 'done'인 것만 골라 저장한다.
export function saveIngredientProductsCache(productsByIngredientId) {
  const toSave = {}
  Object.entries(productsByIngredientId).forEach(([id, entry]) => {
    if (entry?.status === 'done') {
      toSave[id] = { items: entry.items }
    }
  })
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
}
