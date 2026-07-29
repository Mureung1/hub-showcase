import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useUser } from '../context/UserContext.jsx'
import AppButton from '../components/AppButton.jsx'
import { TAB_BAR_CLEARANCE } from '../components/AppShell.jsx'
import BottomSheet from '../components/BottomSheet.jsx'
import CafeteriaPanel from '../components/CafeteriaPanel.jsx'
import Card from '../components/Card.jsx'
import ChevronIcon from '../components/ChevronIcon.jsx'
import FoodCategoryChips from '../components/FoodCategoryChips.jsx'
import NaverPlaceMap from '../components/NaverPlaceMap.jsx'
import PlaceDuelModal from '../components/PlaceDuelModal.jsx'
import PlaceList from '../components/PlaceList.jsx'
import SegmentedControl from '../components/SegmentedControl.jsx'
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
import { diversifyByCategory } from '../lib/placeDiversity.js'
import { calcPlaceScore } from '../lib/placeScore.js'
import { TABS } from '../lib/tabs.js'
import { useDocumentTitle } from '../lib/useDocumentTitle.js'
import { colors, font, layout, radius, spacing, styles } from '../styles/theme.js'

// 위치 권한 거부/실패 시 지도를 띄울 기본 위치(대전 유성구 충남대학교 인근)
const DEFAULT_POSITION = { lat: 36.3665, lng: 127.3448 }

const MAP_VIEW_OPTIONS = [
  { key: 'nearby', label: '주변 식당' },
  { key: 'cafeteria', label: '학식·급식' },
]

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
// 키워드당 결과는 전부(5건) 쓴다.
const MAX_PER_KEYWORD = 5
// 지도 탭 개편(리텐션 강화 v7) — "내 주변 식당 N곳 · 목록 더 보기"를 위해 예전(5곳)보다 넉넉히
// 받아둔다. 10으로 잡은 이유: attachExpectedIntake/enrichExpectedFromDB(장소당 Gemini+DB 조회 —
// 비용이 드는 단계)가 이 값만큼 전부 돌기 때문에, 15 이상으로 올리면 "더 보기"를 한 번도 안 누르는
// 검색에서도 AI 비용만 3배로 늘어난다. 10은 비용 증가를 2배로 묶어두면서도 "더 보기"가 실제로 몇
// 곳을 더 보여줄 수 있게 하는 절충값이다. 처음 화면엔 INITIAL_VISIBLE_PLACES(5)곳만 보여주고 나머지는
// 이미 받아둔 데이터 안에서 "더 보기"로 펼친다(추가 API 호출 없음).
const MAX_TOTAL_PLACES = 10
const INITIAL_VISIBLE_PLACES = 5
// 한 번의 검색 라운드에서 병렬로 던질 최대 키워드 수(호출량·지연 상한)
const MAX_SEARCH_KEYWORDS = 4
// 네이버 지역 검색은 반경 파라미터가 없어 검색어에 지역명을 섞는 것만으로는 먼 결과가 섞여 들어올 수
// 있다 — 사용자 좌표(또는 지정 위치) 기준 이 거리(m)를 벗어나는 결과는 아예 후보에서 제외한다.
const MAX_DISTANCE_METERS = 3000

// category는 foodCategory.js의 항목. 특정 카테고리를 고르면 그 범주 조건이, '전체'면 계열 다양성
// 조건이 추가로 붙는다 — 나트륨 정상 + 카테고리 미지정일 때만 조건 없는 기본 프롬프트가 나간다.
function buildKeywordsPrompt(deficientRows, category, { sodiumExceeded = false } = {}) {
  const nutrientText = deficientRows.map((row) => `${row.label}(${row.key}) 약 ${row.deficiency}${row.unit} 부족`).join(', ')

  // 조건 4번부터 이어 붙는 선택 조건들 — 없으면 빈 문자열이라 기존 프롬프트와 완전히 동일해진다.
  const extraConditions = []
  if (category.key !== 'all') {
    extraConditions.push(
      `사용자가 "${category.label}"을(를) 먹고 싶어 한다. 모든 키워드는 반드시 ${category.label} 범주 안에서 골라라 — 그 범주 안에서 위 영양소를 가장 잘 채워주는 유형을 고르면 된다.`,
    )
  } else {
    // '전체' 카테고리는 최종 목록을 여러 요리 계열로 분산시키는 게 목표(placeDiversity.js가 결정적으로
    // 보장) — 이 조건은 그 목표에 맞는 키워드가 애초에 더 자주 나오게 하는 느슨한 1차 유도일 뿐이다.
    extraConditions.push(
      '키워드들이 가능하면 서로 다른 나라·계열 음식(한식/중식/일식/양식/분식/아시안/카페·디저트)에서 나오게 골라라 — 한 계열에 몰리지 않게 하되, 부족한 영양소를 채우는 게 항상 더 중요하다.',
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

// 반환: { keywords, targets }. targets는 Map<keyword, 그 키워드가 겨냥한 부족 영양소 키> —
// placeDiversity.js가 "영양 충족 고정 픽"에 쓴다(부족 영양소 없이 고른 균형 키워드는 특정 영양소를
// 겨냥한 게 아니므로 targets에 안 들어간다).
async function fetchSearchKeywords(deficientRows, category, { sodiumExceeded = false } = {}) {
  // 부족 영양소가 없는 경우는 둘: ① 프로필/오늘 기록 미입력(고를 근거 없음) ② 4대 영양소 전부 충족.
  // 어느 쪽이든 "균형 잡힌 식사" 방향의 검색어를 쓴다(카테고리를 골랐으면 그 카테고리 풀).
  if (deficientRows.length === 0) {
    const keywords = category.key === 'all' ? BALANCED_KEYWORDS.slice(0, 3) : category.keywords.slice(0, 3)
    return { keywords, targets: new Map() }
  }

  try {
    const text = await geminiCompleteWithRetry({
      prompt: buildKeywordsPrompt(deficientRows, category, { sodiumExceeded }),
      schema: KEYWORDS_SCHEMA,
      schemaName: 'search_keywords',
      temperature: GEMINI_TEMPERATURE.keywords,
    })
    const parsed = parseJsonLoose(text)
    const targets = new Map()
    const keywords = (parsed?.keywords || [])
      .filter((k) => k && typeof k.keyword === 'string' && k.keyword.trim().length > 0)
      .map((k) => {
        const keyword = k.keyword.trim()
        if (typeof k.target === 'string' && k.target.trim()) targets.set(keyword, k.target.trim())
        return keyword
      })
    const unique = [...new Set(keywords)].slice(0, 3)
    if (unique.length > 0) return { keywords: unique, targets }
  } catch (err) {
    console.error('search keyword generation failed:', err)
  }

  // 폴백: 카테고리를 골랐으면 그 카테고리의 검색어 풀, 아니면 부족 영양소별 정적 매핑(유형 분산 유지)
  if (category.key !== 'all') return { keywords: category.keywords.slice(0, 3), targets: new Map() }
  const targets = new Map()
  const mapped = [...new Set(deficientRows.map((row) => {
    const keyword = KEYWORD_FALLBACKS[row.key] || FALLBACK_SEARCH_KEYWORD
    if (KEYWORD_FALLBACKS[row.key]) targets.set(keyword, row.key)
    return keyword
  }))]
  return { keywords: mapped.slice(0, 3), targets }
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
// 반환: { places: 필터 통과 병합 결과, rawPool: 필터 전(거리 필터 후) 후보 전체 — 완화 폴백용,
// pool: MAX_TOTAL_PLACES로 자르기 전 병합 결과 전체 — placeDiversity.js의 '전체' 카테고리 다양화용 }.
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
  return { places: merged.slice(0, MAX_TOTAL_PLACES), rawPool, pool: merged }
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

// 6주차 §5 — 직업은 검색 결과에 조용히 반영하되(참고), 화면에 "직업 맞춤"이라고 이름 붙여 노출하지
// 않는다(별도 섹션·범례·다른 색 핀 전부 제거). 그래서 두 결과를 같은 목록·같은 핀 색으로 합친다 —
// 영양소 추천에 이미 있는 식당은 건너뛰고(중복 제거), 나머지 자리만 채운다(영양소 추천이 항상 우선).
// occupationPlaces는 attachExpectedIntake를 안 거쳐 place.expected가 없으므로, PlaceList에서
// "추천 이유"·"예상 섭취량" 없이 그냥 후보 카드로만 뜬다 — 문구로 직업을 언급할 지점 자체가 없다.
//
// nutrientPlaces 자체가 이미 MAX_TOTAL_PLACES곳까지 채워져 있는 경우가 많아(상업지구 등), 그냥
// 뒤에 이어 붙이고 slice하면 직업 매칭분이 들어갈 자리가 사실상 없다(리뷰에서 발견) — 최소
// RESERVED_OCCUPATION_SLOTS곳은 직업 매칭 전용으로 남겨둔다.
const RESERVED_OCCUPATION_SLOTS = 2

function mergeOccupationPlaces(nutrientPlaces, occupationPlaces) {
  const seen = new Set(nutrientPlaces.map(placeIdentity))
  const extra = occupationPlaces.filter((place) => !seen.has(placeIdentity(place)))
  if (extra.length === 0) return nutrientPlaces.slice(0, MAX_TOTAL_PLACES)

  const nutrientSlots = Math.max(0, MAX_TOTAL_PLACES - RESERVED_OCCUPATION_SLOTS)
  const capped = nutrientPlaces.slice(0, nutrientSlots)
  return [...capped, ...extra].slice(0, MAX_TOTAL_PLACES)
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
- priceRange: 그 대표 메뉴가 대중적으로 가격대가 잘 알려진 음식(예: 김밥, 국밥, 짜장면)이면 현실적인
  원화 가격 범위를 {min, max}로 추정해라. 특정 식당·지역마다 가격이 크게 다르거나 확신이 없으면
  절대 숫자를 지어내지 말고 priceRange 전체를 null로 남겨라. 단정적인 가격이나 허위 가격은 금지다.

식당 목록:
${placeText}

설명이나 마크다운 없이, 아래 스키마와 정확히 일치하는 JSON만 반환해:
{
  "places": [
    { "place_name": "식당 이름", "representativeMenu": "대표 메뉴명", "expected": { "protein": 0 }, "priceRange": { "min": 8000, "max": 9000 } }
  ]
}`
}

// priceRange가 구형 응답(필드 자체가 없음)이거나 형식이 어긋나면 조용히 null로 떨어뜨린다 — 가격
// 표시는 부가 정보라 이 값 하나 때문에 장소 카드 전체가 깨지면 안 된다. Number.isFinite로
// Infinity/NaN을 걸러내고(Infinity는 typeof가 'number'라 앞의 검사만으로는 통과해버린다 — 리뷰에서
// 발견, "약 0~∞원" 같은 문구가 뜰 수 있었다) 한 끼 가격으로 비현실적인 상한도 함께 둔다.
const MAX_PLAUSIBLE_PRICE_WON = 1_000_000

function isValidPriceRange(value) {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    Number.isFinite(value.min) &&
    Number.isFinite(value.max) &&
    value.min >= 0 &&
    value.max >= value.min &&
    value.max <= MAX_PLAUSIBLE_PRICE_WON
  )
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
          {
            expected: p.expected,
            representativeMenu: typeof p.representativeMenu === 'string' ? p.representativeMenu : null,
            priceRange: isValidPriceRange(p.priceRange) ? p.priceRange : null,
          },
        ]),
    )
    return places.map((place) => (byName.has(place.place_name) ? { ...place, ...byName.get(place.place_name) } : place))
  } catch (err) {
    console.error('expected intake calculation failed:', err)
    return places
  }
}

const HEADER_SELECTOR = '.tds-appbar'

// 지도 탭 개편(지도·달력 모바일 개편 3안) — 지도가 상단 Header 아래부터 하단 탭바 위까지 화면
// 전체를 차지하는 레이아웃으로 바뀌면서, 다른 4개 탭과 달리 "내 바로 위에 고정 헤더가 실제로 얼마나
// 큰지"를 알아야 하는 유일한 화면이 됐다. Header.jsx/AppShell.jsx는 건드리지 않고(다른 탭은 그냥
// 문서 흐름대로 스크롤되는 일반 페이지라 이 계산이 필요 없다) 이미 있는 .tds-appbar 클래스로 실제
// 렌더된 높이를 재서 얻는다 — 로그인 상태·안전영역(노치)에 따라 달라지는 헤더 높이를 하드코딩하지
// 않기 위함. useLayoutEffect로 페인트 전에 값을 확정해 첫 프레임에 지도가 살짝 밀렸다 튀는 걸 막는다.
function useMapScreenTop() {
  const [top, setTop] = useState(64)
  useLayoutEffect(() => {
    function measure() {
      const header = document.querySelector(HEADER_SELECTOR)
      if (header) setTop(header.getBoundingClientRect().bottom)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])
  return top
}

// 지도 위 상단 오버레이 — "주변 식당 | 학식·급식" 세그먼트(늘 보임) + 음식 종류 칩('주변 식당'일 때만).
function MapTopOverlay({ view, onChangeView, categoryKey, onChangeCategory, disabled }) {
  return (
    <div style={{ position: 'relative', zIndex: 2, padding: '4px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <SegmentedControl
        options={MAP_VIEW_OPTIONS}
        value={view}
        onChange={onChangeView}
        padding={`${spacing.sm}px 0`}
        fontSize={font.size.sm}
        inactiveTextColor={colors.textStrong}
        style={{ background: 'rgba(255,255,255,0.92)', borderRadius: radius.md, padding: 4, boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}
      />
      {view === 'nearby' && <FoodCategoryChips variant="overlay" value={categoryKey} onChange={onChangeCategory} disabled={disabled} />}
    </div>
  )
}

// 시트 하단 고정 푸터 — 평소엔 "두 곳 비교하기"(듀얼 모드 진입), 모드 안에서는 선택 진행 상황에
// 맞춰 라벨이 바뀐다. 취소(비교 모드 끄기)는 별도 텍스트 링크로 아래에 둔다.
function DuelFooterButton({ duelMode, duelSelectedKeys, onStart, onOpen, onCancel }) {
  if (!duelMode) {
    return (
      <AppButton onClick={onStart} style={{ borderRadius: radius.md, padding: '13px 0' }}>
        두 곳 비교하기
      </AppButton>
    )
  }
  const ready = duelSelectedKeys.length === 2
  return (
    <div>
      <AppButton onClick={onOpen} disabled={!ready} style={{ borderRadius: radius.md, padding: '13px 0' }}>
        {ready ? '비교하기 (2/2)' : `비교할 두 곳을 선택하세요 (${duelSelectedKeys.length}/2)`}
      </AppButton>
      <button
        type="button"
        className="tds-press"
        onClick={onCancel}
        style={{ ...styles.linkButton, display: 'block', margin: `${spacing.sm}px auto 0`, fontSize: font.size.xs, color: colors.muted }}
      >
        비교 모드 끄기
      </button>
    </div>
  )
}

// 바텀시트 안 '주변 식당' 콘텐츠 — 검색 전/로딩/결과 3상태 + "다른 지역에서 찾기"(기본 접힘)를 한
// 자리에 모은다. 원래 화면 세로로 쌓여있던 지도 카드/카테고리 카드/지역검색 카드/결과 리스트를 시트
// 하나로 합친 것뿐, 각 조각의 로직(검색·재시도·완화 안내)은 MapPage의 기존 핸들러를 그대로 받아쓴다.
function NearbySheetContent({
  places,
  visiblePlaces,
  nearbyLoading,
  nearbyError,
  locationNotice,
  categoryNotice,
  staleCategory,
  showAllPlaces,
  onShowAllPlaces,
  todayTotal,
  recommended,
  deficientRows,
  duelMode,
  duelSelectedKeys,
  onToggleDuelSelect,
  locationQuery,
  onChangeLocationQuery,
  onSearchByLocation,
  onFindNearby,
}) {
  const [showLocationSearch, setShowLocationSearch] = useState(false)

  return (
    <div style={{ padding: '4px 18px 4px' }}>
      <button
        type="button"
        className="tds-press"
        onClick={() => setShowLocationSearch((v) => !v)}
        aria-expanded={showLocationSearch}
        style={{ ...styles.linkButton, display: 'flex', alignItems: 'center', gap: 4, fontSize: 12.5, marginBottom: spacing.sm }}
      >
        다른 지역에서 찾기
        <ChevronIcon open={showLocationSearch} />
      </button>

      {showLocationSearch && (
        <div style={{ marginBottom: spacing.md }}>
          <input
            type="text"
            value={locationQuery}
            onChange={(e) => onChangeLocationQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                onSearchByLocation()
              }
            }}
            placeholder="지역명/주소 입력 (예: 대전 유성구, 강남역)"
            style={styles.input}
          />
          <AppButton variant="secondary" onClick={onSearchByLocation} disabled={nearbyLoading} style={{ marginTop: spacing.sm }}>
            이 위치로 검색
          </AppButton>
        </div>
      )}

      <AppButton onClick={onFindNearby} disabled={nearbyLoading}>
        {nearbyLoading && <Spinner size={16} />}
        {nearbyLoading ? '찾는 중...' : staleCategory ? '이 종류로 다시 찾기' : '내 주변에서 찾기'}
      </AppButton>
      {nearbyError && <p style={styles.errorText}>{nearbyError}</p>}
      {locationNotice && <p style={{ ...styles.helperText, fontSize: font.size.xs, marginTop: spacing.xs }}>{locationNotice}</p>}

      {nearbyLoading && (
        <div style={{ marginTop: spacing.md, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[0, 1].map((i) => (
            <Card key={i} flat>
              <Skeleton height={18} width="45%" style={{ marginBottom: spacing.sm }} />
              <Skeleton height={14} width="70%" style={{ marginBottom: spacing.sm }} />
              <Skeleton height={14} width="55%" />
            </Card>
          ))}
        </div>
      )}

      {!nearbyLoading && places && places.length > 0 && (
        <div style={{ marginTop: spacing.md }}>
          {categoryNotice && !staleCategory && (
            <Card style={{ background: colors.deficientSurface, boxShadow: 'none', marginBottom: spacing.sm }}>
              <p style={{ margin: 0, color: colors.textStrong, fontSize: font.size.sm }}>{categoryNotice}</p>
            </Card>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: colors.textStrong }}>내 주변 식당 {places.length}곳</span>
            {!showAllPlaces && places.length > INITIAL_VISIBLE_PLACES && (
              <button
                type="button"
                className="tds-press"
                onClick={onShowAllPlaces}
                style={{ ...styles.linkButton, fontSize: 12.5, whiteSpace: 'nowrap' }}
              >
                목록 더 보기 ({places.length - INITIAL_VISIBLE_PLACES}곳)
              </button>
            )}
          </div>

          <PlaceList
            places={visiblePlaces}
            todayTotal={todayTotal}
            recommended={recommended}
            deficientRows={deficientRows}
            selectable={duelMode}
            selectedKeys={duelSelectedKeys}
            onToggleSelect={onToggleDuelSelect}
          />
        </div>
      )}
    </div>
  )
}

export default function MapPage() {
  useDocumentTitle(TABS.find((t) => t.key === 'map').label)
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
  const [myPosition, setMyPosition] = useState(null)
  const [locationNotice, setLocationNotice] = useState('')
  const [nearbyLoading, setNearbyLoading] = useState(false)
  // "목록 더 보기" — 새 검색을 시작할 때마다 다시 접힌 상태로 되돌린다(핸들러들에서 리셋).
  const [showAllPlaces, setShowAllPlaces] = useState(false)
  const visiblePlaces = places ? (showAllPlaces ? places : places.slice(0, INITIAL_VISIBLE_PLACES)) : []

  // FR-18 — 지도 듀얼 비교. 다중 선택 모드에서 카드 2개를 고르면 "비교하기"가 나타난다.
  const [duelMode, setDuelMode] = useState(false)
  const [duelSelectedKeys, setDuelSelectedKeys] = useState([])
  const [duelPair, setDuelPair] = useState(null) // [placeA, placeB] | null
  // 바텀시트 접힘(330px)/펼침(640px) — 지도 탭 개편(지도·달력 모바일 개편 3안). 학식·급식으로
  // 탭을 바꿔도 그대로 유지된다(사용자가 펼쳐둔 상태를 기억하는 편이 자연스럽다).
  const [sheetExpanded, setSheetExpanded] = useState(false)
  const screenTop = useMapScreenTop()

  function handleToggleDuelMode() {
    setDuelMode((v) => !v)
    setDuelSelectedKeys([])
  }

  function handleToggleDuelSelect(key) {
    setDuelSelectedKeys((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key)
      if (prev.length >= 2) return prev // 이미 2개 선택됨 — 먼저 하나를 해제해야 새로 고를 수 있다.
      return [...prev, key]
    })
  }

  function handleOpenDuel() {
    if (duelSelectedKeys.length !== 2 || !places) return
    const [a, b] = duelSelectedKeys.map((key) => places.find((p) => placeIdentity(p) === key))
    if (a && b) setDuelPair([a, b])
  }
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

    // 1) 부족 영양소(+고른 음식 종류, 나트륨 초과 제약) → 서로 다른 식당 유형 키워드 2~3개.
    // targets: 그 키워드가 겨냥한 부족 영양소 키 — '전체' 카테고리 다양화(placeDiversity.js)의
    // "영양 고정 픽"에 쓴다.
    const { keywords, targets } = await fetchSearchKeywords(top3Rows, category, { sodiumExceeded })

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
    let { places: results, rawPool, pool } = await searchAndMerge({
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
        const poolSeen = new Set(pool.map(placeIdentity))
        pool = [...pool, ...supplement.pool.filter((place) => !poolSeen.has(placeIdentity(place)))]
      }
    }

    // 3.5) '전체' 카테고리는 최종 목록이 여러 요리 계열에 퍼지게 결정적으로 재선정한다(영양 충족은
    //    항상 최우선 — placeDiversity.js 참고). 특정 카테고리를 골랐을 땐 이 블록이 실행되지 않아
    //    results는 기존과 완전히 동일하게 유지된다.
    if (category.key === 'all') {
      const withTargets = pool.map((place) => ({ ...place, matchedTarget: targets.get(place.matchedKeyword) ?? null }))
      results = diversifyByCategory(withTargets, { targetCount: MAX_TOTAL_PLACES })
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

    // 8) 추천도 점수(FR-4) — 영양 충족도 + 거리 근접도 2요인. 네이버 지역 검색엔 평점 필드가 없어
    //    3요인(+평점)은 애초에 못 만든다(직접 확인). 렌더링에 쓰이는 다른 필드는 전혀 안 건드린다.
    const scored = withExpected.map((place) => ({
      ...place,
      score: calcPlaceScore({ expected: place.expected, deficientRows: top3Rows, distance: place.distance, maxDistance: MAX_DISTANCE_METERS }),
    }))
    return { places: scored, categoryNotice }
  }

  // 직업 맞춤 검색(searchOccupationPlaces)은 항상 자체 .catch로 감싸 빈 배열로 떨어뜨린다 — 이 새
  // 검색이 실패하거나 느려도 기존 부족 영양소 검색(searchAroundPosition)의 동작·에러 메시지는
  // 전혀 영향받지 않는다(PRD "한쪽 실패가 다른 쪽을 막지 않게"). 두 결과는 mergeOccupationPlaces로
  // 합쳐 하나의 목록·하나의 지도 핀 색으로만 보여준다(6주차 §5 — 직업 표면 노출 제거).
  async function handleFindNearby() {
    setNearbyLoading(true)
    setNearbyError('')
    setCategoryNotice('')
    setPlaces(null)
    setShowAllPlaces(false)
    setDuelSelectedKeys([])
    try {
      const { x, y } = await getCurrentPosition()
      const [{ places: results, categoryNotice }, occupationResults] = await Promise.all([
        searchAroundPosition({ x, y }),
        searchOccupationPlaces({ x, y }, profile?.occupation).catch((err) => {
          console.error('occupation place search failed:', err)
          return []
        }),
      ])
      const merged = mergeOccupationPlaces(results, occupationResults)

      if (merged.length === 0) {
        setNearbyError(emptyResultMessage('주변'))
        return
      }

      setMyPosition({ lat: y, lng: x })
      setLocationNotice('')
      setCategoryNotice(categoryNotice)
      setSearchedCategory(categoryKey)
      setPlaces(merged)
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
    setShowAllPlaces(false)
    setDuelSelectedKeys([])
    try {
      const { x, y, label } = await geocodeLocation(query)
      const [{ places: results, categoryNotice }, occupationResults] = await Promise.all([
        searchAroundPosition({ x, y }),
        searchOccupationPlaces({ x, y }, profile?.occupation).catch((err) => {
          console.error('occupation place search failed:', err)
          return []
        }),
      ])
      const merged = mergeOccupationPlaces(results, occupationResults)

      if (merged.length === 0) {
        setNearbyError(emptyResultMessage('이 위치 주변'))
        return
      }

      setMyPosition({ lat: y, lng: x })
      setLocationNotice(label ? `"${label}" 주변 결과예요.` : '')
      setCategoryNotice(categoryNotice)
      setSearchedCategory(categoryKey)
      setPlaces(merged)
    } catch (err) {
      console.error('location search failed:', err)
      setNearbyError(err.message || '위치를 찾지 못했습니다.')
    } finally {
      setNearbyLoading(false)
    }
  }

  return (
    <>
      {/* 지도 탭 개편(지도·달력 모바일 개편 3안) — 지도가 화면 전체(상단 Header 아래 ~ 하단 탭바
          위)를 차지하고 목록/학식·급식은 그 위에 뜨는 바텀시트로 옮겨졌다. 화면 제목("지도")과 설명
          줄은 원래도 없었다 — 하단 탭바가 이미 현재 화면을 알려준다. left:50%+translateX(-50%)로
          다른 탭과 같은 shellMaxWidth 중앙 정렬 폭을 유지한다(넓은 웹 브라우저에서 지도만 화면
          가장자리까지 번지지 않게). */}
      <div
        style={{
          position: 'fixed',
          left: '50%',
          transform: 'translateX(-50%)',
          width: `min(100%, ${layout.shellMaxWidth}px)`,
          top: screenTop,
          bottom: TAB_BAR_CLEARANCE,
          overflow: 'hidden',
          background: colors.bg,
        }}
      >
        {myPosition ? (
          <NaverPlaceMap myPosition={myPosition} places={mapPlaces} fullScreen />
        ) : (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: '#E9EDEA',
              backgroundImage: 'linear-gradient(#DFE5E0 1px, transparent 1px), linear-gradient(90deg, #DFE5E0 1px, transparent 1px)',
              backgroundSize: '34px 34px',
            }}
          />
        )}

        <MapTopOverlay
          view={view}
          onChangeView={setView}
          categoryKey={categoryKey}
          onChangeCategory={handleChangeCategory}
          disabled={nearbyLoading}
        />

        {view === 'nearby' && (
          <BottomSheet
            expanded={sheetExpanded}
            onToggle={() => setSheetExpanded((v) => !v)}
            footer={
              places &&
              places.length > 0 && (
                <DuelFooterButton
                  duelMode={duelMode}
                  duelSelectedKeys={duelSelectedKeys}
                  onStart={handleToggleDuelMode}
                  onOpen={handleOpenDuel}
                  onCancel={handleToggleDuelMode}
                />
              )
            }
          >
            <NearbySheetContent
              places={places}
              visiblePlaces={visiblePlaces}
              nearbyLoading={nearbyLoading}
              nearbyError={nearbyError}
              locationNotice={locationNotice}
              categoryNotice={categoryNotice}
              staleCategory={staleCategory}
              showAllPlaces={showAllPlaces}
              onShowAllPlaces={() => setShowAllPlaces(true)}
              todayTotal={todayTotal}
              recommended={recommended}
              deficientRows={top3Rows}
              duelMode={duelMode}
              duelSelectedKeys={duelSelectedKeys}
              onToggleDuelSelect={handleToggleDuelSelect}
              locationQuery={locationQuery}
              onChangeLocationQuery={setLocationQuery}
              onSearchByLocation={handleSearchByLocation}
              onFindNearby={handleFindNearby}
            />
          </BottomSheet>
        )}

        {view === 'cafeteria' && (
          <BottomSheet expanded={sheetExpanded} onToggle={() => setSheetExpanded((v) => !v)}>
            <div style={{ padding: '4px 18px 18px', display: 'flex', flexDirection: 'column', gap: spacing.md }}>
              <CafeteriaPanel />
            </div>
          </BottomSheet>
        )}
      </div>

      {duelPair && (
        <PlaceDuelModal
          placeA={duelPair[0]}
          placeB={duelPair[1]}
          todayTotal={todayTotal}
          recommended={recommended}
          onClose={() => {
            setDuelPair(null)
            // 닫은 뒤 같은 두 곳을 다시 선택한 채로 남기면 "비교하기"가 즉시 같은 모달을 재오픈한다 —
            // 새 듀얼을 시작하려면 선택도 함께 비운다.
            setDuelSelectedKeys([])
          }}
        />
      )}
    </>
  )
}
