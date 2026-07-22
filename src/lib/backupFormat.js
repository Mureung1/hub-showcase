// 백업 CSV의 **형식**만 다루는 순수 모듈 — 직렬화(내보내기용 행 만들기)와 파싱을 함께 담는다.
// 저장소(dataStore/Supabase/localStorage)나 브라우저 API(File, Blob)에 전혀 의존하지 않는다.
//
// [왜 dataBackup.js에서 분리했나]
// ① 이 앱에는 내보내기 진입점이 둘(MY 탭 전체 백업 / 달력 탭 기간별 기록)이고 형식도 둘인데,
//    한때 컬럼 정의가 파일마다 흩어져 있어서 "내보낸 파일을 가져오기가 못 읽는" 버그가 났다.
//    이제 **두 형식의 컬럼 정의가 전부 이 파일 하나에만** 있고, 내보내는 쪽(dataBackup.js, csv.js)과
//    읽는 쪽이 같은 상수를 참조한다 — 한쪽만 바뀌어 어긋나는 일이 구조적으로 불가능해진다.
// ② 저장소 의존이 없어 노드에서 그대로 import된다. scripts/check-csv-roundtrip.mjs가 실제 앱 코드로
//    왕복을 검증할 수 있는 이유다(브라우저를 띄우지 않고도 회귀를 잡는다).
//
// 다루는 두 형식:
//   ① 섹션 형식(SECTIONED) — MY 탭 "데이터 내보내기(CSV)". 신체정보 + 식단.
//        # 주석 줄(가져올 때는 무시)
//        [profile]
//        key,value
//        age,30
//        [meals]
//        date,mealType,item_name,brand,source,calories,protein,carbs,fat,fiber,sodium
//        2026-07-10,lunch,비빔밥,,식약처DB,650,15,95,12,6,900
//   ② 평면 형식(FLAT) — 달력 탭 "기간별 기록 내보내기". 식단만, 엑셀로 열어보기 좋은 표.
//        date,source,item_name,brand,<영양소들>,recommended_<영양소들>,compliant
//
// 행 단위 실패 정책: 개별 행이 깨져 있으면 그 행만 버리고 계속 진행하며 세기만 한다.
// 파일 자체가 두 형식 어느 쪽도 아니면 한 건도 읽지 않고 즉시 중단한다(엉뚱한 CSV가 절반쯤
// 반영되는 걸 막는다).
import { parseCsv } from './csvFormat.js'
import { sumNutrients } from './mealStore.js'
import { normalizeMealType } from './mealType.js'
import { NUTRIENT_LABELS, NUTRITION_SOURCE } from './nutrition.js'

export const NUTRIENT_KEYS = NUTRIENT_LABELS.map((n) => n.key)
export const MEAL_COLUMNS = ['date', 'mealType', 'item_name', 'brand', 'source', ...NUTRIENT_KEYS]
export const PROFILE_COLUMNS = ['key', 'value']

// 달력 탭 내보내기(csv.js)가 쓰는 컬럼. recommended_*/compliant는 내보낼 때만 참고용으로 싣고
// 가져올 때는 읽지 않는다(내보낸 시점 프로필 기준 스냅샷이라 지금 값과 다를 수 있다).
export const FLAT_EXPORT_COLUMNS = [
  'date',
  'source',
  'item_name',
  'brand',
  ...NUTRIENT_KEYS,
  ...NUTRIENT_KEYS.map((key) => `recommended_${key}`),
  'compliant',
]

// 평면 형식으로 인정하는 최소 조건. 컬럼 순서가 달라도, recommended_*/compliant가 없어도 읽는다.
export const FLAT_REQUIRED_COLUMNS = ['date', 'item_name', ...NUTRIENT_KEYS]

const REQUIRED_PROFILE_KEYS = ['age', 'sex', 'heightCm', 'weightKg', 'activity']
const SEX_VALUES = ['male', 'female']
const ACTIVITY_VALUES = ['low', 'moderate', 'high']
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export const BACKUP_FORMAT = {
  SECTIONED: 'sectioned', // MY 탭 전체 백업([profile]/[meals])
  FLAT: 'flat', // 달력 탭 기간별 기록(평면 표)
}

// 형식이 틀린 파일을 올렸을 때 화면이 "올바른 형식"으로 그대로 보여줄 예시(PRD FR-2.2).
// 내보내기 진입점이 둘이라 형식도 둘이다 — 어느 쪽으로 내보낸 파일이든 가져오기가 읽으므로,
// 안내에도 **두 형식을 모두** 보여줘야 사용자가 자기 파일이 왜 거부됐는지 판단할 수 있다.
export const EXPECTED_FORMAT_EXAMPLE = [
  '# ① MY 탭 "데이터 내보내기(CSV)" — 신체정보 + 식단 전체',
  '[profile]',
  PROFILE_COLUMNS.join(','),
  'age,30',
  '',
  '[meals]',
  MEAL_COLUMNS.join(','),
  `2026-07-10,lunch,비빔밥,,${NUTRITION_SOURCE.DB},650,15,95,12,6,900`,
  '',
  '# ② 달력 탭 "기간별 기록 내보내기" — 식단만(신체정보 없음)',
  ['date', 'source', 'item_name', 'brand', ...NUTRIENT_KEYS].join(','),
  `2026-07-10,${NUTRITION_SOURCE.DB},비빔밥,,650,15,95,12,6,900`,
].join('\n')

const FORMAT_ERROR =
  '지원하지 않는 파일 형식입니다. 이 앱에서 내보내기한 CSV 파일인지 확인해주세요(MY 탭 전체 백업 / 달력 탭 기간별 기록 둘 다 가져올 수 있어요).'

function formatError() {
  return Object.assign(new Error(FORMAT_ERROR), { expectedFormat: EXPECTED_FORMAT_EXAMPLE })
}

function makeId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

// ── 직렬화 (내보내기용) ──────────────────────────────────────────────────────

export function buildProfileRows(profile) {
  if (!profile) return []
  return [
    ['age', profile.age],
    ['sex', profile.sex],
    ['heightCm', profile.heightCm],
    ['weightKg', profile.weightKg],
    ['activity', profile.activity],
    ['conditions', (profile.conditions || []).join(';')],
    ['allergies', (profile.allergies || []).join(';')],
  ]
}

export function buildMealRows(mealsByDate) {
  const rows = []
  for (const date of Object.keys(mealsByDate).sort()) {
    for (const meal of mealsByDate[date]) {
      for (const item of meal.items || []) {
        rows.push([
          date,
          meal.mealType,
          item.name ?? '',
          item.brand ?? '',
          item.source ?? '',
          ...NUTRIENT_KEYS.map((key) => item.nutrients?.[key] ?? ''),
        ])
      }
    }
  }
  return rows
}

// ── 파싱 ─────────────────────────────────────────────────────────────────────


// ── 가져오기 1단계: 파싱 (아무 것도 쓰지 않는다) ─────────────────────────────

// rows: [profile] 마커 다음 줄부터 [meals] 마커 전까지. 반환 { profile, failedRows }.
// 프로필 구간이 통째로 깨져 있어도 파일 전체를 막지 않고 "프로필만 못 읽음"으로 처리한다 — 식단
// 기록이라도 살려서 가져오는 편이 사용자에게 이득이기 때문이다(행 단위 실패 정책과 같은 취지).
function parseProfileSection(rows) {
  if (rows.length === 0) return { profile: null, failedRows: 0 }

  const [header, ...dataRows] = rows
  if (header.length !== 2 || header[0] !== PROFILE_COLUMNS[0] || header[1] !== PROFILE_COLUMNS[1]) {
    throw formatError()
  }
  if (dataRows.length === 0) return { profile: null, failedRows: 0 }

  const map = {}
  let failedRows = 0
  for (const row of dataRows) {
    if (row.length !== 2 || !row[0] || row[0] in map) {
      failedRows += 1
      continue
    }
    map[row[0]] = row[1]
  }

  const age = Number(map.age)
  const heightCm = Number(map.heightCm)
  const weightKg = Number(map.weightKg)
  const valid =
    REQUIRED_PROFILE_KEYS.every((key) => map[key]) &&
    [age, heightCm, weightKg].every((n) => Number.isFinite(n) && n > 0) &&
    SEX_VALUES.includes(map.sex) &&
    ACTIVITY_VALUES.includes(map.activity)

  if (!valid) return { profile: null, failedRows: failedRows + dataRows.length }

  return {
    profile: {
      age,
      heightCm,
      weightKg,
      sex: map.sex,
      activity: map.activity,
      conditions: map.conditions ? map.conditions.split(';').filter(Boolean) : [],
      allergies: map.allergies ? map.allergies.split(';').filter(Boolean) : [],
    },
    failedRows,
  }
}

// rows: [meals] 마커 다음 줄부터 끝까지. 반환 { mealsByDate, importedRows, failedRows }.
// 같은 날짜+시간대(mealType)의 음식들을 하나의 끼니 기록으로 묶는다(원본의 정확한 끼니 경계는 CSV에
// 남지 않으므로 date+mealType을 사실상의 끼니 단위로 재구성한다).
function parseMealsSection(rows) {
  if (rows.length === 0) return { mealsByDate: {}, importedRows: 0, failedRows: 0 }

  const [header, ...dataRows] = rows
  if (header.length !== MEAL_COLUMNS.length || MEAL_COLUMNS.some((col, i) => header[i] !== col)) {
    throw formatError()
  }

  const byDate = new Map()
  let importedRows = 0
  let failedRows = 0

  for (const row of dataRows) {
    // 깨진 행 하나 때문에 전체가 멈추지 않도록, 검증 실패는 전부 "이 행만 버림"으로 처리한다.
    if (row.length !== MEAL_COLUMNS.length) {
      failedRows += 1
      continue
    }
    const [date, mealTypeRaw, name, brand, source, ...nutrientRaw] = row
    if (!DATE_RE.test(date) || !name) {
      failedRows += 1
      continue
    }

    const nutrients = {}
    let numbersOk = true
    NUTRIENT_KEYS.forEach((key, i) => {
      const raw = nutrientRaw[i]
      const value = raw === '' ? 0 : Number(raw)
      if (!Number.isFinite(value)) numbersOk = false
      nutrients[key] = Number.isFinite(value) ? value : 0
    })
    if (!numbersOk) {
      failedRows += 1
      continue
    }

    const mealType = normalizeMealType(mealTypeRaw)
    const item = { name, brand: brand || null, nutrients, source: source || NUTRITION_SOURCE.ESTIMATED }

    if (!byDate.has(date)) byDate.set(date, new Map())
    const byMealType = byDate.get(date)
    if (!byMealType.has(mealType)) byMealType.set(mealType, [])
    byMealType.get(mealType).push(item)
    importedRows += 1
  }

  const mealsByDate = {}
  for (const [date, byMealType] of byDate) {
    mealsByDate[date] = [...byMealType.entries()].map(([mealType, items]) => ({
      id: makeId(),
      mealType,
      createdAt: new Date().toISOString(),
      items,
      total: sumNutrients(items),
    }))
  }

  return { mealsByDate, importedRows, failedRows }
}

// ── 평면 형식(달력 탭의 "기간별 기록 내보내기") 파서 ─────────────────────────
// 이 앱에는 내보내기 진입점이 두 개고 형식이 서로 다르다. 이쪽은 엑셀로 열어보기 좋은 평면 표라
// 구간 마커도, 신체정보도, 끼니 시간대도 없다:
//   date,source,item_name,brand,<영양소들>,recommended_<영양소들>,compliant
// 사용자가 "어느 버튼으로 내보낸 파일인지" 기억해야 할 이유는 없으므로, 가져오기가 두 형식을
// 모두 읽는다(내보내기를 하나로 합치면 과거에 내보내 둔 파일의 절반이 영영 안 읽힌다).

// 헤더 이름 -> 인덱스. 컬럼 순서가 달라도 읽히게 이름으로 찾는다(엑셀에서 열었다 저장하면서
// 순서가 바뀌거나 컬럼이 하나 늘어나는 경우가 실제로 있다).
function headerIndex(header) {
  const index = {}
  header.forEach((name, i) => {
    const key = String(name ?? '').trim()
    if (key && !(key in index)) index[key] = i
  })
  return index
}

function isFlatHeader(row) {
  if (!Array.isArray(row)) return false
  const index = headerIndex(row)
  return FLAT_REQUIRED_COLUMNS.every((col) => col in index)
}

// 반환 { mealsByDate, importedRows, failedRows }. 섹션 형식과 같은 모양이라 이후 단계
// (중복 날짜 다이얼로그 -> applyBackup)가 형식을 몰라도 그대로 동작한다.
//
// recommended_* / compliant 컬럼은 읽지 않는다 — 내보낸 시점의 프로필로 계산된 스냅샷이라
// 지금 프로필과 다를 수 있고, 되살리면 오히려 틀린 값을 심게 된다(현재 권장량은 항상 프로필에서
// 다시 계산된다).
// mealType도 이 형식에는 없다. csv.js의 옛 importCSV가 하던 것과 동일하게 'etc'로 둔다.
function parseFlatRows(rows) {
  const [header, ...dataRows] = rows
  const index = headerIndex(header)

  const byDate = new Map()
  let importedRows = 0
  let failedRows = 0

  for (const row of dataRows) {
    const date = row[index.date]
    const name = row[index.item_name]
    // 깨진 행 하나 때문에 전체가 멈추지 않도록, 검증 실패는 "이 행만 버림"으로 처리한다.
    if (!DATE_RE.test(String(date ?? '').trim()) || !name) {
      failedRows += 1
      continue
    }

    const nutrients = {}
    let numbersOk = true
    for (const key of NUTRIENT_KEYS) {
      const raw = row[index[key]]
      const value = raw === '' || raw === undefined ? 0 : Number(raw)
      if (!Number.isFinite(value)) numbersOk = false
      nutrients[key] = Number.isFinite(value) ? value : 0
    }
    if (!numbersOk) {
      failedRows += 1
      continue
    }

    const item = {
      name,
      brand: row[index.brand] || null,
      nutrients,
      source: row[index.source] || NUTRITION_SOURCE.ESTIMATED,
    }

    if (!byDate.has(date)) byDate.set(date, [])
    byDate.get(date).push(item)
    importedRows += 1
  }

  const mealsByDate = {}
  for (const [date, items] of byDate) {
    // 이 형식은 끼니 경계를 담지 않으므로 하루치를 끼니 하나로 묶는다.
    mealsByDate[date] = [
      {
        id: makeId(),
        mealType: normalizeMealType('etc'),
        createdAt: new Date().toISOString(),
        items,
        total: sumNutrients(items),
      },
    ]
  }

  return { mealsByDate, importedRows, failedRows }
}

// ── 형식 판별 + 파싱 ─────────────────────────────────────────────────────────

// 텍스트만 받아 파싱까지 하는 순수 함수(File을 받지 않는다) — 브라우저 없이도 검증할 수 있게
// 분리해뒀다(scripts/check-csv-roundtrip.mjs가 이 함수로 왕복을 확인한다).
// 반환: { format, profile, mealsByDate, importedRows, failedRows }
export function parseBackupText(text) {
  // 항상 UTF-8로 디코딩되므로, 다른 인코딩(예: 엑셀이 저장한 CP949/EUC-KR)으로 저장된 파일은
  // 한글이 U+FFFD(깨짐 표시)로 바뀐다. 그래도 문자열 자체는 비어있지 않아 아래 검증을 그냥
  // 통과해버리므로 — 깨진 채로 조용히 저장되는 걸 막기 위해 여기서 먼저 걸러낸다.
  if (text.includes('�')) {
    throw new Error('파일 인코딩을 읽을 수 없습니다. UTF-8로 저장된 CSV 파일인지 확인해주세요.')
  }

  const allRows = parseCsv(text)

  // (a) 구간 마커가 있으면 전체 백업 형식.
  const profileMarkerIdx = allRows.findIndex((r) => r.length === 1 && r[0].trim() === '[profile]')
  const mealsMarkerIdx = allRows.findIndex((r) => r.length === 1 && r[0].trim() === '[meals]')
  if (profileMarkerIdx !== -1 && mealsMarkerIdx !== -1 && mealsMarkerIdx > profileMarkerIdx) {
    const { profile, failedRows: profileFailed } = parseProfileSection(
      allRows.slice(profileMarkerIdx + 1, mealsMarkerIdx),
    )
    const { mealsByDate, importedRows, failedRows: mealFailed } = parseMealsSection(allRows.slice(mealsMarkerIdx + 1))
    return {
      format: BACKUP_FORMAT.SECTIONED,
      profile,
      mealsByDate,
      importedRows,
      failedRows: profileFailed + mealFailed,
    }
  }

  // (b) 평면 형식의 헤더 행을 찾는다. 파일 앞머리에 주석(#)이 있을 수 있어 첫 줄로 못 박지 않는다.
  const flatHeaderIdx = allRows.findIndex(isFlatHeader)
  if (flatHeaderIdx !== -1) {
    const { mealsByDate, importedRows, failedRows } = parseFlatRows(allRows.slice(flatHeaderIdx))
    // 이 형식에는 신체정보가 없다 — profile: null이 정상이며 에러가 아니다.
    return { format: BACKUP_FORMAT.FLAT, profile: null, mealsByDate, importedRows, failedRows }
  }

  // (c) 둘 다 아니면 이 앱이 만든 파일이 아니다.
  throw formatError()
}
