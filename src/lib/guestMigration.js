// 게스트로 쓰던 중 로그인/회원가입하면, 그동안 localStorage에 쌓인 데이터를 Supabase 계정으로 1회
// 옮길지 물어보고(동의 시) 옮기는 기능. UserContext가 로그인 직후(currentUserId가 채워질 때마다) 이
// 모듈의 checkMigrationPrompt로 "물어볼 필요가 있는지"를 확인하고, 동의하면 migrateGuestData를 부른다.
//
// [남겨두기 정책] 마이그레이션에 성공해도 게스트 localStorage 데이터는 지우지 않고 그대로 남겨둔다.
// 이유: (1) 실패 안전성이 최우선이라, "옮긴 뒤 지우는" 로직 자체를 없애면 그 로직이 버그를 만들 여지도
// 없어진다 — 무슨 일이 있어도 로컬 원본은 항상 그대로 남는다. (2) 로그아웃하면 다시 게스트 모드로
// 돌아가는데, 그때 이 데이터가 남아있어야 이전처럼 계속 쓸 수 있다(지웠다면 로그아웃 시 게스트 데이터가
// 통째로 사라지는 셈). (3) 이미 Supabase에 올렸다는 사실은 아래 상태(offered/doneMealIds)로 따로
// 기억하므로, 로컬 데이터를 지우지 않아도 재로그인 시 중복 업로드로 이어지지 않는다.
//
// [프로필 충돌] 계정에 이미 신체정보가 저장돼 있으면 게스트 값으로 덮어쓰지 않는다 — 계정 데이터가
// 항상 우선이다. 이 확인 없이 무조건 upsert하면, 다른 기기에서 게스트로 잠깐 써본 뒤 원래 쓰던 계정에
// 로그인하는 흔한 경우에 실제 계정 프로필이 그 기기의 게스트 값으로 조용히 덮어써지는 사고가 난다.
// 끼니 기록은 반대로 계정에 이미 있는 기록 위에 그대로 추가(병합)된다 — "같은 날짜에 두 출처의 기록이
// 공존"하는 것이지 서로 덮어쓰지 않으므로 덮어쓰기 충돌 자체가 없다.
//
// [중복 방지] meals 테이블에는 "이 게스트 끼니 하나"를 가리키는 자연키가 없어(끼니 하나 = 행 하나),
// 같은 데이터를 두 번 업로드하면 그대로 중복 행이 생긴다. 그래서 끼니 기록(mealStore가 이미 부여한
// id) 단위로 "이미 옮겼다"를 로컬에 기록해두고(doneMealIds), 마이그레이션이 중간에 실패해 재시도해도
// 이미 끝난 끼니는 건너뛰고 이어서 진행한다 — 날짜 단위가 아니라 끼니 기록 단위로 끊어야, 하루에 여러
// 끼니가 있을 때 이미 성공한 끼니까지 재업로드되는 걸 막을 수 있다.
import { addMeal, getProfile, upsertProfile } from './db.js'
import * as dataStore from './dataStore.js'
import { sumNutrients } from './mealStore.js'
import { get, set } from './storage.js'

function stateKey(userId) {
  return `guestMigration:${userId}`
}

function readState(userId) {
  return get(stateKey(userId), { offered: false, doneMealIds: [] })
}

function writeState(userId, state) {
  set(stateKey(userId), state)
}

// 로그인 직후 "물어봐야 하는지" 판단(순수 로컬 읽기라 즉시 반환된다). 이미 한 번 답했으면(끝까지
// 옮겼든, 거부했든) 다시 묻지 않고 null을 반환한다. 옮길 로컬 데이터가 아예 없는 새 게스트도 물어볼
// 필요가 없으므로 즉시 "처리 완료"로 표시해 다음부터는 이 검사 자체를 건너뛰게 한다.
export function checkMigrationPrompt(userId) {
  const state = readState(userId)
  if (state.offered) return null

  const guestProfile = dataStore.getGuestProfileRaw()
  const guestDates = dataStore.getGuestMealDates()
  if (!guestProfile?.profile && guestDates.length === 0) {
    writeState(userId, { ...state, offered: true })
    return null
  }

  return { hasProfile: Boolean(guestProfile?.profile), mealDayCount: guestDates.length }
}

export function declineMigration(userId) {
  const state = readState(userId)
  writeState(userId, { ...state, offered: true })
}

// 성공적으로 끝까지 돌면 offered:true로 표시해 다시 묻지 않는다. 중간에 실패하면(네트워크 오류 등)
// offered는 false로 남아 — 다음에 다시 프롬프트가 뜨되, 이미 끝난 끼니(doneMealIds)는 건너뛰어 중복
// 업로드 없이 이어서 진행한다. 실패 시 에러를 그대로 던지므로 호출부가 재시도 UI를 보여줄 수 있다.
export async function migrateGuestData(userId) {
  const state = readState(userId)
  const doneMealIds = new Set(state.doneMealIds)

  const guestProfile = dataStore.getGuestProfileRaw()
  if (guestProfile?.profile) {
    const existing = await getProfile()
    if (!existing?.profile) {
      await upsertProfile({ profile: guestProfile.profile, recommended: guestProfile.recommended })
    }
  }

  for (const date of dataStore.getGuestMealDates()) {
    for (const meal of dataStore.getGuestMealsForDate(date)) {
      if (doneMealIds.has(meal.id)) continue
      await addMeal(date, meal.mealType, meal.items, sumNutrients(meal.items))
      doneMealIds.add(meal.id)
      // 끼니 하나가 끝날 때마다 즉시 진행 상태를 저장한다 — 같은 날짜의 다음 끼니에서 실패해도 방금
      // 끝낸 끼니가 재시도 때 다시 올라가지 않는다.
      writeState(userId, { offered: false, doneMealIds: [...doneMealIds] })
    }
  }

  writeState(userId, { offered: true, doneMealIds: [...doneMealIds] })
}
