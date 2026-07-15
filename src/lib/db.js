// profiles/meals 테이블 CRUD. 여기서는 별도 소유권(누가 이 행 주인인지) 검사를 하지 않는다 — RLS
// (supabase/schema.sql, auth.uid() = id / auth.uid() = user_id)가 DB 레벨에서 강제하므로, 이 파일의
// 코드가 실수로 잘못된 조건을 걸어도 다른 사람 데이터가 새어나갈 수 없다. DB는 snake_case, 앱은
// camelCase라 여기서 서로 변환한다.
import { supabase } from './supabase.js'
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
function normalizeItem(item) {
  return {
    name: item.name,
    brand: item.brand ?? null,
    nutrients: item.nutrients,
    source: item.source ?? (item.brand ? '공식' : '추정'),
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

// 끼니 단위 삭제(그 끼니를 구성하는 음식 전체가 함께 제거된다) — mealStore.removeMealRecord와 동일한 단위.
// user_id로 다시 필터링하지 않아도 RLS가 본인 행만 지우게 강제하지만, 로그인 자체가 안 된 상태에서
// 불필요한 요청을 보내지 않도록 다른 함수들과 동일하게 여기서도 먼저 확인한다.
export async function deleteMeal(mealId) {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('로그인이 필요합니다.')

  const { error } = await supabase.from('meals').delete().eq('id', mealId)
  if (error) await throwFriendly(error)
}
