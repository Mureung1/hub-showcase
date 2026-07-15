// profiles 테이블(신체정보 + 하루 권장 영양정보) CRUD. RLS(auth.uid() = id)가 본인 행만
// 다루게 보장하므로, 여기서는 별도 소유권 검사 없이 그대로 supabase 클라이언트를 호출한다.
// 스키마는 supabase/schema.sql 참고 — DB는 snake_case, 앱은 camelCase라 여기서 서로 변환한다.
import { supabase } from './supabase.js'

async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw new Error(error.message)
  return data.user?.id ?? null
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
  if (error) throw new Error(error.message)
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
  if (error) throw new Error(error.message)
  return rowToApp(data)
}
