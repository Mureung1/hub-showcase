// CSV 왕복 검증 — "이 앱이 내보낸 파일을 이 앱이 다시 읽을 수 있는가".
//
//   npm run check:csv
//
// [왜 이 스크립트가 생겼나]
// 내보내기 진입점이 2개(MY 탭 전체 백업 / 달력 탭 기간별 기록)인데 형식이 서로 달랐고, 가져오기는
// 그중 하나만 읽을 수 있었다. 달력 탭에서 내보낸 파일은 앱 어디서도 다시 못 읽는 상태였는데, 저장소에
// 그걸 잡아줄 검사가 하나도 없어서 사용자가 신고할 때까지 아무도 몰랐다. 이 스크립트는 정확히 그
// 회귀를 막는다 — 내보내기 형식을 바꾸면 여기서 먼저 깨진다.
//
// 테스트 러너가 없는 저장소라(package.json에 test 스크립트 없음) 별도 프레임워크 없이 노드로 바로
// 도는 단언 스크립트로 만들었다(check:ads와 같은 방식). 실패하면 종료 코드 1.
//
// 이 검사가 의미를 가지려면 **실제 앱이 쓰는 직렬화·컬럼 정의·파서를 그대로** 써야 한다. 테스트가
// 형식을 따로 재현하면, 앱 쪽 형식만 바뀌었을 때 테스트는 통과하는데 앱은 깨지는 최악의 상황이 된다.
// 그래서 src/lib/backupFormat.js(순수 모듈)에서 직렬화 함수와 두 형식의 컬럼 상수를 그대로 import한다.
// backupFormat.js는 저장소/브라우저 API에 의존하지 않아 노드에서 바로 불러올 수 있다.
import {
  BACKUP_FORMAT,
  buildMealRows,
  buildProfileRows,
  FLAT_EXPORT_COLUMNS,
  MEAL_COLUMNS,
  NUTRIENT_KEYS,
  parseBackupText,
  PROFILE_COLUMNS,
} from '../src/lib/backupFormat.js'
import { rowsToCsv } from '../src/lib/csvFormat.js'
import { NUTRITION_SOURCE } from '../src/lib/nutrition.js'
const BOM = '﻿'

let failed = 0
function check(name, condition, detail = '') {
  if (condition) {
    console.log(`  ✓ ${name}`)
  } else {
    failed += 1
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

// ── 테스트 데이터 ────────────────────────────────────────────────────────────
const MEALS = [
  { date: '2026-07-20', mealType: 'lunch', name: '비빔밥', brand: '', source: NUTRITION_SOURCE.DB, n: [650, 15, 95, 12, 6, 900] },
  { date: '2026-07-20', mealType: 'dinner', name: '김치찌개', brand: '', source: NUTRITION_SOURCE.DB, n: [420, 22, 18, 26, 4, 1800] },
  { date: '2026-07-21', mealType: 'breakfast', name: '토스트, 잼', brand: '샘표', source: NUTRITION_SOURCE.DB_PROCESS, n: [310, 8, 44, 11, 2, 420] },
  { date: '2026-07-22', mealType: 'etc', name: '아메리카노 "톨"', brand: '', source: NUTRITION_SOURCE.ESTIMATED, n: [10, 0, 2, 0, 0, 5] },
]
const EXPECTED_DATES = [...new Set(MEALS.map((m) => m.date))].sort()

// ── 내보내기 (실제 앱의 직렬화 함수·컬럼 상수를 그대로 사용) ─────────────────

// 앱의 내부 표현(mealsByDate)으로 되돌려 실제 직렬화 함수에 넣는다 — 테스트가 형식을 손으로
// 재현하면, 앱 쪽 형식만 바뀌었을 때 테스트는 통과하는데 앱은 깨지는 최악의 상황이 된다.
function mealsByDateFixture() {
  const byDate = {}
  for (const m of MEALS) {
    const nutrients = Object.fromEntries(NUTRIENT_KEYS.map((k, i) => [k, m.n[i]]))
    const items = [{ name: m.name, brand: m.brand || null, source: m.source, nutrients }]
    ;(byDate[m.date] ??= []).push({ id: `${m.date}-${m.mealType}`, mealType: m.mealType, items })
  }
  return byDate
}

// ① MY 탭: dataBackup.exportBackupCSV가 만드는 [profile]/[meals] 섹션 형식
function buildSectionedCsv() {
  const profileRows = buildProfileRows({
    age: 30, sex: 'male', heightCm: 175, weightKg: 70, activity: 'moderate', conditions: [], allergies: [],
  })
  const mealRows = buildMealRows(mealsByDateFixture())
  return (
    BOM +
    [
      '# Mealyze 데이터 백업(기기 이동용)',
      '',
      '[profile]',
      rowsToCsv([PROFILE_COLUMNS, ...profileRows]),
      '',
      '[meals]',
      rowsToCsv([MEAL_COLUMNS, ...mealRows]),
    ].join('\r\n')
  )
}

// ② 달력 탭: csv.exportCSV가 만드는 평면 형식(recommended_*/compliant 포함)
function buildFlatCsv() {
  const rows = MEALS.map((m) => [m.date, m.source, m.name, m.brand, ...m.n, 2500, 125, 313, 83, 30, 2000, 'false'])
  return BOM + rowsToCsv([FLAT_EXPORT_COLUMNS, ...rows])
}

function countItems(mealsByDate) {
  return Object.values(mealsByDate).reduce(
    (sum, records) => sum + records.reduce((n, r) => n + r.items.length, 0),
    0,
  )
}

// ── 검증 ─────────────────────────────────────────────────────────────────────

console.log('\n[① MY 탭 전체 백업 형식 왕복]')
{
  const parsed = parseBackupText(buildSectionedCsv())
  check('형식이 sectioned로 인식됨', parsed.format === BACKUP_FORMAT.SECTIONED, parsed.format)
  check('신체정보가 복원됨', parsed.profile?.age === 30 && parsed.profile?.sex === 'male')
  check(`${MEALS.length}행 전부 읽힘`, parsed.importedRows === MEALS.length, `${parsed.importedRows}행`)
  check('실패 0건', parsed.failedRows === 0, `${parsed.failedRows}건`)
  check('날짜가 원본과 동일', JSON.stringify(Object.keys(parsed.mealsByDate).sort()) === JSON.stringify(EXPECTED_DATES))
  check('음식 개수가 원본과 동일', countItems(parsed.mealsByDate) === MEALS.length)
  const bibim = Object.values(parsed.mealsByDate).flatMap((r) => r.flatMap((x) => x.items)).find((i) => i.name === '비빔밥')
  check('영양소 값이 그대로 보존됨', bibim?.nutrients.calories === 650 && bibim?.nutrients.sodium === 900)
  const quoted = Object.values(parsed.mealsByDate).flatMap((r) => r.flatMap((x) => x.items)).find((i) => i.name.includes('아메리카노'))
  check('쉼표·따옴표가 든 음식명이 깨지지 않음', quoted?.name === '아메리카노 "톨"', quoted?.name)
}

console.log('\n[② 달력 탭 기간별 기록 형식 왕복]  ← 이게 깨져 있던 부분')
{
  const parsed = parseBackupText(buildFlatCsv())
  check('형식이 flat으로 인식됨', parsed.format === BACKUP_FORMAT.FLAT, parsed.format)
  check(`${MEALS.length}행 전부 읽힘`, parsed.importedRows === MEALS.length, `${parsed.importedRows}행`)
  check('실패 0건', parsed.failedRows === 0, `${parsed.failedRows}건`)
  check('날짜가 원본과 동일', JSON.stringify(Object.keys(parsed.mealsByDate).sort()) === JSON.stringify(EXPECTED_DATES))
  check('음식 개수가 원본과 동일', countItems(parsed.mealsByDate) === MEALS.length)
  check('이 형식엔 신체정보가 없으므로 profile은 null', parsed.profile === null)
  const items = Object.values(parsed.mealsByDate).flatMap((r) => r.flatMap((x) => x.items))
  check('brand가 보존됨', items.find((i) => i.name === '토스트, 잼')?.brand === '샘표')
  check('쉼표가 든 음식명이 깨지지 않음', items.some((i) => i.name === '토스트, 잼'))
  check(
    'recommended_*/compliant 컬럼이 영양소로 잘못 새어들지 않음',
    items.every((i) => Object.keys(i.nutrients).length === NUTRIENT_KEYS.length),
  )
}

console.log('\n[컬럼 순서가 바뀐 파일 — 엑셀에서 열었다 저장한 경우]')
{
  // 평면 형식에서 컬럼 순서를 뒤섞고 필수 컬럼만 남겨도 읽혀야 한다(이름으로 찾으므로).
  const columns = ['item_name', 'date', ...NUTRIENT_KEYS, 'brand', 'source']
  const rows = MEALS.map((m) => [m.name, m.date, ...m.n, m.brand, m.source])
  const parsed = parseBackupText(BOM + rowsToCsv([columns, ...rows]))
  check('순서가 바뀌어도 flat으로 인식됨', parsed.format === BACKUP_FORMAT.FLAT, parsed.format)
  check(`${MEALS.length}행 전부 읽힘`, parsed.importedRows === MEALS.length, `${parsed.importedRows}행`)
  const items = Object.values(parsed.mealsByDate).flatMap((r) => r.flatMap((x) => x.items))
  check('컬럼이 뒤바뀌어 값이 섞이지 않음', items.find((i) => i.name === '비빔밥')?.nutrients.calories === 650)
}

console.log('\n[깨진 행 처리 — 행 단위로만 버리고 계속 진행]')
{
  const columns = ['date', 'source', 'item_name', 'brand', ...NUTRIENT_KEYS]
  const rows = [
    ['2026-07-20', NUTRITION_SOURCE.DB, '비빔밥', '', 650, 15, 95, 12, 6, 900],
    ['2026/07/20', NUTRITION_SOURCE.DB, '날짜형식오류', '', 1, 1, 1, 1, 1, 1], // 날짜 형식 오류
    ['2026-07-20', NUTRITION_SOURCE.DB, '', '', 1, 1, 1, 1, 1, 1], // 이름 없음
    ['2026-07-21', NUTRITION_SOURCE.DB, '숫자아님', '', 'N/A', 1, 1, 1, 1, 1], // 숫자 아님
    ['2026-07-21', NUTRITION_SOURCE.DB, '김치찌개', '', 420, 22, 18, 26, 4, 1800],
  ]
  const parsed = parseBackupText(BOM + rowsToCsv([columns, ...rows]))
  check('정상 2건만 가져옴', parsed.importedRows === 2, `${parsed.importedRows}건`)
  check('깨진 3건은 실패로 집계', parsed.failedRows === 3, `${parsed.failedRows}건`)
  check('한 행이 깨져도 나머지는 살아남음', countItems(parsed.mealsByDate) === 2)
}

console.log('\n[앱이 만들지 않은 파일은 거부]')
{
  const cases = [
    ['완전히 무관한 CSV', 'name,age\n홍길동,30'],
    ['빈 파일', ''],
    ['헤더만 있고 필수 컬럼 없음', 'foo,bar\n1,2'],
  ]
  for (const [label, text] of cases) {
    let threw = false
    let hasExample = false
    try {
      parseBackupText(BOM + text)
    } catch (err) {
      threw = true
      hasExample = Boolean(err.expectedFormat)
    }
    check(`${label} → 거부됨`, threw)
    if (threw) check(`${label} → 안내에 올바른 형식 예시 포함`, hasExample)
  }

  // 안내 예시에는 두 형식이 모두 들어 있어야 한다(사용자가 자기 파일이 왜 거부됐는지 판단할 수 있게).
  let example = ''
  try {
    parseBackupText(BOM + 'name,age\n홍길동,30')
  } catch (err) {
    example = err.expectedFormat ?? ''
  }
  check('형식 예시에 [profile]/[meals] 섹션 형식이 포함', example.includes('[profile]') && example.includes('[meals]'))
  check('형식 예시에 평면 형식도 포함', example.includes('date,source,item_name'))
}

console.log('\n[인코딩 깨짐 감지]')
{
  let threw = false
  let message = ''
  try {
    parseBackupText('date,source,item_name,brand,' + NUTRIENT_KEYS.join(',') + '\n2026-07-20,DB,��,,1,1,1,1,1,1')
  } catch (err) {
    threw = true
    message = err.message
  }
  check('CP949 등으로 저장돼 깨진 파일은 거부됨', threw && message.includes('UTF-8'), message)
}

console.log('')
if (failed > 0) {
  console.error(`실패 ${failed}건`)
  process.exit(1)
}
console.log('전부 통과 — 두 내보내기 형식 모두 다시 읽힌다\n')
