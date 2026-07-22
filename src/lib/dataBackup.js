// 신체정보 + 식단 기록 전체를 CSV로 내보내고 다시 불러오는 기능(PRD v2.0 §2) — **저장소와 연결되는
// 부분**만 담당한다. CSV 형식 자체(컬럼 정의·직렬화·파싱)는 전부 backupFormat.js에 있다.
//
// 이 파일의 전신은 게스트 전용이던 guestBackup.js다 — 3주차에 dataStore를 거치도록 바꿔 **게스트와
// 로그인 계정 양쪽에서 똑같이** 동작한다(dataStore가 매 호출마다 세션을 보고 localStorage/Supabase 중
// 어디를 쓸지 알아서 정한다).
//
// [읽을 수 있는 형식이 둘] 이 앱에는 내보내기 진입점이 둘이다 — MY 탭의 전체 백업(이 파일)과 달력 탭의
// 기간별 기록(csv.js). 사용자가 "어느 버튼으로 내보낸 파일인지" 기억할 이유는 없으므로, 가져오기는
// backupFormat.parseBackupText로 **두 형식을 모두** 자동 인식해 읽는다.
//
// [가져오기는 2단계] parseBackupCSV(읽기만) -> applyBackup(실제 반영). 그 사이에 화면이 "이미 기록이
// 있는 날짜를 덮어쓸지 건너뛸지"를 물어볼 수 있어야 하기 때문이다(PRD FR-2.2). 파싱 단계는 아무 것도
// 쓰지 않으므로, 사용자가 다이얼로그를 취소해도 기존 데이터는 그대로다.
import {
  BACKUP_FORMAT,
  buildMealRows,
  buildProfileRows,
  MEAL_COLUMNS,
  parseBackupText,
  PROFILE_COLUMNS,
} from './backupFormat.js'
import { rowsToCsv } from './csvFormat.js'
import * as dataStore from './dataStore.js'
import { saveTextFile, todayFileStamp } from './fileExport.js'
import { calcRecommendedNutrients } from './nutrition.js'

// 화면(DataBackupPanel)이 형식 이름과 안내 예시를 그대로 쓰므로 재수출한다.
export { BACKUP_FORMAT, EXPECTED_FORMAT_EXAMPLE } from './backupFormat.js'

// ── 내보내기 ────────────────────────────────────────────────────────────────

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

// 파일을 읽어 검증까지만 한다. 형식 판별/파싱은 backupFormat이 하고, 여기서는 "이미 기록이 있는
// 날짜"만 덧붙인다(그 판단에는 저장소 조회가 필요해서 순수 모듈에 둘 수 없다).
// 반환: { format, profile, mealsByDate, dates, duplicateDates, importedRows, failedRows }
export async function parseBackupCSV(file) {
  const parsed = parseBackupText(await file.text())
  const { profile, mealsByDate, importedRows, failedRows } = parsed

  if (!profile && Object.keys(mealsByDate).length === 0) {
    throw new Error(
      importedRows + failedRows > 0
        ? '가져올 수 있는 행이 없습니다. 파일 내용을 확인해주세요.'
        : '가져올 데이터가 없습니다.',
    )
  }

  const dates = Object.keys(mealsByDate).sort()
  const existing = await dataStore.getAllMealsByDate()
  const duplicateDates = dates.filter((date) => (existing[date]?.length ?? 0) > 0)

  return { ...parsed, dates, duplicateDates }
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
    format: parsed.format,
    profileRestored: shouldWriteProfile,
    profileSkipped: Boolean(profile) && !shouldWriteProfile,
    // 평면 형식(달력 탭)에는 신체정보가 아예 없다 — "덮어쓰지 않았다"와는 다른 상태라 구분해 알린다.
    profileAbsent: parsed.format === BACKUP_FORMAT.FLAT,
    mealDayCount: written.length,
    skippedDateCount: skipped.size,
    importedRows,
    failedRows: parsed.failedRows,
  }
}
