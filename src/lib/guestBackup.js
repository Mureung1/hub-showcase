// 게스트(비로그인) 전용 CSV 백업 — 로그인 없이 기기를 옮길 때 신체정보+식단 기록을 통째로 내보내고
// 새 기기에서 다시 불러오는 기능. 로그인 계정은 데이터가 이미 Supabase에 있어 이 기능이 필요 없다
// (GuestBackupPanel.jsx가 authMode==='guest'일 때만 버튼을 보여준다). csv.js(로그인 계정의 레거시
// 로컬 백업)와는 완전히 별개 파일/형식이다 — 프로필까지 함께 담아야 하고, 게스트는 항상
// dataStore.GUEST_ID 버킷 하나만 다루면 되므로 날짜 범위/dailyRecord 스냅샷 개념이 필요 없어 더 단순하다.
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
// 가져오기는 파일 전체를 먼저 끝까지 검증한 뒤에만 실제로 localStorage에 쓴다(원자적) — 형식이 중간에
// 깨진 파일이 게스트의 기존 데이터를 절반만 덮어쓰는 일이 없게 하기 위해서다.
import { parseCsv, rowsToCsv } from './csvFormat.js'
import * as dataStore from './dataStore.js'
import { normalizeMealType } from './mealType.js'
import { calcRecommendedNutrients, NUTRIENT_LABELS, NUTRITION_SOURCE } from './nutrition.js'

const NUTRIENT_KEYS = NUTRIENT_LABELS.map((n) => n.key)
const MEAL_COLUMNS = ['date', 'mealType', 'item_name', 'brand', 'source', ...NUTRIENT_KEYS]
const REQUIRED_PROFILE_KEYS = ['age', 'sex', 'heightCm', 'weightKg', 'activity']
const SEX_VALUES = ['male', 'female']
const ACTIVITY_VALUES = ['low', 'moderate', 'high']
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function makeId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

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

function buildMealRows() {
  const rows = []
  for (const date of dataStore.getGuestMealDates()) {
    for (const meal of dataStore.getGuestMealsForDate(date)) {
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

// 내보낼 데이터가 아예 없으면(프로필도 없고 식단도 없는 새 게스트) null을 반환하고 다운로드를
// 트리거하지 않는다. 있으면 { hasProfile, mealDayCount }를 반환한다.
export function exportGuestBackupCSV() {
  const guestProfile = dataStore.getGuestProfileRaw()
  const profileRows = buildProfileRows(guestProfile?.profile)
  const mealRows = buildMealRows()
  if (profileRows.length === 0 && mealRows.length === 0) return null

  const BOM = '﻿' // Excel에서 한글이 깨지지 않도록 UTF-8 BOM을 앞에 붙인다
  const text = [
    '# CJMT 게스트 데이터 백업(기기 이동용)',
    '# MY 탭의 "데이터 가져오기(CSV)"로 새 기기에서 다시 불러올 수 있어요. 로그인 계정에는 영향을 주지 않아요.',
    '',
    '[profile]',
    rowsToCsv([['key', 'value'], ...profileRows]),
    '',
    '[meals]',
    rowsToCsv([MEAL_COLUMNS, ...mealRows]),
  ].join('\r\n')

  const blob = new Blob([BOM + text], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `cjmt_guest_backup_${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  return { hasProfile: profileRows.length > 0, mealDayCount: new Set(mealRows.map((r) => r[0])).size }
}

const FORMAT_ERROR = 'CSV 형식이 올바르지 않습니다. MY 탭에서 내보내기한 파일인지 확인해주세요.'

// rows: [profile] 마커 다음 줄부터 [meals] 마커 전까지의 파싱된 행들. 데이터가 전혀 없으면(게스트가
// 프로필 없이 내보낸 파일) null — 에러가 아니라 "복원할 프로필이 없음"으로 취급한다.
function parseProfileSection(rows) {
  if (rows.length === 0) return null
  const [header, ...dataRows] = rows
  if (header.length !== 2 || header[0] !== 'key' || header[1] !== 'value') throw new Error(FORMAT_ERROR)
  if (dataRows.length === 0) return null

  const map = {}
  for (const row of dataRows) {
    if (row.length !== 2) throw new Error(FORMAT_ERROR)
    if (row[0] in map) throw new Error(`CSV의 신체정보에 "${row[0]}" 항목이 중복돼 있습니다.`)
    map[row[0]] = row[1]
  }

  const missing = REQUIRED_PROFILE_KEYS.filter((key) => !map[key])
  if (missing.length > 0) throw new Error('CSV의 신체정보가 불완전합니다. 내보내기한 파일 그대로 가져와주세요.')

  const age = Number(map.age)
  const heightCm = Number(map.heightCm)
  const weightKg = Number(map.weightKg)
  if (![age, heightCm, weightKg].every((n) => Number.isFinite(n) && n > 0)) {
    throw new Error('CSV의 신체정보 값이 올바르지 않습니다.')
  }
  if (!SEX_VALUES.includes(map.sex)) throw new Error('CSV의 성별 값이 올바르지 않습니다.')
  if (!ACTIVITY_VALUES.includes(map.activity)) throw new Error('CSV의 활동량 값이 올바르지 않습니다.')

  return {
    age,
    heightCm,
    weightKg,
    sex: map.sex,
    activity: map.activity,
    conditions: map.conditions ? map.conditions.split(';').filter(Boolean) : [],
    allergies: map.allergies ? map.allergies.split(';').filter(Boolean) : [],
  }
}

// rows: [meals] 마커 다음 줄부터 끝까지의 파싱된 행들. 반환: { [date]: mealRecord[] } — 같은
// 날짜+시간대(mealType)의 음식들을 하나의 끼니 기록으로 묶는다(원본의 정확한 끼니 경계까지는 CSV에
// 남지 않으므로, date+mealType을 사실상의 끼니 단위로 재구성한다).
function parseMealsSection(rows) {
  if (rows.length === 0) return {}
  const [header, ...dataRows] = rows
  if (header.length !== MEAL_COLUMNS.length || MEAL_COLUMNS.some((col, i) => header[i] !== col)) {
    throw new Error(FORMAT_ERROR)
  }

  const byDate = new Map()
  for (const row of dataRows) {
    if (row.length !== MEAL_COLUMNS.length) throw new Error(FORMAT_ERROR)
    const [date, mealTypeRaw, name, brand, source, ...nutrientRaw] = row
    if (!DATE_RE.test(date)) throw new Error(`CSV의 날짜 형식이 올바르지 않습니다: "${date}"`)
    if (!name) throw new Error('CSV에 음식 이름이 비어 있는 행이 있습니다.')

    const nutrients = {}
    NUTRIENT_KEYS.forEach((key, i) => {
      const raw = nutrientRaw[i]
      const value = raw === '' ? 0 : Number(raw)
      if (!Number.isFinite(value)) throw new Error(`CSV의 영양소 값이 숫자가 아닙니다: "${raw}"`)
      nutrients[key] = value
    })

    const mealType = normalizeMealType(mealTypeRaw)
    const item = { name, brand: brand || null, nutrients, source: source || NUTRITION_SOURCE.ESTIMATED }

    if (!byDate.has(date)) byDate.set(date, new Map())
    const byMealType = byDate.get(date)
    if (!byMealType.has(mealType)) byMealType.set(mealType, [])
    byMealType.get(mealType).push(item)
  }

  const result = {}
  for (const [date, byMealType] of byDate) {
    result[date] = [...byMealType.entries()].map(([mealType, items]) => ({
      id: makeId(),
      mealType,
      createdAt: new Date().toISOString(),
      items,
    }))
  }
  return result
}

// 형식이 안 맞으면(구간 마커 없음, 헤더 불일치, 값 파싱 실패 등) 안내 메시지를 담은 Error를 던진다 —
// 이 시점에는 아직 아무 것도 쓰지 않았으므로 실패해도 기존 게스트 데이터는 그대로 남는다. 파싱이 전부
// 끝난 뒤에만 실제로 로컬 프로필/식단을 덮어쓰고, 그 쓰기 자체도 실패하면(저장 공간 부족 등) 아래에서
// 쓰기 전 값으로 되돌린다.
export async function importGuestBackupCSV(file) {
  const text = await file.text()
  // file.text()는 항상 UTF-8로 디코딩한다 — 다른 인코딩(예: 엑셀이 저장한 CP949/EUC-KR)으로 저장된
  // 파일을 그대로 읽으면 한글이 U+FFFD(깨짐 표시)로 바뀌는데, 그래도 문자열 자체는 비어있지 않아
  // 아래의 "이름이 비어있음" 같은 검증을 그냥 통과해버린다 — 깨진 채로 조용히 저장되는 걸 막기 위해
  // 여기서 먼저 걸러낸다.
  if (text.includes('�')) {
    throw new Error('파일 인코딩을 읽을 수 없습니다. UTF-8로 저장된 CSV 파일인지 확인해주세요.')
  }
  const allRows = parseCsv(text)

  const profileMarkerIdx = allRows.findIndex((r) => r.length === 1 && r[0].trim() === '[profile]')
  const mealsMarkerIdx = allRows.findIndex((r) => r.length === 1 && r[0].trim() === '[meals]')
  if (profileMarkerIdx === -1 || mealsMarkerIdx === -1 || mealsMarkerIdx < profileMarkerIdx) {
    throw new Error(FORMAT_ERROR)
  }

  const profile = parseProfileSection(allRows.slice(profileMarkerIdx + 1, mealsMarkerIdx))
  const mealsByDate = parseMealsSection(allRows.slice(mealsMarkerIdx + 1))

  if (!profile && Object.keys(mealsByDate).length === 0) {
    throw new Error('가져올 데이터가 없습니다.')
  }

  // 여기까지는 전부 순수 파싱/검증이라 아직 아무 것도 쓰지 않았다. 이제부터 실제로 localStorage에
  // 쓰는데, setItem 자체가 중간에 실패할 수 있으므로(예: 대용량 백업이 저장 공간 한도를 넘김) 쓰기
  // 시작 전 값을 스냅샷해뒀다가 실패 시 그대로 되돌린다 — 절반만 반영된 채로 남지 않게 한다.
  const previousProfile = dataStore.getGuestProfileRaw()
  const previousMealsByDate = Object.fromEntries(
    Object.keys(mealsByDate).map((date) => [date, dataStore.getGuestMealsForDate(date)]),
  )

  try {
    if (profile) {
      dataStore.setGuestProfileRaw({ profile, recommended: calcRecommendedNutrients(profile) })
    }
    for (const [date, mealRecords] of Object.entries(mealsByDate)) {
      dataStore.replaceGuestMealsForDate(date, mealRecords)
    }
  } catch (err) {
    if (profile) dataStore.setGuestProfileRaw(previousProfile)
    for (const [date, mealRecords] of Object.entries(previousMealsByDate)) {
      dataStore.replaceGuestMealsForDate(date, mealRecords)
    }
    console.error('guest backup import write failed, rolled back:', err)
    throw new Error('가져오기에 실패했어요(저장 공간 부족 등). 기존 데이터로 되돌렸어요. 다시 시도해주세요.')
  }

  return { profileRestored: Boolean(profile), mealDayCount: Object.keys(mealsByDate).length }
}
