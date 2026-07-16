// 백엔드 Category enum → 화면 표시용(라벨/색상) 매핑.
// docs/design.md 카테고리 컬러 매핑을 기준으로, enum에는 있지만 문서 표에는 없는
// DELIVERY/MEAL_KIT/CAMPUS_MEAL/OTHER는 기존 색과 안 겹치는 새 색을 추가했다.
export const CATEGORY_META: Record<string, { label: string; color: string; bg: string }> = {
  CONVENIENCE_STORE: { label: '편의점', color: '#4F8EF7', bg: '#EBF2FF' },
  CAFE: { label: '카페', color: '#6F4E37', bg: '#FFF3E0' },
  SHOPPING: { label: '쇼핑', color: '#9B8FFF', bg: '#F0EFFF' },
  MART: { label: '마트', color: '#FF6B6B', bg: '#FFF0F0' },
  DELIVERY: { label: '배달', color: '#00C4B3', bg: '#E8F8F6' },
  MEAL_KIT: { label: '밀키트', color: '#F2884B', bg: '#FDECE1' },
  CAMPUS_MEAL: { label: '학식', color: '#5FBF7A', bg: '#EAF7EE' },
  OTHER: { label: '기타', color: '#6B7280', bg: '#F3F4F6' },
}

export function getCategoryMeta(category: string) {
  return CATEGORY_META[category] ?? CATEGORY_META.OTHER
}
