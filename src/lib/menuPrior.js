// 급식 사진 분석의 "정답지 후보" — 그날 그 학교에 실제로 나온 메뉴 목록을 미리 가져온다.
//
// ── 왜 이게 정확도의 최대 지렛대인가 ──
// 한국 학교급식은 영양(교)사가 **표준레시피 × 1인 배식량**으로 영양을 산출해 NEIS에 공개한다.
// 즉 급식 사진에는 그날의 공식 메뉴명 목록이 이미 존재하는데, 지금까지 사진 분석은 그걸 안 쓰고
// AI에게 맨땅에서 이름을 지어내게 했다. 목록을 주면 식별이 **open-set → closed-set**으로 바뀐다:
// AI가 "몬테크리스토샌드위치" 같은 이름을 창작할 여지가 구조적으로 사라지고, 고른 이름이 곧
// 식약처 DB 조회에 쓸 표준명이 된다.
//
// ── 비용 0 ──
// 사진 업로드·Gemini 호출과 **병렬로** 부르고, (학교코드, 날짜) 키로 캐시한다. 같은 학교 학생들이
// 같은 날 찍으면 두 번째부터는 네트워크가 아예 없다. 실패하면 조용히 null — 프라이어가 없어도
// 기존 open-set 경로가 그대로 동작하므로 분석을 막을 이유가 없다.
import { getSchoolMeals } from './schoolMeal.js'

// NEIS 원문 메뉴명에는 알레르기 번호와 각주 기호가 붙는다("치즈스틱 (1.2.5.6)", "백김치*").
// 그대로 프롬프트에 넣으면 AI가 그 표기까지 따라 적어 DB 조회가 어긋나므로 여기서 벗긴다.
// 서버의 normalizeFoodName과 규칙이 겹치지만 목적이 다르다 — 저쪽은 "매칭 키"를 만들고, 여기는
// **사람이 읽는 메뉴명**을 만든다(공백은 살려둔다).
export function cleanMenuName(raw) {
  if (typeof raw !== 'string') return ''
  return raw
    .replace(/\([^)]*\)/g, '') // 알레르기 번호 괄호
    .replace(/[*♧♤○♡]/g, '') // 각주 기호
    .replace(/[\d.]+$/, '') // 말미에 괄호 없이 붙는 알레르기 번호("우유2.5")
    .replace(/^[Hh][-\s]?(?=[가-힣])/, '') // 할랄·저염 표시 접두("H참외")
    .replace(/\s+/g, ' ')
    .trim()
}

const cache = new Map() // `${schoolCode}:${dateKey}` -> meals[]

// 실패는 **성공과 같은 캐시에 담지 않는다.** 예전엔 catch에서 `cache.set(key, [])`를 해서, 네트워크가
// 한 번 끊기거나 아래 타임아웃에 한 번 걸리면 그날 그 학교의 프라이어가 세션 내내 죽었다 —
// closed-set 식별·NEIS 공식 앵커링·판 단위 검증 밴드가 한꺼번에, 사용자에게 아무 표시 없이 꺼진다.
// 대신 짧은 TTL의 실패 기록만 둔다(연타로 NEIS를 두드리는 건 막으면서 회복은 가능하게).
const failures = new Map() // key -> 실패 시각(ms)
const FAILURE_TTL_MS = 60_000

// 프라이어는 "있으면 좋은" 부가 정보인데 Gemini 프롬프트 안에 들어가야 해서 구조적으로 직렬이다
// (메뉴 목록이 프롬프트의 일부다). 그래서 늦으면 **버린다** — NEIS가 느린 날 사용자가 분석 스피너를
// 28초(fetchWithTimeout 기본값) 동안 보고 있다가 그제서야 Gemini 호출이 시작되면 안 된다.
const PRIOR_DEADLINE_MS = 2500

export function _clearMenuPriorCacheForTest() {
  cache.clear()
  failures.clear()
}

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
}

// profile.school: { type, officeCode, code, name, kind } | null (Profile.jsx가 저장하는 모양).
// mealType: 'breakfast' | 'lunch' | 'dinner' — 지금 시간대에 해당하는 끼니.
//
// 반환: { names, officialTotals, schoolKind } | null
//   names: 프롬프트에 넣을 메뉴명 배열
//   officialTotals: NEIS가 함께 주는 공식 영양수치(있으면) — 판 단위 검증에 쓴다.
export async function fetchMenuPrior(profile, mealType) {
  const school = profile?.school
  if (!school?.officeCode || !school?.code) return null

  const date = todayKey()
  const key = `${school.code}:${date}`
  if (cache.has(key)) return pickMeal(cache.get(key), mealType, school.kind)

  // 방금 실패했으면 잠깐은 다시 두드리지 않는다. TTL이 지나면 기록을 지우고 정상 재시도한다.
  const failedAt = failures.get(key)
  if (failedAt !== undefined) {
    if (Date.now() - failedAt < FAILURE_TTL_MS) return null
    failures.delete(key)
  }

  try {
    // 데드라인을 넘기면 결과를 버리고 open-set 경로로 간다. 이때 요청 자체는 백그라운드에서 계속
    // 끝나지만 그 결과를 캐시에 담지는 않는다(레이스로 다른 날짜 결과가 섞이지 않게 한다).
    const days = await Promise.race([
      getSchoolMeals({ officeCode: school.officeCode, schoolCode: school.code, from: date, to: date }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('prior deadline')), PRIOR_DEADLINE_MS)),
    ])
    const meals = days?.[0]?.meals ?? []
    cache.set(key, meals)
    return pickMeal(meals, mealType, school.kind)
  } catch {
    // 프라이어는 부가 정보다 — 못 가져와도 분석은 그대로 진행된다(open-set 경로).
    failures.set(key, Date.now())
    return null
  }
}

function pickMeal(meals, mealType, schoolKind) {
  const meal = (meals ?? []).find((m) => m.mealType === mealType)
  if (!meal) return null
  const names = (meal.menus ?? []).map((m) => cleanMenuName(typeof m === 'string' ? m : m?.name)).filter(Boolean)
  if (names.length === 0) return null
  return { names, officialTotals: buildOfficialTotals(meal), schoolKind: schoolKind ?? null }
}

// NEIS가 주는 공식 수치를 우리 6영양소 모양으로 맞춘다. 없는 항목은 null로 남긴다(0으로 채우면
// "0kcal"과 "모름"이 구분되지 않는다).
function buildOfficialTotals(meal) {
  const calories = Number(meal?.calories)
  if (!(calories > 0)) return null
  const n = meal?.nutrients ?? {}
  return {
    calories,
    protein: Number.isFinite(Number(n.protein)) ? Number(n.protein) : null,
    carbs: Number.isFinite(Number(n.carbs)) ? Number(n.carbs) : null,
    fat: Number.isFinite(Number(n.fat)) ? Number(n.fat) : null,
    fiber: null,
    sodium: Number.isFinite(Number(n.sodium)) ? Number(n.sodium) : null,
  }
}
