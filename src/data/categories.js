// type: 'main'(밥과 함께 한 끼가 되는 메인 요리) | 'side'(여러 끼 나눠 먹는 밑반찬) | 'snack'(간단한 간식류)
// subgroups: 카테고리 안을 한 번 더 나눌 때만 사용 (예: 라면 → 컵라면/봉지라면). 없으면 그냥 가격순 목록으로 표시.
export const TYPE_LABELS = {
  main: '메인음식',
  side: '반찬',
  snack: '간식',
}

export const categories = [
  { id: 'bokkeumbap', name: '볶음밥', type: 'main', emoji: '🍳' },
  { id: 'jjigae', name: '찌개', type: 'main', emoji: '🍲' },
  { id: 'deopbap', name: '덮밥', type: 'main', emoji: '🍱' },
  { id: 'pasta', name: '파스타', type: 'main', emoji: '🍝' },
  { id: 'bokkeum-main', name: '볶음요리', type: 'main', emoji: '🥘' },
  {
    id: 'ramyeon',
    name: '라면',
    type: 'main',
    emoji: '🍜',
    subgroups: [
      { id: 'cup', name: '컵라면' },
      { id: 'bag', name: '봉지라면' },
    ],
  },
  { id: 'rice', name: '밥·즉석식품', type: 'main', emoji: '🍙' },
  { id: 'noodle', name: '면요리', type: 'main', emoji: '🍜' },
  { id: 'salad', name: '샐러드', type: 'main', emoji: '🥗' },
  { id: 'steak', name: '구이·스테이크', type: 'main', emoji: '🍖' },
  { id: 'muchim', name: '무침·나물', type: 'side', emoji: '🥬' },
  { id: 'bokkeum-side', name: '볶음반찬', type: 'side', emoji: '🍢' },
  { id: 'jorim', name: '조림·계란요리', type: 'side', emoji: '🥔' },
  { id: 'toast', name: '토스트', type: 'snack', emoji: '🍞' },
  { id: 'sandwich', name: '샌드위치', type: 'snack', emoji: '🥪' },
]
