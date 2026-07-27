import { useEffect, useMemo, useRef, useState } from 'react'
import { useUser } from '../context/UserContext.jsx'
import AppButton from '../components/AppButton.jsx'
import CafeteriaPanel from '../components/CafeteriaPanel.jsx'
import Card from '../components/Card.jsx'
import FoodCategoryChips from '../components/FoodCategoryChips.jsx'
import NaverPlaceMap from '../components/NaverPlaceMap.jsx'
import OccupationPlaceList from '../components/OccupationPlaceList.jsx'
import PlaceList from '../components/PlaceList.jsx'
import Skeleton from '../components/Skeleton.jsx'
import Spinner from '../components/Spinner.jsx'
import { geminiCompleteWithRetry, parseJsonLoose } from '../lib/gemini.js'
import { EXPECTED_INTAKE_SCHEMA, GEMINI_TEMPERATURE, KEYWORDS_SCHEMA } from '../lib/geminiSchemas.js'
import { getCurrentPosition } from '../lib/geolocation.js'
import { ALLERGY_OPTIONS, labelizeTags } from '../lib/healthProfile.js'
import {
  filterPlacesByCategory,
  getFoodCategory,
  setSelectedFoodCategory,
  useSelectedFoodCategory,
} from '../lib/foodCategory.js'
import { geocodeLocation, reverseGeocode } from '../lib/kakao.js'
import { clampExpectedForItems, enrichExpectedFromDB } from '../lib/menuNutrition.js'
import { searchNaverPlaces } from '../lib/naverPlaces.js'
import { buildDeficiencyRows, isSodiumExceeded } from '../lib/nutrition.js'
import { getOccupationRecommendation } from '../lib/occupationKeywords.js'
import { colors, font, radius, spacing, styles } from '../styles/theme.js'

// 위치 권한 거부/실패 시 지도를 띄울 기본 위치(대전 유성구 충남대학교 인근)
const DEFAULT_POSITION = { lat: 36.3665, lng: 127.3448 }

// AI 키워드 생성이 실패했을 때 쓰는 부족 영양소별 기본 식당 유형(서로 다른 유형으로 분산).
// 칼로리·나트륨은 더 이상 부족 판정 대상이 아니라서(nutrition.js DEFICIENCY_TARGET_KEYS) 키가 없다.
const KEYWORD_FALLBACKS = {
  protein: '고깃집',
  fiber: '샐러드',
  carbs: '백반',
  fat: '돈까스',
}
const FALLBACK_SEARCH_KEYWORD = '백반'
// 4대 목표 영양소를 전부 충족한 날(부족 영양소 없음)의 "균형 잡힌 식사" 방향 검색어
const BALANCED_KEYWORDS = ['백반', '샐러드', '정식']
// 결과가 한 유형으로만 몰렸을 때 보완 검색에 쓰는 다양화 풀
const DIVERSITY_POOL = ['샐러드', '고깃집', '비빔밥', '쌈밥', '두부요리']
// 네이버 지역 검색은 쿼리당 최대 5건만 준다(실측 — proxy.js 참고). 후보 풀은 키워드 수로 늘리므로,
// 키워드당 결과는 전부(5건) 쓰고 최종 목록만 8곳으로 자른다.
const MAX_PER_KEYWORD = 5
const MAX_TOTAL_PLACES = 8
// 한 번의 검색 라운드에서 병렬로 던질 최대 키워드 수(호출량·지연 상한)
const MAX_SEARCH_KEYWORDS = 4
// 네이버 지역 검색은 반경 파라미터가 없어 검색어에 지역명을 섞는 것만으로는 먼 결과가 섞여 들어올 수
// 있다 — 사용자 좌표(또는 지정 위치) 기준 이 거리(m)를 벗어나는 결과는 아예 후보에서 제외한다.
const MAX_DISTANCE_METERS = 3000

// category는 foodCategory.js의 항목. 'all'+나트륨 정상이면 예전 프롬프트와 완전히 동일한 문장이
// 나간다 — 카테고리를 고르지 않은 사용자의 결과가 이번 변경으로 달라지지 않도록.
function buildKeywordsPrompt(deficientRows, category, { sodiumExceeded = false } = {}) {
  const nutrientText = deficientRows.map((row) => `${row.label}(${row.key}) 약 ${row.deficiency}${row.unit} 부족`).join(', ')

  // 조건 4번부터 이어 붙는 선택 조건들 — 없으면 빈 문자열이라 기존 프롬프트와 완전히 동일해진다.
  const extraConditions = []
  if (category.key !== 'all') {
    extraConditions.push(
      `사용자가 "${category.label}"을(를) 먹고 싶어 한다. 모든 키워드는 반드시 ${category.label} 범주 안에서 골라라 — 그 범주 안에서 위 영양소를 가장 잘 채워주는 유형을 고르면 된다.`,
    )
  }
  if (sodiumExceeded) {
    // 나트륨은 부족 영양소가 아니라 역방향(한도 초과) 제약으로만 프롬프트에 반영한다.
    extraConditions.push(
      '사용자는 오늘 나트륨 섭취가 이미 권장 상한을 초과했다. 찌개·짬뽕·국밥처럼 국물 위주로 나트륨이 매우 높은 유형은 키워드로 뽑지 마라.',
    )
  }
  const extraText = extraConditions.map((line, i) => `\n${4 + i}. ${line}`).join('')

  return `오늘 부족한 영양소를 채울 식당을 검색하려고 해.
부족한 영양소: ${nutrientText}.

조건:
1. 부족한 영양소 각각에 대해, 그 영양소를 보충하기 좋은 음식을 파는 "식당 유형" 검색 키워드를 1개씩 뽑아라(총 2~3개).
2. 키워드끼리 서로 다른 유형이어야 한다. 백반/국밥 같은 한 가지 유형으로 몰지 마라.
   매핑 예시: 단백질→구이/고깃집/샤브샤브, 식이섬유→샐러드/비빔밥/쌈밥, 탄수화물→백반/김밥, 칼슘→두부요리.
3. 각 키워드는 지역 장소 검색에 바로 쓸 수 있는 짧은 한국어 단어(1~4글자 상호 유형)여야 한다.${extraText}

설명이나 마크다운 없이, 아래 스키마와 정확히 일치하는 JSON만 반환해:
{
  "keywords": [
    { "keyword": "고깃집", "target": "protein" }
  ]
}`
}

async function fetchSearchKeywords(deficientRows, category, { sodiumExceeded = false } = {}) {
  // 부족 영양소가 없는 경우는 둘: ① 프로필/오늘 기록 미입력(고를 근거 없음) ② 4대 영양소 전부 충족.
  // 어느 쪽이든 "균형 잡힌 식사" 방향의 검색어를 쓴다(카테고리를 골랐으면 그 카테고리 풀).
  if (deficientRows.length === 0) {
    return category.key === 'all' ? BALANCED_KEYWORDS.slice(0, 3) : category.keywords.slice(0, 3)
  }

  try {
    const text = await geminiCompleteWithRetry({
      prompt: buildKeywordsPrompt(deficientRows, category, { sodiumExceeded }),
      schema: KEYWORDS_SCHEMA,
      schemaName: 'search_keywords',
      temperature: GEMINI_TEMPERATURE.keywords,
    })
    const parsed = parseJsonLoose(text)
    const keywords = (parsed?.keywords || [])
      .map((k) => (typeof k === 'string' ? k : k?.keyword))
      .filter((k) => typeof k === 'string' && k.trim().length > 0)
      .map((k) => k.trim())
    const unique = [...new Set(keywords)].slice(0, 3)
    if (unique.length > 0) return unique
  } catch (err) {
    console.error('search keyword generation failed:', err)
  }

  // 폴백: 카테고리를 골랐으면 그 카테고리의 검색어 풀, 아니면 부족 영양소별 정적 매핑(유형 분산 유지)
  if (category.key !== 'all') return category.keywords.slice(0, 3)
  const mapped = [...new Set(deficientRows.map((row) => KEYWORD_FALLBACKS[row.key] || FALLBACK_SEARCH_KEYWORD))]
  return mapped.slice(0, 3)
}

function placeIdentity(place) {
  return place.place_url || `${place.place_name}|${place.road_address_name}`
}

// 네이버(">")·카카오(" > ") 두 표기 모두 대응(카카오 검색 코드는 롤백용으로 남겨둠).
function categoryOf(place) {
  const parts = (place.category_name || '').split('>').map((s) => s.trim()).filter(Boolean)
  return parts[parts.length - 1] || ''
}

function haversineMeters(a, b) {
  const R = 6371000
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const sinLat = Math.sin(dLat / 2)
  const sinLng = Math.sin(dLng / 2)
  const h = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng
  return 2 * R * Math.asin(Math.sqrt(h))
}

// 네이버 지역 검색 API는 가게마다 네이버 지도 상세 페이지 링크를 주지 않는다(item.link는 홈페이지/SNS
// 등 제각각이라 없는 경우도 많음) — 대신 가게 이름+도로명주소로 네이버 지도 검색 결과 URL을 직접
// 만든다. 이름이 고유하면 대개 그 가게의 상세 정보(리뷰·영업시간 등)로 바로 연결된다.
function naverMapSearchUrl(name, address) {
  const query = [name, address].filter(Boolean).join(' ')
  return `https://map.naver.com/p/search/${encodeURIComponent(query)}`
}

// 네이버 지역 검색 결과(name/address/roadAddress/category/link/lat/lng)를 화면이 이미 쓰고 있는 카카오
// 검색 결과 모양(place_name/road_address_name/category_name/place_url/x=경도/y=위도)으로 맞춘다 —
// 카드 UI(PlaceList)와 지도 마커(NaverPlaceMap)를 그대로 재사용하기 위해서이자, 검색만 다시 카카오로
// 롤백하더라도 그 두 컴포넌트는 손댈 필요가 없게 하기 위해서다.
function toPlaceShape(item, myPos) {
  const roadAddress = item.roadAddress || item.address || ''
  return {
    place_name: item.name,
    road_address_name: roadAddress,
    category_name: item.category || '',
    place_url: naverMapSearchUrl(item.name, roadAddress),
    x: item.lng,
    y: item.lat,
    distance: Math.round(haversineMeters(myPos, { lat: item.lat, lng: item.lng })),
  }
}

// 키워드별로 네이버 지역 검색을 병렬로 돌리고, 중복 장소를 제거하며 합친다.
// 네이버 지역 검색은 반경 파라미터가 없어(regionLabel로 검색어에 지역명을 섞어 "내 주변" 느낌을 내는
// 것과 별개로) 결과 자체가 항상 사용자 근처라는 보장이 없다 — 그래서 MAX_DISTANCE_METERS를 벗어난
// 결과는 후보에서 아예 제외하고, 남은 것끼리도 키워드별 결과·최종 병합 결과 모두 거리순으로 정렬한다.
//
// categoryKey: 음식 종류 필터를 **키워드당 슬롯 배분 전에** 적용한다 — 필터를 병합 후에 걸면
// 쿼리당 5건뿐인 슬롯을 다른 종류 식당이 차지해 정작 고른 종류가 밀려나는 낭비가 생긴다.
// 반환: { places: 필터 통과 병합 결과, rawPool: 필터 전(거리 필터 후) 후보 전체 — 완화 폴백용 }.
async function searchAndMerge({ x, y, keywords, regionLabel, categoryKey = 'all', existing = [] }) {
  const merged = [...existing]
  const seen = new Set(existing.map(placeIdentity))
  const rawPool = []
  const rawSeen = new Set()
  const myPos = { lat: Number(y), lng: Number(x) }

  const settled = await Promise.allSettled(
    keywords.map((keyword) => searchNaverPlaces(regionLabel ? `${regionLabel} ${keyword}` : keyword)),
  )

  settled.forEach((result, i) => {
    if (result.status !== 'fulfilled') {
      console.error(`naver search failed for "${keywords[i]}":`, result.reason)
      return
    }
    const nearby = result.value
      .map((item) => toPlaceShape(item, myPos))
      .filter((place) => place.distance <= MAX_DISTANCE_METERS)
      .sort((a, b) => a.distance - b.distance)

    for (const place of nearby) {
      const identity = placeIdentity(place)
      if (rawSeen.has(identity)) continue
      rawSeen.add(identity)
      rawPool.push(place)
    }

    for (const place of filterPlacesByCategory(categoryKey, nearby).slice(0, MAX_PER_KEYWORD)) {
      const identity = placeIdentity(place)
      if (seen.has(identity)) continue
      seen.add(identity)
      merged.push({ ...place, matchedKeyword: keywords[i] })
    }
  })

  merged.sort((a, b) => a.distance - b.distance)
  rawPool.sort((a, b) => a.distance - b.distance)
  return { places: merged.slice(0, MAX_TOTAL_PLACES), rawPool }
}

// 직업 맞춤 추천(FR-2.2) — 부족 영양소 추천과는 별개 축이라 카테고리 필터 없이(categoryKey:'all')
// 직업별 고정 키워드로만 찾는다. 실패해도 기존 부족 영양소 추천(searchAroundPosition)은 영향받지
// 않도록 호출부(handleFindNearby 등)에서 항상 이 함수만 따로 catch한다.
// 지오코딩을 한 번 더 하는 대가로 searchAroundPosition을 손대지 않아도 되게 해, 이미 복잡한 그
// 함수의 회귀 위험을 낮춘다.
async function searchOccupationPlaces({ x, y }, occupation) {
  const { keywords } = getOccupationRecommendation(occupation)
  if (keywords.length === 0) return []

  const regionLabel = await reverseGeocode({ x, y }).catch(() => null)
  const { places } = await searchAndMerge({ x, y, keywords, regionLabel, categoryKey: 'all' })
  return places.map((place) => ({ ...place, isOccupationMatch: true }))
}

// allergyLabels가 비고 나트륨 정상이면(프로필 미입력 등) 기존 프롬프트와 완전히 동일하게 나간다.
function buildExpectedPrompt(places, deficientRows, allergyLabels = [], { sodiumExceeded = false } = {}) {
  const placeText = places.map((p) => `- ${p.place_name} (${p.category_name || '분류 없음'})`).join('\n')
  const deficientKeys = deficientRows.map((row) => `"${row.key}"`).join(', ')
  const nutrientText = deficientRows.map((row) => `${row.label}(${row.key})`).join(', ')
  const allergyLine =
    allergyLabels.length > 0
      ? `\n- 다음 알레르기 성분이 들어간 메뉴는 대표 메뉴(representativeMenu)로 고르지 마라: ${allergyLabels.join(', ')}.`
      : ''
  const sodiumLine = sodiumExceeded
    ? '\n- 사용자는 오늘 나트륨 섭취가 이미 권장 상한을 초과했다. 가능한 한 나트륨(sodium)이 낮은 대표 메뉴를 골라라.'
    : ''

  return `아래는 오늘 부족한 영양소(${nutrientText})를 채우러 갈 후보 식당 목록이야.
각 식당의 카테고리를 보고 대표 메뉴(representativeMenu)를 하나 떠올린 뒤, 그 대표 메뉴 "한국 표준 1인분"을 먹었을 때 예상되는 주요 영양 섭취량(expected)을 계산해줘.

조건:
- representativeMenu는 그 식당 카테고리에서 실제로 흔히 파는 구체적인 메뉴명이어야 한다(예: "국밥" 카테고리 → "쇠고기국밥"). 식당 이름이나 카테고리를 그대로 반복하지 마라.
- 수치는 식품의약품안전처 한국식품영양성분 데이터베이스(국가표준식품성분표)와 한국영양학회 기준값 수준의 표준 1인분 기준으로 계산해라. (URL 조회가 아니라 네가 아는 그 DB 수준의 기준값이라는 의미다.)
- 과대추정 금지: 통상적인 1인분 현실 범위를 벗어나면 스스로 재검토하고 보수적인 값으로 고쳐라.
- expected에는 부족한 영양소 키(${deficientKeys})를 반드시 숫자로 포함하고, 나머지 키도 아는 값이면 숫자로, 확신이 없으면 null로 채워라.
- 사용할 수 있는 키와 단위: calories(kcal), protein(g), carbs(g), fat(g), fiber(g), sodium(mg).
- place_name은 아래 목록의 이름과 정확히 같아야 한다.${allergyLine}${sodiumLine}

식당 목록:
${placeText}

설명이나 마크다운 없이, 아래 스키마와 정확히 일치하는 JSON만 반환해:
{
  "places": [
    { "place_name": "식당 이름", "representativeMenu": "대표 메뉴명", "expected": { "protein": 0 } }
  ]
}`
}

// 장소별 "대표 메뉴 1인분 예상 섭취량"을 한 번의 호출로 계산해 붙인다. 실패해도 목록 자체는 그대로 보여준다.
async function attachExpectedIntake(places, deficientRows, allergyLabels = [], { sodiumExceeded = false } = {}) {
  if (places.length === 0 || deficientRows.length === 0) return places

  try {
    const text = await geminiCompleteWithRetry({
      prompt: buildExpectedPrompt(places, deficientRows, allergyLabels, { sodiumExceeded }),
      schema: EXPECTED_INTAKE_SCHEMA,
      schemaName: 'expected_intake',
      temperature: GEMINI_TEMPERATURE.expectedIntake,
    })
    const parsed = parseJsonLoose(text)
    const byName = new Map(
      (parsed?.places || [])
        .filter((p) => p && typeof p.place_name === 'string' && p.expected && typeof p.expected === 'object')
        .map((p) => [
          p.place_name,
          { expected: p.expected, representativeMenu: typeof p.representativeMenu === 'string' ? p.representativeMenu : null },
        ]),
    )
    return places.map((place) => (byName.has(place.place_name) ? { ...place, ...byName.get(place.place_name) } : place))
  } catch (err) {
    console.error('expected intake calculation failed:', err)
    return places
  }
}

export default function MapPage() {
  const { profile, todayMealsTotal, effectiveRecommended } = useUser()
  const recommended = effectiveRecommended
  const todayTotal = todayMealsTotal

  const allergyLabels = useMemo(
    () => labelizeTags(profile?.allergies, ALLERGY_OPTIONS),
    [profile?.allergies],
  )

  // 오늘 부족한 영양소 상위 3개 — 4대 목표 영양소(탄수·단백·지방·식이섬유)만, 충족률 낮은 순.
  // 프로필/오늘 분석 기록이 없거나 전부 충족이면 빈 배열 → 균형 식사 키워드로 폴백.
  const top3Rows = useMemo(() => buildDeficiencyRows(recommended, todayTotal), [recommended, todayTotal])

  // 나트륨 상한 초과 여부 — 부족 영양소가 아니라 "짠 메뉴 피하기" 역방향 제약으로만 쓴다.
  const sodiumExceeded = useMemo(() => isSodiumExceeded(recommended, todayTotal), [recommended, todayTotal])

  const [places, setPlaces] = useState(null)
  // NaverPlaceMap의 useEffect는 places를 참조 비교로 의존한다 — `places || []`를 JSX에서 그대로
  // 쓰면 places가 null인 동안(검색 전) 리렌더마다 새 배열이 생겨 지도가 매번 통째로 재생성된다.
  // 스폰서 식당(광고, isAd)은 실제 좌표가 없는 목업 항목이라 지도 마커 대상에서는 제외한다(목록에는 남긴다).
  const mapPlaces = useMemo(() => (places ?? []).filter((place) => !place.isAd), [places])
  // OccupationPlaceList의 "부족한 영양소도 채울 수 있어요" 겹침 표시(FR-2.3)에 쓴다.
  const nutrientPlaceIds = useMemo(() => new Set((places ?? []).map(placeIdentity)), [places])
  // 직업 맞춤 추천 핀(FR-2.3) — 부족 영양소 추천(places)과 별개 배열로 들고 있다가 지도에 다른
  // 색으로 함께 그린다. 직업 미설정/기타면 항상 빈 배열(기존 지도 동작과 완전히 동일).
  const [occupationPlaces, setOccupationPlaces] = useState([])
  const [myPosition, setMyPosition] = useState(null)
  const [locationNotice, setLocationNotice] = useState('')
  const [nearbyLoading, setNearbyLoading] = useState(false)
  const [nearbyError, setNearbyError] = useState('')
  const [locationQuery, setLocationQuery] = useState('')
  // 고른 음식 종류는 기기에 저장돼 다시 방문해도 유지된다(foodCategory.js).
  const categoryKey = useSelectedFoodCategory()
  const [categoryNotice, setCategoryNotice] = useState('')
  // 지금 화면에 보이는 결과가 "어느 종류로 찾은 것인지". 종류만 바꾸고 다시 찾지 않으면 목록은 옛 종류의
  // 결과이므로, 그 상태를 버튼 문구로 알려주고 지난 안내 문구는 감춘다.
  const [searchedCategory, setSearchedCategory] = useState(null)
  const staleCategory = places !== null && searchedCategory !== categoryKey
  const locateTriedRef = useRef(false)

  // 상단 토글 "주변 식당 | 학식·급식"(FR-1.2) — 서브 영역만 바뀌고 지도 탭 자체는 그대로다.
  // 학생/대학생 직업이면 첫 진입 시 학식·급식을 우선 보여준다(FR-2.2 mealShortcut) — 그 외/미설정은
  // 기존과 동일하게 '주변 식당'부터 보여준다. 최초 렌더 한 번만 결정하고, 이후 직접 고른 탭은 유지한다.
  const [view, setView] = useState(() => getOccupationRecommendation(profile?.occupation).mealShortcut ?? 'nearby')

  function handleChangeCategory(key) {
    setSelectedFoodCategory(key)
    setNearbyError('')
  }

  // 검색 결과가 아예 없을 때의 문구. 카테고리를 골랐다면 "다른 카테고리를 선택해보세요"로 다음 행동을
  // 알려준다 — 이 경우 결과가 없는 원인이 대개 좁힌 카테고리이기 때문.
  function emptyResultMessage(where) {
    const category = getFoodCategory(categoryKey)
    if (category.key !== 'all') {
      return `${where}에는 ${category.label} 식당이 없어요. 다른 카테고리를 선택해보세요.`
    }
    return `${where}에서 추천할 식당을 찾지 못했어요. 잠시 후 다시 시도해주세요.`
  }

  // 탭 진입 시 바로 위치를 요청해 지도를 내 위치 중심으로 띄운다. 거부/실패 시 기본 위치로 폴백.
  useEffect(() => {
    if (locateTriedRef.current) return
    locateTriedRef.current = true

    getCurrentPosition()
      .then(({ x, y }) => setMyPosition({ lat: y, lng: x }))
      .catch(() => {
        setMyPosition(DEFAULT_POSITION)
        setLocationNotice('위치 권한을 허용하면 현재 위치를 표시해요.')
      })
  }, [])

  // "내 주변에서 찾기"(현재 위치)와 "이 위치로 검색"(지정 위치)이 좌표를 얻는 방법만 다르고 이후
  // 검색 절차(키워드 생성→검색→다양화 보완→예상 섭취량 부착)는 동일해, 그 공통 절차만 여기 모았다.
  // 반환값 { places, categoryNotice } — categoryNotice는 고른 카테고리로 결과를 못 채워 범위를
  // 넓혔을 때만 채워진다(빈 화면 대신 이유를 말해주기 위해).
  async function searchAroundPosition({ x, y }) {
    const category = getFoodCategory(categoryKey)

    // 1) 부족 영양소(+고른 음식 종류, 나트륨 초과 제약) → 서로 다른 식당 유형 키워드 2~3개
    const keywords = await fetchSearchKeywords(top3Rows, category, { sodiumExceeded })

    // 1.2) 후보 풀 확대: 쿼리당 결과가 최대 5건뿐이라(실측, proxy.js) 키워드 수로 풀을 늘린다.
    //  - 카테고리를 골랐으면 카테고리 이름 검색을 첫 배치에 포함한다(예전 5-a 완화 단계가 하던 검색을
    //    선제 흡수 — 영양소 키워드가 전부 빗나가도 이 쿼리가 그 종류의 기본 후보를 확보한다).
    //  - '전체'면 다양화 풀에서 하나를 미리 추가해 유형 다양성을 높인다.
    const searchKeywords = [...keywords]
    if (searchKeywords.length < MAX_SEARCH_KEYWORDS) {
      const extra =
        category.key !== 'all'
          ? category.searchTerm
          : DIVERSITY_POOL.find((k) => !searchKeywords.includes(k))
      if (extra && !searchKeywords.includes(extra)) searchKeywords.push(extra)
    }

    // 1.5) 좌표 -> 대략적 지역명(예: "유성구"). 네이버 지역 검색은 반경 파라미터가 없어, 검색어 자체에
    // 지역명을 섞어 넣어야 "내 주변" 결과에 가까워진다. 실패해도 검색 자체는 지역명 없이 계속 진행한다.
    const regionLabel = await reverseGeocode({ x, y }).catch((err) => {
      console.error('reverse geocode failed, searching without region bias:', err)
      return null
    })

    // 2) 키워드별 병렬 검색 후 병합(중복 제거). 음식 종류 필터는 searchAndMerge 안에서 슬롯 배분
    //    전에 적용된다("한식을 골랐는데 중국집이 나온다"를 막으면서 슬롯 낭비도 없앤다).
    let { places: results, rawPool } = await searchAndMerge({
      x, y, keywords: searchKeywords, regionLabel, categoryKey: category.key,
    })

    // 3) 한 유형으로만 몰리면 다른 유형으로 보완 검색. 카테고리를 골랐다면 그 카테고리 안에서 다양화한다
    //    — '전체'용 풀(샐러드/고깃집/…)을 그대로 쓰면 고른 종류 밖으로 새어 나간다.
    const diversityPool = category.key === 'all' ? DIVERSITY_POOL : category.keywords
    const categoryCount = new Set(results.map(categoryOf)).size
    if (results.length > 0 && categoryCount <= 1) {
      const extraKeyword = diversityPool.find((k) => !searchKeywords.includes(k))
      if (extraKeyword) {
        const supplement = await searchAndMerge({
          x, y, keywords: [extraKeyword], regionLabel, categoryKey: category.key, existing: results,
        })
        results = supplement.places
        rawPool = [...rawPool, ...supplement.rawPool]
      }
    }

    let filtered = results
    let categoryNotice = ''

    // 4) 완화: 고른 종류로는 한 곳도 없는데 종류를 가리지 않은 후보(rawPool)는 있다면, 빈 화면 대신
    //    그걸 보여주고 이유를 말한다. (예전 5-a "카테고리 이름만으로 재검색"은 1.2에서 첫 배치에
    //    흡수됐다 — sort가 결정적(comment)이라 같은 쿼리를 다시 던져도 같은 결과만 나온다.)
    if (filtered.length === 0 && category.key !== 'all' && rawPool.length > 0) {
      // 두 차례 검색(rawPool 합산)에서 같은 식당이 겹칠 수 있어 여기서 한 번 더 중복 제거한다.
      const seen = new Set()
      const dedupedPool = rawPool.filter((place) => {
        const identity = placeIdentity(place)
        if (seen.has(identity)) return false
        seen.add(identity)
        return true
      })
      if (import.meta.env.DEV) {
        console.log(`[식당검색 진단] "${category.label}" 필터 통과 0건 → 종류 무관 후보 ${dedupedPool.length}건으로 완화`)
      }
      filtered = dedupedPool.slice(0, MAX_TOTAL_PLACES)
      categoryNotice = `근처에 ${category.label} 식당이 없어서 다른 종류를 함께 보여줘요.`
    }

    if (filtered.length === 0) return { places: [], categoryNotice: '' }

    // 6) 각 식당의 대표 메뉴 예상 섭취량(추천 근거) 계산해 부착 — 알레르기·나트륨 초과를 대표 메뉴 선정에 반영
    // (예전엔 여기서 스폰서 식당 목업을 4번째 자리에 끼워 넣었지만, 식당 광고는 PRD v2.0 §6에서 이번
    //  릴리즈 스코프 아웃됐다. 광고는 식단 탭의 쿠팡 파트너스 영양제 배너 한 곳으로 통일한다.)
    let withExpected = await attachExpectedIntake(filtered, top3Rows, allergyLabels, { sodiumExceeded })
    // 7) AI 추정치를 현실 범위로 보정한 뒤(1단계, 비용 0), 식약처 DB 실측값으로 보강한다
    //    (2단계 — 병렬·캐시·타임아웃, 실패한 메뉴는 보정된 AI 추정 유지. menuNutrition.js).
    const getMenu = (place) => place.representativeMenu
    withExpected = clampExpectedForItems(withExpected, getMenu)
    withExpected = await enrichExpectedFromDB(withExpected, getMenu)
    return { places: withExpected, categoryNotice }
  }

  // 직업 맞춤 검색(searchOccupationPlaces)은 항상 자체 .catch로 감싸 빈 배열로 떨어뜨린다 — 이 새
  // 검색이 실패하거나 느려도 기존 부족 영양소 검색(searchAroundPosition)의 동작·에러 메시지는
  // 전혀 영향받지 않는다(PRD "한쪽 실패가 다른 쪽을 막지 않게").
  async function handleFindNearby() {
    setNearbyLoading(true)
    setNearbyError('')
    setCategoryNotice('')
    setPlaces(null)
    setOccupationPlaces([])
    try {
      const { x, y } = await getCurrentPosition()
      const [{ places: results, categoryNotice }, occupationResults] = await Promise.all([
        searchAroundPosition({ x, y }),
        searchOccupationPlaces({ x, y }, profile?.occupation).catch((err) => {
          console.error('occupation place search failed:', err)
          return []
        }),
      ])

      if (results.length === 0 && occupationResults.length === 0) {
        setNearbyError(emptyResultMessage('주변'))
        return
      }

      setMyPosition({ lat: y, lng: x })
      setLocationNotice('')
      setCategoryNotice(categoryNotice)
      setSearchedCategory(categoryKey)
      setPlaces(results)
      setOccupationPlaces(occupationResults)
    } catch (err) {
      console.error('nearby search failed:', err)
      setNearbyError(err.message || '주변 식당을 찾지 못했습니다.')
    } finally {
      setNearbyLoading(false)
    }
  }

  async function handleSearchByLocation() {
    const query = locationQuery.trim()
    if (!query) {
      setNearbyError('검색할 지역명/주소를 입력해주세요.')
      return
    }

    setNearbyLoading(true)
    setNearbyError('')
    setCategoryNotice('')
    setPlaces(null)
    setOccupationPlaces([])
    try {
      const { x, y, label } = await geocodeLocation(query)
      const [{ places: results, categoryNotice }, occupationResults] = await Promise.all([
        searchAroundPosition({ x, y }),
        searchOccupationPlaces({ x, y }, profile?.occupation).catch((err) => {
          console.error('occupation place search failed:', err)
          return []
        }),
      ])

      if (results.length === 0 && occupationResults.length === 0) {
        setNearbyError(emptyResultMessage('이 위치 주변'))
        return
      }

      setMyPosition({ lat: y, lng: x })
      setLocationNotice(label ? `"${label}" 주변 결과예요.` : '')
      setCategoryNotice(categoryNotice)
      setSearchedCategory(categoryKey)
      setPlaces(results)
      setOccupationPlaces(occupationResults)
    } catch (err) {
      console.error('location search failed:', err)
      setNearbyError(err.message || '위치를 찾지 못했습니다.')
    } finally {
      setNearbyLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      {/* 화면 제목("지도")과 설명 줄은 두지 않는다 — 하단 탭바가 이미 현재 화면을 알려주므로
          중복이고, 지도를 위로 올려 한 화면에 더 넓게 보여준다. */}
      <div style={{ display: 'flex', gap: spacing.sm, marginBottom: spacing.md }}>
        {[
          { key: 'nearby', label: '주변 식당' },
          { key: 'cafeteria', label: '학식·급식' },
        ].map((tab) => {
          const active = view === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              className="tds-press"
              onClick={() => setView(tab.key)}
              style={{
                flex: 1,
                padding: `${spacing.sm}px 0`,
                borderRadius: radius.sm,
                border: 'none',
                background: active ? colors.primary : colors.bg,
                color: active ? '#fff' : colors.textStrong,
                fontWeight: 700,
                fontSize: font.size.sm,
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {view === 'cafeteria' && <CafeteriaPanel />}

      {view === 'nearby' && (
      <>
      <div style={{ marginBottom: spacing.md }}>
        {myPosition ? (
          <NaverPlaceMap myPosition={myPosition} places={mapPlaces} occupationPlaces={occupationPlaces} />
        ) : (
          <Skeleton height={320} radius={radius.lg} />
        )}
        {locationNotice && (
          <p style={{ ...styles.helperText, margin: `${spacing.sm}px 0 0`, textAlign: 'center' }}>{locationNotice}</p>
        )}
        {/* 색만으로 구분하지 않도록 범례는 항상 색 점 + 글자 라벨을 함께 둔다(FR-2.3 접근성 요구사항). */}
        {occupationPlaces.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: spacing.lg, marginTop: spacing.sm }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: font.size.xs, color: colors.textSub }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#EA4335', display: 'inline-block' }} />
              영양소 추천
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: font.size.xs, color: colors.textSub }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: colors.info, display: 'inline-block' }} />
              직업 맞춤
            </span>
          </div>
        )}
      </div>

      <Card>
        <FoodCategoryChips value={categoryKey} onChange={handleChangeCategory} disabled={nearbyLoading} />
        <AppButton onClick={handleFindNearby} disabled={nearbyLoading}>
          {nearbyLoading && <Spinner size={16} />}
          {nearbyLoading ? '찾는 중...' : staleCategory ? '이 종류로 다시 찾기' : '내 주변에서 찾기'}
        </AppButton>
        {nearbyError && <p style={styles.errorText}>{nearbyError}</p>}
      </Card>

      <Card>
        <h3 style={{ fontSize: font.size.md, fontWeight: 600, margin: `0 0 ${spacing.sm}px`, color: colors.textStrong }}>
          다른 지역에서 찾기
        </h3>
        <input
          type="text"
          value={locationQuery}
          onChange={(e) => setLocationQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleSearchByLocation()
            }
          }}
          placeholder="지역명/주소 입력 (예: 대전 유성구, 강남역)"
          style={styles.input}
        />
        <AppButton
          variant="secondary"
          onClick={handleSearchByLocation}
          disabled={nearbyLoading}
          style={{ marginTop: spacing.sm }}
        >
          이 위치로 검색
        </AppButton>
      </Card>

      {nearbyLoading && (
        <>
          {[0, 1].map((i) => (
            <Card key={i}>
              <Skeleton height={18} width="45%" style={{ marginBottom: spacing.sm }} />
              <Skeleton height={14} width="70%" style={{ marginBottom: spacing.sm }} />
              <Skeleton height={14} width="55%" />
            </Card>
          ))}
        </>
      )}

      {!nearbyLoading && places && (
        <>
          {categoryNotice && !staleCategory && (
            <Card style={{ background: colors.deficientSurface, boxShadow: 'none' }}>
              <p style={{ margin: 0, color: colors.textStrong, fontSize: font.size.sm }}>{categoryNotice}</p>
            </Card>
          )}
          <PlaceList places={places} todayTotal={todayTotal} recommended={recommended} deficientRows={top3Rows} />
        </>
      )}
      {!nearbyLoading && (
        <OccupationPlaceList places={occupationPlaces} nutrientPlaceIds={nutrientPlaceIds} />
      )}
      </>
      )}
    </div>
  )
}
