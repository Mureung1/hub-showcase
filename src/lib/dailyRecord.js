// 날짜별 DailyRecord 조회/누적 레이어. mealStore.js(끼니 목록)+nutrition.js(판정 계산)+storage.js(저장)를
// 조합만 하는 모듈이라 mealStore.js의 기존 export는 전혀 건드리지 않는다.
//
// 저장하는 건 그날의 recommended 스냅샷 하나뿐이다({ date, recommended, owner, createdAt },
// 키: dailyrecord:<userId>:<date>). meals/dayTotal/deficiency/compliant는 따로 저장하지 않고
// 매번 mealStore.getMeals()로 그 순간의 끼니 목록을 읽어 다시 계산한다. recommended만은 예외다:
// 나중에 프로필이 바뀌면 그 자체가 달라지는 값이라 meals에서 유도할 수 없어서, 저장 시점 값을
// 스냅샷으로 얼려둔다(레거시 records.js가 achievementPercent를 얼려두던 것과 같은 이유).
//
// [현재 상태] upsertMeal/replaceDay를 실제로 호출하는 곳은 이제 csv.js(가져오기 시 replaceDay)뿐이다
// — 실시간 화면(MealsPage.jsx 등)은 더 이상 이 모듈을 거치지 않고 db.js(Supabase meals 테이블)를
// 직접 쓴다. 레거시 로컬 데이터 처리 방침(왜 옛 계정 데이터를 새 Supabase 계정으로 옮기지 않는지)은
// csv.js 상단 주석 참고 — 계정 모델 자체가 통째로 바뀌어서(게스트/평문 로그인 → Supabase Auth),
// 옛 키의 owner(userId)를 지금의 auth uid로 안전하게 연결할 방법이 없다.
import { get, keysWithPrefix, remove, set } from './storage.js'
import { addMealRecord, getMeals, setMeals, sumMealRecordsNutrients } from './mealStore.js'
import { calcDayStatus, NUTRIENT_LABELS } from './nutrition.js'

const KEY_PREFIX = 'dailyrecord:'

function storageKey(userId, date) {
  return `${KEY_PREFIX}${userId}:${date}`
}

// recommended[key] - dayTotal[key] (양수=부족, 음수/0=충족 또는 초과). Result.jsx의 기존 계산과 동일 관례.
function calcDeficiency(recommended, dayTotal) {
  return Object.fromEntries(
    NUTRIENT_LABELS.map(({ key }) => [key, (Number(recommended?.[key]) || 0) - (Number(dayTotal?.[key]) || 0)]),
  )
}

// 'good'(6개 영양소 중 5개 이상 충족)일 때만 compliant. 'normal'/'bad'/판정불가는 전부 false.
function calcCompliant(recommended, dayTotal) {
  return calcDayStatus(recommended, dayTotal) === 'good'
}

// userId 소유의 DailyRecord가 존재하는 날짜(YYYY-MM-DD) 목록. 별도 인덱스를 캐시해두지 않고 저장된
// 스냅샷 키를 그때그때 스캔해서 만들기 때문에, 삭제/변경과 절대 어긋나지 않는다.
export function getIndex(userId) {
  if (!userId) return []
  return keysWithPrefix(storageKey(userId, '')).sort()
}

// 특정 날짜의 DailyRecord를 조립해서 반환한다. recommended 스냅샷이 없으면(그 날짜에 upsertMeal을
// 한 번도 부른 적 없음) null — mealStore에 그 날짜의 옛 데이터가 남아있어도 DailyRecord로 치지 않는다.
export function getRecord(userId, date) {
  if (!userId || !date) return null
  const snapshot = get(storageKey(userId, date), null)
  if (!snapshot) return null

  const meals = getMeals(userId, date)
  const dayTotal = sumMealRecordsNutrients(meals)

  return {
    date,
    meals,
    dayTotal,
    recommended: snapshot.recommended,
    deficiency: calcDeficiency(snapshot.recommended, dayTotal),
    compliant: calcCompliant(snapshot.recommended, dayTotal),
    owner: snapshot.owner,
  }
}

// userId의 전체 DailyRecord를 { [date]: DailyRecord } 형태로 반환한다(레거시 records.js의
// getAllRecords와 같은 모양이라, Calendar.jsx 등에서 나중에 그대로 바꿔 끼울 수 있다).
export function getAllRecords(userId) {
  return Object.fromEntries(getIndex(userId).map((date) => [date, getRecord(userId, date)]))
}

// meal({items, mealType}) 하나를 그 날짜 mealStore에 추가하고(mealStore.addMealRecord 위임),
// 그 시점의 recommended로 스냅샷을 (덮어)쓴다. 이름은 upsertMeal이지만 mealStore와 마찬가지로
// 끼니 단위 수정은 없고 "추가"만 한다 — 같은 날 여러 번 부르면 그때마다 새 끼니가 쌓이고,
// recommended 스냅샷은 가장 최근 호출 값으로 갱신된다(그날 프로필을 다시 저장한 뒤 또 먹었다면
// 최신 값을 반영하는 게 맞다고 판단).
export function upsertMeal(userId, date, meal, recommended) {
  if (!userId || !date) return null

  addMealRecord(userId, date, meal)
  set(storageKey(userId, date), { date, recommended, owner: userId, createdAt: new Date().toISOString() })

  return getRecord(userId, date)
}

// CSV 가져오기(csv.js importCSV) 전용: 그 날짜의 기존 끼니를 모두 비우고 meal 하나로 새로 채운 뒤
// recommended 스냅샷을 덮어쓴다. upsertMeal은 항상 "추가"만 하므로, 같은 날짜를 가져올 때마다 끼니가
// 중복 누적되는 걸 막으려면 이 함수가 필요하다 — "같은 날짜 충돌 시 덮어쓰기" 명세를 그대로 구현.
export function replaceDay(userId, date, meal, recommended) {
  if (!userId || !date) return null

  setMeals(userId, date, [])
  addMealRecord(userId, date, meal)
  set(storageKey(userId, date), { date, recommended, owner: userId, createdAt: new Date().toISOString() })

  return getRecord(userId, date)
}

// csv.js importCSV의 롤백 전용 쌍. replaceDay가 덮어쓰는 recommended 스냅샷(dailyrecord:<userId>:<date>
// 키)을 가져오기 전 상태 그대로 저장/복원한다. meals 배열 자체의 스냅샷/복원은 mealStore.getMeals/
// setMeals를 그대로 쓰면 되므로 여기서는 다루지 않는다.
export function getRecommendedSnapshot(userId, date) {
  if (!userId || !date) return null
  return get(storageKey(userId, date), null)
}

export function setRecommendedSnapshot(userId, date, snapshot) {
  if (!userId || !date) return
  if (snapshot === null) {
    remove(storageKey(userId, date))
  } else {
    set(storageKey(userId, date), snapshot)
  }
}
