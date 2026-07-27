// 대학 학식 화면(CafeteriaPanel.jsx)이 "선택한 날짜의 한 식당" 데이터를 렌더링 가능한 조각으로
// 바꾸는 순수 함수(4주차 보강 Step 7-2) — 상태 판정(빈 하루인지)이 컴포넌트 안에 섞이지 않게 분리해
// 브라우저 없이 테스트한다.
const PERIOD_ORDER = [
  { key: 'breakfast', label: '조식' },
  { key: 'lunch', label: '중식' },
  { key: 'dinner', label: '석식' },
]

// meals: 한 식당의 하루치 { breakfast, lunch, dinner } (각 { student, staff } | null).
// track: 'student' | 'staff'. 반환: [{ key, label, slot }] — 항상 3개, 순서 고정(조식→중식→석식).
export function buildDaySlots(meals, track) {
  return PERIOD_ORDER.map(({ key, label }) => ({ key, label, slot: meals?.[key]?.[track] ?? null }))
}

// 하루 전체가 사실상 빈 상태인지 — 끼니 데이터가 아예 없거나(파싱 실패) closed/unknown뿐이면
// "정보 없음"으로 취급한다(open·suspended는 사용자에게 보여줄 실질 정보가 있으므로 제외).
export function isDayEmpty(daySlots) {
  return daySlots.every(({ slot }) => !slot || slot.status === 'closed' || slot.status === 'unknown')
}
