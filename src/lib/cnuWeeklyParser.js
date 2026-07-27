// 충남대 생협 식단 페이지(mobileadmin.cnu.ac.kr/food/index.jsp) 한 건물의 "이번 주" HTML을 표준
// 슬롯 구조로 바꾸는 순수 파서(4주차 보강 Step 7-1). 네트워크 호출은 server/univMealAdapters/cnu.js가
// 맡고, 이 파일은 이미 받아온 HTML 문자열만 다룬다(fetch 없이 순수 함수라 캡처한 HTML로 테스트 가능).
//
// 실제 사이트 구조(2026-07 확인, searchView=date&searchCafeteria=<건물코드>): 한 번 요청하면 그
// 건물의 이번 주(월~토, 6일) 표가 전부 온다. 표는 조식/중식/석식 × 직원/학생 6행, 요일별 6열.
// 셀 내용 패턴: "운영안함" | "정식(6000)"+메뉴 목록 | "정식(null)"+"운영중단(사유)".
// 메뉴명에는 "(pork included)" 류 주석이 붙을 수 있다.
import { tagAllergensFromMenuName } from './allergyRules.js'

const NOT_OPERATING_TEXT = '운영안함'
const SUSPENDED_PATTERN = /^(운영중단|휴무|준비중)/
const MEAL_PERIODS = { 조식: 'breakfast', 중식: 'lunch', 석식: 'dinner' }

// "(pork included)" 류 주석 — 이름에서 제거하고 해당 알레르기 코드를 직접 태깅한다(키워드 매칭보다 확실).
const MEAT_ANNOTATIONS = [
  { pattern: /\(pork included\)/gi, code: 'M10' },
  { pattern: /\(beef included\)/gi, code: 'M16' },
  { pattern: /\(chicken included\)/gi, code: 'M15' },
]

function extractDateColumns(html) {
  const dates = []
  const re = /<th scope="col">[^<]*<br\s*\/?>\s*(\d{4})\.(\d{2})\.(\d{2})\s*<\/th>/g
  let m
  // eslint-disable-next-line no-cond-assign
  while ((m = re.exec(html))) dates.push(`${m[1]}${m[2]}${m[3]}`)
  return dates
}

function extractCells(rowHtml) {
  const cells = []
  const re = /<td>([\s\S]*?)<\/td>/g
  let m
  // eslint-disable-next-line no-cond-assign
  while ((m = re.exec(rowHtml))) cells.push(m[1])
  return cells
}

// 메뉴 한 줄(주석 포함 가능) -> { name, allergyCodes, estimated:true }. 주석 제거 후 남은 이름에
// 키워드 태깅(tagAllergensFromMenuName)도 함께 적용해 합집합으로 둔다.
function parseMenuLine(rawLine) {
  let name = rawLine
  const codes = new Set()
  for (const { pattern, code } of MEAT_ANNOTATIONS) {
    if (pattern.test(name)) codes.add(code)
    name = name.replace(pattern, '').trim()
  }
  for (const code of tagAllergensFromMenuName(name).codes) codes.add(code)
  return { name, allergyCodes: [...codes], estimated: true }
}

// 한 <td> 셀 -> MealSlot. 예상 못한 형식(제목 없음)은 크롤링 전체를 실패시키지 않고 그 항목만
// status:'unknown'+원문으로 남긴다(부분 성공 허용).
function parseCell(cellHtml) {
  const text = cellHtml.trim()
  if (!text || text === NOT_OPERATING_TEXT) {
    return { status: 'closed', price: null, note: null, menus: [] }
  }

  const titleMatch = cellHtml.match(/<h3 class="menu-tit03">([^<]*)<\/h3>/)
  if (!titleMatch) {
    return { status: 'unknown', price: null, note: text.replace(/\s+/g, ' ').slice(0, 100), menus: [] }
  }

  const bodyMatch = cellHtml.match(/<p>([\s\S]*?)<\/p>/)
  const title = titleMatch[1].trim()
  const setMatch = title.match(/^(.*?)\(([^)]*)\)\s*$/)
  const priceRaw = setMatch ? setMatch[2].trim() : ''
  const price = priceRaw && priceRaw !== 'null' && !Number.isNaN(Number(priceRaw)) ? Number(priceRaw) : null

  const items = bodyMatch
    ? bodyMatch[1]
        .split(/<br\s*\/?>/i)
        .map((s) => s.replace(/<[^>]+>/g, '').trim())
        .filter(Boolean)
    : []

  const suspended = items.find((item) => SUSPENDED_PATTERN.test(item))
  if (suspended) {
    return { status: 'suspended', price: null, note: suspended, menus: [] }
  }

  return { status: 'open', price, note: null, menus: items.map(parseMenuLine) }
}

// html: searchView=date&searchCafeteria=<건물코드>로 받은 한 건물의 이번 주 페이지 전체.
// 반환: { dates: ['YYYYMMDD' x N], byDate: { [date]: { breakfast, lunch, dinner } } }.
// breakfast/lunch/dinner = { student: MealSlot, staff: MealSlot } — 표 구조 자체가 안 맞으면(구조
// 변경 등) 그 끼니는 null로 남긴다(어댑터가 이를 보고 폴백 여부를 판단할 수 있게).
export function parseCnuBuildingWeek(html) {
  const dates = extractDateColumns(html)
  const byDate = {}
  for (const date of dates) byDate[date] = { breakfast: null, lunch: null, dinner: null }

  const periodBlocks = [
    ...html.matchAll(/<td class='building' rowspan=2>(조식|중식|석식)<\/td>([\s\S]*?)(?=<td class='building'|<\/tbody>)/g),
  ]

  for (const block of periodBlocks) {
    const periodKey = MEAL_PERIODS[block[1]]
    if (!periodKey) continue

    const rowSplit = block[2].match(/직원<\/td>([\s\S]*?)학생<\/td>([\s\S]*)/)
    if (!rowSplit) continue

    const staffCells = extractCells(rowSplit[1])
    const studentCells = extractCells(rowSplit[2])

    dates.forEach((date, i) => {
      if (staffCells[i] == null || studentCells[i] == null) return
      byDate[date][periodKey] = { student: parseCell(studentCells[i]), staff: parseCell(staffCells[i]) }
    })
  }

  return { dates, byDate }
}
