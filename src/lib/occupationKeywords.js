// 직업 → 자동 추천의 단일 소스(PRD 4주차 FR-2.1/2.2). 프로필의 직업 선택지, 지도 탭 진입 시 우선
// 보여줄 서브뷰(mealShortcut), 직업 맞춤 지도 핀에 쓸 검색 키워드를 여기 하나로 모은다.
export const OCCUPATION_OPTIONS = [
  { key: 'elementary', label: '초등학생' },
  { key: 'middle_high', label: '중·고등학생' },
  { key: 'university', label: '대학생' },
  { key: 'worker', label: '직장인' },
  { key: 'other', label: '기타' },
]

const DEFAULT_RECOMMENDATION = { mealShortcut: null, keywords: [] }

// mealShortcut: 지도 탭 진입 시 우선 보여줄 서브뷰('cafeteria' | null=기존 '주변 식당' 그대로).
// keywords: 부족 영양소 추천과 별개로, 직업 맞춤 지도 핀을 채울 /api/naver-places 검색어.
const OCCUPATION_RECOMMENDATIONS = {
  elementary: { mealShortcut: 'cafeteria', keywords: ['분식', '간식'] },
  middle_high: { mealShortcut: 'cafeteria', keywords: ['분식', '간식'] },
  university: { mealShortcut: 'cafeteria', keywords: ['백반', '가성비 맛집'] },
  worker: { mealShortcut: null, keywords: ['백반', '한식 뷔페', '구내식당', '점심 특선'] },
  other: DEFAULT_RECOMMENDATION,
}

// 미설정(null/undefined)·모르는 값 전부 "기존 부족 영양소 기반 추천만"(DEFAULT_RECOMMENDATION)으로
// 떨어진다 — 직업은 선택 사항이라 미설정 사용자의 기존 동작이 완전히 그대로 유지돼야 한다.
export function getOccupationRecommendation(occupation) {
  return OCCUPATION_RECOMMENDATIONS[occupation] ?? DEFAULT_RECOMMENDATION
}
