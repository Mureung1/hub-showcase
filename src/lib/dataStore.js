// 화면 코드가 "지금 게스트인지 로그인 계정인지"를 몰라도 되게 감싸는 저장소 추상 계층.
// 매 호출마다 supabase.auth.getSession()으로 로그인 여부를 직접 판단해 분기한다 — 호출부가 모드를
// 알려줄 필요가 없다. getSession()은 로컬에 캐시된 세션을 읽을 뿐 네트워크 호출이 아니라 비용이 낮다.
//   · 게스트(세션 없음) -> localStorage(mealStore.js/storage.js, 기존 게스트-시절 저장 방식)
//   · 로그인(세션 있음) -> Supabase(db.js, profiles/meals 테이블)
import { supabase } from './supabase.js'
import * as db from './db.js'
import {
  addMealRecord,
  getDatesWithMeals,
  getMeals as getLocalMeals,
  removeMealRecord,
  setMeals,
  updateMealRecord,
} from './mealStore.js'
import { get, set, keysWithPrefix } from './storage.js'

// 게스트는 로그인이 없어 사용자를 구분할 방법이 없으므로, 브라우저(기기) 하나당 로컬 데이터 버킷
// 하나만 쓴다(여러 사람이 한 브라우저를 같이 쓰는 상황은 고려하지 않음 — 예전 데모/게스트 시절과 동일한
// 제약). UserContext의 effectiveUserId, Calendar의 수동 상태 저장 등도 이 값을 그대로 가져다 쓴다.
export const GUEST_ID = 'guest'
const GUEST_PROFILE_KEY = 'guestProfile'

async function getSessionUserId() {
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.id ?? null
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
    // db.js의 rowToApp과 동일하게 빈 recommended({})는 "없음"(null)으로 취급한다 — 그래야
    // UserContext의 effectiveRecommended가 빈 객체를 "진짜 값 있음"으로 오판하지 않고 tempSex 기반
    // 임시 추정값으로 정상적으로 폴백한다.
    const result = { profile, recommended: recommended && Object.keys(recommended).length > 0 ? recommended : null }
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

// 저장된 끼니의 items를 통째로 교체한다(트랙 2 §5, 저장 전 수정). date는 deleteMeal과 같은 이유로
// 게스트 로컬 경로에서만 필요하다(어느 날짜 버킷을 고칠지 알아야 함). total은 Supabase 경로에만
// 쓰인다 — 게스트 로컬 기록은 원래 total을 저장하지 않고 항상 items에서 다시 계산한다(addMeal과
// 동일한 비대칭, mealStore.js 주석 참고).
export async function updateMeal(mealId, date, items, total) {
  const userId = await getSessionUserId()
  if (!userId) {
    const updated = updateMealRecord(GUEST_ID, date, mealId, { items })
    if (!updated) throw new Error('수정할 기록을 찾을 수 없어요.')
    return updated
  }
  return db.updateMeal(mealId, items, total)
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

// ---- CSV 백업/복원 (게스트·로그인 계정 공통) ----
// 위의 화면용 함수들과 같은 규칙으로 모드를 자동 판단한다 — 백업 UI(DataBackupPanel)는 지금이 게스트인지
// 로그인 계정인지 알 필요 없이 이 두 함수만 부른다.

// 저장된 모든 끼니를 { [date]: mealRecord[] }로 반환.
export async function getAllMealsByDate() {
  const userId = await getSessionUserId()
  if (!userId) {
    const byDate = {}
    for (const date of getDatesWithMeals(GUEST_ID)) {
      const meals = getLocalMeals(GUEST_ID, date)
      if (meals.length > 0) byDate[date] = meals
    }
    return byDate
  }
  return db.getAllMeals()
}

// 여러 날짜의 끼니를 한 번에 통째로 교체(덮어쓰기). mealsByDate: { [date]: mealRecord[] }.
// 날짜 하나씩 부르지 않고 통째로 받는 이유는 db.replaceMealsForDates 주석 참고(왕복 횟수).
export async function replaceMealsForDates(mealsByDate) {
  const userId = await getSessionUserId()
  if (!userId) {
    for (const [date, mealRecords] of Object.entries(mealsByDate)) {
      setMeals(GUEST_ID, date, mealRecords)
    }
    return
  }
  await db.replaceMealsForDates(mealsByDate)
}

// ---- 게스트 전용 원시 접근자 (로그인 시 1회 마이그레이션에서 쓴다) ----
// 위 함수들과 달리 "지금" 로그인 상태인지는 신경 쓰지 않고 항상 게스트 버킷(GUEST_ID)만 직접
// 읽고/쓴다 — 호출부(guestMigration.js)가 이미 "게스트 데이터를 다루는 중"이라는
// 걸 알고 부르므로, 세션 상태에 따라 조용히 다른 데이터를 돌려주면 오히려 혼란스럽다.

export function getGuestProfileRaw() {
  return get(GUEST_PROFILE_KEY, null)
}

export function setGuestProfileRaw(data) {
  set(GUEST_PROFILE_KEY, data)
}

export function getGuestMealDates() {
  return getDatesWithMeals(GUEST_ID)
}

export function getGuestMealsForDate(date) {
  return getLocalMeals(GUEST_ID, date)
}

// ---- 레벨/XP/퀘스트/뱃지 (게이미피케이션 v2) ----
// 위 함수들과 같은 규칙으로 모드를 자동 판단한다. 게스트는 storage.js(localStorage)에, 로그인은
// db.js(Supabase, supabase/migrations/2026-07-29_gamification.sql 적용 후)에 저장한다.

export async function getLevelState() {
  const userId = await getSessionUserId()
  if (!userId) return get('levelState', { totalXp: 0 })
  return db.getLevelState()
}

// CSV 복원 전용 "덮어쓰기"(claimQuest의 증분과 다름 — 백업에 담긴 값을 그대로 심는다).
export async function saveLevelState({ totalXp }) {
  const userId = await getSessionUserId()
  if (!userId) {
    set('levelState', { totalXp })
    return { totalXp }
  }
  return db.saveLevelState({ totalXp })
}

export async function getClaimedQuestIds(dateKey) {
  const userId = await getSessionUserId()
  if (!userId) return get(`questClaims:${dateKey}`, [])
  return db.getClaimedQuestIds(dateKey)
}

// 이미 그 날짜에 수령한 퀘스트면 재지급하지 않는다(게스트는 브라우저 하나 = 탭 하나를 가정한 순차
// 실행이라 안전 — 로그인 쪽은 db.js의 유니크 제약이 최종 방어선).
export async function claimQuest({ dateKey, questId, xpAwarded }) {
  const userId = await getSessionUserId()
  if (!userId) {
    const claimed = get(`questClaims:${dateKey}`, [])
    if (claimed.includes(questId)) {
      const { totalXp } = await getLevelState()
      return { alreadyClaimed: true, totalXp }
    }
    set(`questClaims:${dateKey}`, [...claimed, questId])
    // MY 탭 개편 — "오늘/이번 주 획득 XP" 합산용으로 퀘스트별 지급액도 같이 남긴다(questClaims:는
    // quest_id 목록뿐이라 금액을 모른다). 기존 questClaims: 형식·이걸 읽는 모든 .includes(id) 소비처는
    // 그대로 두고 순수 추가만 한다.
    const claimedXp = get(`questClaimXp:${dateKey}`, {})
    set(`questClaimXp:${dateKey}`, { ...claimedXp, [questId]: xpAwarded })
    const { totalXp: currentXp } = await getLevelState()
    const totalXp = currentXp + xpAwarded
    await saveLevelState({ totalXp })
    return { alreadyClaimed: false, totalXp }
  }
  return db.claimQuest(dateKey, questId, xpAwarded)
}

// MY 탭 개편(요약 카드 "오늘 획득 XP"/퀘스트 화면 "이번 주 획득 XP") — startDateKey~endDateKey(포함)
// 사이에 지급된 XP 총합. 게스트는 questClaimXp: 접두 키를 날짜 범위로 걸러 합산, 로그인은 db.js가
// quest_claims.xp_awarded를 직접 합산한다(새 SQL 불필요 — 기존 컬럼·RLS로 충분).
export async function getXpEarnedInRange(startDateKey, endDateKey) {
  const userId = await getSessionUserId()
  if (!userId) {
    let total = 0
    for (const dateKey of keysWithPrefix('questClaimXp:')) {
      if (dateKey < startDateKey || dateKey > endDateKey) continue
      const claimedXp = get(`questClaimXp:${dateKey}`, {})
      total += Object.values(claimedXp).reduce((sum, xp) => sum + xp, 0)
    }
    return total
  }
  return db.getXpEarnedInRange(startDateKey, endDateKey)
}

// 게스트: `questClaims:` 접두 키를 전부 순회해 집계한다(getAllMealsByDate와 같은 방식).
export async function getQuestClaimStats() {
  const userId = await getSessionUserId()
  if (!userId) {
    const countsByQuestId = {}
    let totalCount = 0
    for (const dateKey of keysWithPrefix('questClaims:')) {
      for (const questId of get(`questClaims:${dateKey}`, [])) {
        countsByQuestId[questId] = (countsByQuestId[questId] ?? 0) + 1
        totalCount += 1
      }
    }
    return { totalCount, countsByQuestId }
  }
  return db.getQuestClaimStats()
}

export async function getUnlockedBadgeIds() {
  const userId = await getSessionUserId()
  if (!userId) return get('badgeUnlocks', [])
  return db.getUnlockedBadgeIds()
}

export async function unlockBadge(badgeId) {
  const userId = await getSessionUserId()
  if (!userId) {
    const unlockedIds = get('badgeUnlocks', [])
    if (unlockedIds.includes(badgeId)) return { alreadyUnlocked: true, unlockedIds }
    const next = [...unlockedIds, badgeId]
    set('badgeUnlocks', next)
    return { alreadyUnlocked: false, unlockedIds: next }
  }
  return db.unlockBadge(badgeId)
}
