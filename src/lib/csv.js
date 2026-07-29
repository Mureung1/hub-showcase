// 달력 탭의 "기간별 기록 내보내기" 전용 — **내보내기만** 한다.
//
// [가져오기가 여기 없는 이유] 예전에는 이 파일에도 짝이 되는 importCSV가 있었지만, 어떤 화면도
// 호출하지 않는 죽은 코드였다. 그 바람에 "달력 탭에서 내보낸 파일을 앱 어디서도 다시 못 읽는"
// 버그가 생겼다(MY 탭 가져오기는 [profile]/[meals] 섹션 형식만 알았다). 지금은
// dataBackup.js의 parseBackupText가 **이 파일이 만드는 평면 형식까지 함께 인식**하므로,
// 같은 형식을 읽는 코드가 두 벌 남아 서로 갈라지지 않도록 이쪽 importCSV는 제거했다.
// -> 이 형식을 읽는 유일한 코드는 dataBackup.js의 parseFlatRows다.
//
// 파싱/직렬화는 직접 구현한다(papaparse 등 외부 라이브러리 없이도 컬럼이 고정된 이 규모의 CSV는
// 따옴표/쉼표/줄바꿈 이스케이프까지 충분히 안전하게 다룰 수 있다).
//
// [안정성 점검(Phase B)에서 고침] 예전엔 이 파일이 mealStore.js(localStorage)를 userId로 직접
// 조회했다 — 게스트는 dataStore.GUEST_ID로 실시간 데이터를 그대로 읽지만, **로그인 계정은 끼니가
// Supabase에만 저장되고 localStorage엔 아예 없어서(dataStore.js의 addMeal 분기 참고)**
// getDatesWithMeals(실제 Supabase uid)가 항상 빈 배열을 반환했다 — 로그인한 모든 사용자에게
// "선택한 기간에는 기록이 없어요"만 뜨고 실제로는 절대 내보낼 수 없는, 조용히 죽어있던 기능이었다.
// dataBackup.js(MY 탭 전체 백업)가 이미 하던 대로 dataStore.js(게스트/로그인 모드를 스스로 판단하는
// 추상 계층)를 거치도록 고쳤다 — 이제 게스트는 기존과 동일하게 동작하고, 로그인 계정은 실제
// Supabase 데이터가 나간다.
//
// [레거시 로컬 데이터 처리 방침 — dailyRecord만 해당] recommended/compliant 스냅샷(dailyRecord.js)은
// 여전히 localStorage 전용이라(Supabase엔 그런 스냅샷 테이블이 없음) 로그인 계정에서는 항상 비어
// 있다 — 값을 지어내지 않고 정직하게 빈 칸으로 남긴다(아래 buildRows 참고). 끼니 자체(음식/영양소)는
// 위 수정으로 정상 표시된다.
//
// 한 행 = 하루 한 끼 항목(음식 하나). recommended_*/compliant는 그날 전체 값이라 그날의 모든 행에서
// 반복된다. compliant는 내보낼 때만 참고용으로 싣고, 가져올 때는 무시한다 — dailyRecord.js의 설계상
// compliant는 항상 recommended+그날 끼니로부터 다시 계산되지 저장되는 값이 아니기 때문이다.
import { FLAT_EXPORT_COLUMNS, NUTRIENT_KEYS } from './backupFormat.js'
import * as dataStore from './dataStore.js'
import { rowsToCsv } from './csvFormat.js'
import { saveTextFile, todayFileStamp } from './fileExport.js'
import { getRecord } from './dailyRecord.js'
import { flattenMealItems } from './mealStore.js'

// 컬럼 정의는 backupFormat.js가 단일 소스다 — 가져오기(parseBackupText)가 읽는 컬럼 목록과 여기서
// 내보내는 컬럼 목록이 갈라지면 "내보낸 파일을 앱이 못 읽는" 상태가 되므로, 양쪽이 같은 상수를 본다.
const COLUMNS = FLAT_EXPORT_COLUMNS

// range({ startDate, endDate }, 둘 다 'YYYY-MM-DD')를 주면 그 기간(포함)의 날짜만, 안 주면(undefined)
// 전체 기간을 내보낸다. dataStore.js가 게스트/로그인 모드를 스스로 판단해 실제 데이터를 돌려준다.
async function buildRows(userId, { startDate, endDate } = {}) {
  const byDate =
    startDate && endDate
      ? await dataStore.getMealsByDateRange(startDate, endDate)
      : await dataStore.getAllMealsByDate()

  const rows = []

  for (const date of Object.keys(byDate).sort()) {
    // recommended 스냅샷이 있으면(dailyRecord.upsertMeal이 호출된 날 — 게스트 전용, 위 주석 참고)
    // 곁들이고, 없으면(로그인 계정, 또는 스냅샷 없는 옛 데이터) recommended/compliant는 모른다는
    // 뜻으로 비워둔다 — 지금 기준으로 채워 넣으면 그 시점엔 다른 프로필/권장량이었을 수도 있는데
    // 마치 정확한 과거 값인 것처럼 CSV에 남아 오해를 부를 수 있다.
    const record = getRecord(userId, date)
    const items = flattenMealItems(record ? record.meals : byDate[date])
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

// userId의 DailyRecord를 CSV로 만들어 파일로 저장한다. range({startDate, endDate})를 주면 그 기간만
// 내보낸다(달력 탭의 기간별 내보내기). 저장 자체는 fileExport.saveTextFile이 3개 환경(PC 웹/모바일 웹/
// APK)을 알아서 처리하고 UTF-8 BOM도 거기서 붙인다.
// 반환: 기록이 없으면 null(파일도 만들지 않는다), 있으면 { dayCount, save } — save는 플랫폼별 완료
// 문구와 네이티브 공유 함수를 담고 있다.
export async function exportCSV(userId, range = {}) {
  const { startDate, endDate } = range
  const rows = await buildRows(userId, range)
  if (rows.length === 0) return null

  const dayCount = new Set(rows.map((row) => row[0])).size
  const filename =
    startDate && endDate ? `mealog_${startDate}_to_${endDate}.csv` : `mealog_${todayFileStamp()}.csv`

  const save = await saveTextFile({ filename, content: rowsToCsv([COLUMNS, ...rows]) })
  return { dayCount, save }
}
