// 화면 코드가 "지금 게스트인지 로그인 계정인지"를 몰라도 되게 감싸는 저장소 추상 계층.
// 매 호출마다 supabase.auth.getSession()으로 로그인 여부를 직접 판단해 분기한다 — 호출부가 모드를
// 알려줄 필요가 없다. getSession()은 로컬에 캐시된 세션을 읽을 뿐 네트워크 호출이 아니라 비용이 낮다.
//   · 게스트(세션 없음) -> localStorage(mealStore.js/storage.js, 기존 게스트-시절 저장 방식)
//   · 로그인(세션 있음) -> Supabase(db.js, profiles/meals 테이블)
import { supabase } from './supabase.js'
import * as db from './db.js'
import { addMealRecord, getDatesWithMeals, getMeals as getLocalMeals, removeMealRecord } from './mealStore.js'
import { get, set } from './storage.js'

// 게스트는 로그인이 없어 사용자를 구분할 방법이 없으므로, 브라우저(기기) 하나당 로컬 데이터 버킷
// 하나만 쓴다(여러 사람이 한 브라우저를 같이 쓰는 상황은 고려하지 않음 — 예전 데모/게스트 시절과 동일한
// 제약). UserContext의 effectiveUserId, Calendar의 수동 상태 저장 등도 이 값을 그대로 가져다 쓴다.
export const GUEST_ID = 'guest'
const GUEST_PROFILE_KEY = 'guestProfile'

async function getSessionUserId() {
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.id ?? null
}

export async function getMode() {
  return (await getSessionUserId()) ? 'user' : 'guest'
}

// ---- profile ----

export async function getProfile() {
  const userId = await getSessionUserId()
  if (!userId) return get(GUEST_PROFILE_KEY, null)
  return db.getProfile()
}

export async function saveProfile({ profile, recommended }) {
  const userId = await getSessionUserId()
  if (!userId) {
    const result = { profile, recommended }
    set(GUEST_PROFILE_KEY, result)
    return result
  }
  return db.upsertProfile({ profile, recommended })
}

// ---- meals ----

export async function getMeals(date) {
  const userId = await getSessionUserId()
  if (!userId) return getLocalMeals(GUEST_ID, date)
  return db.getMeals(date)
}

export async function addMeal(date, mealType, items, total) {
  const userId = await getSessionUserId()
  if (!userId) return addMealRecord(GUEST_ID, date, { items, mealType })
  return db.addMeal(date, mealType, items, total)
}

// date: 그 끼니가 속한 날짜. Supabase는 id만으로 삭제 가능하지만(RLS가 소유자를 가리고, 행 자체에 이미
// 날짜가 있음), 게스트 로컬 삭제는 mealStore가 날짜별 키(meals:guest:<date>)로 저장하므로 어느 날짜
// 버킷에서 지울지 알아야 한다 — 호출부(오늘 끼니만 지움)가 항상 알고 있는 값이라 추가 비용은 없다.
export async function deleteMeal(mealId, date) {
  const userId = await getSessionUserId()
  if (!userId) {
    removeMealRecord(GUEST_ID, date, mealId)
    return
  }
  return db.deleteMeal(mealId)
}

export async function getMealsByDateRange(startDate, endDate) {
  const userId = await getSessionUserId()
  if (!userId) {
    const byDate = {}
    for (const date of getDatesWithMeals(GUEST_ID)) {
      if (date < startDate || date > endDate) continue
      const meals = getLocalMeals(GUEST_ID, date)
      if (meals.length > 0) byDate[date] = meals
    }
    return byDate
  }
  return db.getMealsByDateRange(startDate, endDate)
}
