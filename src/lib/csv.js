// DailyRecord 기기 이관용 CSV 내보내기/가져오기. 파싱은 직접 구현한다(papaparse 등 외부 라이브러리
// 없이도 컬럼이 고정된 이 규모의 CSV는 따옴표/쉼표/줄바꿈 이스케이프까지 충분히 안전하게 다룰 수 있다).
//
// [레거시 로컬 데이터 처리 방침] 이 파일이 의존하는 mealStore.js/dailyRecord.js/records.js의
// localStorage 저장분은 두 성격이 섞여 있다.
// · 로그인 계정: 프로필/끼니 기록이 전부 Supabase로 옮겨간 뒤로, 이 localStorage 저장분은 CSV
//   내보내기/가져오기 "안에서만" 계속 쓰이는 자체 완결형 레거시 서브시스템이다(화면에 보이는 라이브
//   데이터는 Supabase에서 온다). 마이그레이션 이전 계정(임의 문자열 아이디, guest_xxxx)으로 남아있는
//   옛 localStorage 데이터는 의도적으로 옮기지 않고 그대로 둔다(정책: 무시) — 그 옛 아이디들은 지금의
//   Supabase auth uid와 연결할 방법이 전혀 없어서(로그인 시스템 자체가 통째로 교체됐다), "이 옛
//   데이터가 지금 로그인한 이 사람 것"이라고 안전하게 판단해 옮길 근거가 없기 때문이다.
// · 게스트(비로그인) 모드: dataStore.js가 mealStore.js를 고정 아이디(dataStore.GUEST_ID)로 그대로
//   가져다 쓰는 실시간 저장소라서, 이 파일이 다루는 게스트 데이터는 레거시가 아니라 지금 화면에 보이는
//   진짜 데이터다 — CSV 내보내기/가져오기가 게스트의 실제 식단을 그대로 반영한다.
// 어느 쪽이든 데이터 자체는 삭제하지 않는다 — 과거에 CSV로 내보내 둔 백업을 다시 가져오기 하려는
// 사용자가 있을 수 있어서, 읽기 경로는 계속 살려둔다.
//
// 한 행 = 하루 한 끼 항목(음식 하나). recommended_*/compliant는 그날 전체 값이라 그날의 모든 행에서
// 반복된다. compliant는 내보낼 때만 참고용으로 싣고, 가져올 때는 무시한다 — dailyRecord.js의 설계상
// compliant는 항상 recommended+그날 끼니로부터 다시 계산되지 저장되는 값이 아니기 때문이다.
//
// 날짜 목록은 dailyRecord가 아니라 mealStore(getDatesWithMeals)를 기준으로 잡는다. dailyRecord는
// recommended 스냅샷이 있는 날짜만 알기 때문에(dailyRecord.upsertMeal이 한 번도 안 불린 날, 예를
// 들어 #3 구현 이전에 저장된 옛 끼니는 스냅샷이 없다), 그 기준을 그대로 쓰면 실제로 끼니가 남아있는
// 날짜인데도 CSV에서 통째로 빠지는 문제가 생긴다. recommended 스냅샷은 있으면 참고로만 곁들이고,
// "그 날짜를 내보낼지"는 순수하게 mealStore에 끼니가 있는지로만 정한다.
import { parseCsv, rowsToCsv } from './csvFormat.js'
import { getRecord, replaceDay } from './dailyRecord.js'
import { flattenMealItems, getDatesWithMeals, getMeals } from './mealStore.js'
import { NUTRIENT_LABELS, NUTRITION_SOURCE } from './nutrition.js'

const NUTRIENT_KEYS = NUTRIENT_LABELS.map((n) => n.key)

const COLUMNS = [
  'date',
  'source',
  'item_name',
  'brand',
  ...NUTRIENT_KEYS,
  ...NUTRIENT_KEYS.map((key) => `recommended_${key}`),
  'compliant',
]

// range({ startDate, endDate }, 둘 다 'YYYY-MM-DD')를 주면 그 기간(포함)의 날짜만 걸러낸다.
// 하나만 줘도 그쪽 경계만 적용된다. 안 주면(undefined) 전체 기간.
function buildRows(userId, { startDate, endDate } = {}) {
  const dates = getDatesWithMeals(userId).filter((date) => {
    if (startDate && date < startDate) return false
    if (endDate && date > endDate) return false
    return true
  })

  const rows = []

  for (const date of dates) {
    // recommended 스냅샷이 있으면(dailyRecord.upsertMeal이 호출된 날) 곁들이고, 없으면(옛 데이터 등)
    // recommended/compliant는 모른다는 뜻으로 비워둔다 — 지금 기준으로 채워 넣으면 그 시점엔 다른
    // 프로필/권장량이었을 수도 있는데 마치 정확한 과거 값인 것처럼 CSV에 남아 오해를 부를 수 있다.
    const record = getRecord(userId, date)
    const items = flattenMealItems(record ? record.meals : getMeals(userId, date))
    if (items.length === 0) continue // 끼니가 전부 삭제돼 빈 배열만 남은 날짜는 제외

    const recommended = record?.recommended ?? null
    const compliant = record ? record.compliant : null

    for (const item of items) {
      rows.push([
        date,
        item.source ?? '',
        item.name ?? '',
        item.brand ?? '',
        ...NUTRIENT_KEYS.map((key) => item.nutrients?.[key] ?? ''),
        ...NUTRIENT_KEYS.map((key) => recommended?.[key] ?? ''),
        compliant === null ? '' : compliant ? 'true' : 'false',
      ])
    }
  }

  return rows
}

// userId의 DailyRecord를 CSV로 만들어 파일 다운로드까지 트리거한다. range({startDate, endDate})를 주면
// 그 기간만 내보낸다 — MY 탭의 전체 내보내기는 range 없이, 달력 탭의 기간별 내보내기는 range와 함께
// 이 함수를 그대로 호출한다. 내보낸 날짜 수를 반환한다(기록이 없으면 0, 다운로드도 트리거하지 않는다).
export function exportCSV(userId, range = {}) {
  const { startDate, endDate } = range
  const rows = buildRows(userId, range)
  if (rows.length === 0) return 0

  const dayCount = new Set(rows.map((row) => row[0])).size
  const BOM = '﻿' // Excel에서 한글이 깨지지 않도록 UTF-8 BOM을 앞에 붙인다
  const csv = BOM + rowsToCsv([COLUMNS, ...rows])
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const filename =
    startDate && endDate
      ? `cjmt_records_${startDate}_to_${endDate}.csv`
      : `cjmt_records_${new Date().toISOString().slice(0, 10)}.csv`

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  return dayCount
}

// CSV 파일을 파싱해 날짜별로 묶은 뒤, 각 날짜를 dailyRecord.replaceDay로 통째로 덮어써 복원한다.
// 같은 날짜의 기존 기록은 명세대로 덮어쓰기(병합하지 않음). 복원된 날짜 수를 반환한다.
export async function importCSV(userId, file) {
  const text = await file.text()
  const table = parseCsv(text)
  if (table.length === 0) return 0

  const [header, ...dataRows] = table
  const columnIndex = Object.fromEntries(COLUMNS.map((col) => [col, header.indexOf(col)]))
  if (Object.values(columnIndex).some((i) => i === -1)) {
    throw new Error('CSV 형식이 올바르지 않습니다. 내보내기한 파일인지 확인해주세요.')
  }

  const byDate = new Map()
  for (const row of dataRows) {
    const date = row[columnIndex.date]
    const name = row[columnIndex.item_name]
    if (!date || !name) continue

    const nutrients = Object.fromEntries(
      NUTRIENT_KEYS.map((key) => {
        const raw = row[columnIndex[key]]
        return [key, raw === '' || raw === undefined ? null : Number(raw)]
      }),
    )
    const recommendedRaw = Object.fromEntries(
      NUTRIENT_KEYS.map((key) => {
        const raw = row[columnIndex[`recommended_${key}`]]
        return [key, raw === '' || raw === undefined ? null : Number(raw)]
      }),
    )
    // 내보낼 때 recommended 스냅샷이 없어 전부 빈 칸이었던 날짜는, 값이 있는 것처럼 보이는 "전부
    // null인 객체"가 아니라 진짜 null로 되돌린다 — dailyRecord.js가 원래 "모름"을 표현하는 방식과
    // 맞춰야, 나중에 Calendar 등에서 "recommended 있음"으로 잘못 취급되지 않는다.
    const recommended = Object.values(recommendedRaw).every((v) => v === null) ? null : recommendedRaw
    const item = {
      name,
      brand: row[columnIndex.brand] || null,
      nutrients,
      source: row[columnIndex.source] || NUTRITION_SOURCE.ESTIMATED,
    }

    if (!byDate.has(date)) byDate.set(date, { items: [], recommended })
    byDate.get(date).items.push(item)
  }

  for (const [date, { items, recommended }] of byDate) {
    replaceDay(userId, date, { items, mealType: 'etc' }, recommended)
  }

  return byDate.size
}
