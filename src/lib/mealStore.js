// 날짜별 "오늘 먹은 끼니 목록" 저장(식단 탭용). 키: cjmt:meals:<userId>:<YYYY-MM-DD>
// 저장 단위는 "한 끼(meal record)"다 — 사진 한 번 분석으로 나온 음식들(items) 전체를 하나의 끼니로 묶는다.
// meal record 형태: { id, mealType('breakfast'|'lunch'|'dinner'|'etc'), createdAt, items: [{ id, name, brand, nutrients(NutrientSet), source }] }
// 구버전 데이터(음식 하나가 곧 저장 단위였던 시절, items 없이 name/nutrients가 최상위에 있던 형태)는
// getMeals()에서 items 1개짜리 끼니로 정규화해 그대로 호환한다.
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

// 구버전(items 없음) 항목은 그 자체가 음식 하나였으므로, items 1개짜리 끼니로 감싼다.
// id를 그대로 재사용해 기존 삭제 동작(그 항목 하나 제거)이 그대로 유지되게 한다.
function normalizeMealRecord(raw) {
  const mealType = normalizeMealType(raw?.mealType)
  if (Array.isArray(raw?.items)) {
    return { id: raw.id, mealType, createdAt: raw.createdAt, items: raw.items }
  }
  return {
    id: raw.id,
    mealType,
    createdAt: raw.createdAt,
    items: [{ id: raw.id, name: raw.name, brand: raw.brand, nutrients: raw.nutrients, source: raw.source }],
  }
}

export function getMeals(userId, dateKey) {
  if (!userId || !dateKey) return []
  const raw = get(storageKey(userId, dateKey), [])
  return Array.isArray(raw) ? raw.map(normalizeMealRecord) : []
}

// 판정: 끼니를 구성하는 음식이 2개 이상이면 "다중 메뉴(한 끼 세트)"다.
export function isSetMeal(mealRecord) {
  return Array.isArray(mealRecord?.items) && mealRecord.items.length > 1
}

// 한 번의 분석에서 나온 음식들(items) 전체를 끼니 기록 하나로 저장한다.
export function addMealRecord(userId, dateKey, { items, mealType } = {}) {
  if (!userId || !dateKey || !Array.isArray(items) || items.length === 0) return null

  const entry = {
    id: makeId(),
    mealType: normalizeMealType(mealType),
    createdAt: new Date().toISOString(),
    items: items.map((item) => ({
      id: makeId(),
      name: item.name,
      brand: item.brand,
      nutrients: item.nutrients,
      source: item.source ?? (item.brand ? '공식' : '추정'),
    })),
  }

  const raw = get(storageKey(userId, dateKey), [])
  set(storageKey(userId, dateKey), [...(Array.isArray(raw) ? raw : []), entry])
  return entry
}

// 끼니 카드 삭제 = 그 끼니를 구성하는 음식 전체 제거(끼니 단위 삭제만 지원, 개별 음식 삭제는 없음).
export function removeMealRecord(userId, dateKey, mealRecordId) {
  if (!userId || !dateKey) return
  const raw = get(storageKey(userId, dateKey), [])
  set(
    storageKey(userId, dateKey),
    (Array.isArray(raw) ? raw : []).filter((m) => m.id !== mealRecordId),
  )
}

// 음식 목록(플랫)의 영양소 합계(순수함수). 목록이 비어도 0으로 채운 NutrientSet을 반환한다.
export function sumNutrients(items) {
  const total = Object.fromEntries(NUTRIENT_LABELS.map(({ key }) => [key, 0]))
  for (const item of items || []) {
    for (const { key } of NUTRIENT_LABELS) {
      total[key] += Number(item?.nutrients?.[key]) || 0
    }
  }
  return total
}

// 끼니 기록 목록(getMeals 결과) 전체의 영양소 합계 — 모든 끼니의 모든 음식 합.
export function sumMealRecordsNutrients(mealRecords) {
  return sumNutrients((mealRecords || []).flatMap((record) => record.items || []))
}

// 끼니 기록 목록을 개별 음식 플랫 목록으로 펼친다(달력 등 음식 단위 표시용).
// 끼니 단위에만 있는 mealType을 각 음식에 복사해, 펼친 뒤에도 항목별로 시간대를 알 수 있게 한다.
export function flattenMealItems(mealRecords) {
  return (mealRecords || []).flatMap((record) => (record.items || []).map((item) => ({ ...item, mealType: record.mealType })))
}

export function getTodayTotal(userId, dateKey) {
  return sumMealRecordsNutrients(getMeals(userId, dateKey))
}
