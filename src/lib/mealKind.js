// 학식·급식 뷰에서 "대학 학식"과 "급식(초·중·고)" 중 무엇을 보고 있는지 — 단일 소스.
//
// CafeteriaPanel(바텀시트 안)이 갖고 있던 state인데, 지도(MapPage)도 같은 값을 알아야 한다.
// 어느 쪽을 보고 있느냐로 지도가 보여줘야 할 곳이 완전히 달라지기 때문이다:
//   대학 학식 → 그 대학 학식당 전부가 한눈에 들어오게
//   급식      → 프로필에 설정한 초·중·고 학교 위치로 이동
// 두 컴포넌트가 각자 localStorage를 읽으면 키·폴백 규칙이 갈라지므로 여기 하나로 모은다
// (cnuBuildings.js의 건물 선택과 같은 패턴).
//
// 기기(localStorage)에 저장하는 이유: 상단 "주변 식당 ↔ 학식·급식" 토글을 오갈 때마다
// CafeteriaPanel이 마운트/언마운트돼(MapPage가 조건부 렌더) 컴포넌트 state만으로는 재진입할 때마다
// 프로필 기본값으로 되돌아간다. 계정이 아니라 기기에 두는 건 화면 취향이지 계정 데이터가 아니어서다.
import { get, set } from './storage.js'

export const MEAL_KIND_STORAGE_KEY = 'mapSettings:mealKind'
export const MEAL_KINDS = ['k12', 'university']

// 저장된 선택이 없을 때(첫 방문) 프로필의 학교 종류를 따른다.
export function defaultMealKindFor(school) {
  return school?.type === 'university' ? 'university' : 'k12'
}

export function getSelectedMealKind(fallback) {
  const saved = get(MEAL_KIND_STORAGE_KEY, null)
  return MEAL_KINDS.includes(saved) ? saved : fallback
}

export function setSelectedMealKind(key) {
  if (MEAL_KINDS.includes(key)) set(MEAL_KIND_STORAGE_KEY, key)
}
