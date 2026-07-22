// 신체정보 + 식단 기록 전체를 CSV 한 파일로 내보내고 다시 불러오는 기능(PRD v2.0 §2).
// 이 파일의 전신은 게스트 전용이던 guestBackup.js다 — 3주차에 dataStore를 거치도록 바꿔 **게스트와
// 로그인 계정 양쪽에서 똑같이** 동작한다(dataStore가 매 호출마다 세션을 보고 localStorage/Supabase 중
// 어디를 쓸지 알아서 정한다). csv.js(로그인 계정의 레거시 로컬 백업)와는 여전히 별개 파일/형식이다.
//
// 파일 구조(플레인 텍스트, 사람이 열어봐도 대략 읽을 수 있게 두 구간으로 나눔):
//   # 주석 줄(가져올 때는 무시)
//   [profile]
//   key,value
//   age,30
//   ...
//   [meals]
//   date,mealType,item_name,brand,source,calories,protein,carbs,fat,fiber,sodium
//   2026-07-10,lunch,비빔밥,,식약처DB,650,15,95,12,6,900
//
// 가져오기는 **파싱과 반영을 두 단계로 나눈다**(parseBackupCSV -> applyBackup). 그 사이에 화면이
// "이미 기록이 있는 날짜를 덮어쓸지 건너뛸지"를 물어볼 수 있어야 하기 때문이다(PRD FR-2.2).
// 파싱 단계는 아무 것도 쓰지 않으므로, 사용자가 다이얼로그를 취소해도 기존 데이터는 그대로다.
//
// 행 단위 실패 정책(PRD FR-2.2): 개별 행이 깨져 있으면 그 행만 버리고 계속 진행한 뒤 "N건 가져옴,
// M건 실패"로 요약한다. 반대로 파일 자체가 이 형식이 아니면(구간 마커 없음/헤더 불일치) 한 건도 읽지
// 않고 "지원하지 않는 파일 형식입니다"로 즉시 중단한다 — 엉뚱한 CSV가 절반쯤 반영되는 걸 막는다.
import { parseCsv, rowsToCsv } from './csvFormat.js'
import * as dataStore from './dataStore.js'
import { saveTextFile, todayFileStamp } from './fileExport.js'
import { sumNutrients } from './mealStore.js'
import { normalizeMealType } from './mealType.js'
import { calcRecommendedNutrients, NUTRIENT_LABELS, NUTRITION_SOURCE } from './nutrition.js'

const NUTRIENT_KEYS = NUTRIENT_LABELS.map((n) => n.key)
const MEAL_COLUMNS = ['date', 'mealType', 'item_name', 'brand', 'source', ...NUTRIENT_KEYS]
const PROFILE_COLUMNS = ['key', 'value']
const REQUIRED_PROFILE_KEYS = ['age', 'sex', 'heightCm', 'weightKg', 'activity']
const SEX_VALUES = ['male', 'female']
const ACTIVITY_VALUES = ['low', 'moderate', 'high']
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

// 형식이 틀린 파일을 올렸을 때 화면이 "올바른 형식"으로 그대로 보여줄 예시(PRD FR-2.2).
export const EXPECTED_FORMAT_EXAMPLE = [
  '[profile]',
  PROFILE_COLUMNS.join(','),
  'age,30',
  '',
  '[meals]',
  MEAL_COLUMNS.join(','),
  `2026-07-10,lunch,비빔밥,,${NUTRITION_SOURCE.DB},650,15,95,12,6,900`,
].join('\n')

const FORMAT_ERROR = '지원하지 않는 파일 형식입니다. MY 탭에서 내보내기한 CSV 파일인지 확인해주세요.'

function formatError() {
  return Object.assign(new Error(FORMAT_ERROR), { expectedFormat: EXPECTED_FORMAT_EXAMPLE })
}

function makeId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

// ── 내보내기 ────────────────────────────────────────────────────────────────

function buildProfileRows(profile) {
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

function buildMealRows(mealsByDate) {
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

// 내보낼 데이터가 아예 없으면(프로필도 없고 식단도 없는 새 계정) null을 반환하고 파일도 만들지 않는다.
// 있으면 { hasProfile, mealDayCount, itemCount, save }를 반환한다 — save는 fileExport.saveTextFile의
// 결과(플랫폼별 완료 문구 + 네이티브 공유 함수)를 그대로 담고 있다.
export async function exportBackupCSV() {
  const [profileData, mealsByDate] = await Promise.all([dataStore.getProfile(), dataStore.getAllMealsByDate()])

  const profileRows = buildProfileRows(profileData?.profile)
  const mealRows = buildMealRows(mealsByDate)
  if (profileRows.length === 0 && mealRows.length === 0) return null

  const text = [
    '# Mealyze 데이터 백업(기기 이동용)',
    '# MY 탭의 "데이터 가져오기(CSV)"로 다른 기기/계정에서 다시 불러올 수 있어요.',
    '',
    '[profile]',
    rowsToCsv([PROFILE_COLUMNS, ...profileRows]),
    '',
    '[meals]',
    rowsToCsv([MEAL_COLUMNS, ...mealRows]),
  ].join('\r\n')

  // PRD FR-2.1: 파일명은 영문 고정 mealog_YYYY-MM-DD.csv, 인코딩은 UTF-8 with BOM(saveTextFile이 붙인다).
  const save = await saveTextFile({ filename: `mealog_${todayFileStamp()}.csv`, content: text })

  return {
    hasProfile: profileRows.length > 0,
    mealDayCount: new Set(mealRows.map((r) => r[0])).size,
    itemCount: mealRows.length,
    save,
  }
}

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

// 파일을 읽어 검증까지만 한다. 이 시점에는 아무 것도 저장하지 않으므로, 화면이 결과를 보고 사용자에게
// 되물어본 뒤(중복 날짜 처리) applyBackup을 부르면 된다.
// 반환: { profile, mealsByDate, dates, duplicateDates, importedRows, failedRows }
export async function parseBackupCSV(file) {
  const text = await file.text()
  // file.text()는 항상 UTF-8로 디코딩한다 — 다른 인코딩(예: 엑셀이 저장한 CP949/EUC-KR)으로 저장된
  // 파일을 그대로 읽으면 한글이 U+FFFD(깨짐 표시)로 바뀌는데, 그래도 문자열 자체는 비어있지 않아
  // 아래 검증을 그냥 통과해버린다 — 깨진 채로 조용히 저장되는 걸 막기 위해 여기서 먼저 걸러낸다.
  if (text.includes('�')) {
    throw new Error('파일 인코딩을 읽을 수 없습니다. UTF-8로 저장된 CSV 파일인지 확인해주세요.')
  }

  const allRows = parseCsv(text)
  const profileMarkerIdx = allRows.findIndex((r) => r.length === 1 && r[0].trim() === '[profile]')
  const mealsMarkerIdx = allRows.findIndex((r) => r.length === 1 && r[0].trim() === '[meals]')
  if (profileMarkerIdx === -1 || mealsMarkerIdx === -1 || mealsMarkerIdx < profileMarkerIdx) {
    throw formatError()
  }

  const { profile, failedRows: profileFailed } = parseProfileSection(
    allRows.slice(profileMarkerIdx + 1, mealsMarkerIdx),
  )
  const { mealsByDate, importedRows, failedRows: mealFailed } = parseMealsSection(allRows.slice(mealsMarkerIdx + 1))

  if (!profile && Object.keys(mealsByDate).length === 0) {
    const error = new Error(
      importedRows + mealFailed + profileFailed > 0
        ? '가져올 수 있는 행이 없습니다. 파일 내용을 확인해주세요.'
        : '가져올 데이터가 없습니다.',
    )
    throw error
  }

  // 이미 기록이 있는 날짜 = 덮어쓰기 여부를 물어봐야 하는 날짜.
  const dates = Object.keys(mealsByDate).sort()
  const existing = await dataStore.getAllMealsByDate()
  const duplicateDates = dates.filter((date) => (existing[date]?.length ?? 0) > 0)

  return {
    profile,
    mealsByDate,
    dates,
    duplicateDates,
    importedRows,
    failedRows: profileFailed + mealFailed,
  }
}

// ── 가져오기 2단계: 실제 반영 ────────────────────────────────────────────────

// parsed: parseBackupCSV의 반환값. duplicateStrategy: 'overwrite' | 'skip' — 이미 기록이 있는 날짜를
// 어떻게 할지(중복이 없으면 무시된다).
// 실패 시 이미 쓴 부분을 쓰기 전 값으로 되돌린 뒤 던진다 — 절반만 반영된 채로 남지 않게 한다.
// 반환: { profileRestored, mealDayCount, skippedDateCount, importedRows, failedRows }
export async function applyBackup(parsed, { duplicateStrategy = 'overwrite' } = {}) {
  const { profile, mealsByDate, duplicateDates } = parsed
  const skipped = duplicateStrategy === 'skip' ? new Set(duplicateDates) : new Set()
  const targetDates = parsed.dates.filter((date) => !skipped.has(date))

  // 계정에 이미 신체정보가 있으면 CSV 값으로 덮어쓰지 않는다 — 여기서 덮어쓰면 다른 기기의 옛 백업을
  // 무심코 가져왔을 때 현재 프로필이 조용히 사라진다(guestMigration.js의 프로필 충돌 정책과 동일).
  const existingProfile = await dataStore.getProfile()
  const shouldWriteProfile = Boolean(profile) && !existingProfile?.profile

  // 쓰기 전 스냅샷 — 중간 실패 시 되돌리기 위해서다. 대상 날짜만 담으면 되므로 전체 조회 결과에서
  // 해당 날짜만 추린다(그 날짜에 기록이 없었으면 빈 배열 = "원래 비어 있었음").
  const allExisting = await dataStore.getAllMealsByDate()
  const previousMeals = Object.fromEntries(targetDates.map((date) => [date, allExisting[date] ?? []]))
  const nextMeals = Object.fromEntries(targetDates.map((date) => [date, mealsByDate[date]]))

  try {
    if (shouldWriteProfile) {
      await dataStore.saveProfile({ profile, recommended: calcRecommendedNutrients(profile) })
    }
    // 날짜 수와 무관하게 왕복 2회로 끝난다(delete 1회 + insert 1회) — 수용 기준의 "1,000행 3초 이내"는
    // 날짜마다 왕복하면 맞출 수 없다.
    await dataStore.replaceMealsForDates(nextMeals)
  } catch (err) {
    try {
      await dataStore.replaceMealsForDates(previousMeals)
    } catch {
      // 되돌리기까지 실패하면 더 할 수 있는 게 없다 — 아래 메시지로 사용자에게 상태를 알린다.
    }
    console.error('backup import write failed, rolled back:', err)
    throw new Error('가져오기에 실패했어요. 기존 데이터로 되돌렸어요. 잠시 후 다시 시도해주세요.')
  }
  const written = targetDates

  // "N건 가져옴"은 실제로 반영된 행(음식) 수여야 한다 — 건너뛴 날짜의 행은 세지 않는다.
  const importedRows = written.reduce(
    (sum, date) => sum + mealsByDate[date].reduce((n, record) => n + record.items.length, 0),
    0,
  )

  return {
    profileRestored: shouldWriteProfile,
    profileSkipped: Boolean(profile) && !shouldWriteProfile,
    mealDayCount: written.length,
    skippedDateCount: skipped.size,
    importedRows,
    failedRows: parsed.failedRows,
  }
}
