// 날짜별 "오늘 먹은 끼니 목록" 저장(식단 탭용). 키: cjmt:meals:<userId>:<YYYY-MM-DD>
// 저장 단위는 "한 끼(meal record)"다 — 사진 한 번 분석으로 나온 음식들(items) 전체를 하나의 끼니로 묶는다.
// meal record 형태: { id, mealType('breakfast'|'lunch'|'dinner'|'etc'), createdAt, items: [{ id, name, brand, nutrients(NutrientSet), source }] }
// 구버전 데이터(음식 하나가 곧 저장 단위였던 시절, items 없이 name/nutrients가 최상위에 있던 형태)는
// getMeals()에서 items 1개짜리 끼니로 정규화해 그대로 호환한다.
//
// [현재 상태] 저장 함수(addMealRecord/setMeals/removeMealRecord/getMeals/getDatesWithMeals)는 두 곳에서
// 쓰인다: ① dataStore.js가 게스트(비로그인) 모드의 실시간 끼니 저장소로 그대로 가져다 쓴다(userId로
// dataStore.GUEST_ID라는 고정값 하나를 씀 — 브라우저 하나당 게스트 버킷 하나). ② csv.js가 CSV
// 내보내기/가져오기 자체 완결형 레거시 서브시스템으로 계속 쓴다(로그인 계정의 과거 데이터, 마이그레이션
// 이전 게스트 데이터 등). 로그인 계정의 실시간 식단은 여전히 db.js를 거쳐 Supabase meals 테이블에서
// 온다. 순수 계산 함수(sumNutrients/sumMealRecordsNutrients/isSetMeal/flattenMealItems)는 출처가 어디든
// (localStorage/Supabase) 같은 모양의 데이터에 그대로 쓸 수 있어 여러 화면이 계속 import한다. 레거시
// 로컬 데이터 처리 방침은 csv.js 상단 주석 참고.
import { get, keysWithPrefix, remove, set } from './storage.js'
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

// userId 소유의 끼니 저장 키(meals:<userId>:<date>)가 존재하는 날짜(YYYY-MM-DD) 목록. dailyRecord의
// recommended 스냅샷 유무와 무관하게 "실제로 끼니를 저장한 적 있는 날"을 알아야 할 때 쓴다(CSV
// 내보내기가 대표적 — dailyRecord.getIndex는 스냅샷 없는 옛 날짜를 놓치므로 이 함수로 대신한다).
export function getDatesWithMeals(userId) {
  if (!userId) return []
  return keysWithPrefix(storageKey(userId, '')).sort()
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
      // 6주차 §2 인분 조절 — 없으면(구버전 기록) undefined로 저장되고, 읽는 쪽(재열람 UI)이 1인분으로
      // 해석한다. 마이그레이션은 하지 않는다(PRD 규칙).
      baseNutrients: item.baseNutrients,
      servings: item.servings,
    })),
  }

  const raw = get(storageKey(userId, dateKey), [])
  set(storageKey(userId, dateKey), [...(Array.isArray(raw) ? raw : []), entry])
  return entry
}

// 그 날짜의 끼니 목록을 통째로 교체한다(추가만 하는 addMealRecord와 달리 덮어쓰기).
// CSV 가져오기(dailyRecord.replaceDay)처럼 "이 날짜는 이 데이터로 완전히 대체"하는 용도로만 쓴다.
export function setMeals(userId, dateKey, mealRecords) {
  if (!userId || !dateKey) return
  set(storageKey(userId, dateKey), Array.isArray(mealRecords) ? mealRecords : [])
}

// 저장된 끼니의 음식 목록을 통째로 교체한다(트랙 2 §5, 저장 전 항목 하나만 값을 고치고 나머지는 그대로
// 넘기는 식으로 쓴다 — addMealRecord처럼 id를 새로 만들지 않고 호출부가 넘긴 항목을 그대로 믿는다).
// 없는 mealRecordId면 아무 것도 바꾸지 않고 null을 반환한다(호출부가 "수정할 기록을 못 찾음"으로 처리).
export function updateMealRecord(userId, dateKey, mealRecordId, { items } = {}) {
  if (!userId || !dateKey || !Array.isArray(items) || items.length === 0) return null

  const raw = get(storageKey(userId, dateKey), [])
  const records = Array.isArray(raw) ? raw : []
  let updated = null
  const next = records.map((record) => {
    if (record.id !== mealRecordId) return record
    updated = { ...record, items }
    return updated
  })
  if (!updated) return null

  set(storageKey(userId, dateKey), next)
  return updated
}

// 끼니 카드 삭제 = 그 끼니를 구성하는 음식 전체 제거(끼니 단위 삭제만 지원, 개별 음식 삭제는 없음).
// 그 날짜의 마지막 끼니를 지운 경우 빈 배열을 남기지 않고 키 자체를 지운다 — getDatesWithMeals가
// 키의 "존재 여부"로 날짜를 세므로, 빈 배열만 남기면 실제로는 끼니가 없는 날짜가 계속 "끼니가 있는
// 날"로 잡혀 CSV 내보내기/게스트 마이그레이션 프롬프트의 날짜 수 집계가 부풀려진다.
export function removeMealRecord(userId, dateKey, mealRecordId) {
  if (!userId || !dateKey) return
  const raw = get(storageKey(userId, dateKey), [])
  const next = (Array.isArray(raw) ? raw : []).filter((m) => m.id !== mealRecordId)
  if (next.length === 0) {
    remove(storageKey(userId, dateKey))
  } else {
    set(storageKey(userId, dateKey), next)
  }
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
