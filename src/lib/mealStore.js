// 날짜별 "오늘 먹은 음식 목록" 저장(식단 탭용). 키: cjmt:meals:<userId>:<YYYY-MM-DD>
// 항목 형태: { id, name, brand, nutrients(NutrientSet), source('공식'|'추정'), mealType('breakfast'|'lunch'|'dinner'|'etc'), createdAt }
import { get, set } from './storage.js'
import { normalizeMealType } from './mealType.js'
import { NUTRIENT_LABELS } from './nutrition.js'

function storageKey(userId, dateKey) {
  return `meals:${userId}:${dateKey}`
}

function makeId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function getMeals(userId, dateKey) {
  if (!userId || !dateKey) return []
  const meals = get(storageKey(userId, dateKey), [])
  // 과거에 저장된 mealType 없는 항목은 '기타'로 간주한다.
  return Array.isArray(meals) ? meals.map((m) => ({ ...m, mealType: normalizeMealType(m.mealType) })) : []
}

export function addMeal(userId, dateKey, meal) {
  if (!userId || !dateKey || !meal) return null

  const entry = {
    id: makeId(),
    name: meal.name,
    brand: meal.brand,
    nutrients: meal.nutrients,
    source: meal.source ?? (meal.brand ? '공식' : '추정'),
    mealType: normalizeMealType(meal.mealType),
    createdAt: new Date().toISOString(),
  }

  set(storageKey(userId, dateKey), [...getMeals(userId, dateKey), entry])
  return entry
}

export function removeMeal(userId, dateKey, mealId) {
  if (!userId || !dateKey) return
  set(
    storageKey(userId, dateKey),
    getMeals(userId, dateKey).filter((m) => m.id !== mealId),
  )
}

// 식사 목록의 영양소 합계(순수함수). 목록이 비어도 0으로 채운 NutrientSet을 반환한다.
export function sumNutrients(meals) {
  const total = Object.fromEntries(NUTRIENT_LABELS.map(({ key }) => [key, 0]))
  for (const meal of meals || []) {
    for (const { key } of NUTRIENT_LABELS) {
      total[key] += Number(meal?.nutrients?.[key]) || 0
    }
  }
  return total
}

export function getTodayTotal(userId, dateKey) {
  return sumNutrients(getMeals(userId, dateKey))
}
