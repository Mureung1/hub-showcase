// 지도 탭 "음식 종류" 필터의 단일 소스 — 목록 정의, 카테고리 판별, 선택값 저장을 한곳에 모은다.
//
// 왜 필요한가: 식당 추천은 원래 "오늘 부족한 영양소"만 보고 검색어를 만든다. 그래서 단백질이 부족하면
// 늘 고깃집 계열만 나오는 식이었는데, 실제로는 "지금은 면이 당긴다" 같은 사용자 의사가 따로 있다.
// 이 필터가 그 의사를 검색어 구성 단계에 얹는다(영양 로직 자체는 그대로 둔다).
//
// 저장 위치가 계정이 아니라 기기(localStorage)인 이유는 cardSettings.js와 같다 — 계정 데이터가 아니라
// 화면 설정이고, 게스트도 로그인 사용자도 똑같이 유지돼야 한다.
import { useSyncExternalStore } from 'react'
import { get, set } from './storage.js'

const STORAGE_KEY = 'mapSettings:foodCategory'

// keywords: 이 카테고리 안에서 쓸 검색어 풀. 두 곳에 쓰인다 —
//   (1) AI 키워드 생성이 실패했을 때의 폴백, (2) 결과가 한 유형으로 몰렸을 때의 다양화 보완 검색.
//     ('전체'일 때 쓰는 기존 풀은 MapPage 쪽에 그대로 있다.)
// match: 네이버 지역 검색이 돌려주는 category 문자열("한식>육류,고기요리", "음식점>중식" 등)에서
//   이 카테고리로 볼 토큰들. 검색어만으로는 다른 종류가 섞여 들어오므로 결과를 한 번 더 거른다.
export const FOOD_CATEGORIES = [
  { key: 'all', label: '전체', searchTerm: '', keywords: [], match: [] },
  {
    key: 'korean',
    label: '한식',
    searchTerm: '한식',
    keywords: ['백반', '국밥', '쌈밥'],
    match: ['한식', '한정식', '백반', '국밥', '해장국', '찌개', '고기', '구이', '삼겹살', '족발', '보쌈', '닭갈비', '설렁탕', '냉면'],
  },
  {
    key: 'chinese',
    label: '중식',
    searchTerm: '중식',
    keywords: ['중국집', '마라탕', '양꼬치'],
    match: ['중식', '중국', '마라', '양꼬치', '딤섬'],
  },
  {
    key: 'japanese',
    label: '일식',
    searchTerm: '일식',
    keywords: ['초밥', '돈까스', '라멘'],
    match: ['일식', '일본', '초밥', '스시', '돈까스', '라멘', '우동', '규동', '이자카야'],
  },
  {
    key: 'western',
    label: '양식',
    searchTerm: '양식',
    keywords: ['파스타', '스테이크', '샐러드'],
    match: ['양식', '이탈리', '프랑스', '스테이크', '파스타', '피자', '햄버거', 'brunch', '브런치', '샐러드'],
  },
  {
    key: 'bunsik',
    label: '분식',
    searchTerm: '분식',
    keywords: ['김밥', '떡볶이', '만두'],
    match: ['분식', '김밥', '떡볶이', '만두', '순대'],
  },
  {
    key: 'asian',
    label: '아시안',
    searchTerm: '아시안',
    keywords: ['쌀국수', '태국음식', '인도음식'],
    match: ['아시아', '베트남', '쌀국수', '태국', '인도', '동남아', '이국적', '터키', '멕시코'],
  },
  {
    key: 'cafe',
    label: '카페·디저트',
    searchTerm: '카페',
    keywords: ['카페', '베이커리', '디저트'],
    match: ['카페', '디저트', '베이커리', '제과', '빵', '커피', '아이스크림'],
  },
]

export const DEFAULT_FOOD_CATEGORY = 'all'

// 저장된 값이 예전 것이거나 손상됐어도 항상 유효한 카테고리를 돌려준다(호출부에 null 체크를 퍼뜨리지 않는다).
export function getFoodCategory(key) {
  return FOOD_CATEGORIES.find((c) => c.key === key) || FOOD_CATEGORIES[0]
}

// 네이버가 준 category 문자열이 이 카테고리에 속하는지. '전체'는 항상 true.
export function matchesFoodCategory(categoryKey, categoryName) {
  const category = getFoodCategory(categoryKey)
  if (category.key === 'all') return true
  const text = (categoryName || '').toLowerCase()
  if (!text) return false
  return category.match.some((token) => text.includes(token.toLowerCase()))
}

// 검색 결과(toPlaceShape를 거친 모양)에서 선택한 카테고리에 맞는 것만 남긴다.
export function filterPlacesByCategory(categoryKey, places) {
  if (getFoodCategory(categoryKey).key === 'all') return places
  return places.filter((place) => matchesFoodCategory(categoryKey, place.category_name))
}

// ─── 선택값 저장(기기 단위) ────────────────────────────────────────────────────

function read() {
  const saved = get(STORAGE_KEY, null)
  return typeof saved === 'string' && FOOD_CATEGORIES.some((c) => c.key === saved) ? saved : DEFAULT_FOOD_CATEGORY
}

let cache = read()
const listeners = new Set()

export function getSelectedFoodCategory() {
  return cache
}

export function setSelectedFoodCategory(key) {
  cache = getFoodCategory(key).key
  set(STORAGE_KEY, cache)
  listeners.forEach((fn) => fn())
}

function subscribe(callback) {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

// cardSettings.useVisibleNutrients와 같은 최소 pub-sub. 다시 방문했을 때 고른 카테고리가 남아 있게 한다.
export function useSelectedFoodCategory() {
  return useSyncExternalStore(subscribe, getSelectedFoodCategory)
}
