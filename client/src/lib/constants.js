// 기획서 §3.1 카테고리 — 서버 storeService.CATEGORIES와 동일하게 유지
export const CATEGORIES = ['베이커리', '디저트', '신선식품', '반찬', '음료']

// W1 좌표 입력 프리셋 (T-04 결정: 지오코딩 없이 프리셋 + 직접 수정)
export const LOCATION_PRESETS = [
  { label: '신촌역 인근', lat: 37.5551, lng: 126.9366 },
  { label: '연세로 (신촌 중심)', lat: 37.5585, lng: 126.9368 },
  { label: '이대앞', lat: 37.5567, lng: 126.9459 },
  { label: '홍대입구', lat: 37.5573, lng: 126.9237 },
]
