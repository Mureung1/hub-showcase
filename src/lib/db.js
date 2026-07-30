// profiles/meals 테이블 CRUD. 여기서는 별도 소유권(누가 이 행 주인인지) 검사를 하지 않는다 — RLS
// (supabase/schema.sql, auth.uid() = id / auth.uid() = user_id)가 DB 레벨에서 강제하므로, 이 파일의
// 코드가 실수로 잘못된 조건을 걸어도 다른 사람 데이터가 새어나갈 수 없다. DB는 snake_case, 앱은
// camelCase라 여기서 서로 변환한다.
import { supabase } from './supabase.js'
import { rpcWithAuthRetry } from './supabaseRpc.js'
import { normalizeMealType } from './mealType.js'

// PostgREST/GoTrue가 세션 만료·무효 토큰일 때 주는 에러들(코드 PGRST301, 또는 메시지에 jwt/token
// 언급)을 감지해 "다시 로그인해주세요"로 통일하고, 클라이언트 세션도 확실히 비워서 RequireAuth가
// 곧바로 /login으로 보내게 한다 — 반쯤 만료된 세션으로 계속 실패하는 요청을 반복하지 않도록.
function isSessionError(error) {
  return error?.code === 'PGRST301' || /jwt|token|session/i.test(error?.message || '')
}

async function throwFriendly(error) {
  if (isSessionError(error)) {
    await supabase.auth.signOut()
    throw new Error('세션이 만료됐어요. 다시 로그인해주세요.')
  }
  if (/failed to fetch|network/i.test(error?.message || '')) {
    throw new Error('네트워크 연결을 확인한 뒤 다시 시도해주세요.')
  }
  throw new Error(error.message)
}

// getUser()(서버에 매번 토큰을 재검증하는 네트워크 호출) 대신 getSession()(로컬에 캐시된 세션을
// 즉시 반환, 세션 없으면 에러 없이 session:null)을 쓴다 — 아래에서 바로 이어지는 실제 데이터 쿼리도
// 같은 토큰으로 다시 RLS 검증을 받으므로, 여기서 한 번 더 서버 왕복을 할 필요가 없다.
async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getSession()
  if (error) await throwFriendly(error)
  return data.session?.user?.id ?? null
}

function rowToApp(row) {
  if (!row) return null
  return {
    profile: {
      age: row.age,
      sex: row.sex,
      heightCm: row.height_cm,
      weightKg: row.weight_kg,
      activity: row.activity,
      conditions: row.conditions ?? [],
      allergies: row.allergies ?? [],
      school: row.school_type
        ? {
            type: row.school_type,
            officeCode: row.school_office_code,
            code: row.school_code,
            name: row.school_name,
            kind: row.school_kind,
          }
        : null,
      occupation: row.occupation ?? null,
    },
    recommended: row.recommended && Object.keys(row.recommended).length > 0 ? row.recommended : null,
  }
}

// 로그인 안 된 상태거나, 로그인은 했지만 아직 한 번도 저장한 적 없으면 null을 반환한다
// (신체정보 미입력 = "온보딩 필요" 상태와 동일하게 다룬다).
export async function getProfile() {
  const userId = await getCurrentUserId()
  if (!userId) return null

  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) await throwFriendly(error)
  return rowToApp(data)
}

// 있으면 update, 없으면 insert(upsert). profile: {age,sex,heightCm,weightKg,activity,conditions,allergies},
// recommended: {calories,protein,carbs,fat,fiber,sodium}.
export async function upsertProfile({ profile, recommended }) {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('로그인이 필요합니다.')

  const row = {
    id: userId,
    age: profile.age,
    sex: profile.sex,
    height_cm: profile.heightCm,
    weight_kg: profile.weightKg,
    activity: profile.activity,
    conditions: profile.conditions ?? [],
    allergies: profile.allergies ?? [],
    school_type: profile.school?.type ?? null,
    school_office_code: profile.school?.officeCode ?? null,
    school_code: profile.school?.code ?? null,
    school_name: profile.school?.name ?? null,
    school_kind: profile.school?.kind ?? null,
    occupation: profile.occupation ?? null,
    recommended: recommended ?? {},
  }

  const { data, error } = await supabase.from('profiles').upsert(row, { onConflict: 'id' }).select().maybeSingle()
  if (error) await throwFriendly(error)
  return rowToApp(data)
}

// meals: 끼니 기록. 한 번의 분석(=한 끼)이 한 행. 앱이 쓰는 "meal record" 모양({id, mealType,
// createdAt, items})으로 변환해 돌려준다 — mealStore.js의 순수 계산 함수(sumMealRecordsNutrients,
// flattenMealItems 등)가 이 모양을 그대로 기대하므로, 그 함수들을 안 건드리고 재사용할 수 있다.
function mealRowToApp(row) {
  return {
    id: row.id,
    mealType: row.meal_type,
    createdAt: row.created_at,
    items: row.items ?? [],
  }
}

// mealStore.addMealRecord와 동일한 필드만 남기고(브라우저가 보낸 임시 필드는 버리고) 저장한다.
// baseNutrients/servings(6주차 §2)는 items가 JSONB 컬럼이라 스키마 변경 없이 그대로 저장된다 —
// 없으면(구버전 기록) null로, 읽는 쪽이 1인분으로 해석한다.
function normalizeItem(item) {
  return {
    name: item.name,
    brand: item.brand ?? null,
    nutrients: item.nutrients,
    source: item.source ?? (item.brand ? '공식' : '추정'),
    baseNutrients: item.baseNutrients ?? null,
    servings: item.servings ?? null,
  }
}

// date: 'YYYY-MM-DD'. items가 비어 있으면(분석 결과 없음) 아무것도 안 하고 null을 반환한다
// (mealStore.addMealRecord의 기존 가드와 동일).
export async function addMeal(date, mealType, items, total) {
  if (!Array.isArray(items) || items.length === 0) return null

  const userId = await getCurrentUserId()
  if (!userId) throw new Error('로그인이 필요합니다.')

  const row = {
    user_id: userId,
    date,
    meal_type: normalizeMealType(mealType),
    items: items.map(normalizeItem),
    total: total ?? {},
  }

  const { data, error } = await supabase.from('meals').insert(row).select().single()
  if (error) await throwFriendly(error)
  return mealRowToApp(data)
}

// 저장된 끼니의 items(+total)를 통째로 교체한다(트랙 2 §5, 저장 전 항목 하나만 값을 고치고 나머지는
// 그대로 넘기는 식으로 쓴다). schema.sql의 meals_update_own 정책이 이미 있어 별도 소유권 검사 없이
// update만 호출하면 된다 — 본인 행이 아니면 RLS가 애초에 그 행을 안 보여줘 0행 업데이트로 끝나고,
// 그건 mealId가 틀렸을 때와 구분이 안 되므로 둘 다 "수정할 기록을 찾을 수 없어요"로 알린다.
export async function updateMeal(mealId, items, total) {
  if (!Array.isArray(items) || items.length === 0) return null

  const userId = await getCurrentUserId()
  if (!userId) throw new Error('로그인이 필요합니다.')

  const row = {
    items: items.map(normalizeItem),
    total: total ?? {},
  }

  const { data, error } = await supabase.from('meals').update(row).eq('id', mealId).select().maybeSingle()
  if (error) await throwFriendly(error)
  if (!data) throw new Error('수정할 기록을 찾을 수 없어요.')
  return mealRowToApp(data)
}

// date: 'YYYY-MM-DD'. 그날의 끼니 기록 배열(오래된 순).
export async function getMeals(date) {
  const userId = await getCurrentUserId()
  if (!userId) return []

  const { data, error } = await supabase
    .from('meals')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .order('created_at', { ascending: true })
  if (error) await throwFriendly(error)
  return (data ?? []).map(mealRowToApp)
}

// startDate/endDate: 'YYYY-MM-DD', 둘 다 포함(inclusive) 범위. 달력이 날짜 하나하나 쿼리하지 않고
// 보이는 달 전체를 한 번에 조회할 때 쓴다. 반환은 { [date]: mealRecord[] }.
export async function getMealsByDateRange(startDate, endDate) {
  const userId = await getCurrentUserId()
  if (!userId) return {}

  const { data, error } = await supabase
    .from('meals')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('created_at', { ascending: true })
  if (error) await throwFriendly(error)

  const byDate = {}
  for (const row of data ?? []) {
    ;(byDate[row.date] ??= []).push(mealRowToApp(row))
  }
  return byDate
}

// 이 계정의 모든 끼니 기록을 날짜별로 묶어 반환한다({ [date]: mealRecord[] }). CSV 전체 백업 전용 —
// 화면들은 날짜/기간이 정해진 getMeals/getMealsByDateRange를 쓴다. RLS가 본인 행만 돌려주므로 여기서
// 별도 소유권 조건을 걸지 않는다.
export async function getAllMeals() {
  const userId = await getCurrentUserId()
  if (!userId) return {}

  const { data, error } = await supabase
    .from('meals')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) await throwFriendly(error)

  const byDate = {}
  for (const row of data ?? []) {
    ;(byDate[row.date] ??= []).push(mealRowToApp(row))
  }
  return byDate
}

// 여러 날짜의 끼니를 한 번에 통째로 교체한다(CSV 가져오기의 "덮어쓰기"). mealsByDate: { [date]: mealRecord[] }.
// 날짜별로 delete+insert를 반복하지 않고 **delete 1회 + insert 1회**로 끝낸다 — 1,000행짜리 백업이면
// 날짜가 250일을 넘기도 하는데, 날짜마다 왕복하면 수용 기준(1,000행 3초 이내)을 도저히 못 맞춘다.
// 지우고 넣는 두 단계라 중간에 실패하면 그 날짜들이 비어버릴 수 있어, 호출부(dataBackup.js)가 쓰기 전
// 스냅샷을 들고 있다가 되돌린다(meals 테이블을 트랜잭션으로 묶을 RPC가 없어 클라이언트 보상 방식).
export async function replaceMealsForDates(mealsByDate) {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('로그인이 필요합니다.')

  const dates = Object.keys(mealsByDate)
  if (dates.length === 0) return

  const { error: deleteError } = await supabase.from('meals').delete().eq('user_id', userId).in('date', dates)
  if (deleteError) await throwFriendly(deleteError)

  const rows = []
  for (const date of dates) {
    for (const record of mealsByDate[date] ?? []) {
      if (!Array.isArray(record.items) || record.items.length === 0) continue
      rows.push({
        user_id: userId,
        date,
        meal_type: normalizeMealType(record.mealType),
        items: record.items.map(normalizeItem),
        total: record.total ?? {},
      })
    }
  }
  if (rows.length === 0) return

  const { error } = await supabase.from('meals').insert(rows)
  if (error) await throwFriendly(error)
}

// 끼니 단위 삭제(그 끼니를 구성하는 음식 전체가 함께 제거된다) — mealStore.removeMealRecord와 동일한 단위.
// user_id로 다시 필터링하지 않아도 RLS가 본인 행만 지우게 강제하지만, 로그인 자체가 안 된 상태에서
// 불필요한 요청을 보내지 않도록 다른 함수들과 동일하게 여기서도 먼저 확인한다.
export async function deleteMeal(mealId) {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('로그인이 필요합니다.')

  const { error } = await supabase.from('meals').delete().eq('id', mealId)
  if (error) await throwFriendly(error)
}

// ---------------------------------------------------------------------
// 레벨/XP/퀘스트/뱃지 (게이미피케이션 v2) — supabase/migrations/2026-07-29_gamification.sql이
// 적용된 뒤에만 동작한다. profiles.total_xp/quest_claims/badge_unlocks 전부 upsertProfile이 다루는
// 신체정보와 무관하게 독립적으로 읽고 쓴다 — 온보딩 전 사용자도 XP를 쌓을 수 있어야 하기 때문이다.
// ---------------------------------------------------------------------

// 프로필 행이 아직 없으면(온보딩 전, XP도 아직 없음) 0을 반환한다.
export async function getLevelState() {
  const userId = await getCurrentUserId()
  if (!userId) return { totalXp: 0 }

  const { data, error } = await supabase.from('profiles').select('total_xp').eq('id', userId).maybeSingle()
  if (error) await throwFriendly(error)
  return { totalXp: data?.total_xp ?? 0 }
}

// CSV 복원 전용 "덮어쓰기". claimQuest처럼 증분하는 게 아니라 백업에 담긴 값을 그대로 심는다 —
// 신체정보가 없어도(profiles 행이 아직 없어도) upsert로 안전하게 생성된다(age/sex 등은 전부
// nullable, supabase/schema.sql 참고).
export async function saveLevelState({ totalXp }) {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('로그인이 필요합니다.')

  const { error } = await supabase.from('profiles').upsert({ id: userId, total_xp: totalXp }, { onConflict: 'id' })
  if (error) await throwFriendly(error)
  return { totalXp }
}

export async function getClaimedQuestIds(dateKey) {
  const userId = await getCurrentUserId()
  if (!userId) return []

  const { data, error } = await supabase.from('quest_claims').select('quest_id').eq('user_id', userId).eq('date', dateKey)
  if (error) await throwFriendly(error)
  return (data ?? []).map((row) => row.quest_id)
}

// quest_claims의 (user_id,date,quest_id) 유니크 제약이 중복 수령의 최종 방어선이다 — insert가 유니크
// 위반(23505)이면 이미 수령한 것이므로 XP를 다시 지급하지 않고 현재 totalXp만 돌려준다. insert가
// 성공했을 때만 increment_total_xp RPC(원자적 증가)를 호출한다.
export async function claimQuest(dateKey, questId, xpAwarded) {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('로그인이 필요합니다.')

  const { error: insertError } = await supabase
    .from('quest_claims')
    .insert({ user_id: userId, date: dateKey, quest_id: questId, xp_awarded: xpAwarded })
  if (insertError) {
    if (insertError.code === '23505') {
      const { totalXp } = await getLevelState()
      return { alreadyClaimed: true, totalXp }
    }
    await throwFriendly(insertError)
  }

  // 여기도 rpcWithAuthRetry를 쓴다. 바로 위 insert가 성공한 뒤 이 호출만 토큰 만료로 401을 받으면
  // **퀘스트는 클레임 처리됐는데 XP만 안 오르는** 상태가 되고, 리더보드가 XP 기준이라 그대로 순위에
  // 반영된다. 재시도가 안전한 이유: 401은 JWT가 거부돼 **함수가 실행조차 안 된 것**이므로 중복 증가가
  // 생길 수 없다(중복이 생길 수 있는 건 성공 후 응답을 못 받은 경우인데, 그건 401이 아니다).
  const { data, error: rpcError } = await rpcWithAuthRetry('increment_total_xp', { p_delta: xpAwarded })
  if (rpcError) await throwFriendly(rpcError)
  return { alreadyClaimed: false, totalXp: Number(data) }
}

// quest_claims 전체를 quest_id만 select해 클라이언트에서 집계한다(getAllMeals와 같은 방식 — 유저당
// "퀘스트 수 x 기록한 날 수" 정도라 서버 집계 쿼리 없이도 부담이 적다).
export async function getQuestClaimStats() {
  const userId = await getCurrentUserId()
  if (!userId) return { totalCount: 0, countsByQuestId: {} }

  const { data, error } = await supabase.from('quest_claims').select('quest_id').eq('user_id', userId)
  if (error) await throwFriendly(error)

  const countsByQuestId = {}
  for (const row of data ?? []) {
    countsByQuestId[row.quest_id] = (countsByQuestId[row.quest_id] ?? 0) + 1
  }
  return { totalCount: (data ?? []).length, countsByQuestId }
}

// MY 탭 개편 — "오늘/이번 주 획득 XP" 요약용. quest_claims에 이미 date/xp_awarded 컬럼과 본인만
// select 가능한 RLS가 있어 새 SQL·마이그레이션 없이 클라이언트 합산만으로 충분하다.
export async function getXpEarnedInRange(startDateKey, endDateKey) {
  const userId = await getCurrentUserId()
  if (!userId) return 0

  const { data, error } = await supabase
    .from('quest_claims')
    .select('xp_awarded')
    .eq('user_id', userId)
    .gte('date', startDateKey)
    .lte('date', endDateKey)
  if (error) await throwFriendly(error)
  return (data ?? []).reduce((sum, row) => sum + row.xp_awarded, 0)
}

export async function getUnlockedBadgeIds() {
  const userId = await getCurrentUserId()
  if (!userId) return []

  const { data, error } = await supabase.from('badge_unlocks').select('badge_id').eq('user_id', userId)
  if (error) await throwFriendly(error)
  return (data ?? []).map((row) => row.badge_id)
}

// badge_unlocks의 (user_id,badge_id) 유니크 제약이 중복 잠금해제의 최종 방어선이다.
export async function unlockBadge(badgeId) {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('로그인이 필요합니다.')

  const { error } = await supabase.from('badge_unlocks').insert({ user_id: userId, badge_id: badgeId })
  if (error) {
    if (error.code === '23505') {
      return { alreadyUnlocked: true, unlockedIds: await getUnlockedBadgeIds() }
    }
    await throwFriendly(error)
  }
  return { alreadyUnlocked: false, unlockedIds: await getUnlockedBadgeIds() }
}
