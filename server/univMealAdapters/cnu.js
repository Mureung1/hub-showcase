// 충남대 생협 식단 페이지 전용 크롤러 어댑터(4주차 보강 Step 7-1 — 5개 식당 × 주간 단위로 재작성).
// 향후 다른 대학이 추가되면 이 파일과 같은 fetchWeeklyMenu() => { week, days } 인터페이스로
// server/univMealAdapters/<univ>.js를 하나 더 만들면 된다 — /api/univ-meal(server/proxy.js)이
// univ 파라미터로 어댑터를 고른다.
//
// 실제 HTML 파싱은 순수 함수인 src/lib/cnuWeeklyParser.js가 맡는다(테스트가 그쪽에 있다) — 이
// 파일은 "어디서, 어떻게(네트워크로) 가져오는지"와 5개 건물을 어떻게 합치는지만 안다.
//
// 제1학생회관(cnu1)은 크롤링하지 않는다 — 이 "정식" 시스템에 그 건물 데이터가 실제로 없다
// (searchCafeteria=OCL03.01로 직접 요청해도 매주 전 끼니 운영안함, 사이트 자체도 그 건물 탭을
// 누르면 이 표 대신 외부 "메뉴운영내역" 페이지로 보낸다 — 실측). 그래서 cnu1은 항상 external로
// 고정하고, 나머지 4개 건물만 실제로 크롤링한다.
import { parseCnuBuildingWeek } from '../../src/lib/cnuWeeklyParser.js'

const CNU_MENU_URL = 'https://mobileadmin.cnu.ac.kr/food/index.jsp'
const CNU1_EXTERNAL_URL = 'https://cnuit.cnu.ac.kr/checkMenu.jsp?p0=B124va6F37RRI8qp'
const CNU1_NOTE = '제1학생회관은 별도 운영 안내 페이지에서 확인할 수 있어요.'

// 크롤링 대상 4개 건물 — 표시 순서(2·3·4학생회관 → 생활과학대학)도 이 배열 순서를 따른다.
const CRAWL_BUILDINGS = [
  { key: 'cnu2', name: '제2학생회관', code: 'OCL03.02' },
  { key: 'cnu3', name: '제3학생회관', code: 'OCL03.03' },
  { key: 'cnu4', name: '제4학생회관', code: 'OCL03.04' },
  { key: 'cnuLife', name: '생활과학대학', code: 'OCL03.05' },
]

// 서버 전체 건물 순서·이름의 단일 소스. 클라이언트는 이 파일을 import할 수 없어
// src/lib/cnuBuildings.js에 key만 복제해 두었다 — key가 서로 어긋나면 안 되니 함께 바꿀 것.
export const CNU_BUILDINGS = [{ key: 'cnu1', name: '제1학생회관' }, ...CRAWL_BUILDINGS.map(({ key, name }) => ({ key, name }))]
export const CNU1_LINK = { url: CNU1_EXTERNAL_URL, note: CNU1_NOTE }

function externalSlot() {
  return { status: 'external', price: null, note: CNU1_NOTE, menus: [] }
}

function cnu1DayMeals() {
  const slot = externalSlot()
  return { breakfast: { student: slot, staff: null }, lunch: { student: slot, staff: null }, dinner: { student: slot, staff: null } }
}

function toDotDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}.${m}.${d}`
}

async function fetchBuildingHtml(code, { fetchImpl, timeoutMs }) {
  const url = new URL(CNU_MENU_URL)
  // 실측: 이 사이트는 searchYmd 값과 무관하게 항상 "서버 기준 이번 주"만 반환한다(과거/미래 주
  // 이동 파라미터가 없음) — 오늘 날짜를 실어 보내는 것은 형식을 맞추기 위함일 뿐 결과에 영향 없다.
  url.searchParams.set('searchYmd', toDotDate(new Date()))
  url.searchParams.set('searchLang', 'OCL04.10')
  url.searchParams.set('searchView', 'date')
  url.searchParams.set('searchCafeteria', code)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetchImpl(url.toString(), { signal: controller.signal })
    if (!res.ok) {
      throw new Error(`충남대 학식 페이지 응답 실패: ${res.status} (${code})`)
    }
    return await res.text()
  } finally {
    clearTimeout(timer)
  }
}

// 반환: { week: 'YYYYMMDD'(월요일), days: [{ date, cafeterias }] } — 5개 건물 × 이 사이트가 주는
// 요일 수(보통 월~토 6일). 4개 건물을 병렬로 가져온다(실행 속도 우선 — 공개 조회 전용 페이지라
// 동시 4건은 서버에 부담이 되는 수준이 아니다). 건물 중 하나라도 fetch가 완전히 실패하거나 표
// 구조 자체를 못 찾으면 예외를 던져 호출부(라우트)가 폴백으로 넘어가게 한다 — 개별 "셀" 단위
// 이상 형식은 이미 파서가 status:'unknown'으로 흡수하므로 여기까지 올라오지 않는다.
export async function fetchWeeklyMenu({ fetchImpl = fetch, timeoutMs = 8000 } = {}) {
  const htmls = await Promise.all(CRAWL_BUILDINGS.map((b) => fetchBuildingHtml(b.code, { fetchImpl, timeoutMs })))
  const parsed = htmls.map((html) => parseCnuBuildingWeek(html))

  const dates = parsed[0]?.dates ?? []
  if (dates.length === 0) {
    throw new Error('충남대 학식 페이지 구조를 해석할 수 없습니다(날짜 열을 찾지 못함)')
  }

  const days = dates.map((date) => {
    const cafeterias = { cnu1: { name: '제1학생회관', meals: cnu1DayMeals() } }
    CRAWL_BUILDINGS.forEach((b, i) => {
      cafeterias[b.key] = {
        name: b.name,
        meals: parsed[i].byDate[date] ?? { breakfast: null, lunch: null, dinner: null },
      }
    })
    return { date, cafeterias }
  })

  return { week: dates[0], days }
}
